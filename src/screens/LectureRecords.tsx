/**
 * Lecture Records Screen
 * Matches exact format of 3.csv: DATE, LECTURER'S NAME, CLASS, COURSE UNIT, 
 * TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT
 */

import React, { useState, useEffect, useRef } from 'react';
import { 
  Search, Filter, Plus, FileSpreadsheet, MoreHorizontal, 
  Calendar as CalendarIcon, Clock, User, BookOpen, MapPin, 
  Trash2, Edit, CheckCircle, XCircle, AlertCircle, Download, Upload, LogIn, LogOut,
  ChevronLeft, ChevronRight
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
import { 
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger 
} from '@/components/ui/dropdown-menu';
import { qaService } from '@/services/qa.service';
import { academicService, staffService } from '@/services';
import { exportLectureRecordsToCSV, importLectureRecordsFromCSV, downloadLectureRecordsImportTemplateExcel, LECTURE_RECORDS_IMPORT_CSV_HEADER } from '@/utils/excel';
import { toast } from 'sonner';
import type { QALectureRecord } from '@/types/qa';

export default function LectureRecords() {
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
  const [page, setPage] = useState(1);
  const [pageSize] = useState(20);
  const commentOptions = ['TAUGHT', 'UNTAUGHT', 'COMPENSATION', 'MEETING', 'SDL', 'STUDENTS_ORIENTATION'];

  // Debounce search term
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearchTerm(searchTerm);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchTerm]);

  // Load initial data on mount
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

  const loadLecturers = async () => {
    try {
      const response = await staffService.getLecturers();
      const lecturerNames = response.data.map((lecturer: any) => 
        `${lecturer.firstName} ${lecturer.lastName}`.trim()
      );
      setAllLecturers([...new Set(lecturerNames)].sort());
    } catch (error) {
      console.error('Error loading lecturers:', error);
      setAllLecturers([]);
    }
  };

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

  const loadRecords = async () => {
    setIsLoading(true);
    try {
      const filter: any = {
        page,
        limit: pageSize,
        sortBy: 'date',
        sortOrder: 'desc',
      };

      if (schoolFilter !== 'All') {
        filter.school = schoolFilter;
      }

      if (lecturerFilter !== 'All') {
        filter.lecturerName = lecturerFilter;
      } else if (debouncedSearchTerm.trim()) {
        filter.lecturerName = debouncedSearchTerm.trim();
      }

      if (classFilter !== 'All') {
        filter.class = classFilter;
      }

      if (commentFilter !== 'All') {
        const commentValue = commentFilter === 'STUDENTS ORIENTATION' ? 'STUDENTS_ORIENTATION' : commentFilter;
        filter.comment = commentValue;
      }

      if (statusFilter !== 'All') {
        filter.checkInStatus = statusFilter;
      }

      if (dateFrom) {
        filter.startDate = dateFrom;
      }

      if (dateTo) {
        filter.endDate = dateTo;
      }

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

  const filteredRecords = records;
  const taughtCount = filteredRecords.filter((r: QALectureRecord) => (r.comment || '').toUpperCase() === 'TAUGHT').length;
  const untaughtCount = filteredRecords.filter((r: QALectureRecord) => (r.comment || '').toUpperCase() === 'UNTAUGHT').length;
  const onTimeCount = filteredRecords.filter((r: any) => (r.status || 'OnTime') === 'OnTime').length;
  const onTimeRatePct = filteredRecords.length > 0 ? Math.round((onTimeCount / filteredRecords.length) * 1000) / 10 : 0;

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
    
    const newRecord: QALectureRecord = {
      date: formData.get('date') as string,
      lecturerName: formData.get('lecturerName') as string,
      class: formData.get('class') as string,
      courseUnit: formData.get('courseUnit') as string,
      timeForStarting: startTime,
      timeOutForEnding: endTime,
      duration: duration,
      timeLost: formData.get('timeLost') as string || '0',
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
      setIsDialogOpen(false);
      setCurrentRecordId(null);
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
      } catch (error) {
        console.error('Error deleting record:', error);
        toast.error('Failed to delete record. Please try again.');
      }
    }
  };

  const openEdit = (id: string) => {
    setCurrentRecordId(id);
    const record = records.find(r => r.id === id);
    if (!record) return;
    
    // Try to determine school from the record's class asynchronously
    if (record.class) {
      qaService.getSchools().then(allSchools => {
        Promise.all(
          allSchools.map(school => 
            qaService.getClassesBySchool(school).then(classes => ({ school, classes }))
          )
        ).then(results => {
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
    setIsDialogOpen(true);
  };

  const handleExport = async () => {
    try {
      if (filteredRecords.length === 0) {
        toast.warning('No records to export. Please apply filters to see records.');
        return;
      }
      const filename = `Lecture_Records_${new Date().toISOString().split('T')[0]}.xlsx`;
      exportLectureRecordsToCSV(filteredRecords, filename);
      toast.success(`Exported ${filteredRecords.length} record(s) to Excel.`);
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
    } catch (error: any) {
      console.error('Error importing lecture records:', error);
      toast.error(`Failed to import: ${error?.message || 'Unknown error'}`);
    }
  };

  const formatDate = (date: Date | string): string => {
    if (typeof date === 'string') {
      // Try to parse various date formats
      const parsed = new Date(date);
      if (!isNaN(parsed.getTime())) {
        return parsed.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
      }
      return date;
    }
    return date.toLocaleDateString('en-US', { month: 'numeric', day: 'numeric', year: 'numeric' });
  };

  const getCommentBadgeVariant = (comment: string) => {
    switch (comment.toUpperCase()) {
      case 'TAUGHT':
        return 'default';
      case 'UNTAUGHT':
        return 'destructive';
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
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExport} disabled={filteredRecords.length === 0}>
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

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Lectures (in list)</p>
              <h3 className="text-2xl font-bold text-gray-900">{isLoading ? '—' : filteredRecords.length}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <BookOpen size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Taught (filtered)</p>
              <h3 className="text-2xl font-bold text-[#015F2B]">{isLoading ? '—' : taughtCount}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-[#015F2B]">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Untaught (filtered)</p>
              <h3 className="text-2xl font-bold text-red-600">{isLoading ? '—' : untaughtCount}</h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <XCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">On-time rate</p>
              <h3 className="text-2xl font-bold text-blue-600">{isLoading ? '—' : (onTimeRatePct + '%')}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-600">
              <Clock size={20} />
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
                  {commentOptions.map(comment => (
                    <SelectItem key={comment} value={comment}>
                      {comment === 'STUDENTS_ORIENTATION' ? 'STUDENTS ORIENTATION' : comment}
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
                  <TableHead>LECTURER'S NAME</TableHead>
                  <TableHead>CLASS</TableHead>
                  <TableHead>COURSE UNIT</TableHead>
                  <TableHead>TIME FOR STARTING</TableHead>
                  <TableHead>TIME OUT FOR ENDING</TableHead>
                  <TableHead>CHECK-IN</TableHead>
                  <TableHead>CHECK-OUT</TableHead>
                  <TableHead>DURATION</TableHead>
                  <TableHead>TIME LOST</TableHead>
                  <TableHead>STATUS</TableHead>
                  <TableHead>COMMENT</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center">
                      Loading records...
                    </TableCell>
                  </TableRow>
                ) : filteredRecords.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={13} className="h-24 text-center">
                      No records found.
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredRecords.map((record, index) => (
                    <TableRow key={index}>
                      <TableCell className="whitespace-nowrap font-medium">
                        {formatDate(record.date)}
                      </TableCell>
                      <TableCell className="font-medium">{record.lecturerName}</TableCell>
                      <TableCell>{record.class || (record as any).className || '-'}</TableCell>
                      <TableCell className="max-w-xs truncate">{record.courseUnit}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{record.timeForStarting}</TableCell>
                      <TableCell className="whitespace-nowrap text-sm">{record.timeOutForEnding}</TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.checkInTime ? (
                          <div className="flex items-center gap-1 text-green-600">
                            <LogIn className="h-3 w-3" />
                            <span className="text-sm font-medium">{record.checkInTime}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.checkOutTime ? (
                          <div className="flex items-center gap-1 text-blue-600">
                            <LogOut className="h-3 w-3" />
                            <span className="text-sm font-medium">{record.checkOutTime}</span>
                          </div>
                        ) : (
                          <span className="text-gray-400 text-sm">-</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">
                        {record.lessonTimeout ? (
                          <div className="flex items-center gap-1">
                            <Clock className="h-3 w-3 text-gray-500" />
                            <span className="text-sm font-medium">{record.lessonTimeout}</span>
                          </div>
                        ) : (
                          <span className="text-sm">{record.duration}</span>
                        )}
                      </TableCell>
                      <TableCell className="whitespace-nowrap">{record.timeLost}</TableCell>
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
                          {record.comment}
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
                            <DropdownMenuItem onClick={() => record.id && openEdit(record.id)}>
                              <Edit className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
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

      {/* Import Lecture Records Dialog */}
      <Dialog open={importOpen} onOpenChange={setImportOpen}>
        <DialogContent className="sm:max-w-md">
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

      {/* Record/Edit Dialog */}
      <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
        <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
          <form onSubmit={handleSave}>
            <DialogHeader>
              <DialogTitle>{currentRecordId !== null ? 'Edit Lecture Record' : 'Record New Lecture'}</DialogTitle>
              <DialogDescription>
                Enter the details matching the CSV format. Click save when you're done.
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="date">DATE *</Label>
                  <Input 
                    id="date" 
                    name="date" 
                    type="date" 
                    required 
                    defaultValue={currentRecordId !== null ? formatDate(records.find(r => r.id === currentRecordId)?.date || '') : new Date().toISOString().split('T')[0]} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lecturerName">LECTURER'S NAME *</Label>
                  <Input 
                    id="lecturerName" 
                    name="lecturerName" 
                    placeholder="e.g. Mr. Wagima Christopher" 
                    required 
                    defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.lecturerName || '' : ''} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="school">SCHOOL *</Label>
                  <Select 
                    value={selectedSchool} 
                    onValueChange={(value) => {
                      setSelectedSchool(value);
                      // Reset class selection when school changes
                      const classInput = document.getElementById('class') as HTMLInputElement;
                      if (classInput) classInput.value = '';
                    }}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select a school" />
                    </SelectTrigger>
                    <SelectContent>
                      {schools.map(school => (
                        <SelectItem key={school} value={school}>{school}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">CLASS *</Label>
                  {selectedSchool && classes.length > 0 ? (
                    <Select 
                      name="class"
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.class || '' : ''}
                      required
                    >
                      <SelectTrigger id="class-select">
                        <SelectValue placeholder="Select a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map(cls => (
                          <SelectItem key={cls} value={cls}>{cls}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : selectedSchool && classes.length === 0 ? (
                    <div className="space-y-2">
                      <Input 
                        id="class" 
                        name="class" 
                        placeholder="No classes found. Enter class manually" 
                        required 
                        defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.class || '' : ''} 
                      />
                      <p className="text-xs text-gray-500">No classes found for this school. You can enter the class manually.</p>
                    </div>
                  ) : (
                    <Input 
                      id="class" 
                      name="class" 
                      placeholder="Select a school first" 
                      required 
                      disabled={!selectedSchool}
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.class || '' : ''} 
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="courseUnit">COURSE UNIT *</Label>
                  <Input 
                    id="courseUnit" 
                    name="courseUnit" 
                    placeholder="e.g. MATHEMATICS FOR ECONOMICS" 
                    required 
                    defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.courseUnit || '' : ''} 
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
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

              {/* Check-in/Check-out Section */}
              <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
                <div className="flex items-center justify-between">
                  <div>
                    <Label className="text-base font-semibold">Actual Attendance Tracking</Label>
                    <p className="text-sm text-gray-500">Record actual check-in and check-out times</p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="checkInTime">Check-In Time (Actual)</Label>
                    <Input 
                      id="checkInTime" 
                      name="checkInTime" 
                      type="time" 
                      step="1"
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.checkInTime || '' : ''} 
                    />
                    <p className="text-xs text-gray-500">Time when lecturer actually arrived</p>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="checkOutTime">Check-Out Time (Actual)</Label>
                    <Input 
                      id="checkOutTime" 
                      name="checkOutTime" 
                      type="time" 
                      step="1"
                      defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.checkOutTime || '' : ''} 
                    />
                    <p className="text-xs text-gray-500">Time when lecturer actually left</p>
                  </div>
                </div>

                {currentRecordId !== null && records.find(r => r.id === currentRecordId)?.checkInTime && records.find(r => r.id === currentRecordId)?.checkOutTime && (
                  <div className="pt-2 border-t">
                    <div className="flex items-center gap-2 text-sm">
                      <Clock className="h-4 w-4 text-gray-500" />
                      <span className="text-gray-500">Lesson Duration:</span>
                      <span className="font-semibold">
                        {calculateDuration(records.find(r => r.id === currentRecordId)?.checkInTime || '', records.find(r => r.id === currentRecordId)?.checkOutTime || '')}
                      </span>
                    </div>
                  </div>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="timeLost">TIME LOST</Label>
                  <Input 
                    id="timeLost" 
                    name="timeLost" 
                    placeholder="e.g. 00:50:00 or 0" 
                    defaultValue={currentRecordId !== null ? records.find(r => r.id === currentRecordId)?.timeLost || '0' : '0'} 
                  />
                </div>
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
                      {commentOptions.map(comment => (
                        <SelectItem key={comment} value={comment}>
                          {comment === 'STUDENTS_ORIENTATION' ? 'STUDENTS ORIENTATION' : comment}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
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
