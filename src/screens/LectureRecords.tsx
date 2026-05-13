/**
 * Lecture Records Screen
 * Matches exact format of 3.csv: DATE, LECTURER'S NAME, CLASS, COURSE UNIT, 
 * TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  Search, Filter, Plus, MoreHorizontal, 
  Calendar as CalendarIcon, Clock, BookOpen, 
  Trash2, Edit, CheckCircle, XCircle, Download, Upload, LogIn, LogOut,
  ChevronLeft, ChevronRight, UserCheck, Loader2, CalendarClock, Eye
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Combobox } from '@/components/ui/combobox';
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { qaService } from '@/services/qa.service';
import { academicService, staffService, enrollmentService, studentService } from '@/services';
import { exportLectureRecordsToCSV, importLectureRecordsFromCSV, downloadLectureRecordsImportTemplateExcel, LECTURE_RECORDS_IMPORT_CSV_HEADER } from '@/utils/excel';
import { toast } from 'sonner';
import type { QALectureRecord } from '@/types/qa';
import { useAuth } from '@/contexts/AuthContext';

const COMMENT_FILTER_LABELS: Record<string, string> = {
  PENDING: 'Pending (awaiting QA)',
  TAUGHT: 'TAUGHT',
  UNTAUGHT: 'UNTAUGHT',
  CANCELLED: 'CANCELLED',
  SUBSTITUTED: 'SUBSTITUTED',
  COMPENSATION: 'COMPENSATION',
  MEETING: 'MEETING',
  SDL: 'SDL',
  STUDENTS_ORIENTATION: 'STUDENTS ORIENTATION',
};

export default function LectureRecords() {
  const { user } = useAuth();
  const canSeedFromTimetable = useMemo(
    () => (user?.permissions ?? []).includes('qa.seed_timetable'),
    [user?.permissions]
  );
  const [records, setRecords] = useState<QALectureRecord[]>([]);
  const [totalRecords, setTotalRecords] = useState(0);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [commentFilter, setCommentFilter] = useState('All');
  const [lecturerFilter, setLecturerFilter] = useState('All');
  const [schoolFilter, setSchoolFilter] = useState('All');
  const [classFilter, setClassFilter] = useState('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [attendanceStatusFilter, setAttendanceStatusFilter] = useState('All');
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [currentRecordId, setCurrentRecordId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [schools, setSchools] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('');
  const [classes, setClasses] = useState<string[]>([]);
  const [importOpen, setImportOpen] = useState(false);
  const lectureImportFileRef = useRef<HTMLInputElement>(null);
  const [allLecturers, setAllLecturers] = useState<string[]>([]);
  const [allClasses, setAllClasses] = useState<string[]>([]);
  const [selectedLecturerName, setSelectedLecturerName] = useState('');
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const commentOptions = [
    'PENDING',
    'TAUGHT',
    'UNTAUGHT',
    'CANCELLED',
    'SUBSTITUTED',
    'COMPENSATION',
    'MEETING',
    'SDL',
    'STUDENTS_ORIENTATION',
  ];
  const [timetableSeedDate, setTimetableSeedDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [timetableSeedLoading, setTimetableSeedLoading] = useState(false);
  const [sessionAttendanceOpen, setSessionAttendanceOpen] = useState(false);
  const [sessionRecord, setSessionRecord] = useState<{ classId: string; date: string; className: string } | null>(null);
  const [sessionEnrollments, setSessionEnrollments] = useState<Array<{ studentId: string; student?: { id: string; firstName: string; lastName: string; studentNumber: string } }>>([]);
  const [sessionStatusMap, setSessionStatusMap] = useState<Record<string, string>>({});
  const [sessionLoading, setSessionLoading] = useState(false);
  const [sessionSaving, setSessionSaving] = useState(false);
  const [selectedClassName, setSelectedClassName] = useState('');
  const [lecturerOptions, setLecturerOptions] = useState<{ id: string; name: string; departmentName?: string }[]>([]);
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [selectedDepartmentName, setSelectedDepartmentName] = useState('');
  const [departments, setDepartments] = useState<string[]>([]);
  const [lecturerAssignments, setLecturerAssignments] = useState<{
    lecturerId: string;
    departments: Array<{ id: string; name: string; classes: Array<{ id: string; label: string; className: string; courseUnit: string }> }>;
  } | null>(null);
  const [selectedDepartmentId, setSelectedDepartmentId] = useState('');
  const [selectedClassId, setSelectedClassId] = useState('');
  const [summary, setSummary] = useState<{
    totalRecords: number;
    taughtCount: number;
    untaughtCount: number;
    pendingCount: number;
    cancelledCount: number;
    onTimeCount: number;
    onTimeRatePct: number;
    hasFilters: boolean;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailsRecord, setDetailsRecord] = useState<QALectureRecord | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    loadSchools();
    loadLecturers();
    loadAllClasses();
  }, []);

  useEffect(() => {
    setPage(1);
  }, [debouncedSearchTerm, commentFilter, lecturerFilter, schoolFilter, classFilter, dateFrom, dateTo, statusFilter, attendanceStatusFilter]);

  useEffect(() => {
    loadRecords();
  }, [debouncedSearchTerm, commentFilter, lecturerFilter, schoolFilter, classFilter, dateFrom, dateTo, statusFilter, attendanceStatusFilter, page]);

  useEffect(() => {
    loadSummary();
  }, [debouncedSearchTerm, commentFilter, lecturerFilter, schoolFilter, classFilter, dateFrom, dateTo, statusFilter, attendanceStatusFilter]);

  useEffect(() => {
    if (sessionAttendanceOpen && sessionRecord) {
      setSessionLoading(true);
      Promise.all([
        enrollmentService.getClassEnrollments(sessionRecord.classId, { roster: true }),
        studentService.getSessionAttendance(sessionRecord.classId, sessionRecord.date),
      ])
        .then(([list, existing]) => {
          const roster = (list as any[]) || [];
          setSessionEnrollments(roster);
          const map: Record<string, string> = {};
          (existing || []).forEach((a: any) => {
            if (a?.studentId && a?.status) {
              map[a.studentId] = a.status;
            }
          });
          setSessionStatusMap(map);
        })
        .catch(() => {
          toast.error("Couldn't load the class list. Please try again.");
          setSessionEnrollments([]);
          setSessionStatusMap({});
        })
        .finally(() => setSessionLoading(false));
    }
  }, [sessionAttendanceOpen, sessionRecord]);

  const openSessionAttendance = (record: QALectureRecord & { classId?: string | null }) => {
    const classId = (record as any).classId;
    if (!classId) {
      toast.error('No class is linked to this lecture, so attendance cannot be recorded.');
      return;
    }
    const date = typeof record.date === 'string' 
      ? record.date.slice(0, 10) 
      : new Date(record.date).toISOString().slice(0, 10);
    const className = record.class || (record as any).className || 'Class';
    setSessionRecord({ classId, date, className });
    setSessionStatusMap({});
    setSessionAttendanceOpen(true);
  };

  const setSessionStudentStatus = (studentId: string, status: string) => {
    setSessionStatusMap(prev => ({ ...prev, [studentId]: status }));
  };

  const setAllSessionStatus = (status: string) => {
    if (sessionEnrollments.length === 0) return;
    const next: Record<string, string> = {};
    sessionEnrollments.forEach((enr: any) => {
      if (enr?.studentId) next[enr.studentId] = status;
    });
    setSessionStatusMap(next);
  };

  const handleSessionAttendanceSubmit = async () => {
    if (!sessionRecord || sessionEnrollments.length === 0) return;
    setSessionSaving(true);
    try {
      const payload = sessionEnrollments.map(e => ({
        studentId: e.studentId,
        status: sessionStatusMap[e.studentId] || 'Absent',
      }));
      const result = await studentService.createSessionAttendance({
        classId: sessionRecord.classId,
        date: sessionRecord.date,
        records: payload,
      });
      const saved = result?.count ?? 0;
      const skipped = Math.max(0, payload.length - saved);
      if (skipped > 0) {
        toast.success('Attendance saved.', {
          description: `${saved} student${saved === 1 ? '' : 's'} recorded · ${skipped} not in this class.`,
        });
      } else {
        toast.success('Attendance saved.', {
          description: `${saved} student${saved === 1 ? '' : 's'} recorded.`,
        });
      }
      setSessionAttendanceOpen(false);
      setSessionRecord(null);
      setSessionEnrollments([]);
      setSessionStatusMap({});
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save attendance. Please try again.");
    } finally {
      setSessionSaving(false);
    }
  };

  const loadLecturers = async () => {
    try {
      const response = await staffService.getLecturers({ limit: 5000 });
      const lecturerNames = response.data.map((lecturer: any) =>
        `${lecturer.firstName} ${lecturer.lastName}`.trim()
      );
      setAllLecturers([...new Set(lecturerNames)].sort());
      const options = response.data.map((lecturer: any) => ({
        id: lecturer.id,
        name: `${lecturer.firstName} ${lecturer.lastName}`.trim(),
        departmentName: lecturer.departmentName || lecturer.department?.name,
      }));
      setLecturerOptions(options);
      const deptNames = options
        .map((o) => o.departmentName)
        .filter((n): n is string => !!n);
      setDepartments([...new Set(deptNames)].sort());
    } catch (error) {
      console.error('Error loading lecturers:', error);
      setAllLecturers([]);
      setLecturerOptions([]);
      setDepartments([]);
    }
  };

  const normalizeName = (value?: string | null) =>
    (value || '').toLowerCase().replace(/\s+/g, ' ').trim();

  const loadAllClasses = async () => {
    try {
      const classList = await qaService.getAllClasses();
      setAllClasses(classList);
    } catch (error) {
      console.error('Error loading all classes:', error);
      setAllClasses([]);
    }
  };


  // Load classes when school changes
  useEffect(() => {
    if (selectedSchool) {
      loadClasses(selectedSchool);
    } else {
      setClasses([]);
    }
  }, [selectedSchool]);

  const loadSchools = async () => {
    try {
      const schoolList = await qaService.getSchools();
      setSchools(schoolList);
    } catch (error) {
      console.error('Error loading schools:', error);
    }
  };

  const loadClasses = async (school: string) => {
    try {
      const classList = await qaService.getClassesBySchool(school);
      setClasses(classList);
    } catch (error) {
      console.error('Error loading classes:', error);
    }
  };

  const buildBaseFilter = () => {
    const filter: any = {};
    if (schoolFilter !== 'All') filter.school = schoolFilter;
    if (lecturerFilter !== 'All') {
      filter.lecturerName = lecturerFilter;
    } else if (debouncedSearchTerm.trim()) {
      filter.lecturerName = debouncedSearchTerm.trim();
    }
    if (classFilter !== 'All') filter.class = classFilter;
    if (commentFilter !== 'All') filter.comment = commentFilter;
    if (statusFilter !== 'All') filter.checkInStatus = statusFilter;
    if (dateFrom) filter.startDate = dateFrom;
    if (dateTo) filter.endDate = dateTo;
    return filter;
  };

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const filter: any = {
        ...buildBaseFilter(),
        page,
        limit: pageSize,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      const response = await qaService.getLectureRecords(filter);
      let data: QALectureRecord[] = [];
      let total = 0;

      if (Array.isArray(response)) {
        data = response;
        total = response.length;
      } else {
        data = (response as any)?.data || [];
        total = (response as any)?.total || 0;
      }

      data = data.map((record: any) => ({
        ...record,
        class: record.class || record.className || '',
      }));

      setRecords(data);
      setTotalRecords(total);
    } catch (error) {
      console.error('Error loading records:', error);
      setRecords([]);
      setTotalRecords(0);
    } finally {
      setIsLoading(false);
    }
  };

  const loadSummary = async () => {
    setSummaryLoading(true);
    try {
      const result = await qaService.getLectureRecordsSummary(buildBaseFilter());
      setSummary(result);
    } catch {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  };

  const filteredRecords = records;
  const taughtCount = summary?.taughtCount ?? 0;
  const untaughtCount = summary?.untaughtCount ?? 0;
  const pendingCount = summary?.pendingCount ?? 0;
  const onTimeRatePct = summary?.onTimeRatePct ?? 0;
  const summaryTotalRecords = summary?.totalRecords ?? 0;
  const summaryHasFilters = summary?.hasFilters ?? false;

  const clearFilters = () => {
    setSearchTerm('');
    setCommentFilter('All');
    setLecturerFilter('All');
    setSchoolFilter('All');
    setClassFilter('All');
    setStatusFilter('All');
    setAttendanceStatusFilter('All');
    setDateFrom('');
    setDateTo('');
  };

  const handleSeedFromTimetable = async () => {
    const d = timetableSeedDate.trim();
    if (!d) {
      toast.error('Choose a date for timetable alignment.');
      return;
    }
    setTimetableSeedLoading(true);
    try {
      const result = await qaService.seedLectureRecordsFromTimetable(d);
      const { created = 0, skipped = 0 } = result || {};
      if (created > 0) {
        toast.success(`Created ${created} pending row(s) from the timetable.${skipped ? ` ${skipped} slot(s) already had records.` : ''}`);
      } else if (skipped > 0) {
        toast.info(`Every scheduled slot for ${d} already has a QA row (${skipped} checked). Adjust date or timetable if needed.`);
      } else {
        toast.warning(`No scheduled timetable slots found for ${d}. Ensure classes have weekly times and timetable generation has run for that weekday.`);
      }
      setDateFrom(d);
      setDateTo(d);
      setPage(1);
      setCommentFilter('PENDING');
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : 'Failed to align timetable into lecture records.';
      toast.error(msg);
    } finally {
      setTimetableSeedLoading(false);
    }
  };

  // Calculate duration from start and end times
  const calculateDuration = (startTime: string, endTime: string): string => {
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 0;
    };

    const start = parseTime(startTime);
    const end = parseTime(endTime);
    const diff = end - start;
    
    if (diff < 0) return '00:00:00';
    
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  // Handle Form Submit
  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedLecturerName?.trim()) {
      toast.error('Please select a lecturer.');
      return;
    }
    const formData = new FormData(e.target as HTMLFormElement);
    
    const startTime = formData.get('timeForStarting') as string;
    const endTime = formData.get('timeOutForEnding') as string;
    const checkInTime = formData.get('checkInTime') as string;
    const checkOutTime = formData.get('checkOutTime') as string;
    
    // Calculate duration from check-in to check-out if available, otherwise from scheduled times
    let duration: string;
    let lessonTimeout: string | undefined;
    
    if (checkInTime && checkOutTime) {
      duration = calculateDuration(checkInTime, checkOutTime);
      lessonTimeout = duration;
    } else {
      duration = calculateDuration(startTime, endTime);
    }
    
    // Derive course unit from selected class assignment if available
    let courseUnit = '';
    let classCourseId: string | null | undefined = null;
    if (lecturerAssignments && selectedDepartmentId && selectedClassId) {
      const dept = lecturerAssignments.departments.find(d => d.id === selectedDepartmentId);
      const cls: any = dept?.classes.find((c: any) => c.id === selectedClassId);
      if (cls) {
        courseUnit = cls.courseUnit;
        classCourseId = cls.courseId;
      }
    }
    // Fallback: derive roughly from class text if no structured mapping
    if (!courseUnit && selectedClassName) {
      const parts = selectedClassName.split('–');
      if (parts.length > 1) {
        courseUnit = parts[1].split('(')[0].trim();
      } else {
        courseUnit = selectedClassName.trim();
      }
    }

    const newRecord: QALectureRecord = {
      date: formData.get('date') as string,
      lecturerName: selectedLecturerName.trim(),
      class: selectedClassName.trim() || (formData.get('class') as string),
      classId: selectedClassId || undefined,
      courseId: classCourseId || undefined,
      courseUnit: courseUnit || (formData.get('courseUnit') as string) || '',
      timeForStarting: startTime,
      timeOutForEnding: endTime,
      duration: duration,
      timeLost: '0',
      comment: formData.get('comment') as string,
      checkInTime: checkInTime || undefined,
      checkOutTime: checkOutTime || undefined,
      lessonTimeout: lessonTimeout,
    };

    try {
      if (currentRecordId) {
        await qaService.updateLectureRecord(currentRecordId, newRecord);
      } else {
        await qaService.createLectureRecord(newRecord);
      }
      await loadRecords();
      loadSummary();
      setIsDialogOpen(false);
      setCurrentRecordId(null);
      setSelectedLecturerName('');
      setSelectedLecturerId('');
    } catch (error) {
      console.error('Error saving record:', error);
      toast.error('Failed to save record. Please try again.');
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm('Are you sure you want to delete this record?')) {
      try {
        await qaService.deleteLectureRecord(id);
        await loadRecords();
        loadSummary();
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record. Please try again.');
      }
    }
  };

  const openDetails = (id: string) => {
    const record = records.find((r) => r.id === id);
    if (!record) return;
    setDetailsRecord(record);
    setDetailsOpen(true);
  };

  const openEdit = async (id: string) => {
    setCurrentRecordId(id);
    const record = records.find((r) => r.id === id);
    if (!record) return;
    const nameTrim = (record.lecturerName || '').trim();
    setSelectedLecturerName(nameTrim);
    const recordDeptName = (record.department || '').trim();
    setSelectedDepartmentName(recordDeptName);
    setSelectedClassName(record.class || '');

    const staffIdFromRecord = record.lecturerId;
    const normalizedRecordName = normalizeName(record.lecturerName);
    let nameMatch =
      (staffIdFromRecord ? lecturerOptions.find((l) => l.id === staffIdFromRecord) : undefined) ||
      lecturerOptions.find((l) => normalizeName(l.name) === normalizedRecordName);

    if (!nameMatch && staffIdFromRecord) {
      try {
        const staff = await staffService.getStaffById(staffIdFromRecord);
        if (staff) {
          const fetched = {
            id: staff.id,
            name: `${staff.firstName} ${staff.lastName}`.trim(),
            departmentName:
              (staff as any).departmentName || (staff as any).department?.name || undefined,
          };
          setLecturerOptions((prev) =>
            prev.some((p) => p.id === fetched.id) ? prev : [...prev, fetched]
          );
          if (fetched.departmentName && !recordDeptName) {
            setSelectedDepartmentName(fetched.departmentName);
          }
          nameMatch = fetched;
        }
      } catch (err) {
        console.error('Failed to fetch lecturer by id:', err);
      }
    }

    setSelectedLecturerId(nameMatch?.id || '');
    setSelectedDepartmentId('');
    setSelectedClassId('');

    if (nameMatch?.id) {
      const classIdFromRecord = record.classId ?? undefined;
      try {
        const assignments = await qaService.getLecturerAssignments(nameMatch.id);
        setLecturerAssignments(assignments ?? null);
        let matchedDept = false;
        if (assignments?.departments) {
          if (classIdFromRecord) {
            for (const d of assignments.departments) {
              const cls = d.classes.find((c) => c.id === classIdFromRecord);
              if (cls) {
                setSelectedDepartmentId(d.id);
                setSelectedDepartmentName(d.name);
                setSelectedClassId(cls.id);
                setSelectedClassName(cls.label || record.class || '');
                matchedDept = true;
                break;
              }
            }
          }
          if (!matchedDept && recordDeptName) {
            const normRecordDept = normalizeName(recordDeptName);
            const deptByName = assignments.departments.find(
              (d) => normalizeName(d.name) === normRecordDept
            );
            if (deptByName) {
              setSelectedDepartmentId(deptByName.id);
              setSelectedDepartmentName(deptByName.name);
              const normRecordClass = normalizeName(record.class);
              const clsByName = deptByName.classes.find(
                (c) =>
                  normalizeName(c.label) === normRecordClass ||
                  normalizeName(c.className) === normRecordClass
              );
              if (clsByName) {
                setSelectedClassId(clsByName.id);
                setSelectedClassName(clsByName.label || record.class || '');
              }
              matchedDept = true;
            }
          }
        }
      } catch (err) {
        console.error('Failed to load lecturer assignments:', err);
        setLecturerAssignments(null);
      }
    } else {
      setLecturerAssignments(null);
    }

    if (record.class) {
      qaService.getSchools().then((allSchools) => {
        Promise.all(
          allSchools.map((school) =>
            qaService.getClassesBySchool(school).then((classes) => ({ school, classes }))
          )
        ).then((results) => {
          const match = results.find(({ classes }) => classes.includes(record.class));
          if (match) {
            setSelectedSchool(match.school);
            setClasses(match.classes);
          } else {
            setSelectedSchool('');
            setClasses([]);
          }
        });
      });
    } else {
      setSelectedSchool('');
      setClasses([]);
    }

    setIsDialogOpen(true);
  };

  const openNew = () => {
    setCurrentRecordId(null);
    setSelectedSchool('');
    setClasses([]);
    setSelectedLecturerName('');
    setSelectedLecturerId('');
    setSelectedDepartmentId('');
    setSelectedDepartmentName('');
    setSelectedClassId('');
    setSelectedClassName('');
    setLecturerAssignments(null);
    setIsDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      const filter: any = {
        ...buildBaseFilter(),
        page: 1,
        limit: 10000,
        sortBy: 'date',
        sortOrder: 'desc',
      };
      const response = await qaService.getLectureRecords(filter);
      const data: QALectureRecord[] = Array.isArray(response)
        ? response
        : ((response as any)?.data || []);
      const enriched = data.map((record: any) => ({
        ...record,
        class: record.class || record.className || '',
      }));
      if (enriched.length === 0) {
        toast.warning('No records match the current filters.');
        return;
      }
      const filename = `Lecture_Records_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportLectureRecordsToCSV(enriched, filename);
      toast.success(`Exported ${enriched.length} record(s) to Excel.`);
    } catch (error) {
      console.error('Error exporting:', error);
      toast.error('Failed to export records. Please try again.');
    }
  };

  const handleLectureImport = async () => {
    const file = lectureImportFileRef.current?.files?.[0];
    if (!file) {
      toast.error('Please select a CSV or Excel file.');
      return;
    }
    try {
      const parsed = await importLectureRecordsFromCSV(file);
      const mapped: QALectureRecord[] = parsed.map((r: QALectureRecord) => ({
        date: typeof r.date === 'string' ? r.date : new Date(r.date).toISOString().split('T')[0],
        lecturerName: r.lecturerName,
        class: r.class || (r as { className?: string }).className || '',
        courseUnit: r.courseUnit,
        timeForStarting: r.timeForStarting || '08:00:00',
        timeOutForEnding: r.timeOutForEnding || '10:00:00',
        duration: r.duration || '00:00:00',
        timeLost: r.timeLost || '0',
        comment: (r.comment || 'TAUGHT').replace(/\s+/g, '_') as 'TAUGHT' | 'UNTAUGHT' | 'COMPENSATION' | 'MEETING' | 'SDL' | 'STUDENTS_ORIENTATION',
      }));
      await qaService.importLectureRecords(mapped);
      toast.success(`Imported ${mapped.length} lecture record(s).`);
      setImportOpen(false);
      lectureImportFileRef.current!.value = '';
      await loadRecords();
      loadSummary();
    } catch (error: any) {
      console.error('Error importing lecture records:', error);
      toast.error(`Failed to import: ${error?.message || 'Unknown error'}`);
    }
  };

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
      }
      return date;
    }
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const formatDateForInput = (date: Date | string | undefined | null): string => {
    const pad = (n: number) => String(n).padStart(2, '0');
    const toYmdLocal = (d: Date) =>
      `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
    const today = () => toYmdLocal(new Date());
    if (date == null || date === '') return today();
    if (typeof date === 'string') {
      const trimmed = date.trim();
      const ymd = /^(\d{4})-(\d{2})-(\d{2})/.exec(trimmed);
      if (ymd) return `${ymd[1]}-${ymd[2]}-${ymd[3]}`;
      const parsed = new Date(trimmed);
      if (!Number.isNaN(parsed.getTime())) return toYmdLocal(parsed);
      return today();
    }
    if (Number.isNaN(date.getTime())) return today();
    return toYmdLocal(date);
  };

  const getCommentBadgeVariant = (comment: string) => {
    switch (comment.toUpperCase()) {
      case 'TAUGHT':
        return 'default';
      case 'UNTAUGHT':
      case 'CANCELLED':
        return 'destructive';
      case 'PENDING':
        return 'secondary';
      case 'SUBSTITUTED':
      case 'COMPENSATION':
        return 'secondary';
      case 'MEETING':
      case 'SDL':
      case 'STUDENTS ORIENTATION':
        return 'outline';
      default:
        return 'outline';
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lecture Records</h1>
          <p className="text-gray-500">Manage and verify daily teaching activities across all schools.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center justify-end">
          {canSeedFromTimetable && (
            <div className="flex flex-wrap items-center gap-2 mr-2 pr-2 border-r border-gray-200">
              <Input
                type="date"
                value={timetableSeedDate}
                onChange={(e) => setTimetableSeedDate(e.target.value)}
                className="w-[150px]"
                aria-label="Date to fill from timetable"
              />
              <Button
                type="button"
                variant="secondary"
                className="gap-2"
                disabled={timetableSeedLoading}
                onClick={handleSeedFromTimetable}
              >
                {timetableSeedLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <CalendarClock className="h-4 w-4" />}
                From timetable
              </Button>
            </div>
          )}
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={summaryLoading || summaryTotalRecords === 0}>
            <Download size={16} /> Export Excel
          </Button>
          <Button variant="outline" className="gap-2" onClick={() => setImportOpen(true)}>
            <Upload size={16} /> Import
          </Button>
          <Button onClick={openNew} className="bg-[#015F2B] hover:bg-[#014022] gap-2">
            <Plus size={16} /> Record Lecture
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{summaryHasFilters ? 'Total Lectures (filtered)' : 'Total Lectures'}</p>
              <h3 className="text-2xl font-bold text-gray-900">{summaryLoading ? '—' : summaryTotalRecords}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <BookOpen size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{summaryHasFilters ? 'Taught (filtered)' : 'Taught (all-time)'}</p>
              <h3 className="text-2xl font-bold text-[#015F2B]">{summaryLoading ? '—' : taughtCount}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-[#015F2B]">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{summaryHasFilters ? 'Untaught (filtered)' : 'Untaught (all-time)'}</p>
              <h3 className="text-2xl font-bold text-red-600">{summaryLoading ? '—' : untaughtCount}</h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <XCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{summaryHasFilters ? 'On-time rate (filtered)' : 'On-time rate (overall)'}</p>
              <h3 className="text-2xl font-bold text-blue-600">{summaryLoading ? '—' : (onTimeRatePct + '%')}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white border-amber-100">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{summaryHasFilters ? 'Pending (filtered)' : 'Pending (all-time)'}</p>
              <h3 className="text-2xl font-bold text-amber-700">{summaryLoading ? '—' : pendingCount}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-700">
              <CalendarIcon size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>All Records</CardTitle>
          <CardDescription>
            Showing {filteredRecords.length} of {totalRecords} records matching your filters.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {/* Filters Toolbar */}
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search lecturer, course unit, or class..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={commentFilter} onValueChange={setCommentFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Comment" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Comments</SelectItem>
                  {commentOptions.map((comment) => (
                    <SelectItem key={comment} value={comment}>
                      {COMMENT_FILTER_LABELS[comment] ?? comment}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={lecturerFilter} onValueChange={setLecturerFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Lecturer" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Lecturers</SelectItem>
                  {allLecturers.map(lecturer => (
                    <SelectItem key={lecturer} value={lecturer}>{lecturer}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={classFilter} onValueChange={setClassFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Filter Class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Classes</SelectItem>
                  {allClasses.map(cls => (
                    <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="Filter by School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Schools</SelectItem>
                  {schools.map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Check-in Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Check-in Status</SelectItem>
                  <SelectItem value="Checked In">Checked In Only</SelectItem>
                  <SelectItem value="Checked Out">Checked Out</SelectItem>
                  <SelectItem value="Not Checked In">Not Checked In</SelectItem>
                </SelectContent>
              </Select>
              <Select value={attendanceStatusFilter} onValueChange={setAttendanceStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Attendance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Attendance</SelectItem>
                  <SelectItem value="OnTime">On Time</SelectItem>
                  <SelectItem value="Late">Late</SelectItem>
                  <SelectItem value="Absent">Absent</SelectItem>
                  <SelectItem value="EarlyDeparture">Early Departure</SelectItem>
                </SelectContent>
              </Select>
              <Input
                type="date"
                placeholder="Date From"
                value={dateFrom}
                onChange={(e) => setDateFrom(e.target.value)}
                className="w-[150px]"
              />
              <Input
                type="date"
                placeholder="Date To"
                value={dateTo}
                onChange={(e) => setDateTo(e.target.value)}
                className="w-[150px]"
              />
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <Filter className="h-4 w-4" /> Clear Filters
              </Button>
            </div>
          </div>

          {/* Table - Matching 3.csv format exactly */}
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>DATE</TableHead>
                  <TableHead>LECTURER&apos;S NAME</TableHead>
                  <TableHead>CLASS</TableHead>
                  <TableHead>COURSE UNIT</TableHead>
                  <TableHead className="whitespace-nowrap">TIME LOST</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>COMMENT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record, index) => (
                    <TableRow key={record.id || `lec-${index}`}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell className="font-medium max-w-[200px] truncate" title={record.lecturerName}>
                        {record.lecturerName}
                      </TableCell>
                      <TableCell className="max-w-[140px] truncate" title={record.class || (record as any).className || ''}>
                        {record.class || (record as any).className || '-'}
                      </TableCell>
                      <TableCell className="max-w-[220px] truncate" title={record.courseUnit}>
                        {record.courseUnit}
                      </TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{record.timeLost}</TableCell>
                      <TableCell>
                        {(() => {
                          const status = (record as any).status || 'OnTime';
                          const statusConfig = {
                            OnTime: { label: 'On Time', className: 'bg-green-100 text-green-800 border-green-200' },
                            Late: { label: 'Late', className: 'bg-orange-100 text-orange-800 border-orange-200' },
                            Absent: { label: 'Absent', className: 'bg-red-100 text-red-800 border-red-200' },
                            EarlyDeparture: { label: 'Early Departure', className: 'bg-blue-100 text-blue-800 border-blue-200' },
                          };
                          const config = statusConfig[status as keyof typeof statusConfig] || statusConfig.OnTime;
                          return (
                            <Badge variant="outline" className={config.className}>
                              {config.label}
                            </Badge>
                          );
                        })()}
                      </TableCell>
                      <TableCell>
                        <Badge variant={getCommentBadgeVariant(record.comment)}>
                          {COMMENT_FILTER_LABELS[(record.comment || '').toUpperCase()] ?? record.comment}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-8 w-8 p-0">
                              <span className="sr-only">Open menu</span>
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem onClick={() => record.id && openDetails(record.id)}>
                              <Eye className="mr-2 h-4 w-4" /> View details
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => record.id && openEdit(record.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            {(record as any).classId && (
                              <DropdownMenuItem onClick={() => openSessionAttendance(record)}>
                                <UserCheck className="mr-2 h-4 w-4" /> Record student attendance
                              </DropdownMenuItem>
                            )}
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => record.id && handleDelete(record.id)}>
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {totalRecords > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{totalRecords} total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">Page {page} of {Math.max(1, Math.ceil(totalRecords / pageSize))}</span>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(totalRecords / pageSize)} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={detailsOpen} onOpenChange={(open) => { setDetailsOpen(open); if (!open) setDetailsRecord(null); }}>
        <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lecture record details</DialogTitle>
            <DialogDescription>
              {detailsRecord
                ? `${formatDate(detailsRecord.date)} · ${detailsRecord.lecturerName}`
                : 'Full breakdown of this lecture record.'}
            </DialogDescription>
          </DialogHeader>
          {detailsRecord && (() => {
            const status = (detailsRecord as any).status || 'OnTime';
            const statusConfig: Record<string, { label: string; className: string }> = {
              OnTime: { label: 'On Time', className: 'bg-green-100 text-green-800 border-green-200' },
              Late: { label: 'Late', className: 'bg-orange-100 text-orange-800 border-orange-200' },
              Absent: { label: 'Absent', className: 'bg-red-100 text-red-800 border-red-200' },
              EarlyDeparture: { label: 'Early Departure', className: 'bg-blue-100 text-blue-800 border-blue-200' },
            };
            const statusCfg = statusConfig[status] || statusConfig.OnTime;
            const commentLabel = COMMENT_FILTER_LABELS[(detailsRecord.comment || '').toUpperCase()] ?? detailsRecord.comment;
            return (
              <div className="space-y-5 py-2">
                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lecture</h4>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Date</p>
                      <p className="font-medium text-gray-900">{formatDate(detailsRecord.date)}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lecturer</p>
                      <p className="font-medium text-gray-900">{detailsRecord.lecturerName || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Department</p>
                      <p className="font-medium text-gray-900">{detailsRecord.department || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Class</p>
                      <p className="font-medium text-gray-900">{detailsRecord.class || (detailsRecord as any).className || '—'}</p>
                    </div>
                    <div className="sm:col-span-2">
                      <p className="text-xs text-muted-foreground">Course unit</p>
                      <p className="font-medium text-gray-900">{detailsRecord.courseUnit || '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled timing</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Start</p>
                      <p className="font-medium text-gray-900">{detailsRecord.timeForStarting || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">End</p>
                      <p className="font-medium text-gray-900">{detailsRecord.timeOutForEnding || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Duration</p>
                      <p className="font-medium text-gray-900">{detailsRecord.duration || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Time lost</p>
                      <p className="font-medium text-gray-900">{detailsRecord.timeLost ?? '—'}</p>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Attendance</h4>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-x-4 gap-y-3 rounded-md border bg-muted/30 p-3 text-sm">
                    <div>
                      <p className="text-xs text-muted-foreground">Check-in</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1">
                        {detailsRecord.checkInTime ? <LogIn className="h-3 w-3 text-green-600" /> : null}
                        {detailsRecord.checkInTime || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Check-out</p>
                      <p className="font-medium text-gray-900 flex items-center gap-1">
                        {detailsRecord.checkOutTime ? <LogOut className="h-3 w-3 text-blue-600" /> : null}
                        {detailsRecord.checkOutTime || '—'}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Lesson length</p>
                      <p className="font-medium text-gray-900">{detailsRecord.lessonTimeout || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs text-muted-foreground">Status</p>
                      <Badge variant="outline" className={statusCfg.className}>{statusCfg.label}</Badge>
                    </div>
                  </div>
                </section>

                <section className="space-y-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QA outcome</h4>
                  <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">Comment:</span>
                      <Badge variant={getCommentBadgeVariant(detailsRecord.comment)}>{commentLabel}</Badge>
                    </div>
                  </div>
                </section>
              </div>
            );
          })()}
          <DialogFooter>
            {detailsRecord?.id && (
              <Button
                variant="outline"
                onClick={() => {
                  if (!detailsRecord?.id) return;
                  setDetailsOpen(false);
                  openEdit(detailsRecord.id);
                }}
              >
                <Edit className="mr-2 h-4 w-4" /> Edit record
              </Button>
            )}
            <Button onClick={() => { setDetailsOpen(false); setDetailsRecord(null); }}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={sessionAttendanceOpen} onOpenChange={(open) => { setSessionAttendanceOpen(open); if (!open) { setSessionRecord(null); setSessionEnrollments([]); setSessionStatusMap({}); } }}>
        <DialogContent className="w-[96vw] max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0">
          <DialogHeader className="px-6 pt-6 pb-3 border-b">
            <DialogTitle>Record student attendance</DialogTitle>
            <DialogDescription>
              {sessionRecord ? `${sessionRecord.className} — ${sessionRecord.date}` : ''}
            </DialogDescription>
          </DialogHeader>
          {sessionLoading ? (
            <div className="py-10 text-center text-muted-foreground">Loading students…</div>
          ) : (
            <>
              {sessionEnrollments.length > 0 && (
                <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-6 py-3 text-sm">
                  <span className="text-muted-foreground">
                    {sessionEnrollments.length} student{sessionEnrollments.length === 1 ? '' : 's'} in this class
                    {Object.keys(sessionStatusMap).length > 0 && (
                      <> · <span className="text-foreground font-medium">{Object.keys(sessionStatusMap).length}</span> already marked</>
                    )}
                  </span>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-muted-foreground">Mark all:</span>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-green-600 text-green-700 hover:bg-green-50" onClick={() => setAllSessionStatus('Present')}>
                      Present
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-red-600 text-red-700 hover:bg-red-50" onClick={() => setAllSessionStatus('Absent')}>
                      Absent
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-amber-600 text-amber-700 hover:bg-amber-50" onClick={() => setAllSessionStatus('Late')}>
                      Late
                    </Button>
                    <Button type="button" size="sm" variant="outline" className="h-7 border-blue-600 text-blue-700 hover:bg-blue-50" onClick={() => setAllSessionStatus('Excused')}>
                      Excused
                    </Button>
                  </div>
                </div>
              )}
              <div className="overflow-auto flex-1 min-h-0">
                <Table>
                  <TableHeader className="sticky top-0 bg-background z-10">
                    <TableRow>
                      <TableHead className="w-12 text-center">#</TableHead>
                      <TableHead>Student</TableHead>
                      <TableHead className="w-40">Student number</TableHead>
                      <TableHead className="w-44">Status</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {sessionEnrollments.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No students in this class yet.
                        </TableCell>
                      </TableRow>
                    ) : (
                      sessionEnrollments.map((enr: any, idx: number) => {
                        const student = enr.student;
                        const name = student ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || '—' : '—';
                        const num = student?.studentNumber || '—';
                        const status = sessionStatusMap[enr.studentId] || 'Absent';
                        return (
                          <TableRow key={enr.studentId}>
                            <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell className="font-medium">{name}</TableCell>
                            <TableCell className="text-muted-foreground">{num}</TableCell>
                            <TableCell>
                              <Select value={status} onValueChange={(v) => setSessionStudentStatus(enr.studentId, v)}>
                                <SelectTrigger className="w-full">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="Present">Present</SelectItem>
                                  <SelectItem value="Absent">Absent</SelectItem>
                                  <SelectItem value="Late">Late</SelectItem>
                                  <SelectItem value="Excused">Excused</SelectItem>
                                </SelectContent>
                              </Select>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
              <DialogFooter className="px-6 py-3 border-t">
                <Button type="button" variant="outline" onClick={() => { setSessionAttendanceOpen(false); setSessionRecord(null); setSessionEnrollments([]); setSessionStatusMap({}); }}>
                  Cancel
                </Button>
                <Button onClick={handleSessionAttendanceSubmit} disabled={sessionSaving || sessionEnrollments.length === 0} className="bg-[#015F2B] hover:bg-[#014022]">
                  {sessionSaving ? 'Saving…' : 'Save attendance'}
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Import Lecture Records Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="w-[95vw] sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Import Lecture Records</DialogTitle>
            <DialogDescription>
              Upload a CSV or Excel (.xlsx) file with columns: DATE, LECTURER&apos;S NAME, CLASS, COURSE UNIT, TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <a href={`data:text/csv;charset=utf-8,${encodeURIComponent(LECTURE_RECORDS_IMPORT_CSV_HEADER + '\n')}`} download="lecture_records_template.csv" className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download CSV template
              </a>
              <span className="text-muted-foreground">or</span>
              <button type="button" onClick={downloadLectureRecordsImportTemplateExcel} className="flex items-center gap-2 text-sm text-[#015F2B] hover:underline">
                <Download className="h-4 w-4" /> Download Excel template
              </button>
            </div>
            <div className="space-y-2">
              <Label>Select file (CSV or Excel)</Label>
              <Input ref={lectureImportFileRef} type="file" accept=".csv,.xlsx,.xls" onChange={() => {}} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setImportOpen(false)}>Cancel</Button>
            <Button onClick={handleLectureImport} className="bg-[#015F2B]"><Upload className="mr-2 h-4 w-4" /> Import</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="w-[96vw] max-w-5xl max-h-[92vh] overflow-y-auto">
          <form key={currentRecordId ?? 'new'} onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{currentRecordId !== null ? 'Edit Lecture Record' : 'Record New Lecture'}</DialogTitle>
              <DialogDescription>
                Capture one lecture session with school, class, course unit and both scheduled and actual times.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-6 py-4">
              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Lecture identity</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">DATE *</Label>
                    <Input
                      id="date"
                      name="date"
                      type="date"
                      required
                      defaultValue={
                        currentRecordId !== null
                          ? formatDateForInput(records.find((r) => r.id === currentRecordId)?.date)
                          : formatDateForInput(new Date())
                      }
                    />
                  </div>
                  <div className="space-y-2 lg:col-span-3">
                    <Label>LECTURER&apos;S NAME *</Label>
                    <Combobox
                      options={lecturerOptions.map((l) => ({
                        value: l.id,
                        label: l.departmentName ? `${l.name} — ${l.departmentName}` : l.name,
                      }))}
                      value={selectedLecturerId}
                      selectedLabel={selectedLecturerName || undefined}
                      onValueChange={async (id) => {
                        if (!id) {
                          setSelectedLecturerId('');
                          setSelectedLecturerName('');
                          setSelectedDepartmentId('');
                          setSelectedDepartmentName('');
                          setSelectedClassId('');
                          setSelectedClassName('');
                          setLecturerAssignments(null);
                          return;
                        }
                        const opt = lecturerOptions.find((l) => l.id === id);
                        setSelectedLecturerId(id);
                        setSelectedLecturerName(opt?.name || '');
                        setSelectedDepartmentId('');
                        setSelectedDepartmentName(opt?.departmentName || '');
                        setSelectedClassId('');
                        setSelectedClassName('');
                        const assignments = await qaService.getLecturerAssignments(id);
                        setLecturerAssignments(assignments ?? null);
                      }}
                      placeholder="Select a lecturer"
                      searchPlaceholder="Search lecturers by name or department..."
                      emptyText="No lecturer found."
                      initialDisplayCount={10}
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>DEPARTMENT</Label>
                    {lecturerAssignments && lecturerAssignments.departments.length > 0 ? (
                      <Select
                        value={selectedDepartmentId}
                        onValueChange={(value) => {
                          setSelectedDepartmentId(value);
                          setSelectedClassId('');
                          setSelectedClassName('');
                          const dept = lecturerAssignments?.departments.find((d) => d.id === value);
                          setSelectedDepartmentName(dept?.name || '');
                        }}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a department" />
                        </SelectTrigger>
                        <SelectContent>
                          {lecturerAssignments.departments.map((dept) => (
                            <SelectItem key={dept.id} value={dept.id}>{dept.name}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        value={selectedDepartmentName || 'Lecturer not assigned to any department'}
                        readOnly
                        disabled
                      />
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="class">CLASS *</Label>
                    {lecturerAssignments &&
                    selectedDepartmentId &&
                    lecturerAssignments.departments.find((d) => d.id === selectedDepartmentId)?.classes.length ? (
                      <Select
                        name="class"
                        value={selectedClassId}
                        onValueChange={(value) => {
                          setSelectedClassId(value);
                          const dept = lecturerAssignments.departments.find((d) => d.id === selectedDepartmentId);
                          const cls = dept?.classes.find((c: { id: string; label: string }) => c.id === value);
                          setSelectedClassName(cls?.label || '');
                        }}
                        required
                      >
                        <SelectTrigger id="class">
                          <SelectValue placeholder="Select a class" />
                        </SelectTrigger>
                        <SelectContent>
                          {lecturerAssignments.departments
                            .find((d) => d.id === selectedDepartmentId)
                            ?.classes.map((cls) => (
                              <SelectItem key={cls.id} value={cls.id}>{cls.label}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <Input
                        name="class"
                        value={selectedClassName || ''}
                        onChange={(e) => setSelectedClassName(e.target.value)}
                        placeholder="Lecturer not assigned to any class"
                      />
                    )}
                  </div>
                </div>
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Scheduled timing</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="timeForStarting">TIME FOR STARTING (Scheduled) *</Label>
                    <Input
                      id="timeForStarting"
                      name="timeForStarting"
                      type="time"
                      required
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.timeForStarting || '08:00' : '08:00'}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="timeOutForEnding">TIME OUT FOR ENDING (Scheduled) *</Label>
                    <Input
                      id="timeOutForEnding"
                      name="timeOutForEnding"
                      type="time"
                      required
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.timeOutForEnding || '10:00' : '10:00'}
                    />
                  </div>
                </div>
              </section>

              <section className="space-y-3 rounded-lg border bg-muted/30 p-4">
                <div>
                  <h4 className="text-base font-semibold">Actual attendance tracking</h4>
                  <p className="text-xs text-muted-foreground">Record the lecturer&apos;s real arrival and departure times.</p>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkInTime">Check-in time (actual)</Label>
                    <Input
                      id="checkInTime"
                      name="checkInTime"
                      type="time"
                      step="1"
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.checkInTime || '' : ''}
                    />
                    <p className="text-xs text-muted-foreground">Time when the lecturer actually arrived.</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOutTime">Check-out time (actual)</Label>
                    <Input
                      id="checkOutTime"
                      name="checkOutTime"
                      type="time"
                      step="1"
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.checkOutTime || '' : ''}
                    />
                    <p className="text-xs text-muted-foreground">Time when the lecturer actually left.</p>
                  </div>
                </div>
                {currentRecordId !== null && records.find(r => r.id === currentRecordId)?.checkInTime && records.find(r => r.id === currentRecordId)?.checkOutTime && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-muted-foreground">Lesson duration:</span>
                      <span className="font-semibold">
                        {calculateDuration(records.find(r => r.id === currentRecordId)?.checkInTime || '', records.find(r => r.id === currentRecordId)?.checkOutTime || '')}
                      </span>
                    </div>
                  </div>
                )}
              </section>

              <section className="space-y-3">
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">QA outcome</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="comment">COMMENT *</Label>
                    <Select
                      name="comment"
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.comment || 'TAUGHT' : 'TAUGHT'}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select comment" />
                      </SelectTrigger>
                      <SelectContent>
                        {commentOptions.map((comment) => (
                          <SelectItem key={comment} value={comment}>
                            {COMMENT_FILTER_LABELS[comment] ?? comment}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </section>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsDialogOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]">Save Record</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
