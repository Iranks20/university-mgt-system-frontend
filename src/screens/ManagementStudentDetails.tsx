/**
 * Management Student Details Screen
 * View student details, records, and generate reports
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, User, GraduationCap, Calendar, 
  BookOpen, TrendingDown, TrendingUp, AlertCircle, CheckCircle,
  FileText, BarChart, Users, School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { studentService, reportService, settingsService } from '@/services';
import { exportStudentAttendanceReport } from '@/utils/excel';
import type { StudentAttendanceReport } from '@/types/student';
import { toast } from 'sonner';

export default function ManagementStudentDetails() {
  const [searchTerm, setSearchTerm] = useState('');
  const [programFilter, setProgramFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [programCodes, setProgramCodes] = useState<string[]>([]);
  const [selectedStudent, setSelectedStudent] = useState<StudentAttendanceReport | null>(null);
  const [activeTab, setActiveTab] = useState('overview');

  const [students, setStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState(settingsService.getDefaultThresholds());

  useEffect(() => {
    // Load performance thresholds from API
    settingsService.getPerformanceThresholds().then(setThresholds).catch(() => {
      // Use defaults if API fails
      setThresholds(settingsService.getDefaultThresholds());
    });
  }, []);

  useEffect(() => {
    loadProgramCodes();
  }, []);

  useEffect(() => {
    const loadStudents = async () => {
      setLoading(true);
      try {
        const res = await studentService.getStudents({ page: 1, limit: 200 });
        const list = res?.data ?? [];
        
        // Fetch attendance data for each student
        const mapped = await Promise.all(
          list.map(async (s: any) => {
            let attendance = 0;
            let totalLectures = 0;
            let attendedLectures = 0;
            let status = 'Good';
            
            try {
              // Fetch attendance records for this student
              const attendanceRecords = await studentService.getStudentAttendance(s.id);
              const presentRecords = attendanceRecords.filter((a: any) => a.status === 'Present');
              const lateRecords = attendanceRecords.filter((a: any) => a.status === 'Late');
              const excusedRecords = attendanceRecords.filter((a: any) => a.status === 'Excused');
              
              totalLectures = attendanceRecords.length;
              const expectedLectures = Math.max(0, totalLectures - excusedRecords.length);
              attendedLectures = presentRecords.length + 0.5 * lateRecords.length;
              
              if (expectedLectures > 0) {
                attendance = Math.round((attendedLectures / expectedLectures) * 100);
              }
              
              // Calculate status based on attendance rate
              // Use thresholds from API
              if (attendance >= thresholds.student.excellent) {
                status = 'Excellent';
              } else if (attendance >= thresholds.student.good) {
                status = 'Good';
              } else if (attendance >= thresholds.student.warning) {
                status = 'Warning';
              } else {
                status = 'Critical';
              }
            } catch (error) {
              console.warn(`Error fetching attendance for student ${s.id}:`, error);
              // Keep default values if attendance fetch fails
            }
            
            return {
              id: s.id,
              registrationNumber: s.studentNumber,
              name: `${s.firstName || ''} ${s.lastName || ''}`.trim(),
              program: s.program || '',
              year: s.year ?? 1,
              semester: s.semester ?? 1,
              attendance,
              totalLectures,
              attendedLectures,
              status,
              email: s.email || '',
              phone: s.phone || '',
            };
          })
        );
        
        setStudents(mapped);
      } catch (error) {
        console.error('Error loading students:', error);
      } finally {
        setLoading(false);
      }
    };
    loadStudents();
  }, []);

  const loadProgramCodes = async () => {
    try {
      const codes = await studentService.getProgramCodes();
      setProgramCodes(codes);
    } catch (error) {
      console.error('Error loading program codes:', error);
    }
  };

  const filteredStudents = students.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.program.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesProgram = programFilter === 'All' || student.program === programFilter;
    const matchesYear = yearFilter === 'All' || student.year.toString() === yearFilter;

    return matchesSearch && matchesProgram && matchesYear;
  });

  const handleViewDetails = async (student: any) => {
    try {
      const report = await studentService.getStudentAttendanceReport(student.registrationNumber);
      if (report) {
        setSelectedStudent(report);
        setActiveTab('details');
      }
    } catch (error) {
      console.error('Error loading student details:', error);
    }
  };

  const handleExportReport = async (student: any) => {
    try {
      const report = await studentService.getStudentAttendanceReport(student.registrationNumber);
      if (report) {
        exportStudentAttendanceReport(report);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  const handleExportAll = async () => {
    try {
      const filters: any = {};
      if (programFilter !== 'All') filters.program = programFilter;
      if (yearFilter !== 'All') filters.year = parseInt(yearFilter);
      
      const result = await reportService.exportReport(
        'student-attendance',
        'excel',
        undefined
      );
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      } else if ((result as { content?: string })?.content) {
        const blob = new Blob([(result as unknown as { content: string }).content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `all-students-attendance-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export all students: ${error?.message || 'Unknown error'}`);
    }
  };

  const getStatusBadge = (status: string) => {
    const variants: Record<string, any> = {
      'Excellent': { variant: 'default', className: 'bg-green-100 text-green-800 border-green-200' },
      'Good': { variant: 'default', className: 'bg-blue-100 text-blue-800 border-blue-200' },
      'Warning': { variant: 'secondary', className: 'bg-orange-100 text-orange-800 border-orange-200' },
      'Critical': { variant: 'destructive', className: 'bg-red-100 text-red-800 border-red-200' },
    };
    const config = variants[status] || variants['Good'];
    return <Badge {...config}>{status}</Badge>;
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Student Details & Reports</h1>
          <p className="text-gray-500">View student information, attendance records, and generate reports.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" className="gap-2" onClick={handleExportAll}>
            <Download size={16} /> Export All
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Students</p>
              <h2 className="text-3xl font-bold text-gray-900">{students.length}</h2>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
              <h2 className="text-3xl font-bold text-gray-900">
                {(students.reduce((sum, s) => sum + s.attendance, 0) / students.length).toFixed(1)}%
              </h2>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">At Risk</p>
              <h2 className="text-3xl font-bold text-red-600">
                {students.filter(s => s.status === 'Warning' || s.status === 'Critical').length}
              </h2>
            </div>
            <div className="bg-red-100 p-3 rounded-full">
              <AlertCircle className="w-6 h-6 text-red-600" />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Programs</p>
              <h2 className="text-3xl font-bold text-gray-900">{programCodes.length}</h2>
            </div>
            <div className="bg-purple-100 p-3 rounded-full">
              <School className="w-6 h-6 text-purple-600" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex flex-col md:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder="Search by name, registration number, or program..." 
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <Select value={programFilter} onValueChange={setProgramFilter}>
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Programs</SelectItem>
                {programCodes.map(code => (
                  <SelectItem key={code} value={code}>{code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={yearFilter} onValueChange={setYearFilter}>
              <SelectTrigger className="w-full md:w-[150px]">
                <SelectValue placeholder="Year" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="All">All Years</SelectItem>
                <SelectItem value="1">Year 1</SelectItem>
                <SelectItem value="2">Year 2</SelectItem>
                <SelectItem value="3">Year 3</SelectItem>
                <SelectItem value="4">Year 4</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* Students Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Records</CardTitle>
          <CardDescription>
            Showing {filteredStudents.length} student{filteredStudents.length !== 1 ? 's' : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Registration Number</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Year</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-center">Lectures</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredStudents.map((student) => (
                <TableRow key={student.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#015F2B]/10 text-[#015F2B] font-medium">
                          {student.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{student.name}</div>
                        <div className="text-xs text-muted-foreground">{student.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell className="font-mono">{student.registrationNumber}</TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell>Year {student.year}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {student.attendance >= 80 ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-bold ${
                        student.attendance >= 80 ? 'text-green-600' : 
                        student.attendance >= 70 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {student.attendance.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    {student.attendedLectures} / {student.totalLectures}
                  </TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleViewDetails(student)}
                      >
                        <FileText className="h-4 w-4 mr-1" /> View
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleExportReport(student)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Student Details Modal/Dialog would go here */}
      {selectedStudent && (
        <Card className="mt-6">
          <CardHeader>
            <CardTitle>Student Attendance Report</CardTitle>
            <CardDescription>
              Detailed attendance report for {selectedStudent.studentName}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Tabs value={activeTab} onValueChange={setActiveTab}>
              <TabsList>
                <TabsTrigger value="overview">Overview</TabsTrigger>
                <TabsTrigger value="details">Attendance Details</TabsTrigger>
                <TabsTrigger value="reports">Reports</TabsTrigger>
              </TabsList>
              <TabsContent value="overview" className="space-y-4">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Attendance</p>
                    <p className="text-2xl font-bold">{selectedStudent.overallStats?.attendancePercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attended</p>
                    <p className="text-2xl font-bold">{selectedStudent.overallStats?.attendedLectures}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected</p>
                    <p className="text-2xl font-bold">{selectedStudent.overallStats?.expectedLectures}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <p className="text-lg font-bold">
                      {getStatusBadge(
                        (selectedStudent.overallStats?.attendancePercentage || 0) >= thresholds.student.excellent ? 'Excellent' :
                        (selectedStudent.overallStats?.attendancePercentage || 0) >= thresholds.student.good ? 'Good' :
                        (selectedStudent.overallStats?.attendancePercentage || 0) >= thresholds.student.warning ? 'Warning' : 'Critical'
                      )}
                    </p>
                  </div>
                </div>
              </TabsContent>
              <TabsContent value="details">
                <p className="text-muted-foreground">Detailed attendance breakdown would go here</p>
              </TabsContent>
              <TabsContent value="reports">
                <div className="space-y-2">
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={async () => {
                      try {
                        const report = await reportService.generateReport(
                          'student-performance',
                          `Performance Report - ${selectedStudent.studentName}`,
                          { registrationNumber: selectedStudent.registrationNumber },
                          selectedStudent
                        );
                        toast.success(`Performance report generated successfully! ID: ${report.id}`);
                      } catch (error: any) {
                        console.error('Generate failed:', error);
                        toast.error(`Failed to generate report: ${error?.message || 'Unknown error'}`);
                      }
                    }}
                  >
                    <BarChart className="mr-2 h-4 w-4" /> Generate Performance Report
                  </Button>
                  <Button 
                    variant="outline" 
                    className="w-full justify-start"
                    onClick={() => {
                      const student = students.find(s => s.registrationNumber === selectedStudent.registrationNumber);
                      if (student) {
                        handleExportReport(student);
                      }
                    }}
                  >
                    <FileText className="mr-2 h-4 w-4" /> Export Attendance Report
                  </Button>
                </div>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
