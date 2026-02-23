/**
 * Management Student Performance Screen
 * Focused on student performance metrics and analytics
 * Includes student details and reports functionality
 */

import React, { useState, useEffect } from 'react';
import { 
  Search, Filter, Download, TrendingDown, TrendingUp, AlertCircle,
  GraduationCap, BarChart, Users, Target, Award, FileText, School
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { studentService, settingsService } from '@/services';
import { analyticsService } from '@/services/analytics.service';
import { exportStudentAttendanceReport } from '@/utils/excel';
import { reportService } from '@/services/report.service';
import { toast } from 'sonner';
import type { StudentAttendanceReport } from '@/types/student';

export default function ManagementStudentPerformance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [performanceFilter, setPerformanceFilter] = useState<string>('All');
  const [programFilter, setProgramFilter] = useState<string>('All');
  const [yearFilter, setYearFilter] = useState<string>('All');
  const [attendanceRangeFilter, setAttendanceRangeFilter] = useState<string>('All');
  const [studentPerformance, setStudentPerformance] = useState<any[]>([]);
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
    const fetchData = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (programFilter !== 'All') params.program = programFilter;
        if (yearFilter !== 'All') params.year = parseInt(yearFilter);
        if (searchTerm) params.search = searchTerm;
        
        const result = await studentService.getStudents(params);
        const students = Array.isArray(result) ? result : (result as any)?.data || [];
        
        const performanceData = await Promise.all(
          students.slice(0, 100).map(async (student: any) => {
            const [perfData, academicData] = await Promise.all([
              analyticsService.getStudentPerformance(student.id) as any,
              analyticsService.getStudentAcademicPerformance(student.id).catch(() => null),
            ]);
            const attendanceRate = perfData?.attendanceRate ?? 0;
            const academicScore = academicData?.academicScore ?? 0;
            const overallPerformance = academicScore > 0 
              ? (attendanceRate + academicScore) / 2 
              : attendanceRate;
            // Use thresholds from API
            const status = overallPerformance >= thresholds.student.excellent ? 'Excellent' : 
                          overallPerformance >= thresholds.student.good ? 'Good' : 
                          overallPerformance >= thresholds.student.warning ? 'Warning' : 'Critical';
            // Calculate trend: compare current academic score with previous period
            // Note: Historical data API can be added for accurate trend calculation
            const previousScore = perfData?.previousAcademicScore;
            const trend = previousScore != null 
              ? (academicScore >= previousScore ? 'up' : 'down')
              : 'up'; // Default to 'up' if no historical data available
            return {
              id: student.id,
              name: `${student.firstName || ''} ${student.lastName || ''}`.trim() || 'Unknown',
              registrationNumber: student.studentNumber || '—',
              program: student.program || '—',
              year: student.year ?? 1,
              attendance: attendanceRate,
              academicScore,
              overallPerformance,
              trend,
              status,
              courses: academicData?.courses || [],
            };
          })
        );
        
        setStudentPerformance(performanceData);
      } catch (error) {
        console.error('Error fetching student performance:', error);
        setStudentPerformance([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [programFilter, yearFilter, searchTerm]);

  const filteredStudents = studentPerformance.filter(student => {
    const matchesSearch = 
      student.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      student.registrationNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesFilter = 
      performanceFilter === 'All' ||
      (performanceFilter === 'Excellent' && student.status === 'Excellent') ||
      (performanceFilter === 'Good' && student.status === 'Good') ||
      (performanceFilter === 'Warning' && student.status === 'Warning') ||
      (performanceFilter === 'Critical' && student.status === 'Critical');
    
    const matchesProgram = programFilter === 'All' || student.program === programFilter;
    const matchesYear = yearFilter === 'All' || student.year.toString() === yearFilter;
    
    const matchesAttendanceRange = 
      attendanceRangeFilter === 'All' ||
      (attendanceRangeFilter === 'Excellent' && student.attendance >= thresholds.student.excellent) ||
      (attendanceRangeFilter === 'Good' && student.attendance >= thresholds.student.good && student.attendance < thresholds.student.excellent) ||
      (attendanceRangeFilter === 'Average' && student.attendance >= thresholds.student.warning && student.attendance < thresholds.student.good) ||
      (attendanceRangeFilter === 'Poor' && student.attendance < thresholds.student.warning);

    return matchesSearch && matchesFilter && matchesProgram && matchesYear && matchesAttendanceRange;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setPerformanceFilter('All');
    setProgramFilter('All');
    setYearFilter('All');
    setAttendanceRangeFilter('All');
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

  const [selectedStudent, setSelectedStudent] = useState<typeof studentPerformance[0] | null>(null);
  const [studentDetails, setStudentDetails] = useState<StudentAttendanceReport | null>(null);
  const [activeTab, setActiveTab] = useState<'performance' | 'details'>('performance');

  const handleViewDetails = async (student: typeof studentPerformance[0]) => {
    setSelectedStudent(student);
    setActiveTab('details');
    try {
      const report = await studentService.getStudentAttendanceReport(student.registrationNumber);
      if (report) {
        setStudentDetails(report);
      }
    } catch (error) {
      console.error('Error loading student details:', error);
    }
  };

  const handleExportReport = async (student: typeof studentPerformance[0]) => {
    try {
      const report = await studentService.getStudentAttendanceReport(student.registrationNumber);
      if (report) {
        exportStudentAttendanceReport(report);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Student Performance & Details</h1>
          <p className="text-gray-500">Track student academic performance, attendance metrics, and view detailed records.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={async () => {
              try {
                const result = await reportService.exportReport('student-performance', 'excel');
                if (result?.downloadUrl) {
                  window.open(result.downloadUrl, '_blank');
                  toast.success('Report exported successfully');
                } else {
                  // Fallback: create CSV
                  const csv = [
                    ['Name', 'Registration Number', 'Program', 'Year', 'Attendance %', 'Academic Score %', 'Overall Performance %', 'Status'].join(','),
                    ...filteredStudents.map(s => [
                      s.name,
                      s.registrationNumber,
                      s.program,
                      s.year,
                      s.attendance.toFixed(1),
                      s.academicScore.toFixed(1),
                      s.overallPerformance.toFixed(1),
                      s.status,
                    ].join(',')),
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `student-performance-${new Date().toISOString().split('T')[0]}.csv`;
                  document.body.appendChild(a);
                  a.click();
                  window.URL.revokeObjectURL(url);
                  document.body.removeChild(a);
                  toast.success('Report exported successfully');
                }
              } catch (error: any) {
                console.error('Export failed:', error);
                toast.error(`Failed to export report: ${error?.message || 'Unknown error'}`);
              }
            }}
          >
            <Download size={16} /> Export Report
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'performance' | 'details')}>
        <TabsList>
          <TabsTrigger value="performance">Performance Metrics</TabsTrigger>
          <TabsTrigger value="details">Student Details & Reports</TabsTrigger>
        </TabsList>

        <TabsContent value="performance" className="space-y-6">

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Performance</p>
              <h2 className="text-3xl font-bold text-gray-900">
                {studentPerformance.length === 0 ? '—' : (studentPerformance.reduce((sum, s) => sum + s.overallPerformance, 0) / studentPerformance.length).toFixed(1) + '%'}
              </h2>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <BarChart className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Top Performers</p>
              <h2 className="text-3xl font-bold text-green-600">
                {studentPerformance.filter(s => s.status === 'Excellent').length}
              </h2>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <Award className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">At Risk</p>
              <h2 className="text-3xl font-bold text-red-600">
                {studentPerformance.filter(s => s.status === 'Warning' || s.status === 'Critical').length}
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
              <p className="text-sm font-medium text-muted-foreground">Improving</p>
              <h2 className="text-3xl font-bold text-[#015F2B]">
                {studentPerformance.filter(s => s.trend === 'up').length}
              </h2>
            </div>
            <div className="bg-[#015F2B]/10 p-3 rounded-full">
              <TrendingUp className="w-6 h-6 text-[#015F2B]" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input 
                  placeholder="Search by name or registration number..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={performanceFilter} onValueChange={setPerformanceFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Performance Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Status</SelectItem>
                  <SelectItem value="Excellent">Excellent</SelectItem>
                  <SelectItem value="Good">Good</SelectItem>
                  <SelectItem value="Warning">Warning</SelectItem>
                  <SelectItem value="Critical">Critical</SelectItem>
                </SelectContent>
              </Select>
              <Select value={programFilter} onValueChange={setProgramFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Program" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Programs</SelectItem>
                  {Array.from(new Set(studentPerformance.map(s => s.program))).map(prog => (
                    <SelectItem key={prog} value={prog}>{prog}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
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
              <Select value={attendanceRangeFilter} onValueChange={setAttendanceRangeFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Attendance Range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Ranges</SelectItem>
                  <SelectItem value="Excellent">Excellent (90-100%)</SelectItem>
                  <SelectItem value="Good">Good (80-89%)</SelectItem>
                  <SelectItem value="Average">Average (70-79%)</SelectItem>
                  <SelectItem value="Poor">Poor (Below 70%)</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" onClick={clearFilters} className="gap-2">
                <Filter className="h-4 w-4" /> Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Student Performance Metrics</CardTitle>
          <CardDescription>
            Comprehensive view of student academic and attendance performance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Program</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-center">Academic Score</TableHead>
                <TableHead className="text-center">Overall</TableHead>
                <TableHead>Trend</TableHead>
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
                        <div className="text-xs text-muted-foreground">{student.registrationNumber}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{student.program}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <span className={`font-bold ${
                        student.attendance >= thresholds.student.excellent ? 'text-green-600' : 
                        student.attendance >= thresholds.student.good ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {student.attendance.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-bold ${
                      student.academicScore >= 70 ? 'text-green-600' : 
                      student.academicScore >= 60 ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {student.academicScore.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="space-y-1">
                      <span className={`font-bold text-lg ${
                        student.overallPerformance >= 70 ? 'text-green-600' : 
                        student.overallPerformance >= 60 ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {student.overallPerformance.toFixed(1)}%
                      </span>
                      <Progress 
                        value={student.overallPerformance} 
                        className="h-2 w-20 mx-auto"
                      />
                    </div>
                  </TableCell>
                  <TableCell>
                    {student.trend === 'up' ? (
                      <div className="flex items-center gap-1 text-green-600">
                        <TrendingUp className="h-4 w-4" />
                        <span className="text-sm">Improving</span>
                      </div>
                    ) : (
                      <div className="flex items-center gap-1 text-red-600">
                        <TrendingDown className="h-4 w-4" />
                        <span className="text-sm">Declining</span>
                      </div>
                    )}
                  </TableCell>
                  <TableCell>{getStatusBadge(student.status)}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      <Button variant="ghost" size="sm" onClick={() => handleViewDetails(student)}>
                        View Details
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleExportReport(student)}>
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
        </TabsContent>

        <TabsContent value="details" className="space-y-6">
          {/* Student Details Content - Similar to ManagementStudentDetails */}
          {selectedStudent && studentDetails ? (
            <Card>
              <CardHeader>
                <CardTitle>Student Details: {selectedStudent.name}</CardTitle>
                <CardDescription>
                  Registration Number: {selectedStudent.registrationNumber} | Program: {selectedStudent.program}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Attendance</p>
                    <p className="text-2xl font-bold">{studentDetails.overallStats?.attendancePercentage.toFixed(1)}%</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Attended</p>
                    <p className="text-2xl font-bold">{studentDetails.overallStats?.attendedLectures}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Expected</p>
                    <p className="text-2xl font-bold">{studentDetails.overallStats?.expectedLectures}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    <Badge className={
                      (studentDetails.overallStats?.attendancePercentage || 0) >= thresholds.student.excellent ? 'bg-green-100 text-green-800' :
                      (studentDetails.overallStats?.attendancePercentage || 0) >= thresholds.student.good ? 'bg-blue-100 text-blue-800' :
                      (studentDetails.overallStats?.attendancePercentage || 0) >= thresholds.student.warning ? 'bg-orange-100 text-orange-800' : 'bg-red-100 text-red-800'
                    }>
                      {(studentDetails.overallStats?.attendancePercentage || 0) >= thresholds.student.excellent ? 'Excellent' :
                       (studentDetails.overallStats?.attendancePercentage || 0) >= thresholds.student.good ? 'Good' :
                       (studentDetails.overallStats?.attendancePercentage || 0) >= thresholds.student.warning ? 'Warning' : 'Critical'}
                    </Badge>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" onClick={() => handleExportReport(selectedStudent)}>
                    <Download className="mr-2 h-4 w-4" /> Export Attendance Report
                  </Button>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-12 text-center">
                <p className="text-muted-foreground">Select a student from the Performance Metrics tab to view details</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
