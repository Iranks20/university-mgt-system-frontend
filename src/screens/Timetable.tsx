import Components from "../components"
import React, { useState, useEffect, useMemo } from 'react';
import { 
  Calendar as CalendarIcon, Clock, MapPin, 
  ChevronLeft, ChevronRight, BookOpen, User, LogIn, LogOut,
  Edit, Trash2, Loader2, EyeOff, Eye,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Combobox } from '@/components/ui/combobox';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { useRole } from '@/components/RoleProvider';
import { qaService, academicService, timetableService, staffService } from '@/services';
import type { TimetableClass } from '@/services/timetable.service';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

// Generate day names dynamically for better localization support
const getDayNames = (): string[] => {
  const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  // Return weekdays (Monday-Saturday) for timetable
  return days.slice(1);
};

const DAYS = getDayNames();

const QA_DAY_OPTIONS = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
];

function normalizeTimeForEdit(value: string | null | undefined): string {
  if (!value) return '';
  if (value.includes('T')) {
    const d = new Date(value);
    if (!isNaN(d.getTime())) {
      return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    }
  }
  const match = value.match(/^(\d{1,2}):(\d{2})/);
  if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
  return value.slice(0, 5);
}

function resolveClassVenueId(cls: TimetableClass): string {
  return cls.venueId || cls.venue?.id || '';
}

function resolveClassLecturerId(cls: TimetableClass): string {
  return cls.lecturerId || cls.lecturer?.id || '';
}

function normalizeTimetableClassRecord(item: TimetableClass): TimetableClass {
  const venueId = item.venueId || item.venue?.id || null;
  const lecturerId = item.lecturerId || item.lecturer?.id || null;
  return {
    ...item,
    venueId,
    lecturerId,
  };
}

interface TimetableItem {
  id: string;
  day: string | null;
  time: string;
  course: string;
  code: string;
  venue: string;
  lecturer: string;
  type: string;
  isLive?: boolean;
}

