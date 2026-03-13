import React, { useState, useEffect, useCallback } from 'react';
import {
  Search, Filter, MoreHorizontal, FileSpreadsheet,
  User, CheckCircle, XCircle, Clock, MapPin,
  Trash2, Edit, ChevronLeft, ChevronRight, Plus
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
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { studentService, academicService } from '@/services';
import { exportAttendanceRecordsToExcel } from '@/utils/excel';
import type { AttendanceRecordRow } from '@/types/student';
import type { School } from '@/types';
import type { Course } from '@/types';
import type { Student } from '@/types';
import type { Class } from '@/types';
import { toast } from 'sonner';

const STATUS_OPTIONS = ['Present', 'Absent', 'Late', 'Excused'] as const;
const ALL_PROGRAMS_VALUE = '__all__';
const ALL_VALUE = '__all__';

export default function StudentRecords() {
  const [records, setRecords] = useState<AttendanceRecordRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);
  const [programCodes, setProgramCodes] = useState<string[]>([]);
  const [selectedProgram, setSelectedProgram] = useState<string>(ALL_PROGRAMS_VALUE);
  const [schools, setSchools] = useState<School[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>(ALL_VALUE);
  const [selectedCourse, setSelectedCourse] = useState<string>(ALL_VALUE);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [recordsLoading, setRecordsLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [currentRecord, setCurrentRecord] = useState<AttendanceRecordRow | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addStudentId, setAddStudentId] = useState('');
  const [addClassId, setAddClassId] = useState('');
  const [addDate, setAddDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [addStatus, setAddStatus] = useState<string>('Present');
  const [addSaving, setAddSaving] = useState(false);
  const [studentsForAdd, setStudentsForAdd] = useState<Student[]>([]);
  const [classesForAdd, setClassesForAdd] = useState<Class[]>([]);

  useEffect(() => {
    studentService.getProgramCodes().then(codes => setProgramCodes(codes));
  }, []);
  useEffect(() => {
    academicService.getSchools().then(list => setSchools(list || []));
  }, []);
  useEffect(() => {
    academicService.getCourses({ limit: 50 }).then(r => setCourses(r.data || []));
  }, []);

  const buildFilterParams = useCallback((opts?: { limit?: number; page?: number }) => {
    const params: Record<string, string | number | undefined> = {
      page: opts?.page ?? page,
      limit: opts?.limit ?? pageSize,
    };
    if (selectedProgram && selectedProgram !== ALL_PROGRAMS_VALUE) params.program = selectedProgram;
    if (selectedSchool && selectedSchool !== ALL_VALUE) params.schoolId = selectedSchool;
    if (selectedCourse && selectedCourse !== ALL_VALUE) params.courseId = selectedCourse;
    if (dateFrom) params.startDate = dateFrom;
    if (dateTo) params.endDate = dateTo;
    if (statusFilter !== 'All') params.status = statusFilter;
    if (searchTerm.trim()) params.search = searchTerm.trim();
    return params;
  }, [selectedProgram, selectedSchool, selectedCourse, dateFrom, dateTo, statusFilter, searchTerm, page, pageSize]);

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

  useEffect(() => {
    setPage(1);
  }, [selectedProgram, selectedSchool, selectedCourse, dateFrom, dateTo, statusFilter, searchTerm]);

  useEffect(() => {
    loadAttendanceRecords();
  }, [loadAttendanceRecords]);

  useEffect(() => {
    if (addOpen) {
      studentService.getStudents({ limit: 50 }).then(r => setStudentsForAdd(r.data || []));
      academicService.getClasses({ limit: 50 }).then(r => setClassesForAdd(r.data || []));
    }
  }, [addOpen]);

  const openAdd = () => {
    setAddStudentId('');
    setAddClassId('');
    setAddDate(new Date().toISOString().slice(0, 10));
    setAddStatus('Present');
    setAddOpen(true);
  };

  const handleAddSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addStudentId || !addClassId || !addDate) {
      toast.error('Please select student, class, and date.');
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
    setSelectedCourse(ALL_VALUE);
    setDateFrom('');
    setDateTo('');
  };

  const handleExportExcel = async () => {
    setExporting(true);
    try {
      const params = buildFilterParams({ limit: 50, page: 1 });
      const result = await studentService.getAttendanceRecords(params);
      exportAttendanceRecordsToExcel(result.data);
      toast.success(`Exported ${result.data.length} record(s).`);
    } catch (e: any) {
      toast.error(e?.message || 'Export failed.');
    } finally {
      setExporting(false);
    }
  };

  const presentInList = records.filter(r => r.status === 'Present').length;
  const absentInList = records.filter(r => r.status === 'Absent').length;
  const uniqueStudents = new Set(records.map(r => r.studentId)).size;
  const attendanceRatePct = (presentInList + absentInList) > 0
    ? Math.round((presentInList / (presentInList + absentInList)) * 1000) / 10
    : (records.length > 0 ? Math.round((records.filter(r => r.status === 'Present').length / records.length) * 1000) / 10 : 0);

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this attendance record?')) return;
    try {
      await studentService.deleteAttendanceRecord(id);
      setRecords(prev => prev.filter(r => r.id !== id));
      setTotal(prev => Math.max(0, prev - 1));
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
          <Select value={selectedProgram} onValueChange={setSelectedProgram}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All programs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_PROGRAMS_VALUE}>All programs</SelectItem>
              {programCodes.map(code => (
                <SelectItem key={code} value={code}>{code}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-[200px]">
              <SelectValue placeholder="All schools" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All schools</SelectItem>
              {schools.map(s => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={selectedCourse} onValueChange={setSelectedCourse}>
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="All courses" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL_VALUE}>All courses</SelectItem>
              {courses.map(c => (
                <SelectItem key={c.id} value={c.id}>{c.code} – {c.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={handleExportExcel} disabled={exporting}>
            <FileSpreadsheet size={16} /> {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
          <Button className="bg-[#015F2B] hover:bg-[#014022] gap-2" onClick={openAdd}>
            <Plus size={16} /> Add attendance record
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students (in list)</p>
              <h3 className="text-2xl font-bold text-gray-900">{recordsLoading ? '—' : uniqueStudents}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <User size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Present (filtered)</p>
              <h3 className="text-2xl font-bold text-[#015F2B]">{recordsLoading ? '—' : presentInList}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-[#015F2B]">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Absent (filtered)</p>
              <h3 className="text-2xl font-bold text-red-600">{recordsLoading ? '—' : absentInList}</h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <XCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Attendance Rate</p>
              <h3 className="text-2xl font-bold text-blue-600">{recordsLoading ? '—' : (attendanceRatePct + '%')}</h3>
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
          <div className="space-y-4 mb-6">
            <div className="flex flex-col md:flex-row gap-4 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search student name or ID..."
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadAttendanceRecords()}
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Statuses</SelectItem>
                  {STATUS_OPTIONS.map(s => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input type="date" placeholder="From" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="w-[150px]" />
              <Input type="date" placeholder="To" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="w-[150px]" />
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
        <DialogContent>
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
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add attendance record</DialogTitle>
            <DialogDescription>
              Record attendance for a student in a class on a given date.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleAddSubmit}>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-student">Student</Label>
                <Select value={addStudentId} onValueChange={setAddStudentId} required>
                  <SelectTrigger id="add-student">
                    <SelectValue placeholder="Select student" />
                  </SelectTrigger>
                  <SelectContent>
                    {studentsForAdd.map(s => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName}{s.studentNumber ? ` (${s.studentNumber})` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-class">Class</Label>
                <Select value={addClassId} onValueChange={setAddClassId} required>
                  <SelectTrigger id="add-class">
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classesForAdd.map(c => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name || c.id}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-date">Date</Label>
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
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={addSaving}>
                {addSaving ? 'Saving…' : 'Add record'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
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
