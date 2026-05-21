import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import {
  Search, Filter, MoreHorizontal, FileSpreadsheet,
  User, CheckCircle, XCircle, Clock, MapPin,
  Trash2, Edit, ChevronLeft, ChevronRight, Plus, GraduationCap
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import DailyAttendanceGrid from '@/features/student/components/DailyAttendanceGrid';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { studentService, academicService, enrollmentService } from '@/services';
import { exportAttendanceRecordsToExcel } from '@/utils/excel';
import type { AttendanceRecordRow } from '@/types/student';
import type { School, Department, Level } from '@/types';
import type { Course } from '@/types';
import type { Student } from '@/types';
import { toast } from 'sonner';

interface EnrollmentClassOption {
  enrollmentId: string;
  classId: string;
  status: string;
  className: string;
  courseId?: string;
  courseCode?: string;
  courseName?: string;
}

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'] as const;
const YEAR_OPTIONS = [1, 2, 3, 4, 5] as const;
const SEMESTER_OPTIONS = [1, 2] as const;
const ALL_VALUE = '__all__';

export default function StudentRecords() {
  const [records, setRecords] = useState<AttendanceRecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [schools, setSchools] = useState<School[]>([]);
  const [allLevels, setAllLevels] = useState<Level[]>([]);
  const [allDepartments, setAllDepartments] = useState<Department[]>([]);
  const [allPrograms, setAllPrograms] = useState<Array<{ id: string; name: string; code: string; departmentId: string }>>([]);
  const [allCourses, setAllCourses] = useState<Course[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>(ALL_VALUE);
  const [selectedProgramId, setSelectedProgramId] = useState<string>(ALL_VALUE);
  const [selectedCourseId, setSelectedCourseId] = useState<string>(ALL_VALUE);
  const [selectedYear, setSelectedYear] = useState<string>(ALL_VALUE);
  const [selectedSemester, setSelectedSemester] = useState<string>(ALL_VALUE);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecordRow | null>(null);
  const [summary, setSummary] = useState<{
    totalRecords: number;
    presentCount: number;
    lateCount: number;
    absentCount: number;
    excusedCount: number;
    uniqueStudentsInRecords: number;
    totalStudentsInScope: number;
    attendanceRatePct: number;
    hasFilters: boolean;
  } | null>(null);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [addOpen, setAddOpen] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [addClassId, setAddClassId] = useState('');
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addStatus, setAddStatus] = useState<string>('Present');
  const [addSaving, setAddSaving] = useState(false);
  const [studentSearch, setStudentSearch] = useState('');
  const [studentResults, setStudentResults] = useState<Student[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [studentEnrollments, setStudentEnrollments] = useState<EnrollmentClassOption[]>([]);
  const [enrollmentsLoading, setEnrollmentsLoading] = useState(false);
  const studentSearchSeqRef = useRef(0);
  const enrollmentsSeqRef = useRef(0);

  useEffect(() => {
    academicService.getSchools().then(list => setSchools(list || []));
    academicService.getLevels().then(list => setAllLevels(list || []));
    academicService.getDepartments().then(list => setAllDepartments(list || []));
    academicService.getPrograms().then(list => setAllPrograms((list as any[]) || []));
    academicService.getCourses({ limit: 500 }).then(r => setAllCourses(r.data || []));
  }, []);

  const programToSchoolMap = useMemo(() => {
    const levelToSchool = new Map(allLevels.map(l => [l.id, l.schoolId]));
    const deptToSchool = new Map(allDepartments.map(d => [d.id, levelToSchool.get(d.levelId) || '']));
    return new Map(allPrograms.map(p => [p.id, deptToSchool.get(p.departmentId) || '']));
  }, [allPrograms, allDepartments, allLevels]);

  const filteredPrograms = useMemo(() => {
    if (selectedSchool === ALL_VALUE) return allPrograms;
    return allPrograms.filter(p => programToSchoolMap.get(p.id) === selectedSchool);
  }, [allPrograms, selectedSchool, programToSchoolMap]);

  const programIdsInScope = useMemo(
    () => new Set(filteredPrograms.map(p => p.id)),
    [filteredPrograms]
  );

  const filteredCourses = useMemo(() => {
    let list = allCourses;
    if (selectedProgramId !== ALL_VALUE) {
      list = list.filter(c => c.programId === selectedProgramId);
    } else if (selectedSchool !== ALL_VALUE) {
      list = list.filter(c => c.programId && programIdsInScope.has(c.programId));
    }
    if (selectedYear !== ALL_VALUE) {
      list = list.filter(c => c.level === Number(selectedYear));
    }
    if (selectedSemester !== ALL_VALUE) {
      list = list.filter(c => c.semester === Number(selectedSemester));
    }
    return list;
  }, [allCourses, selectedProgramId, selectedSchool, selectedYear, selectedSemester, programIdsInScope]);

  const handleSchoolChange = (value: string) => {
    setSelectedSchool(value);
    setSelectedProgramId(ALL_VALUE);
    setSelectedCourseId(ALL_VALUE);
  };
  const handleProgramChange = (value: string) => {
    setSelectedProgramId(value);
    setSelectedCourseId(ALL_VALUE);
  };
  const handleYearChange = (value: string) => {
    setSelectedYear(value);
    if (selectedCourseId !== ALL_VALUE) {
      const stillValid = filteredCourses.some(c => c.id === selectedCourseId && (value === ALL_VALUE || c.level === Number(value)));
      if (!stillValid) setSelectedCourseId(ALL_VALUE);
    }
  };
  const handleSemesterChange = (value: string) => {
    setSelectedSemester(value);
    if (selectedCourseId !== ALL_VALUE) {
      const stillValid = filteredCourses.some(c => c.id === selectedCourseId && (value === ALL_VALUE || c.semester === Number(value)));
      if (!stillValid) setSelectedCourseId(ALL_VALUE);
    }
  };

  const buildScopeParams = useCallback(() => {
    const params: Record<string, string | number | undefined> = {};
    if (selectedSchool !== ALL_VALUE) params.schoolId = selectedSchool;
    if (selectedProgramId !== ALL_VALUE) params.programId = selectedProgramId;
    if (selectedCourseId !== ALL_VALUE) params.courseId = selectedCourseId;
    if (selectedYear !== ALL_VALUE) params.level = Number(selectedYear);
    if (selectedSemester !== ALL_VALUE) params.semester = Number(selectedSemester);
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (statusFilter !== 'All') params.status = statusFilter;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return params;
  }, [selectedSchool, selectedProgramId, selectedCourseId, selectedYear, selectedSemester, dateFrom, dateTo, statusFilter, searchTerm]);

  const buildFilterParams = useCallback((opts?: { limit?: number; page?: number }) => {
    return {
      page: opts?.page ?? page,
      limit: opts?.limit ?? pageSize,
      ...buildScopeParams(),
    };
  }, [page, pageSize, buildScopeParams]);

  const loadAttendanceRecords = useCallback(async () => {
    setRecordsLoading(true);
    try {
      const result = await studentService.getAttendanceRecords(buildFilterParams());
      setRecords(result.data);
      setTotal(result.total);
      setPage(result.page);
      setPageSize(result.pageSize);
    } catch (e: any) {
      setRecords([]);
      setTotal(0);
      toast.error(e?.message || 'Failed to load attendance records.');
    } finally {
      setRecordsLoading(false);
    }
  }, [buildFilterParams]);

  const loadAttendanceSummary = useCallback(async () => {
    setSummaryLoading(true);
    try {
      const result = await studentService.getAttendanceSummary(buildScopeParams());
      setSummary(result);
    } catch (e: any) {
      setSummary(null);
    } finally {
      setSummaryLoading(false);
    }
  }, [buildScopeParams]);

  useEffect(() => {
    setPage(1);
  }, [selectedSchool, selectedProgramId, selectedCourseId, selectedYear, selectedSemester, dateFrom, dateTo, statusFilter, searchTerm]);

  useEffect(() => {
    loadAttendanceRecords();
  }, [loadAttendanceRecords]);

  useEffect(() => {
    loadAttendanceSummary();
  }, [loadAttendanceSummary]);

  const runStudentSearch = useCallback(async (query: string) => {
    const seq = ++studentSearchSeqRef.current;
    setStudentSearchLoading(true);
    try {
      const trimmed = query.trim();
      const params = trimmed ? { search: trimmed, limit: 25 } : { limit: 25 };
      const result = await studentService.getStudents(params);
      if (seq !== studentSearchSeqRef.current) return;
      setStudentResults(result.data || []);
    } catch {
      if (seq !== studentSearchSeqRef.current) return;
      setStudentResults([]);
    } finally {
      if (seq === studentSearchSeqRef.current) setStudentSearchLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!addOpen) return;
    runStudentSearch('');
  }, [addOpen, runStudentSearch]);

  useEffect(() => {
    if (!addOpen) return;
    const handle = setTimeout(() => {
      runStudentSearch(studentSearch);
    }, 250);
    return () => clearTimeout(handle);
  }, [studentSearch, addOpen, runStudentSearch]);

  const loadStudentEnrollments = useCallback(async (studentId: string) => {
    const seq = ++enrollmentsSeqRef.current;
    setEnrollmentsLoading(true);
    try {
      const data = await enrollmentService.getStudentEnrollments(studentId);
      if (seq !== enrollmentsSeqRef.current) return;
      const list = Array.isArray(data) ? (data as any[]) : [];
      const mapped: EnrollmentClassOption[] = list
        .filter((row) => row?.classId && (row.status ? row.status === 'Active' : true))
        .map((row) => ({
          enrollmentId: row.id,
          classId: row.classId,
          status: row.status || 'Active',
          className: row.class?.name || row.class?.code || row.classId,
          courseId: row.class?.course?.id,
          courseCode: row.class?.course?.code,
          courseName: row.class?.course?.name,
        }));
      const unique = new Map<string, EnrollmentClassOption>();
      mapped.forEach((opt) => {
        if (!unique.has(opt.classId)) unique.set(opt.classId, opt);
      });
      setStudentEnrollments(Array.from(unique.values()));
    } catch {
      if (seq !== enrollmentsSeqRef.current) return;
      setStudentEnrollments([]);
    } finally {
      if (seq === enrollmentsSeqRef.current) setEnrollmentsLoading(false);
    }
  }, []);

  const handleStudentSelect = (value: string) => {
    if (!value || value === addStudentId) {
      setAddStudentId('');
      setSelectedStudent(null);
      setStudentEnrollments([]);
      setAddClassId('');
      return;
    }
    const fromResults = studentResults.find((s) => s.id === value) || null;
    setAddStudentId(value);
    setSelectedStudent(fromResults);
    setAddClassId('');
    setStudentEnrollments([]);
    if (!fromResults) {
      studentService.getStudentById(value).then((s) => {
        if (s) setSelectedStudent(s);
      });
    }
    loadStudentEnrollments(value);
  };

  const programNameForSelected = useMemo(() => {
    if (!selectedStudent) return '';
    const programRecord = allPrograms.find((p) => p.id === (selectedStudent as any).programId);
    if (programRecord) return `${programRecord.code} — ${programRecord.name}`;
    return selectedStudent.program || '';
  }, [selectedStudent, allPrograms]);

  const openAdd = () => {
    setAddStudentId('');
    setAddClassId('');
    setAddDate(new Date().toISOString().slice(0, 10));
    setAddStatus('Present');
    setSelectedStudent(null);
    setStudentEnrollments([]);
    setStudentSearch('');
    setStudentResults([]);
    setAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentId) {
      toast.error('Please select a student.');
      return;
    }
    if (!addClassId) {
      toast.error('Please select a course the student is enrolled in.');
      return;
    }
    if (!addDate) {
      toast.error('Please choose a date.');
      return;
    }
    setAddSaving(true);
    try {
      await studentService.createAttendanceRecord({
        studentId: addStudentId,
        classId: addClassId,
        date: addDate,
        status: addStatus,
      });
      toast.success('Attendance record added.');
      setAddOpen(false);
      loadAttendanceRecords();
      loadAttendanceSummary();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to add record.');
    } finally {
      setAddSaving(false);
    }
  };

  const clearFilters = () => {
    setSearchTerm('');
    setStatusFilter('All');
    setSelectedSchool(ALL_VALUE);
    setSelectedProgramId(ALL_VALUE);
    setSelectedCourseId(ALL_VALUE);
    setSelectedYear(ALL_VALUE);
    setSelectedSemester(ALL_VALUE);
    setDateFrom('');
    setDateTo('');
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = buildFilterParams({ limit: 10000, page: 1 });
      const result = await studentService.getAttendanceRecords(params);
      if (result.data.length === 0) {
        toast.warning('No records match the current filters.');
        return;
      }
      exportAttendanceRecordsToExcel(result.data);
      toast.success(`Exported ${result.data.length} record(s).`);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const totalStudentsLabel = summary?.hasFilters ? 'Students in scope' : 'Total Students';
  const presentLabel = summary?.hasFilters ? 'Present (filtered)' : 'Present (all-time)';
  const absentLabel = summary?.hasFilters ? 'Absent (filtered)' : 'Absent (all-time)';
  const attendanceRateLabel = summary?.hasFilters ? 'Attendance Rate (filtered)' : 'Attendance Rate (overall)';

  const totalStudentsValue = summary?.totalStudentsInScope ?? 0;
  const presentValue = summary?.presentCount ?? 0;
  const absentValue = summary?.absentCount ?? 0;
  const attendanceRateValue = summary?.attendanceRatePct ?? 0;

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await studentService.deleteAttendanceRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
      loadAttendanceSummary();
      toast.success('Record deleted.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to delete record.');
    }
  };

  const handleEdit = (record: AttendanceRecordRow) => {
    setCurrentRecord(record);
    setEditOpen(true);
  };

  const saveEdit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentRecord) return;
    const formData = new FormData(e.target as HTMLFormElement);
    const updatedStatus = formData.get('status') as string;
    try {
      await studentService.updateAttendanceRecord(currentRecord.id, { status: updatedStatus as any });
      setRecords(prev => prev.map(r => r.id === currentRecord.id ? { ...r, status: updatedStatus } : r));
      setEditOpen(false);
      loadAttendanceSummary();
      toast.success('Status updated.');
    } catch (error: any) {
      toast.error(error?.message || 'Failed to update status.');
    }
  };

  const formatDate = (d: string | Date) => {
    if (!d) return '—';
    const date = typeof d === 'string' ? new Date(d) : d;
    return isNaN(date.getTime()) ? '—' : date.toISOString().slice(0, 10);
  };

  const formatTime = (d: string | null) => {
    if (!d) return '—';
    const date = new Date(d);
    return isNaN(date.getTime()) ? '—' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Student Attendance Records</h1>
          <p className="text-gray-500">View and manage student presence across courses.</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Button variant="outline" className="gap-2" onClick={handleExportExcel} disabled={exporting}>
            <FileSpreadsheet size={16} /> {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          <Button className="bg-[#015F2B] hover:bg-[#014022] gap-2" onClick={openAdd}>
            <Plus size={16} /> Add attendance record
          </Button>
        </div>
      </div>

      <Tabs defaultValue="log" className="space-y-4">
        <TabsList className="bg-gray-100 p-1">
          <TabsTrigger value="log">Attendance log</TabsTrigger>
          <TabsTrigger value="daily-bulk">Daily bulk marking</TabsTrigger>
        </TabsList>

        <TabsContent value="daily-bulk" className="mt-0">
          <DailyAttendanceGrid
            schools={schools.map((s) => ({ id: s.id, name: s.name }))}
            programs={allPrograms}
            programToSchoolMap={programToSchoolMap}
            onSaved={() => {
              loadAttendanceRecords();
              loadAttendanceSummary();
            }}
          />
        </TabsContent>

        <TabsContent value="log" className="mt-0 space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{totalStudentsLabel}</p>
              <h3 className="text-2xl font-bold text-gray-900">{summaryLoading ? '—' : totalStudentsValue}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <User size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{presentLabel}</p>
              <h3 className="text-2xl font-bold text-[#015F2B]">{summaryLoading ? '—' : presentValue}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-[#015F2B]">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{absentLabel}</p>
              <h3 className="text-2xl font-bold text-red-600">{summaryLoading ? '—' : absentValue}</h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <XCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">{attendanceRateLabel}</p>
              <h3 className="text-2xl font-bold text-blue-600">{summaryLoading ? '—' : (attendanceRateValue + '%')}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Attendance Log</CardTitle>
          <CardDescription>
            Showing {records.length} of {total} records. Filters are applied on the server.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3 mb-6">
            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[220px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student name or number..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAttendanceRecords()}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[170px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All statuses</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
            </div>
            <div className="flex flex-col md:flex-row gap-3 flex-wrap">
              <Select value={selectedSchool} onValueChange={handleSchoolChange}>
                <SelectTrigger className="w-[200px]">
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All schools</SelectItem>
                  {schools.map(s => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedProgramId} onValueChange={handleProgramChange}>
                <SelectTrigger className="w-[220px]">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>
                    {selectedSchool === ALL_VALUE ? 'All programs' : `All programs in school`}
                  </SelectItem>
                  {filteredPrograms.map(p => (
                    <SelectItem key={p.id} value={p.id}>{p.code} — {p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedCourseId} onValueChange={setSelectedCourseId}>
                <SelectTrigger className="w-[240px]">
                  <SelectValue placeholder="Course" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>
                    {selectedProgramId === ALL_VALUE && selectedSchool === ALL_VALUE
                      ? 'All courses'
                      : 'All courses in scope'}
                  </SelectItem>
                  {filteredCourses.map(c => (
                    <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedYear} onValueChange={handleYearChange}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All years</SelectItem>
                  {YEAR_OPTIONS.map(y => (
                    <SelectItem key={y} value={String(y)}>Year {y}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={selectedSemester} onValueChange={handleSemesterChange}>
                <SelectTrigger className="w-[150px]">
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={ALL_VALUE}>All semesters</SelectItem>
                  {SEMESTER_OPTIONS.map(s => (
                    <SelectItem key={s} value={String(s)}>Semester {s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={loadAttendanceRecords} className="gap-2">
                <Filter className="h-4 w-4" /> Apply
              </Button>
              <Button variant="ghost" onClick={clearFilters}>Clear</Button>
            </div>
          </div>

          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Student</TableHead>
                  <TableHead>Student ID</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Check-in Time</TableHead>
                  <TableHead>Verified By</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {recordsLoading ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center text-muted-foreground">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : records.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={8} className="h-24 text-center">
                      No records found. Apply filters or select a program.
                    </TableCell>
                  </TableRow>
                ) : (
                  records.map((record) => (
                    <TableRow key={record.id}>
                      <TableCell className="whitespace-nowrap font-medium text-sm text-gray-700">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-gray-100 text-xs">
                              {record.studentName.split(' ').map(n => n[0]).join('').slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          <span className="font-medium text-gray-900">{record.studentName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{record.studentNumber}</TableCell>
                      <TableCell className="text-sm font-medium">{record.courseName || record.courseCode || '—'}</TableCell>
                      <TableCell className="text-sm whitespace-nowrap">{formatTime(record.markedAt)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {record.markedBy && record.markedBy !== '—' ? (
                          <span className="flex items-center gap-1">
                            <MapPin size={10} /> {record.markedBy}
                          </span>
                        ) : '—'}
                      </TableCell>
                      <TableCell>
                        <StatusBadge status={record.status} />
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
                            <DropdownMenuItem onClick={() => handleEdit(record)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit Status
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-red-600 focus:text-red-600" onClick={() => handleDelete(record.id)}>
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
            {total > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{total} total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">Page {page} of {Math.max(1, Math.ceil(total / pageSize))}</span>
                  <Button variant="outline" size="sm" disabled={page >= Math.ceil(total / pageSize)} onClick={() => setPage(p => p + 1)}>
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit Attendance Status</DialogTitle>
            <DialogDescription>
              Update the status for {currentRecord?.studentName} in {currentRecord?.courseName}.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={saveEdit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="status">Attendance Status</Label>
                <Select name="status" defaultValue={currentRecord?.status}>
                  <SelectTrigger id="status">
                    <SelectValue placeholder="Select status" />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map(s => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]">Update</Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add attendance record</DialogTitle>
            <DialogDescription>
              Search for a student, pick a course they are enrolled in, and record their attendance for the chosen date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="grid gap-5 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-student">Student *</Label>
                <Combobox
                  options={studentResults.map((s) => ({
                    value: s.id,
                    label: `${s.firstName} ${s.lastName}${s.studentNumber ? ` (${s.studentNumber})` : ''}`,
                    description: s.email,
                  }))}
                  value={addStudentId}
                  onValueChange={handleStudentSelect}
                  onSearchChange={setStudentSearch}
                  manualFiltering
                  loading={studentSearchLoading}
                  placeholder="Search and select a student..."
                  searchPlaceholder="Search by name, number, or email…"
                  emptyText={studentSearch.trim() ? 'No matching students.' : 'Start typing to search students.'}
                  selectedLabel={selectedStudent ? `${selectedStudent.firstName} ${selectedStudent.lastName}${selectedStudent.studentNumber ? ` (${selectedStudent.studentNumber})` : ''}` : undefined}
                />
              </div>

              {selectedStudent && (
                <div className="rounded-md border bg-muted/30 p-3 text-sm">
                  <div className="flex items-center gap-2 mb-2 text-gray-900 font-medium">
                    <GraduationCap className="h-4 w-4 text-[#015F2B]" />
                    {selectedStudent.firstName} {selectedStudent.lastName}
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Program</p>
                      <p className="font-medium text-gray-800 break-words">{programNameForSelected || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Year</p>
                      <p className="font-medium text-gray-800">{selectedStudent.year || '—'}</p>
                    </div>
                    <div>
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">Semester</p>
                      <p className="font-medium text-gray-800">{selectedStudent.semester || '—'}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="add-class">Course *</Label>
                <Select
                  value={addClassId}
                  onValueChange={setAddClassId}
                  disabled={!addStudentId || enrollmentsLoading}
                  required
                >
                  <SelectTrigger id="add-class">
                    <SelectValue
                      placeholder={
                        !addStudentId
                          ? 'Select a student first'
                          : enrollmentsLoading
                          ? 'Loading enrolled courses…'
                          : studentEnrollments.length === 0
                          ? 'No active enrollments found'
                          : 'Select a course'
                      }
                    />
                  </SelectTrigger>
                  <SelectContent>
                    {studentEnrollments.map((opt) => (
                      <SelectItem key={opt.classId} value={opt.classId}>
                        {opt.courseCode ? `${opt.courseCode} — ` : ''}
                        {opt.courseName || opt.className}
                        {opt.className && opt.courseName ? ` · ${opt.className}` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {addStudentId && !enrollmentsLoading && studentEnrollments.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    This student has no active class enrollments yet. Enrollments are derived from the student&apos;s program intake — confirm their program, year and semester are set.
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="add-date">Date *</Label>
                  <Input
                    id="add-date"
                    type="date"
                    value={addDate}
                    onChange={e => setAddDate(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="add-status">Status</Label>
                  <Select value={addStatus} onValueChange={setAddStatus}>
                    <SelectTrigger id="add-status">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map(s => (
                        <SelectItem key={s} value={s}>{s}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button
                type="submit"
                className="bg-[#015F2B] hover:bg-[#014022]"
                disabled={addSaving || !addStudentId || !addClassId}
              >
                {addSaving ? 'Saving…' : 'Add record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function StatusBadge({ status }: { status: string }) {
  if (status === 'Present') {
    return <Badge className="bg-[#015F2B]/10 text-[#015F2B] border-[#015F2B]/20 shadow-none">Present</Badge>;
  }
  if (status === 'Absent') {
    return <Badge className="bg-red-50 text-red-700 border-red-200 shadow-none">Absent</Badge>;
  }
  if (status === 'Late') {
    return <Badge className="bg-[#F6A000]/10 text-[#F6A000] border-[#F6A000]/20 shadow-none">Late</Badge>;
  }
  if (status === 'Excused') {
    return <Badge className="bg-blue-50 text-blue-700 border-blue-200 shadow-none">Excused</Badge>;
  }
  return <Badge variant="outline">{status}</Badge>;
}
