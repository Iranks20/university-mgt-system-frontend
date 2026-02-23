/**
 * Management Lecturer Performance Screen
 * Focused on lecturer teaching performance and metrics
 */

import React, { useState, useEffect } from 'react';
import { staffService, settingsService } from '@/services';
import { analyticsService } from '@/services/analytics.service';
import { academicService } from '@/services/academic.service';
import { qaService } from '@/services/qa.service';
import { 
  Search, Filter, Download, TrendingDown, TrendingUp, AlertCircle,
  UserCheck, BookOpen, Clock, Award, Users
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { reportService } from '@/services/report.service';
import { toast } from 'sonner';

export default function ManagementLecturerPerformance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [performanceFilter, setPerformanceFilter] = useState<string>('All');
  const [schoolFilter, setSchoolFilter] = useState<string>('All');
  const [attendanceRangeFilter, setAttendanceRangeFilter] = useState<string>('All');
  const [lecturerPerformance, setLecturerPerformance] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<any | null>(null);
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
        if (departmentFilter !== 'All') params.department = departmentFilter;
        if (searchTerm) params.search = searchTerm;

        const [lecturersResult, allLectureRecords] = await Promise.all([
          staffService.getLecturers(params),
          qaService.getLectureRecords(),
        ]);
        const lecturers = Array.isArray(lecturersResult) ? lecturersResult : lecturersResult.data || [];
        const records = Array.isArray(allLectureRecords) ? allLectureRecords : [];

        const recordsByLecturerId: Record<string, any[]> = {};
        const recordsByLecturerName: Record<string, any[]> = {};
        records.forEach((r: any) => {
          const id = r.lecturerId;
          const name = (r.lecturerName || '').trim().toLowerCase();
          if (id) {
            if (!recordsByLecturerId[id]) recordsByLecturerId[id] = [];
            recordsByLecturerId[id].push(r);
          }
          if (name) {
            if (!recordsByLecturerName[name]) recordsByLecturerName[name] = [];
            recordsByLecturerName[name].push(r);
          }
        });

        const performanceData = await Promise.all(
          lecturers.map(async (lecturer: any) => {
            const [perf, rating] = await Promise.all([
              analyticsService.getLecturerPerformance(lecturer.id) as any,
              staffService.getStaffStudentRating(lecturer.id).catch(() => null),
            ]);
            const attendanceRate = perf?.attendanceRate ?? 0;
            const taught = perf?.taught ?? 0;
            const untaught = perf?.untaught ?? 0;

            const lecturerRecords = (
              recordsByLecturerId[lecturer.id] ||
              recordsByLecturerName[`${(lecturer.firstName || '').trim()} ${(lecturer.lastName || '').trim()}`.trim().toLowerCase()] ||
              []
            );
            let onTimeRate = attendanceRate;
            if (lecturerRecords.length > 0) {
              const onTimeCount = lecturerRecords.filter((r: any) => {
                if (!r.timeForStarting || !r.checkInTime) return false;
                const scheduled = r.timeForStarting.split(':').slice(0, 2).map(Number);
                const actual = r.checkInTime.split(':').slice(0, 2).map(Number);
                const scheduledMinutes = scheduled[0] * 60 + scheduled[1];
                const actualMinutes = actual[0] * 60 + actual[1];
                return actualMinutes <= scheduledMinutes + 5;
              }).length;
              onTimeRate = (onTimeCount / lecturerRecords.length) * 100;
            }

            let schoolName = 'N/A';
            if (lecturer.departmentId) {
              try {
                const dept = await academicService.getDepartmentById(lecturer.departmentId);
                if (dept?.schoolId) {
                  const school = await academicService.getSchoolById(dept.schoolId);
                  schoolName = school?.name || 'N/A';
                }
              } catch {
                // ignore
              }
            }

            const status = attendanceRate >= thresholds.lecturer.excellent ? 'Excellent' :
              attendanceRate >= thresholds.lecturer.good ? 'Good' :
                attendanceRate >= thresholds.lecturer.warning ? 'Warning' : 'Critical';
            const previousPerformance = perf?.previousAttendanceRate ?? attendanceRate * 0.95;
            const trend = attendanceRate >= previousPerformance ? 'up' : 'down';

            return {
              id: lecturer.id,
              name: `${lecturer.firstName || ''} ${lecturer.lastName || ''}`.trim() || 'Unknown',
              staffNumber: lecturer.staffNumber,
              department: lecturer.departmentId || 'N/A',
              school: schoolName,
              attendance: attendanceRate,
              classesTaught: taught,
              classesMissed: untaught,
              onTimeRate: Math.round(onTimeRate * 10) / 10,
              studentRating: rating?.rating ?? 0,
              overallPerformance: attendanceRate,
              trend,
              status,
            };
          })
        );

        setLecturerPerformance(performanceData);
      } catch (error) {
        console.error('Error fetching lecturer performance:', error);
        setLecturerPerformance([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [departmentFilter, searchTerm]);

  const filteredLecturers = lecturerPerformance.filter(lecturer => {
    const matchesSearch = 
      lecturer.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      lecturer.staffNumber.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesDepartment = departmentFilter === 'All' || lecturer.department === departmentFilter;
    const matchesSchool = schoolFilter === 'All' || lecturer.school === schoolFilter;
    
    const matchesFilter = 
      performanceFilter === 'All' ||
      (performanceFilter === 'Excellent' && lecturer.status === 'Excellent') ||
      (performanceFilter === 'Good' && lecturer.status === 'Good') ||
      (performanceFilter === 'Warning' && lecturer.status === 'Warning') ||
      (performanceFilter === 'Critical' && lecturer.status === 'Critical');
    
    const matchesAttendanceRange = 
      attendanceRangeFilter === 'All' ||
      (attendanceRangeFilter === 'Excellent' && lecturer.attendance >= thresholds.lecturer.excellent) ||
      (attendanceRangeFilter === 'Good' && lecturer.attendance >= thresholds.lecturer.good && lecturer.attendance < thresholds.lecturer.excellent) ||
      (attendanceRangeFilter === 'Average' && lecturer.attendance >= thresholds.lecturer.warning && lecturer.attendance < thresholds.lecturer.good) ||
      (attendanceRangeFilter === 'Poor' && lecturer.attendance < thresholds.lecturer.warning);

    return matchesSearch && matchesDepartment && matchesFilter && matchesSchool && matchesAttendanceRange;
  });

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('All');
    setPerformanceFilter('All');
    setSchoolFilter('All');
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

  const uniqueDepartments = Array.from(new Set(lecturerPerformance.map(l => l.department)));

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Lecturer Performance</h1>
          <p className="text-gray-500">Track lecturer teaching performance, attendance, and student feedback.</p>
        </div>
        <div className="flex gap-2">
          <Button 
            variant="outline" 
            className="gap-2"
            onClick={async () => {
              try {
                const result = await reportService.exportReport('lecturer-performance', 'excel');
                if (result?.downloadUrl) {
                  window.open(result.downloadUrl, '_blank');
                  toast.success('Report exported successfully');
                } else {
                  // Fallback: create CSV
                  const csv = [
                    ['Name', 'Staff Number', 'Department', 'School', 'Attendance %', 'Classes Taught', 'Classes Missed', 'On-Time Rate %', 'Student Rating', 'Status'].join(','),
                    ...filteredLecturers.map(l => [
                      l.name,
                      l.staffNumber,
                      l.department,
                      l.school,
                      l.attendance.toFixed(1),
                      l.classesTaught,
                      l.classesMissed,
                      l.onTimeRate.toFixed(1),
                      l.studentRating.toFixed(1),
                      l.status,
                    ].join(',')),
                  ].join('\n');
                  const blob = new Blob([csv], { type: 'text/csv' });
                  const url = window.URL.createObjectURL(blob);
                  const a = document.createElement('a');
                  a.href = url;
                  a.download = `lecturer-performance-${new Date().toISOString().split('T')[0]}.csv`;
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

      {/* Performance Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Avg. Attendance</p>
              <h2 className="text-3xl font-bold text-gray-900">
                {(lecturerPerformance.reduce((sum, l) => sum + l.attendance, 0) / lecturerPerformance.length).toFixed(1)}%
              </h2>
            </div>
            <div className="bg-green-100 p-3 rounded-full">
              <UserCheck className="w-6 h-6 text-green-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total Classes</p>
              <h2 className="text-3xl font-bold text-gray-900">
                {lecturerPerformance.reduce((sum, l) => sum + l.classesTaught, 0)}
              </h2>
            </div>
            <div className="bg-blue-100 p-3 rounded-full">
              <BookOpen className="w-6 h-6 text-blue-600" />
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Classes Missed</p>
              <h2 className="text-3xl font-bold text-red-600">
                {lecturerPerformance.reduce((sum, l) => sum + l.classesMissed, 0)}
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
              <p className="text-sm font-medium text-muted-foreground">Avg. Rating</p>
              <h2 className="text-3xl font-bold text-[#015F2B]">
                {(lecturerPerformance.reduce((sum, l) => sum + l.studentRating, 0) / lecturerPerformance.length).toFixed(1)}
              </h2>
            </div>
            <div className="bg-[#015F2B]/10 p-3 rounded-full">
              <Award className="w-6 h-6 text-[#015F2B]" />
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
                  placeholder="Search by name or staff number..." 
                  className="pl-8"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="Department" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Departments</SelectItem>
                  {uniqueDepartments.map(dept => (
                    <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-full md:w-[200px]">
                  <SelectValue placeholder="School" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All Schools</SelectItem>
                  {Array.from(new Set(lecturerPerformance.map(l => l.school))).map(school => (
                    <SelectItem key={school} value={school}>{school}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col md:flex-row gap-4">
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

      {/* Lecturer Performance Table */}
      <Card>
        <CardHeader>
          <CardTitle>Lecturer Performance Metrics</CardTitle>
          <CardDescription>
            Comprehensive view of lecturer teaching performance and attendance
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lecturer</TableHead>
                <TableHead>Department</TableHead>
                <TableHead className="text-center">Attendance</TableHead>
                <TableHead className="text-center">Classes</TableHead>
                <TableHead className="text-center">Missed</TableHead>
                <TableHead className="text-center">On-Time Rate</TableHead>
                <TableHead className="text-center">Rating</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLecturers.map((lecturer) => (
                <TableRow key={lecturer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9">
                        <AvatarFallback className="bg-[#015F2B]/10 text-[#015F2B] font-medium">
                          {lecturer.name.split(' ').map((n: string) => n[0]).join('')}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium text-gray-900">{lecturer.name}</div>
                        <div className="text-xs text-muted-foreground">{lecturer.staffNumber}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{lecturer.department}</TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      {lecturer.trend === 'up' ? (
                        <TrendingUp className="h-4 w-4 text-green-600" />
                      ) : (
                        <TrendingDown className="h-4 w-4 text-red-600" />
                      )}
                      <span className={`font-bold ${
                        lecturer.attendance >= thresholds.lecturer.excellent ? 'text-green-600' : 
                        lecturer.attendance >= thresholds.lecturer.good ? 'text-orange-600' : 'text-red-600'
                      }`}>
                        {lecturer.attendance.toFixed(1)}%
                      </span>
                    </div>
                  </TableCell>
                  <TableCell className="text-center font-medium">{lecturer.classesTaught}</TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${lecturer.classesMissed > 0 ? 'text-red-600' : 'text-gray-500'}`}>
                      {lecturer.classesMissed > 0 ? lecturer.classesMissed : '-'}
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <span className={`font-medium ${
                      lecturer.onTimeRate >= thresholds.lecturer.excellent ? 'text-green-600' : 
                      lecturer.onTimeRate >= thresholds.lecturer.good ? 'text-orange-600' : 'text-red-600'
                    }`}>
                      {lecturer.onTimeRate.toFixed(1)}%
                    </span>
                  </TableCell>
                  <TableCell className="text-center">
                    <div className="flex items-center justify-center gap-1">
                      <Award className="h-4 w-4 text-[#F6A000]" />
                      <span className="font-bold">{lecturer.studentRating.toFixed(1)}</span>
                    </div>
                  </TableCell>
                  <TableCell>{getStatusBadge(lecturer.status)}</TableCell>
                  <TableCell className="text-right">
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setSelectedLecturer(lecturer);
                        setDetailsOpen(true);
                      }}
                    >
                      View Details
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Lecturer Details Dialog */}
      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Lecturer Performance Details</DialogTitle>
            <DialogDescription>
              Comprehensive performance metrics for {selectedLecturer?.name}
            </DialogDescription>
          </DialogHeader>
          {selectedLecturer && (
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-sm font-medium text-gray-500">Name</p>
                  <p className="text-sm font-medium">{selectedLecturer.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Staff Number</p>
                  <p className="text-sm font-medium">{selectedLecturer.staffNumber}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Department</p>
                  <p className="text-sm font-medium">{selectedLecturer.department}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">School</p>
                  <p className="text-sm font-medium">{selectedLecturer.school}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Attendance Rate</p>
                  <p className={`text-sm font-bold ${selectedLecturer.attendance >= thresholds.lecturer.excellent ? 'text-green-600' : selectedLecturer.attendance >= thresholds.lecturer.good ? 'text-orange-600' : 'text-red-600'}`}>
                    {selectedLecturer.attendance.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">On-Time Rate</p>
                  <p className={`text-sm font-bold ${selectedLecturer.onTimeRate >= thresholds.lecturer.excellent ? 'text-green-600' : selectedLecturer.onTimeRate >= thresholds.lecturer.good ? 'text-orange-600' : 'text-red-600'}`}>
                    {selectedLecturer.onTimeRate.toFixed(1)}%
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Classes Taught</p>
                  <p className="text-sm font-medium">{selectedLecturer.classesTaught}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Classes Missed</p>
                  <p className={`text-sm font-medium ${selectedLecturer.classesMissed > 0 ? 'text-red-600' : ''}`}>
                    {selectedLecturer.classesMissed}
                  </p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Student Rating</p>
                  <p className="text-sm font-medium">{selectedLecturer.studentRating.toFixed(1)} / 5.0</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-gray-500">Status</p>
                  <div>{getStatusBadge(selectedLecturer.status)}</div>
                </div>
              </div>
              <div className="pt-4 border-t">
                <p className="text-sm font-medium text-gray-500 mb-2">Performance Trend</p>
                <div className="flex items-center gap-2">
                  {selectedLecturer.trend === 'up' ? (
                    <>
                      <TrendingUp className="h-4 w-4 text-green-600" />
                      <span className="text-sm text-green-600">Improving</span>
                    </>
                  ) : (
                    <>
                      <TrendingDown className="h-4 w-4 text-red-600" />
                      <span className="text-sm text-red-600">Declining</span>
                    </>
                  )}
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