export default function Timetable() {
  const { role } = useRole();
  const { user } = useAuth();
  const [viewMode, setViewMode] = useState<'list' | 'week'>('week');
  const [selectedDay, setSelectedDay] = useState('Monday');
  const [timetableData, setTimetableData] = useState<TimetableItem[]>([]);
  const [qaPage, setQaPage] = useState(1);
  const [qaTotal, setQaTotal] = useState(0);
  const qaPageSize = 50;
  const [loading, setLoading] = useState(true);
  const [activeCheckIns, setActiveCheckIns] = useState<Record<string, { checkIn: string; checkOut?: string }>>({});
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedItem, setSelectedItem] = useState<TimetableItem | null>(null);
  const [qaFilters, setQaFilters] = useState({
    day: 'all',
    search: '',
    classStatus: 'active' as 'active' | 'inactive' | 'all',
  });
  const [qaRawClasses, setQaRawClasses] = useState<Record<string, TimetableClass>>({});
  const [qaEditOpen, setQaEditOpen] = useState(false);
  const [qaEditingClass, setQaEditingClass] = useState<TimetableClass | null>(null);
  const [qaEditForm, setQaEditForm] = useState({
    dayOfWeek: 1,
    lecturerId: '',
    venueId: '',
    capacity: 50,
    startTime: '',
    endTime: '',
  });
  const [qaDeleteOpen, setQaDeleteOpen] = useState(false);
  const [qaDeletingClass, setQaDeletingClass] = useState<TimetableClass | null>(null);
  const [qaDeleting, setQaDeleting] = useState(false);
  const [qaDeactivateOpen, setQaDeactivateOpen] = useState(false);
  const [qaDeactivatingClass, setQaDeactivatingClass] = useState<TimetableClass | null>(null);
  const [qaDeactivating, setQaDeactivating] = useState(false);
  const [qaVenues, setQaVenues] = useState<{ id: string; name: string }[]>([]);
  const [qaLecturers, setQaLecturers] = useState<{ id: string; name: string }[]>([]);

  const refreshCheckInState = async () => {
    if (role === 'Lecturer') {
      try {
        const todayRecords = await qaService.getTodayRecords();
        const byClass: Record<string, { checkIn: string; checkOut?: string }> = {};
        todayRecords.forEach((r: any) => {
          if (r.classId && r.checkInTime) {
            byClass[r.classId] = {
              checkIn: r.checkInTime,
              ...(r.checkOutTime ? { checkOut: r.checkOutTime } : {}),
            };
          }
        });
        setActiveCheckIns(byClass);
      } catch (e) {
        console.error('Error refreshing check-in state:', e);
      }
    }
  };

  const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const formatTimeDisplay = (value: string | null | undefined): string => {
    if (!value) return '';
    // If ISO datetime, format to local HH:MM
    if (value.includes('T')) {
      const d = new Date(value);
      if (!isNaN(d.getTime())) {
        return d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
      }
    }
    // Already HH:MM or similar
    return value;
  };

  const isClassLive = (startTime: string, endTime: string, dayOfWeek: number | null): boolean => {
    if (!startTime || !endTime || dayOfWeek === null) return false;
    const now = new Date();
    const currentDay = now.getDay();
    if (currentDay !== dayOfWeek) return false;
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null) return false;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const loadTimetable = async () => {
    try {
      setLoading(true);
      let data: any[] = [];
      if (role === 'Student') {
        data = await timetableService.getMyTimetable();
      } else if (role === 'Lecturer') {
        data = await academicService.getTimetable();
      } else if (role === 'QA') {
        const query: {
          page: number;
          limit: number;
          sortBy: 'day';
          sortOrder: 'asc';
          day?: string;
          classStatus?: 'active' | 'inactive' | 'all';
        } = { page: qaPage, limit: qaPageSize, sortBy: 'day', sortOrder: 'asc', classStatus: qaFilters.classStatus };
        if (qaFilters.day !== 'all') {
          query.day = qaFilters.day.toLowerCase();
        }
        const result = await timetableService.getTimetable(query);
        data = result.data || [];
        setQaTotal(result.total || 0);
        const rawMap: Record<string, TimetableClass> = {};
        (data as TimetableClass[]).forEach((item) => {
          if (item?.id) rawMap[item.id] = normalizeTimetableClassRecord(item);
        });
        setQaRawClasses(rawMap);
      } else {
        data = await academicService.getTimetable();
      }
      const dayNamesFull = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
      const formatted = data.map((item: any) => {
        const fromScheduled = item.courseName !== undefined || item.courseCode !== undefined;
        let dayOfWeek: number | null = null;
        if (fromScheduled) {
          if (item.date) {
            const d = new Date(item.date);
            const dNum = d.getDay();
            dayOfWeek = isNaN(dNum) ? null : dNum;
          }
        } else {
          dayOfWeek = item.dayOfWeek !== null && item.dayOfWeek !== undefined ? item.dayOfWeek : null;
        }
        const dayName =
          dayOfWeek !== null && dayOfWeek !== undefined && dayOfWeek >= 0 && dayOfWeek <= 6
            ? dayNamesFull[dayOfWeek]
            : null;
        const startDisplay = formatTimeDisplay(item.startTime || '');
        const endDisplay = formatTimeDisplay(item.endTime || '');
        const live = isClassLive(startDisplay, endDisplay, dayOfWeek);
        return {
          id: item.id,
          day: dayName,
          dayOfWeek,
          time: startDisplay && endDisplay ? `${startDisplay} - ${endDisplay}` : 'TBA',
          course: fromScheduled ? (item.courseName || 'Unknown Course') : (item.course?.name || 'Unknown Course'),
          code: fromScheduled ? (item.courseCode || '—') : (item.course?.code || '—'),
          venue: fromScheduled ? (item.venue || 'TBA') : (item.venue?.name || 'TBA'),
          lecturer: fromScheduled ? (item.lecturerName || 'TBA') : (item.lecturer?.name || 'TBA'),
          type: 'Lecture',
          startTime: item.startTime,
          endTime: item.endTime,
          isLive: live,
        };
      });
      setTimetableData(formatted);
      if (role === 'Lecturer') {
        try {
          await refreshCheckInState();
        } catch (refreshError) {
          console.error('Error refreshing check-in state:', refreshError);
        }
      }
    } catch (error) {
      console.error('Error loading timetable:', error);
      setTimetableData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadTimetable();
  }, [user, role, qaPage, qaFilters.day, qaFilters.classStatus]);

  useEffect(() => {
    if (role === 'QA') {
      const now = new Date();
      const dayIndex = now.getDay(); // 0-6
      const mondayBasedIndex = dayIndex === 0 ? 6 : dayIndex - 1; // 0=Mon,...,6=Sun
      const todayName = DAYS[mondayBasedIndex] ?? 'Monday';
      setViewMode('list');
      setSelectedDay(todayName);
    }
  }, [role]);

  useEffect(() => {
    if (role !== 'QA') return;
    const loadQaEditOptions = async () => {
      try {
        const lecturerRes = await staffService.getLecturers({ limit: 5000 });
        setQaLecturers(
          (lecturerRes.data || []).map((l) => ({
            id: l.id,
            name: `${l.firstName || ''} ${l.lastName || ''}`.trim() || l.email || l.id,
          }))
        );
      } catch {
        setQaLecturers([]);
      }
      try {
        const allVenues: { id: string; name: string }[] = [];
        let venuePage = 1;
        while (true) {
          const res = await academicService.getVenues({ page: venuePage, limit: 100 });
          const arr = res?.data ?? [];
          allVenues.push(...arr.map((v) => ({ id: v.id, name: v.name })));
          const total = res?.total ?? allVenues.length;
          if (arr.length === 0 || allVenues.length >= total) break;
          venuePage += 1;
        }
        setQaVenues(allVenues);
      } catch {
        setQaVenues([]);
      }
    };
    loadQaEditOptions();
  }, [role]);

  const openQaEdit = (classId: string) => {
    const cls = qaRawClasses[classId];
    if (!cls) {
      toast.error('Could not load class details for editing.');
      return;
    }
    let venueId = resolveClassVenueId(cls);
    let lecturerId = resolveClassLecturerId(cls);
    if (!venueId && cls.venue?.name) {
      const venueByName = qaVenues.find(
        (v) => v.name.trim().toLowerCase() === cls.venue!.name.trim().toLowerCase()
      );
      if (venueByName) venueId = venueByName.id;
    }
    if (!lecturerId && cls.lecturer?.name) {
      const lecturerByName = qaLecturers.find(
        (l) => l.name.trim().toLowerCase() === cls.lecturer!.name.trim().toLowerCase()
      );
      if (lecturerByName) lecturerId = lecturerByName.id;
    }
    if (venueId && cls.venue?.name) {
      setQaVenues((prev) =>
        prev.some((v) => v.id === venueId) ? prev : [...prev, { id: venueId, name: cls.venue!.name }]
      );
    }
    if (lecturerId && cls.lecturer?.name) {
      setQaLecturers((prev) =>
        prev.some((l) => l.id === lecturerId) ? prev : [...prev, { id: lecturerId, name: cls.lecturer!.name }]
      );
    }
    setQaEditingClass(cls);
    setQaEditForm({
      dayOfWeek: cls.dayOfWeek ?? 1,
      lecturerId,
      venueId,
      capacity: cls.capacity ?? 50,
      startTime: normalizeTimeForEdit(cls.startTime),
      endTime: normalizeTimeForEdit(cls.endTime),
    });
    setQaEditOpen(true);
  };

  const qaVenueComboboxOptions = useMemo(() => {
    const options = [
      { value: 'none', label: 'None' },
      ...qaVenues.map((v) => ({ value: v.id, label: v.name })),
    ];
    const currentId = qaEditForm.venueId || (qaEditingClass ? resolveClassVenueId(qaEditingClass) : '');
    const currentLabel = qaEditingClass?.venue?.name;
    if (currentId && currentLabel && !options.some((o) => o.value === currentId)) {
      options.splice(1, 0, { value: currentId, label: currentLabel });
    }
    return options;
  }, [qaVenues, qaEditForm.venueId, qaEditingClass]);

  const qaLecturerComboboxOptions = useMemo(() => {
    const options = [
      { value: 'none', label: 'None' },
      ...qaLecturers.map((l) => ({ value: l.id, label: l.name })),
    ];
    const currentId = qaEditForm.lecturerId || (qaEditingClass ? resolveClassLecturerId(qaEditingClass) : '');
    const currentLabel = qaEditingClass?.lecturer?.name;
    if (currentId && currentLabel && !options.some((o) => o.value === currentId)) {
      options.splice(1, 0, { value: currentId, label: currentLabel });
    }
    return options;
  }, [qaLecturers, qaEditForm.lecturerId, qaEditingClass]);

  const qaVenueComboboxValue = qaEditForm.venueId || 'none';
  const qaLecturerComboboxValue = qaEditForm.lecturerId || 'none';

  const handleQaSaveEdit = async () => {
    if (!qaEditingClass) return;
    try {
      await timetableService.updateClass(qaEditingClass.id, {
        dayOfWeek: qaEditForm.dayOfWeek,
        lecturerId: qaEditForm.lecturerId || null,
        venueId: qaEditForm.venueId || null,
        capacity: parseInt(String(qaEditForm.capacity), 10) || 50,
        startTime: qaEditForm.startTime || undefined,
        endTime: qaEditForm.endTime || undefined,
      });
      toast.success('Session updated');
      setQaEditOpen(false);
      setQaEditingClass(null);
      await loadTimetable();
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update session');
    }
  };

  const openQaDelete = (classId: string) => {
    const cls = qaRawClasses[classId];
    if (!cls) {
      toast.error('Could not load class details for deletion.');
      return;
    }
    setQaDeletingClass(cls);
    setQaDeleteOpen(true);
  };

  const handleQaConfirmDelete = async () => {
    if (!qaDeletingClass) return;
    setQaDeleting(true);
    try {
      await timetableService.deleteClass(qaDeletingClass.id);
      toast.success('Session removed from timetable');
      setQaDeleteOpen(false);
      setQaDeletingClass(null);
      await loadTimetable();
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (error: any) {
      const code = error?.response?.data?.code;
      const msg = error?.response?.data?.message || error?.message || 'Failed to delete session';
      if (code === 'CLASS_HAS_ENROLLMENTS' && qaDeletingClass) {
        setQaDeleteOpen(false);
        setQaDeactivatingClass(qaDeletingClass);
        setQaDeactivateOpen(true);
        toast.error(msg);
      } else {
        toast.error(msg);
      }
    } finally {
      setQaDeleting(false);
    }
  };

  const openQaDeactivate = (cls: TimetableClass) => {
    setQaDeactivatingClass(cls);
    setQaDeactivateOpen(true);
  };

  const handleQaConfirmDeactivate = async () => {
    if (!qaDeactivatingClass) return;
    setQaDeactivating(true);
    try {
      await timetableService.deactivateClass(qaDeactivatingClass.id);
      toast.success('Class deactivated');
      setQaDeactivateOpen(false);
      setQaDeactivatingClass(null);
      setQaDeleteOpen(false);
      setQaDeletingClass(null);
      await loadTimetable();
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to deactivate');
    } finally {
      setQaDeactivating(false);
    }
  };

  const handleQaActivate = async (cls: TimetableClass) => {
    try {
      await timetableService.activateClass(cls.id);
      toast.success('Class activated');
      await loadTimetable();
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (error: any) {
      toast.error(error?.response?.data?.message || error?.message || 'Failed to activate');
    }
  };

  useEffect(() => {
    if (role !== 'Lecturer') return;
    
    const handleCheckInOutChange = () => {
      refreshCheckInState();
    };
    
    const handleFocus = () => {
      refreshCheckInState();
    };
    
    window.addEventListener('check-in-out-changed', handleCheckInOutChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('check-in-out-changed', handleCheckInOutChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [role]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const handleCheckIn = async (classId: string) => {
    try {
      let lat = 0;
      let lng = 0;
      try {
        const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
          navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
        );
        lat = pos.coords.latitude;
        lng = pos.coords.longitude;
      } catch (_) {}
      const result = await qaService.checkIn(classId, lat, lng);
      const rec = result.record;
      const checkInStr = rec?.checkInTime || formatTime(new Date());
      setActiveCheckIns(prev => ({
        ...prev,
        [classId]: { checkIn: checkInStr, ...(rec?.checkOutTime ? { checkOut: rec.checkOutTime } : {}) },
      }));
      window.dispatchEvent(new CustomEvent('check-in-out-changed', { detail: { classId, action: 'check-in' } }));
      if (result.alreadyCheckedIn) {
        toast.info('You are already checked in for this class.');
      } else {
        toast.success('Check-in recorded');
      }
    } catch (error: any) {
      const code = (error as any)?.code;
      if (code === 'ALREADY_CHECKED_IN') {
        const record = await qaService.getTodayRecordForClass(classId);
        if (record) {
          setActiveCheckIns(prev => ({
            ...prev,
            [classId]: {
              checkIn: record.checkInTime || '',
              ...(record.checkOutTime ? { checkOut: record.checkOutTime } : {}),
            },
          }));
        }
        toast.info('You are already checked in for this class.');
      } else {
        toast.error(error?.message || 'Check-in failed');
      }
    }
  };

  const handleCheckOut = async (classId: string) => {
    try {
      const record = await qaService.checkOut(classId);
      const checkOutStr = (record as any)?.checkOutTime || formatTime(new Date());
      setActiveCheckIns(prev => ({
        ...prev,
        [classId]: { ...prev[classId], checkIn: prev[classId]?.checkIn || '', checkOut: checkOutStr },
      }));
      window.dispatchEvent(new CustomEvent('check-in-out-changed', { detail: { classId, action: 'check-out' } }));
      toast.success('Check-out recorded');
    } catch (error: any) {
      const code = (error as any)?.code;
      const record = await qaService.getTodayRecordForClass(classId);
      if (record) {
        setActiveCheckIns(prev => ({
          ...prev,
          [classId]: {
            checkIn: record.checkInTime || prev[classId]?.checkIn || '',
            checkOut: record.checkOutTime || prev[classId]?.checkOut,
          },
        }));
      }
      if (code === 'NO_CHECK_IN') {
        toast.warning('No active check-in found. Check in first, or you may have already checked out.');
      } else if (code === 'ALREADY_CHECKED_OUT') {
        toast.info('You have already checked out for this class today.');
      } else {
        toast.error(error?.message || 'Check-out failed');
      }
    }
  };

  // Calculate duration
  const calculateDuration = (start: string, end: string): string => {
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 0;
    };

    const startMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    const diff = endMinutes - startMinutes;
    
    if (diff < 0) return '00:00:00';
    
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const filteredTimetable = viewMode === 'list' 
    ? timetableData.filter(t => t.day === selectedDay)
    : timetableData;

  const qaFilteredTimetable = timetableData.filter((t) => {
    if (qaFilters.search.trim()) {
      const q = qaFilters.search.toLowerCase();
      if (
        !(
          (t.course || '').toLowerCase().includes(q) ||
          (t.code || '').toLowerCase().includes(q) ||
          (t.lecturer || '').toLowerCase().includes(q) ||
          (t.venue || '').toLowerCase().includes(q)
        )
      ) {
        return false;
      }
    }
    return true;
  });

  if (loading) {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading timetable...</p>
        </div>
      </div>
    );
  }

  if ((role as string) === 'QA') {
    return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              University Timetable
            </h1>
            <p className="text-gray-500">
              View and manage timetable sessions. Edit to move a class to another day or time; delete to remove unwanted slots.
            </p>
          </div>
        </div>

        <Card>
          <CardHeader className="pb-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div>
                <CardTitle className="text-base">Timetable classes</CardTitle>
                <CardDescription>
                  Showing {qaFilteredTimetable.length} class{qaFilteredTimetable.length === 1 ? '' : 'es'}
                  {qaFilters.day !== 'all' ? ` on ${qaFilters.day}` : ''}
                  {qaFilters.search.trim() ? ' (search applied on this page)' : ''}
                  {' · '}
                  {qaTotal} total matching{qaFilters.day !== 'all' ? ' this day' : ''}
                </CardDescription>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 w-full lg:w-auto">
                <div className="flex items-center gap-2 sm:w-auto">
                  <Label className="text-sm text-muted-foreground">Day</Label>
                  <Select
                    value={qaFilters.day}
                    onValueChange={(v) => {
                      setQaPage(1);
                      setQaFilters((f) => ({ ...f, day: v }));
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="All days" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All days</SelectItem>
                      {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'].map((d) => (
                        <SelectItem key={d} value={d}>{d}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Select
                    value={qaFilters.classStatus}
                    onValueChange={(v) => {
                      setQaPage(1);
                      setQaFilters((f) => ({ ...f, classStatus: v as 'active' | 'inactive' | 'all' }));
                    }}
                  >
                    <SelectTrigger className="w-[150px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="all">All</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Input
                    placeholder="Search course, code, lecturer or venue"
                    value={qaFilters.search}
                    onChange={(e) => setQaFilters((f) => ({ ...f, search: e.target.value }))}
                    className="w-full"
                  />
                </div>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {qaFilteredTimetable.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                <CalendarIcon className="mx-auto h-10 w-10 mb-2 text-gray-300" />
                <p>No classes match the current filters.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>DAY</TableHead>
                      <TableHead>TIME</TableHead>
                      <TableHead>COURSE</TableHead>
                      <TableHead>CODE</TableHead>
                      <TableHead>VENUE</TableHead>
                      <TableHead>LECTURER</TableHead>
                      <TableHead className="text-right w-28">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {qaFilteredTimetable.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell>{t.day || '—'}</TableCell>
                        <TableCell>{t.time}</TableCell>
                        <TableCell className="font-medium">{t.course}</TableCell>
                        <TableCell>{t.code}</TableCell>
                        <TableCell>{t.venue}</TableCell>
                        <TableCell>{t.lecturer}</TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => openQaEdit(t.id)}
                              aria-label={`Edit ${t.course}`}
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            {qaRawClasses[t.id]?.isActive === false ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="text-[#015F2B]"
                                onClick={() => qaRawClasses[t.id] && handleQaActivate(qaRawClasses[t.id])}
                                aria-label={`Activate ${t.course}`}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            ) : (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                onClick={() => qaRawClasses[t.id] && openQaDeactivate(qaRawClasses[t.id])}
                                aria-label={`Deactivate ${t.course}`}
                              >
                                <EyeOff className="h-4 w-4 text-amber-700" />
                              </Button>
                            )}
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              className="text-red-600 hover:text-red-700"
                              onClick={() => openQaDelete(t.id)}
                              aria-label={`Delete ${t.course}`}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            {qaTotal > qaPageSize && (
              <div className="flex justify-between items-center mt-4 text-sm text-muted-foreground">
                <span>
                  Page {qaPage} of {Math.max(1, Math.ceil(qaTotal / qaPageSize))}
                </span>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qaPage === 1}
                    onClick={() => setQaPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={qaPage >= Math.ceil(qaTotal / qaPageSize)}
                    onClick={() => setQaPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Dialog open={qaDeleteOpen} onOpenChange={setQaDeleteOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Delete session</DialogTitle>
              <DialogDescription>
                Remove &quot;{qaDeletingClass?.name || qaDeletingClass?.course?.name}&quot; from the timetable? This cannot be undone.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQaDeleteOpen(false)} disabled={qaDeleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={handleQaConfirmDelete} disabled={qaDeleting}>
                {qaDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Delete
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={qaDeactivateOpen} onOpenChange={setQaDeactivateOpen}>
          <DialogContent className="w-[95vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Deactivate Class</DialogTitle>
              <DialogDescription>
                Deactivate &quot;{qaDeactivatingClass?.name || qaDeactivatingClass?.course?.name}&quot;? It will be hidden from schedules and class lists but kept for records.
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQaDeactivateOpen(false)} disabled={qaDeactivating}>
                Cancel
              </Button>
              <Button
                className="bg-amber-700 hover:bg-amber-800 text-white"
                onClick={handleQaConfirmDeactivate}
                disabled={qaDeactivating}
              >
                {qaDeactivating ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Deactivate
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={qaEditOpen} onOpenChange={setQaEditOpen}>
          <DialogContent className="w-[96vw] max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Edit session</DialogTitle>
              <DialogDescription>
                {qaEditingClass?.course?.name || qaEditingClass?.name} ({qaEditingClass?.course?.code})
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label>Day</Label>
                <Select
                  value={String(qaEditForm.dayOfWeek)}
                  onValueChange={(v) => setQaEditForm((f) => ({ ...f, dayOfWeek: parseInt(v, 10) }))}
                >
                  <SelectTrigger><SelectValue placeholder="Day" /></SelectTrigger>
                  <SelectContent>
                    {QA_DAY_OPTIONS.map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Lecturer</Label>
                <Combobox
                  options={qaLecturerComboboxOptions}
                  value={qaLecturerComboboxValue}
                  selectedLabel={
                    qaLecturerComboboxValue === 'none' ? undefined : qaEditingClass?.lecturer?.name
                  }
                  onValueChange={(v) => setQaEditForm((f) => ({ ...f, lecturerId: v === 'none' ? '' : v }))}
                  placeholder="Select lecturer"
                  searchPlaceholder="Search lecturers..."
                  emptyText="No lecturer found."
                  initialDisplayCount={10}
                />
              </div>
              <div>
                <Label>Venue</Label>
                <Combobox
                  options={qaVenueComboboxOptions}
                  value={qaVenueComboboxValue}
                  selectedLabel={
                    qaVenueComboboxValue === 'none' ? undefined : qaEditingClass?.venue?.name
                  }
                  onValueChange={(v) => setQaEditForm((f) => ({ ...f, venueId: v === 'none' ? '' : v }))}
                  placeholder="Select venue"
                  searchPlaceholder="Search venues..."
                  emptyText="No venue found."
                  initialDisplayCount={10}
                />
              </div>
              <div>
                <Label>Start time (HH:MM)</Label>
                <Input
                  value={qaEditForm.startTime}
                  onChange={(e) => setQaEditForm((f) => ({ ...f, startTime: e.target.value }))}
                  placeholder="08:00"
                />
              </div>
              <div>
                <Label>End time (HH:MM)</Label>
                <Input
                  value={qaEditForm.endTime}
                  onChange={(e) => setQaEditForm((f) => ({ ...f, endTime: e.target.value }))}
                  placeholder="10:00"
                />
              </div>
              <div>
                <Label>Capacity</Label>
                <Input
                  type="number"
                  value={qaEditForm.capacity}
                  onChange={(e) =>
                    setQaEditForm((f) => ({ ...f, capacity: parseInt(e.target.value, 10) || 50 }))
                  }
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setQaEditOpen(false)}>Cancel</Button>
              <Button onClick={handleQaSaveEdit} className="bg-[#015F2B] hover:bg-[#014022]">
                Save changes
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">
              {role === 'QA' ? 'University Timetable' : 'My Timetable'}
            </h1>
            <p className="text-gray-500">
              {role === 'QA'
                ? "View all classes scheduled for today across the university."
                : 'View your weekly class schedule and venues.'}
            </p>
          </div>
          <div className="flex bg-gray-100 p-1 rounded-lg">
            <Button 
              variant={viewMode === 'week' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('week')}
              className={viewMode === 'week' ? 'bg-[#015F2B] hover:bg-[#014022]' : ''}
            >
              Weekly View
            </Button>
            <Button 
              variant={viewMode === 'list' ? 'default' : 'ghost'} 
              size="sm" 
              onClick={() => setViewMode('list')}
              className={viewMode === 'list' ? 'bg-[#015F2B] hover:bg-[#014022]' : ''}
            >
              Daily List
            </Button>
          </div>
        </div>

        {viewMode === 'list' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
              <Button variant="ghost" size="icon" onClick={() => {
                const prevIndex = DAYS.indexOf(selectedDay) - 1;
                if (prevIndex >= 0) setSelectedDay(DAYS[prevIndex]);
              }}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <h2 className="text-lg font-semibold text-[#015F2B]">{selectedDay}</h2>
              <Button variant="ghost" size="icon" onClick={() => {
                const nextIndex = DAYS.indexOf(selectedDay) + 1;
                if (nextIndex < DAYS.length) setSelectedDay(DAYS[nextIndex]);
              }}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>

            <div className="grid gap-4">
              {filteredTimetable.length > 0 ? (
                filteredTimetable.map((item) => (
                  <TimetableCard 
                    key={item.id} 
                    item={item}
                    onCheckIn={handleCheckIn}
                    onCheckOut={handleCheckOut}
                    onOpenDetails={(i) => { setSelectedItem(i); setDetailsOpen(true); }}
                    checkInData={activeCheckIns[item.id]}
                  />
                ))
              ) : (
                <div className="text-center py-12 text-gray-500 bg-gray-50 rounded-lg border border-dashed">
                  <CalendarIcon className="mx-auto h-12 w-12 text-gray-300 mb-2" />
                  <p>No classes scheduled for {selectedDay}.</p>
                </div>
              )}
            </div>
          </div>
        )}

        {viewMode === 'week' && (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5 gap-4">
            {['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'].map(day => {
              const dayClasses = timetableData.filter(t => t.day === day);
              return (
                <Card key={day} className={`h-full border-t-4 ${dayClasses.length > 0 ? 'border-t-[#015F2B]' : 'border-t-gray-200'}`}>
                  <CardHeader className="pb-2 bg-gray-50/50">
                    <CardTitle className="text-sm font-bold text-gray-700 uppercase tracking-wider">{day}</CardTitle>
                  </CardHeader>
                  <CardContent className="pt-4 space-y-3">
                    {dayClasses.length > 0 ? (
                      dayClasses.map(item => {
                        const checkInData = activeCheckIns[item.id];
                        const hasCheckedIn = !!checkInData?.checkIn;
                        const hasCheckedOut = !!checkInData?.checkOut;
                        const isLecturer = role === 'Lecturer';
                        
                        return (
                          <div key={item.id} className={`p-3 bg-white rounded border shadow-sm hover:shadow-md transition-shadow cursor-pointer group ${item.isLive ? 'border-green-400 bg-green-50/30' : ''}`}>
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-bold text-[#F6A000]">{item.time}</span>
                              <div className="flex gap-1">
                                {item.isLive && (
                                  <Badge className="bg-green-500 text-white hover:bg-green-600 border-green-600 animate-pulse text-[10px] px-1 h-5">
                                    Live
                                  </Badge>
                                )}
                                <Badge variant="secondary" className="text-[10px] px-1 h-5">{item.type}</Badge>
                              </div>
                            </div>
                            <h4 className="font-semibold text-sm text-[#015F2B] leading-tight group-hover:underline">{item.course}</h4>
                            <p className="text-xs text-gray-500 mb-2">{item.code}</p>
                            <div className="flex items-center gap-1 text-xs text-gray-600 font-medium">
                              <MapPin size={10} /> {item.venue}
                            </div>
                            <div className="flex items-center gap-1 text-xs text-gray-600 mt-1">
                              <User size={10} /> {item.lecturer}
                            </div>
                            {isLecturer && (
                              <div className="mt-2 pt-2 border-t border-gray-200">
                                {!hasCheckedIn ? (
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    className="w-full bg-[#015F2B] hover:bg-[#014022] h-7 text-xs"
                                    onClick={() => handleCheckIn(item.id)}
                                  >
                                    <LogIn className="h-3 w-3 mr-1" />
                                    Check In
                                  </Button>
                                ) : !hasCheckedOut ? (
                                  <Button 
                                    size="sm" 
                                    variant="default"
                                    className="w-full bg-blue-600 hover:bg-blue-700 h-7 text-xs"
                                    onClick={() => handleCheckOut(item.id)}
                                  >
                                    <LogOut className="h-3 w-3 mr-1" />
                                    Check Out
                                  </Button>
                                ) : (
                                  <div className="text-xs">
                                    <div className="text-green-600 flex items-center gap-1 mb-1">
                                      <LogIn className="h-3 w-3" />
                                      {checkInData.checkIn}
                                    </div>
                                    <div className="text-blue-600 flex items-center gap-1">
                                      <LogOut className="h-3 w-3" />
                                      {checkInData.checkOut}
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
                          </div>
                        );
                      })
                    ) : (
                      <div className="text-xs text-gray-400 text-center py-4 italic">Free Day</div>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Timetable Item Details</DialogTitle>
              <DialogDescription>
                Complete information for this scheduled class
              </DialogDescription>
            </DialogHeader>
            {selectedItem && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Course</Label>
                    <p className="text-lg font-semibold text-[#015F2B]">{selectedItem.course}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Course Code</Label>
                    <p className="text-sm font-medium">{selectedItem.code}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Day</Label>
                    <p className="text-sm font-medium">{selectedItem.day || 'TBA'}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Time</Label>
                    <p className="text-sm font-medium">{selectedItem.time}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Venue</Label>
                    <p className="text-sm font-medium">{selectedItem.venue}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Lecturer</Label>
                    <p className="text-sm font-medium">{selectedItem.lecturer}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Type</Label>
                    <Badge variant="secondary">{selectedItem.type}</Badge>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}

function TimetableCard({ item, onCheckIn, onCheckOut, onOpenDetails, checkInData }: { 
  item: TimetableItem; 
  onCheckIn: (id: string) => void;
  onCheckOut: (id: string) => void;
  onOpenDetails?: (item: TimetableItem) => void;
  checkInData?: { checkIn: string; checkOut?: string };
}) {
  const { role } = useRole();
  const isLecturer = role === 'Lecturer';
  const hasCheckedIn = !!checkInData?.checkIn;
  const hasCheckedOut = !!checkInData?.checkOut;

  const isLive = item.isLive ?? false;

  return (
    <Card className={`hover:shadow-md transition-shadow border-l-4 ${isLive ? 'border-l-green-500 bg-green-50/20' : 'border-l-[#015F2B]'}`}>
      <CardContent className="p-0">
        <div className="flex flex-col md:flex-row">
          <div className="p-4 md:w-48 bg-gray-50 flex flex-col justify-center border-b md:border-b-0 md:border-r">
            <div className="flex items-center gap-2 text-[#F6A000] font-bold mb-1">
              <Clock size={16} />
              <span>{item.time}</span>
            </div>
            <div className="flex gap-1 mb-1">
              {isLive && (
                <Badge className="bg-green-500 text-white hover:bg-green-600 border-green-600 animate-pulse text-[10px] px-1.5 py-0">
                  Live
                </Badge>
              )}
              <div className="text-sm text-gray-500 font-medium bg-white px-2 py-1 rounded inline-block self-start border">
                {item.type}
              </div>
            </div>
            {isLecturer && hasCheckedIn && (
              <div className="mt-2 space-y-1">
                <div className="text-xs text-green-600 flex items-center gap-1">
                  <LogIn className="h-3 w-3" />
                  {checkInData.checkIn}
                </div>
                {hasCheckedOut && (
                  <div className="text-xs text-blue-600 flex items-center gap-1">
                    <LogOut className="h-3 w-3" />
                    {checkInData.checkOut}
                  </div>
                )}
              </div>
            )}
          </div>
          <div className="p-4 flex-1">
            <div className="flex justify-between items-start">
              <div>
                <h3 className="font-bold text-lg text-gray-900 mb-1">{item.course}</h3>
                <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                  <span className="flex items-center gap-1"><BookOpen size={14} /> {item.code}</span>
                  <span className="flex items-center gap-1 font-medium"><MapPin size={14} /> {item.venue}</span>
                  <span className="flex items-center gap-1"><User size={14} /> {item.lecturer}</span>
                </div>
              </div>
              <div className="flex gap-2">
                {isLecturer && (
                  <div className="flex gap-1">
                    {!hasCheckedIn ? (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-[#015F2B] hover:bg-[#014022]"
                        onClick={() => onCheckIn(item.id)}
                      >
                        <LogIn className="h-3 w-3 mr-1" />
                        Check In
                      </Button>
                    ) : !hasCheckedOut ? (
                      <Button 
                        size="sm" 
                        variant="default"
                        className="bg-blue-600 hover:bg-blue-700"
                        onClick={() => onCheckOut(item.id)}
                      >
                        <LogOut className="h-3 w-3 mr-1" />
                        Check Out
                      </Button>
                    ) : (
                      <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                        Completed
                      </Badge>
                    )}
                  </div>
                )}
                {onOpenDetails && (
                <Button 
                  size="sm" 
                  variant="outline" 
                  className="hidden md:flex"
                  onClick={() => onOpenDetails(item)}
                >
                  Details
                </Button>
                )}
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
