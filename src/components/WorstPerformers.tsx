import React, { useState, useEffect } from 'react';
import api from '@/lib/api';
import { 
  AlertTriangle, TrendingDown, User, GraduationCap, 
  Download, ChevronRight, Clock, BookOpen
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Progress } from '@/components/ui/progress';
import { reportService } from '@/services';
import { useNavigate } from 'react-router';
import { toast } from 'sonner';

interface WorstPerformersProps {
  maxItems?: number;
  showExport?: boolean;
}

export default function WorstPerformers({ maxItems = 10, showExport = true }: WorstPerformersProps) {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState<'lecturers' | 'students'>('lecturers');
  const [worstLecturers, setWorstLecturers] = useState<any[]>([]);
  const [worstStudents, setWorstStudents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [lecturers, students] = await Promise.all([
          api.get('/analytics/worst-lecturers', { limit: maxItems }),
          api.get('/analytics/worst-students', { limit: maxItems }),
        ]);
        setWorstLecturers(Array.isArray(lecturers) ? lecturers : (lecturers as any)?.data || []);
        setWorstStudents(Array.isArray(students) ? students : (students as any)?.data || []);
      } catch (error) {
        console.error('Error fetching worst performers:', error);
        setWorstLecturers([]);
        setWorstStudents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [maxItems]);

  const getPerformanceBadge = (performance: number) => {
    if (performance < 50) {
      return <Badge variant="destructive" className="bg-red-100 text-red-800 border-red-200">Critical</Badge>;
    } else if (performance < 70) {
      return <Badge variant="secondary" className="bg-orange-100 text-orange-800 border-orange-200">Warning</Badge>;
    }
    return <Badge variant="default" className="bg-yellow-100 text-yellow-800 border-yellow-200">At Risk</Badge>;
  };

  const handleExport = async () => {
    try {
      const reportType = activeTab === 'lecturers' ? 'lecturer-performance' : 'student-performance';
      const data = activeTab === 'lecturers' ? worstLecturers : worstStudents;
      
      const result = await reportService.exportReport(reportType, 'excel', undefined);
      
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
        toast.success('Report exported successfully');
      } else if ((result as { content?: string })?.content) {
        // Fallback: create CSV export
        const csvContent = convertToCSV(data, activeTab);
        const blob = new Blob([csvContent], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `worst-${activeTab}-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        toast.success('Report exported successfully');
      } else {
        toast.error('Failed to export report');
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export report: ${error?.message || 'Unknown error'}`);
    }
  };

  const convertToCSV = (data: any[], type: 'lecturers' | 'students'): string => {
    if (data.length === 0) return '';
    
    if (type === 'lecturers') {
      const headers = ['Name', 'Staff Number', 'Department', 'Attendance %', 'Missed Classes', 'Rating', 'Performance %'];
      const rows = data.map(item => [
        item.name || '',
        item.staffNumber || '',
        item.department || '',
        item.attendance?.toFixed(1) || '0',
        item.classesMissed || '0',
        item.studentRating?.toFixed(1) || '0',
        item.performance?.toFixed(1) || '0',
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    } else {
      const headers = ['Name', 'Registration Number', 'Program', 'Year', 'Attendance %', 'Academic Score %', 'Overall Performance %', 'Missed Lectures'];
      const rows = data.map(item => [
        item.name || '',
        item.registrationNumber || '',
        item.program || '',
        item.year || '',
        item.attendance?.toFixed(1) || '0',
        item.academicScore?.toFixed(1) || '0',
        item.overallPerformance?.toFixed(1) || '0',
        item.missedLectures || '0',
      ]);
      return [headers.join(','), ...rows.map(row => row.join(','))].join('\n');
    }
  };

  const handleViewAll = () => {
    if (activeTab === 'lecturers') {
      navigate('/management/lecturer-performance');
    } else {
      navigate('/management/student-performance');
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-red-600" />
              Worst Performers
            </CardTitle>
            <CardDescription>
              Lecturers and students requiring immediate attention
            </CardDescription>
          </div>
          {showExport && (
            <Button variant="outline" size="sm" className="gap-2" onClick={handleExport}>
              <Download className="h-4 w-4" /> Export
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'lecturers' | 'students')}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="lecturers" className="gap-2">
              <User className="h-4 w-4" /> Lecturers ({worstLecturers.length})
            </TabsTrigger>
            <TabsTrigger value="students" className="gap-2">
              <GraduationCap className="h-4 w-4" /> Students ({worstStudents.length})
            </TabsTrigger>
          </TabsList>

          <TabsContent value="lecturers" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Lecturer</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Missed</TableHead>
                    <TableHead className="text-center">Rating</TableHead>
                    <TableHead className="text-center">Performance</TableHead>
                    <TableHead>Issues</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Loading worst performers...
                      </TableCell>
                    </TableRow>
                  ) : worstLecturers.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No worst performers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    worstLecturers.slice(0, maxItems).map((lecturer: any) => {
                      const lName = lecturer.name ?? '—';
                      const lAttendance = Number(lecturer.attendance ?? 0);
                      const lPerf = Number(lecturer.performance ?? lecturer.attendance ?? 0);
                      const lRating = Number(lecturer.studentRating ?? 0);
                      return (
                    <TableRow key={lecturer.id} className="hover:bg-red-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-red-100 text-red-800 text-xs font-medium">
                              {String(lName).split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{lName}</div>
                            <div className="text-xs text-muted-foreground">{lecturer.staffNumber ?? '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{lecturer.department ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-red-600">{lAttendance.toFixed(1)}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-red-600">{lecturer.classesMissed ?? 0}</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium">{lRating.toFixed(1)}/5.0</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-bold text-red-600">{lPerf.toFixed(1)}%</span>
                          <Progress value={lPerf} className="h-1.5 w-16 mx-auto" />
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex flex-wrap gap-1">
                          {(lecturer.issues || []).map((issue: string, idx: number) => (
                            <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                              {issue}
                            </Badge>
                          ))}
                        </div>
                      </TableCell>
                    </TableRow>
                    ); })
                  )}
                </TableBody>
              </Table>
            </div>
            {worstLecturers.length > maxItems && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleViewAll}>
                  View All {worstLecturers.length} Lecturers
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>

          <TabsContent value="students" className="space-y-4">
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Student</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead className="text-center">Attendance</TableHead>
                    <TableHead className="text-center">Academic</TableHead>
                    <TableHead className="text-center">Overall</TableHead>
                    <TableHead className="text-center">Missed</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        Loading worst performers...
                      </TableCell>
                    </TableRow>
                  ) : worstStudents.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-8 text-gray-500">
                        No worst performers found
                      </TableCell>
                    </TableRow>
                  ) : (
                    worstStudents.slice(0, maxItems).map((student: any) => {
                      const name = student.studentName ?? student.name ?? '—';
                      const attendanceRate = student.attendanceRate ?? student.attendancePercent ?? student.attendance ?? 0;
                      const overall = student.overallPerformance ?? attendanceRate;
                      const academicScore = student.academicScore ?? attendanceRate;
                      const missed = student.missedCount ?? student.missedLectures ?? student.missed ?? 0;
                      return (
                    <TableRow key={student.studentId ?? student.id} className="hover:bg-red-50/50">
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-8 w-8">
                            <AvatarFallback className="bg-red-100 text-red-800 text-xs font-medium">
                              {String(name).split(' ').map((n: string) => n[0]).join('').slice(0, 2) || '?'}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{name}</div>
                            <div className="text-xs text-muted-foreground font-mono">{student.registrationNumber ?? student.studentNumber ?? '—'}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="text-sm">{student.program ?? student.programCode ?? '—'}</div>
                        <div className="text-xs text-muted-foreground">{student.year != null ? `Year ${student.year}` : ''}</div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-bold text-red-600">{(Number(attendanceRate)).toFixed(1)}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-red-600">{(Number(academicScore)).toFixed(1)}%</span>
                      </TableCell>
                      <TableCell className="text-center">
                        <div className="space-y-1">
                          <span className="font-bold text-red-600">{(Number(overall)).toFixed(1)}%</span>
                          <Progress value={Number(overall)} className="h-1.5 w-16 mx-auto" />
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        <span className="font-medium text-red-600">{missed}</span>
                      </TableCell>
                      <TableCell>
                        <div className="space-y-1">
                          {getPerformanceBadge(Number(overall))}
                          <div className="flex flex-wrap gap-1 mt-1">
                            {(student.issues || []).slice(0, 1).map((issue: string, idx: number) => (
                              <Badge key={idx} variant="outline" className="text-xs bg-red-50 text-red-700 border-red-200">
                                {issue}
                              </Badge>
                            ))}
                          </div>
                        </div>
                      </TableCell>
                    </TableRow>
                    ); })
                  )}
                </TableBody>
              </Table>
            </div>
            {worstStudents.length > maxItems && (
              <div className="text-center pt-2">
                <Button variant="ghost" size="sm" className="gap-2" onClick={handleViewAll}>
                  View All {worstStudents.length} Students
                  <ChevronRight className="h-4 w-4" />
                </Button>
              </div>
            )}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
