import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  FileText, Download, Filter, Calendar, Users, Building, 
  TrendingUp, AlertCircle, CheckCircle, Search
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QASchoolSummary, QALecturerSummary } from '@/features/qa';
import { analyticsService } from '@/services/analytics.service';
import { reportService } from '@/services/report.service';
import { qaService } from '@/services/qa.service';
import { academicService } from '@/services/academic.service';
import { timetableService } from '@/services/timetable.service';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';


export default function Reports() {
  const [dateRange, setDateRange] = useState('week');
  const [reportType, setReportType] = useState('school');
  const [overviewStats, setOverviewStats] = useState<{ teachingRatePercent?: number; studentAttendancePercent?: number; recentQARecords?: number; untaughtLectures?: number; scheduledCountLast30?: number; teachingRateVsScheduledPercent?: number } | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<{ day: string; present: number; absent: number }[]>([]);
  const [attendancePie, setAttendancePie] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentReports, setRecentReports] = useState<{ id: string; name: string; date: string; type: string }[]>([]);
  const [schoolPerformance, setSchoolPerformance] = useState<{ name: string; taught: number; untaught: number; rate: number; scheduled?: number; rateVsScheduled?: number }[]>([]);
  const [lecturerTableData, setLecturerTableData] = useState<{ id: string; name: string; school: string; taught: number; missed: number; rate: number }[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [studentsReport, setStudentsReport] = useState<{ id: string; name: string; program?: string; attendanceRate?: number; missed?: number }[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<{ id: string; name: string; school: string; taught: number; missed: number; rate: number } | null>(null);
  const [reconciliationData, setReconciliationData] = useState<{ date: string; className: string; lecturerName: string; scheduled: boolean; outcome: string; substituteLecturerName?: string | null }[]>([]);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconDateFrom, setReconDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [reconDateTo, setReconDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reconSchoolId, setReconSchoolId] = useState<string>('');
  const [reconCourseId, setReconCourseId] = useState<string>('');
  const [schoolsList, setSchoolsList] = useState<{ id: string; name: string }[]>([]);
  const [schoolPerfDateRange, setSchoolPerfDateRange] = useState<'all' | 'last_30_days' | 'this_term'>('all');
  const [lecturerDateRange, setLecturerDateRange] = useState<'all' | 'last_30_days' | 'this_term'>('all');
  const [studentAttendDateRange, setStudentAttendDateRange] = useState<'all' | 'last_30_days' | 'this_term'>('all');
  const [studentAttendLimit, setStudentAttendLimit] = useState<number>(100);

  const getSchoolPerfDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    const now = new Date();
    if (schoolPerfDateRange === 'all') return undefined;
    if (schoolPerfDateRange === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (schoolPerfDateRange === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  const getLecturerDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    const now = new Date();
    if (lecturerDateRange === 'all') return undefined;
    if (lecturerDateRange === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (lecturerDateRange === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  const getStudentAttendDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    const now = new Date();
    if (studentAttendDateRange === 'all') return undefined;
    if (studentAttendDateRange === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (studentAttendDateRange === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  useEffect(() => {
    const load = async () => {
      setOverviewLoading(true);
      try {
        const now = new Date();
        const last30To = now.toISOString().slice(0, 10);
        const last30From = (() => { const d = new Date(now); d.setDate(d.getDate() - 30); return d.toISOString().slice(0, 10); })();
        const [stats, trends, dist, reports, schoolSummaryLast30, scheduledBySchool] = await Promise.all([
          analyticsService.getDashboardStats(),
          analyticsService.getAttendanceTrends(7),
          analyticsService.getAttendanceDistribution(),
          reportService.getReports(),
          qaService.getSchoolSummaryReport({ dateFrom: last30From, dateTo: last30To }),
          timetableService.getScheduledCountBySchool(last30From, last30To).catch(() => []),
        ]);
        const baseStats = stats || {};
        let scheduledCountLast30: number | undefined;
        let teachingRateVsScheduledPercent: number | undefined;
        const arr = Array.isArray(schoolSummaryLast30) ? schoolSummaryLast30 : [];
        const totalTaught30 = arr.reduce((sum: number, s: any) => sum + (s.totalNoTaught ?? 0), 0);
        const totalScheduled30 = Array.isArray(scheduledBySchool) ? scheduledBySchool.reduce((sum: number, x: any) => sum + (x.scheduledCount ?? 0), 0) : 0;
        if (totalScheduled30 > 0) {
          scheduledCountLast30 = totalScheduled30;
          teachingRateVsScheduledPercent = Math.round((totalTaught30 / totalScheduled30) * 1000) / 10;
        }
        setOverviewStats({
          ...baseStats,
          scheduledCountLast30,
          teachingRateVsScheduledPercent,
        });
        setAttendanceTrends(Array.isArray(trends) && trends.length > 0 ? trends.map((t: any) => ({ day: t.day, present: t.present ?? 0, absent: t.absent ?? 0 })) : []);
        setAttendancePie(Array.isArray(dist) && dist.length > 0 ? (dist as { name: string; value: number; color: string }[]) : []);
        const reportList = Array.isArray(reports) ? reports : [];
        setRecentReports(reportList.map((r: any) => ({
          id: r.id,
          name: r.title || `${r.type || 'Report'}`,
          date: r.generatedAt ? new Date(r.generatedAt).toISOString().slice(0, 10) : '—',
          type: r.type || '—',
        })));
      } catch (e) {
        setAttendanceTrends([]);
        setAttendancePie([]);
      } finally {
        setOverviewLoading(false);
      }
    };
    load();
  }, [retryCount]);

  useEffect(() => {
    setSchoolsLoading(true);
    const params = getSchoolPerfDateParams();
    const load = async () => {
      try {
        const list = await qaService.getSchoolSummaryReport(params);
        const arr = Array.isArray(list) ? list : [];
        let scheduledBySchool: { schoolName: string; scheduledCount: number }[] = [];
        if (params?.dateFrom && params?.dateTo) {
          try {
            scheduledBySchool = await timetableService.getScheduledCountBySchool(params.dateFrom, params.dateTo);
          } catch {
            scheduledBySchool = [];
          }
        }
        const scheduledMap = new Map(scheduledBySchool.map((x) => [x.schoolName, x.scheduledCount]));
        setSchoolPerformance(arr.map((s: any) => {
          const taught = s.totalNoTaught ?? 0;
          const untaught = s.noUntaught ?? 0;
          const total = taught + untaught;
          const scheduled = scheduledMap.get(s.school ?? '') ?? undefined;
          const rateVsScheduled = scheduled != null && scheduled > 0 ? Math.round((taught / scheduled) * 1000) / 10 : undefined;
          return {
            name: s.school ?? '—',
            taught,
            untaught,
            rate: total > 0 ? Math.round((taught / total) * 1000) / 10 : 0,
            scheduled,
            rateVsScheduled,
          };
        }));
      } finally {
        setSchoolsLoading(false);
      }
    };
    load();
  }, [schoolPerfDateRange]);

  useEffect(() => {
    setLecturersLoading(true);
    const params = getLecturerDateParams();
    analyticsService.getTopPerformingStaff(200, params?.dateFrom, params?.dateTo).then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setLecturerTableData(arr.map((s: any, idx: number) => {
        const rate = typeof s.attendance === 'number' ? s.attendance : (typeof s.attendance === 'string' ? parseFloat(s.attendance.replace('%', '')) : 0) || 0;
        return {
          id: s.id || String(idx),
          name: s.name ?? '—',
          school: s.department ?? '—',
          taught: s.classes ?? 0,
          missed: s.missedClasses ?? s.missedCount ?? s.missed ?? 0,
          rate: Math.round(rate * 10) / 10,
        };
      }));
      setLecturersLoading(false);
    }).catch(() => setLecturersLoading(false));
  }, [lecturerDateRange]);

  useEffect(() => {
    academicService.getSchools().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setSchoolsList(arr.map((s: any) => ({ id: s.id, name: s.name ?? '—' })));
    }).catch(() => setSchoolsList([]));
  }, []);

  const loadReconciliationReport = async () => {
    setReconciliationLoading(true);
    try {
      const data = await qaService.getReconciliationReport(reconDateFrom, reconDateTo, reconSchoolId || undefined, reconCourseId || undefined);
      setReconciliationData(data.map((r: any) => ({
        date: r.date,
        className: r.className ?? '—',
        lecturerName: r.lecturerName ?? '—',
        scheduled: r.scheduled !== false,
        outcome: r.outcome ?? 'no_record',
        substituteLecturerName: r.substituteLecturerName,
      })));
    } catch (e) {
      setReconciliationData([]);
      toast.error('Failed to load reconciliation report');
    } finally {
      setReconciliationLoading(false);
    }
  };

  const exportReconciliationCSV = () => {
    const headers = ['Date', 'Class', 'Lecturer', 'Scheduled', 'Outcome', 'Substitute Lecturer'];
    const rows = reconciliationData.map(r => [
      r.date,
      r.className,
      r.lecturerName,
      r.scheduled ? 'Y' : 'N',
      r.outcome,
      r.substituteLecturerName ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `teaching-reconciliation-${reconDateFrom}-${reconDateTo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Export downloaded');
  };

  useEffect(() => {
    setStudentsLoading(true);
    const params = getStudentAttendDateParams();
    analyticsService.getWorstPerformingStudents(studentAttendLimit, params?.dateFrom, params?.dateTo).then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setStudentsReport(arr.map((s: any) => ({
        id: s.studentId || s.id || '',
        name: s.studentName ?? s.name ?? '—',
        program: s.programCode ?? s.program ?? '—',
        attendanceRate: s.attendanceRate ?? s.attendancePercent ?? s.attendance,
        missed: s.missedCount ?? s.missed ?? 0,
      })));
    }).catch(() => setStudentsReport([])).finally(() => setStudentsLoading(false));
  }, [studentAttendDateRange, studentAttendLimit]);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Generate and view detailed attendance and performance reports.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Select value={dateRange} onValueChange={setDateRange}>
              <SelectTrigger className="w-[150px]">
                <SelectValue placeholder="Select period" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="week">This Week</SelectItem>
                <SelectItem value="month">This Month</SelectItem>
                <SelectItem value="semester">This Semester</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="outline" className="gap-2" onClick={async () => {
              try {
                const result = await reportService.exportReport('all', 'csv');
                if (result.downloadUrl) {
                  const link = document.createElement('a');
                  link.href = result.downloadUrl;
                  link.download = result.filename;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
                }
              } catch (error: any) {
                console.error('Error exporting reports:', error);
                toast.error(`Failed to export: ${error?.message || 'Unknown error'}`);
              }
            }}>
              <Download size={16} /> Export All
            </Button>
            <Button className="bg-[#015F2B] hover:bg-[#014022] gap-2" onClick={async () => {
              try {
                const report = await reportService.generateReport('lecture-records', 'QA Lecture Records Report', {}, {});
                toast.success(`Report generated successfully! ID: ${report.id}`);
                // Refresh reports list
                const reports = await reportService.getReports();
                const reportList = Array.isArray(reports) ? reports : [];
                setRecentReports(reportList.map((r: any) => ({
                  id: r.id,
                  name: r.title || `${r.type || 'Report'}`,
                  date: r.generatedAt ? new Date(r.generatedAt).toISOString().slice(0, 10) : '—',
                  type: r.type || '—',
                })));
              } catch (error: any) {
                console.error('Error generating report:', error);
                toast.error(`Failed to generate report: ${error?.message || 'Unknown error'}`);
              }
            }}>
              <FileText size={16} /> New Report
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="space-y-4">
          <TabsList className="bg-gray-100 p-1">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reconciliation">Teaching Reconciliation</TabsTrigger>
            <TabsTrigger value="school-summary">School Summary</TabsTrigger>
            <TabsTrigger value="lecturer-summary">Lecturer Summary</TabsTrigger>
            <TabsTrigger value="schools">School Performance</TabsTrigger>
            <TabsTrigger value="lecturers">Lecturer Stats</TabsTrigger>
            <TabsTrigger value="students">Student Attendance</TabsTrigger>
          </TabsList>

          <TabsContent value="reconciliation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled vs Delivered</CardTitle>
                <CardDescription>Teaching reconciliation: scheduled sessions and recorded outcome (Taught / Untaught / Cancelled / Substituted / No record).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Date from</label>
                    <Input type="date" value={reconDateFrom} onChange={(e) => setReconDateFrom(e.target.value)} className="w-[160px]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Date to</label>
                    <Input type="date" value={reconDateTo} onChange={(e) => setReconDateTo(e.target.value)} className="w-[160px]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">School</label>
                    <Select value={reconSchoolId || 'all'} onValueChange={(v) => { setReconSchoolId(v === 'all' ? '' : v); setReconCourseId(''); }}>
                      <SelectTrigger className="w-[200px]">
                        <SelectValue placeholder="All schools" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All schools</SelectItem>
                        {schoolsList.map((s) => (
                          <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button onClick={loadReconciliationReport} disabled={reconciliationLoading}>
                    {reconciliationLoading ? 'Loading...' : 'Apply'}
                  </Button>
                  <Button variant="outline" onClick={exportReconciliationCSV} disabled={reconciliationData.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Lecturer</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Substitute</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                      ) : reconciliationData.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data. Set date range and click Apply.</TableCell></TableRow>
                      ) : (
                        reconciliationData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.date}</TableCell>
                            <TableCell>{row.className}</TableCell>
                            <TableCell>{row.lecturerName}</TableCell>
                            <TableCell>{row.scheduled ? 'Y' : 'N'}</TableCell>
                            <TableCell>
                              <Badge variant={row.outcome === 'taught' ? 'default' : row.outcome === 'no_record' ? 'secondary' : 'destructive'} className={
                                row.outcome === 'taught' ? 'bg-[#015F2B]' : row.outcome === 'no_record' ? '' : 'bg-amber-100 text-amber-800'
                              }>
                                {row.outcome === 'no_record' ? 'No record' : row.outcome.charAt(0).toUpperCase() + row.outcome.slice(1).toLowerCase().replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.substituteLecturerName ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHOOL SUMMARY TAB - Matches 1.csv format */}
          <TabsContent value="school-summary" className="space-y-4">
            <QASchoolSummary />
          </TabsContent>

          {/* LECTURER SUMMARY TAB - Matches 2.csv format */}
          <TabsContent value="lecturer-summary" className="space-y-4">
            <QALecturerSummary />
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Teaching Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-[#015F2B]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.teachingRatePercent != null ? `${overviewStats.teachingRatePercent}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Overview</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Student Attendance</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.studentAttendancePercent != null ? `${overviewStats.studentAttendancePercent}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Overview</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Classes Taught</CardTitle>
                  <BookOpen className="h-4 w-4 text-[#F6A000]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.recentQARecords != null ? overviewStats.recentQARecords : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Recent records</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Missed Classes</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.untaughtLectures != null ? overviewStats.untaughtLectures : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Scheduled (last 30 days)</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.scheduledCountLast30 != null ? overviewStats.scheduledCountLast30 : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Timetable slots</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Teaching rate (vs scheduled)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#015F2B]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.teachingRateVsScheduledPercent != null ? `${overviewStats.teachingRateVsScheduledPercent}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Trends</CardTitle>
                  <CardDescription>Daily student presence vs absence over the last week.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {attendanceTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" name="Present" fill="#015F2B" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" name="Absent" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                      <div>No attendance trend data available</div>
                      <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Status Distribution</CardTitle>
                  <CardDescription>Breakdown of all attendance records this semester.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {attendancePie.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendancePie}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {attendancePie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                      <div>No attendance distribution data available</div>
                      <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Generated Reports</CardTitle>
                <CardDescription>Download previously generated reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Date Generated</TableHead>
                      <TableHead>Format</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReports.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No reports yet. Generate one from School Summary or Lecturer Summary.</TableCell></TableRow>
                    ) : (
                      recentReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText size={16} className="text-gray-500" /> {report.name}
                          </TableCell>
                          <TableCell>{report.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                              {report.type}
                            </Badge>
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right">
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={async () => {
                              try {
                                await reportService.downloadReport(report.id);
                              } catch (error: any) {
                                console.error('Error downloading report:', error);
                                toast.error(`Failed to download: ${error?.message || 'Unknown error'}`);
                              }
                            }}>
                              <Download size={16} />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHOOLS TAB */}
          <TabsContent value="schools" className="space-y-4">
            <div className="flex flex-wrap items-center gap-3">
              <Select value={schoolPerfDateRange} onValueChange={(v: 'all' | 'last_30_days' | 'this_term') => setSchoolPerfDateRange(v)}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue placeholder="Date range" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All time</SelectItem>
                  <SelectItem value="last_30_days">Last 30 days</SelectItem>
                  <SelectItem value="this_term">Last 3 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Card>
              <CardHeader>
                <CardTitle>School Performance Comparison</CardTitle>
                <CardDescription>Teaching completion rates by school for the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {schoolsLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : schoolPerformance.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No school data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="rate" name="Teaching Rate %" fill="#015F2B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Detailed School Statistics</CardTitle>
                <CardDescription>
                  {schoolPerfDateRange !== 'all' ? 'Scheduled = timetable slots in period. Rate (vs scheduled) = taught ÷ scheduled.' : 'Select a date range to see scheduled counts and rate vs scheduled.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      {schoolPerformance.some((s) => s.scheduled != null) && (
                        <>
                          <TableHead className="text-right">Scheduled</TableHead>
                          <TableHead className="text-right">Rate (vs scheduled)</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Sessions Recorded</TableHead>
                      <TableHead className="text-right">Classes Taught</TableHead>
                      <TableHead className="text-right">Classes Missed</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolPerformance.map((school) => (
                      <TableRow key={school.name}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        {schoolPerformance.some((s) => s.scheduled != null) && (
                          <>
                            <TableCell className="text-right">{school.scheduled ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              {school.rateVsScheduled != null ? `${school.rateVsScheduled}%` : '—'}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right">{school.taught + school.untaught}</TableCell>
                        <TableCell className="text-right text-[#015F2B] font-medium">{school.taught}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{school.untaught}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={`${school.rate >= 95 ? 'bg-[#015F2B]' : school.rate >= 90 ? 'bg-yellow-500' : 'bg-red-500'} hover:opacity-90`}>
                            {school.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LECTURERS TAB */}
          <TabsContent value="lecturers" className="space-y-4">
             <div className="flex flex-wrap items-center gap-4 mb-4">
               <Select value={lecturerDateRange} onValueChange={(v: 'all' | 'last_30_days' | 'this_term') => setLecturerDateRange(v)}>
                 <SelectTrigger className="w-[180px]">
                   <SelectValue placeholder="Date range" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All time</SelectItem>
                   <SelectItem value="last_30_days">Last 30 days</SelectItem>
                   <SelectItem value="this_term">Last 3 months</SelectItem>
                 </SelectContent>
               </Select>
               <div className="relative flex-1 min-w-[200px] max-w-sm">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input placeholder="Search lecturer..." className="pl-8" value={lecturerSearch} onChange={(e) => setLecturerSearch(e.target.value)} />
               </div>
               <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Filter School" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Schools</SelectItem>
                    {Array.from(new Set([...schoolPerformance.map(s => s.name), ...lecturerTableData.map(l => l.school).filter(Boolean)])).sort().map(name => (
                      <SelectItem key={name} value={name}>{name}</SelectItem>
                    ))}
                  </SelectContent>
               </Select>
             </div>
             
             <Card>
               <CardHeader>
                  <CardTitle>Lecturer Performance</CardTitle>
                  <CardDescription>Top performing staff teaching records and attendance rates.</CardDescription>
               </CardHeader>
               <CardContent>
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Lecturer Name</TableHead>
                       <TableHead>School / Dept</TableHead>
                       <TableHead className="text-right">Taught</TableHead>
                       <TableHead className="text-right">Missed</TableHead>
                       <TableHead className="text-right">Rate</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {lecturersLoading ? (
                       <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                     ) : lecturerTableData.length === 0 ? (
                       <TableRow><TableCell colSpan={6} className="text-center py-4 text-muted-foreground">No lecturer data yet.</TableCell></TableRow>
                     ) : (
                       lecturerTableData
                         .filter(lecturer => {
                           const matchesSearch = lecturerSearch === '' || lecturer.name.toLowerCase().includes(lecturerSearch.toLowerCase());
                           const matchesFilter = schoolFilter === 'all' || lecturer.school.toLowerCase().includes(schoolFilter.toLowerCase());
                           return matchesSearch && matchesFilter;
                         })
                         .map((lecturer) => (
                         <TableRow key={lecturer.id}>
                           <TableCell className="font-medium">{lecturer.name}</TableCell>
                           <TableCell>{lecturer.school}</TableCell>
                           <TableCell className="text-right">{lecturer.taught}</TableCell>
                           <TableCell className="text-right text-red-600">{lecturer.missed}</TableCell>
                           <TableCell className="text-right">
                              <span className={`font-bold ${lecturer.rate < 90 ? 'text-red-600' : 'text-[#015F2B]'}`}>
                                {lecturer.rate}%
                              </span>
                           </TableCell>
                           <TableCell className="text-right">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="text-[#015F2B]"
                               onClick={() => {
                                 setSelectedLecturer(lecturer);
                                 setDetailsOpen(true);
                               }}
                             >
                               View Details
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
               </CardContent>
             </Card>
          </TabsContent>

           {/* STUDENTS TAB - from analytics worst-performing students */}
           <TabsContent value="students" className="space-y-4">
             <div className="flex flex-wrap items-center gap-3">
               <Select value={studentAttendDateRange} onValueChange={(v: 'all' | 'last_30_days' | 'this_term') => setStudentAttendDateRange(v)}>
                 <SelectTrigger className="w-[180px]">
                   <SelectValue placeholder="Date range" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="all">All time</SelectItem>
                   <SelectItem value="last_30_days">Last 30 days</SelectItem>
                   <SelectItem value="this_term">Last 3 months</SelectItem>
                 </SelectContent>
               </Select>
               <Select value={String(studentAttendLimit)} onValueChange={(v) => setStudentAttendLimit(Number(v))}>
                 <SelectTrigger className="w-[160px]">
                   <SelectValue placeholder="Show top" />
                 </SelectTrigger>
                 <SelectContent>
                   <SelectItem value="50">Top 50</SelectItem>
                   <SelectItem value="100">Top 100</SelectItem>
                   <SelectItem value="200">Top 200</SelectItem>
                 </SelectContent>
               </Select>
             </div>
              <Card>
                <CardHeader>
                  <CardTitle>Student Attendance Report</CardTitle>
                  <CardDescription>
                    Students with lowest attendance (at-risk). Attendance % = Present ÷ total records in the selected period. Missed = number of Absent records.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                        <TableHead className="text-right">Missed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsLoading ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                      ) : studentsReport.length === 0 ? (
                        <TableRow><TableCell colSpan={4} className="text-center py-4 text-muted-foreground">No student attendance data yet.</TableCell></TableRow>
                      ) : (
                        studentsReport.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.program ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              <span className={s.attendanceRate != null && s.attendanceRate < 75 ? 'text-red-600 font-medium' : ''}>
                                {s.attendanceRate != null ? `${s.attendanceRate}%` : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{s.missed ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>

        {/* Lecturer Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Lecturer Performance Details</DialogTitle>
              <DialogDescription>
                Performance metrics for {selectedLecturer?.name}
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
                    <p className="text-sm font-medium text-gray-500">School</p>
                    <p className="text-sm font-medium">{selectedLecturer.school}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Classes Taught</p>
                    <p className="text-sm font-medium">{selectedLecturer.taught}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Classes Missed</p>
                    <p className={`text-sm font-medium ${selectedLecturer.missed > 0 ? 'text-red-600' : ''}`}>
                      {selectedLecturer.missed}
                    </p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Teaching Rate</p>
                    <p className={`text-sm font-bold ${selectedLecturer.rate >= 90 ? 'text-green-600' : selectedLecturer.rate >= 80 ? 'text-orange-600' : 'text-red-600'}`}>
                      {selectedLecturer.rate.toFixed(1)}%
                    </p>
                  </div>
                </div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

// Icon helper
function BookOpen(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
