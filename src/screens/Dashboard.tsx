import React, { useState, useEffect } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area
} from 'recharts';
import { 
  Clock, MapPin, Calendar, CheckCircle, XCircle, AlertTriangle, 
  MoreHorizontal, Plus, Search, Filter, ArrowRight, UserCheck, Shield,
  Building, Users
} from 'lucide-react';
import { useRole } from '@/components/RoleProvider';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Progress } from '@/components/ui/progress';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import WorstPerformers from '@/components/WorstPerformers';
import { qaService } from '@/services/qa.service';
import { analyticsService } from '@/services/analytics.service';
import { reportService } from '@/services/report.service';
import { staffService } from '@/services/staff.service';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { QAAttendanceForm } from '@/features/qa/components/QAAttendanceForm';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router';


const COLORS = {
  primary: '#015F2B',
  secondary: '#F6A000',
  destructive: '#DC2626',
  muted: '#E5E7EB'
};

export default function Dashboard() {
  return <DashboardContent />;
}

function DashboardContent() {
  const { role } = useRole();

  if (!role) {
    return (
      <div className="p-8 text-center">
        <div className="text-gray-500 mb-4">Loading dashboard...</div>
      </div>
    );
  }

  let content;
  switch (role) {
    case 'QA':
      content = <QADashboard />;
      break;
    case 'Lecturer':
      content = <LecturerDashboard />;
      break;
    case 'Student':
      content = <StudentDashboard />;
      break;
    case 'Management':
    case 'Admin':
      content = <ManagementDashboard />;
      break;
    case 'Staff':
      content = <StaffDashboard />;
      break;
    default:
      content = (
        <div className="p-8 text-center space-y-4">
          <div className="text-gray-500 mb-4">Dashboard not available for role: {role}</div>
          <div className="text-sm text-gray-400">Please contact support if you believe this is an error.</div>
        </div>
      );
  }

  return content;
}

type TeachingRange = 'today' | 'yesterday' | 'this_week' | 'last_30_days';

function QADashboard() {
  const [stats, setStats] = useState<any>(null);
  const [teachingRange, setTeachingRange] = useState<TeachingRange>('last_30_days');
  const [teachingStatsByRange, setTeachingStatsByRange] = useState<{
    scheduledCount: number;
    taughtCount: number;
    untaughtCount: number;
    cancelledCount: number;
    substitutedCount: number;
    conductedCount: number;
    teachingRateFromScheduled: number | null;
    teachingRateFromRecorded: number | null;
  } | null>(null);
  const [schoolPerformance, setSchoolPerformance] = useState<any[]>([]);
  const [recentLectures, setRecentLectures] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [timeLostStats, setTimeLostStats] = useState<{ totalHours: number } | null>(null);
  const [timeLostLoading, setTimeLostLoading] = useState(true);
  const [retryCount, setRetryCount] = useState(0);
  const [filterOpen, setFilterOpen] = useState(false);
  const [recordLectureOpen, setRecordLectureOpen] = useState(false);

  const rangeLabel: Record<TeachingRange, string> = {
    today: 'Today',
    yesterday: 'Yesterday',
    this_week: 'This week',
    last_30_days: 'Last 30 days',
  };

  const fetchData = async () => {
    try {
      const [dashboardStats, teachingByRange, schoolSummary, lecturesRes, trends, timeLostResult] = await Promise.allSettled([
        analyticsService.getDashboardStats(),
        analyticsService.getTeachingStatsByRange(teachingRange),
        qaService.getSchoolSummaryReport(),
        qaService.getLectureRecords({ page: 1, limit: 5 }),
        analyticsService.getAttendanceTrends(7),
        analyticsService.getTimeLostStats(),
      ]);
      if (dashboardStats.status === 'fulfilled') setStats(dashboardStats.value);
      if (teachingByRange.status === 'fulfilled' && teachingByRange.value) setTeachingStatsByRange(teachingByRange.value);
      else setTeachingStatsByRange(null);
      if (schoolSummary.status === 'fulfilled') {
        const s = schoolSummary.value;
        setSchoolPerformance(Array.isArray(s) ? s : (s as { data?: unknown[] })?.data || []);
      }
      if (lecturesRes.status === 'fulfilled') {
        const list = Array.isArray(lecturesRes.value) ? lecturesRes.value : (lecturesRes.value as any)?.data || [];
        setRecentLectures(list.slice(0, 5));
      }
      if (trends.status === 'fulfilled') setAttendanceTrend(Array.isArray(trends.value) && trends.value.length > 0 ? trends.value : []);
      if (timeLostResult.status === 'fulfilled' && timeLostResult.value) setTimeLostStats(timeLostResult.value);
      else setTimeLostStats(null);
    } catch (error) {
      console.error('Error fetching QA dashboard data:', error);
      toast.error('Failed to load dashboard data');
    } finally {
      setTimeLostLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [retryCount, teachingRange]);

  const attendanceChartData = attendanceTrend.length > 0 ? attendanceTrend : [];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">QA Dashboard</h1>
          <p className="text-gray-500">Overview of university-wide teaching execution and attendance.</p>
        </div>
        <div className="flex flex-wrap gap-3 items-center">
          <Select value={teachingRange} onValueChange={(v) => setTeachingRange(v as TeachingRange)}>
            <SelectTrigger className="w-[160px]">
              <SelectValue placeholder="Time range" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="today">Today</SelectItem>
              <SelectItem value="yesterday">Yesterday</SelectItem>
              <SelectItem value="this_week">This week</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="gap-2" onClick={() => setFilterOpen(true)}>
            <Filter size={16} /> Filter
          </Button>
          <Button className="bg-[#015F2B] hover:bg-[#014022] gap-2" onClick={() => setRecordLectureOpen(true)}>
            <Plus size={16} /> Record Lecture
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={Calendar} label={`Scheduled (${rangeLabel[teachingRange]})`} value={teachingStatsByRange != null ? String(teachingStatsByRange.scheduledCount) : '—'} color="text-gray-700" />
        <StatsCard icon={CheckCircle} label={`Taught (${rangeLabel[teachingRange]})`} value={teachingStatsByRange != null ? String(teachingStatsByRange.taughtCount) : (stats?.recentQARecords ?? '0')} color="text-[#015F2B]" />
        <StatsCard icon={XCircle} label={`Untaught (${rangeLabel[teachingRange]})`} value={teachingStatsByRange != null ? String(teachingStatsByRange.untaughtCount) : String(stats?.untaughtLectures ?? '0')} color="text-red-600" />
        <StatsCard icon={AlertTriangle} label={`Cancelled (${rangeLabel[teachingRange]})`} value={teachingStatsByRange != null ? String(teachingStatsByRange.cancelledCount) : '0'} color="text-amber-600" />
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard icon={UserCheck} label="Substituted" value={teachingStatsByRange != null ? String(teachingStatsByRange.substitutedCount) : '0'} color="text-blue-600" />
        <StatsCard icon={CheckCircle} label={`Teaching rate (${rangeLabel[teachingRange]})`} value={teachingStatsByRange?.teachingRateFromScheduled != null ? `${teachingStatsByRange.teachingRateFromScheduled.toFixed(1)}%` : teachingStatsByRange?.teachingRateFromRecorded != null ? `${teachingStatsByRange.teachingRateFromRecorded.toFixed(1)}%` : stats?.teachingRatePercent != null ? `${stats.teachingRatePercent}%` : '—'} color="text-[#015F2B]" />
        <StatsCard icon={UserCheck} label="Student Attendance" value={stats?.studentAttendancePercent != null ? `${stats.studentAttendancePercent}%` : '0%'} color="text-blue-600" />
        <StatsCard icon={Clock} label="Time Lost (Hrs)" value={timeLostLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : (timeLostStats?.totalHours?.toFixed(1) ?? '—')} color="text-[#F6A000]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle>Teaching Performance by School</CardTitle>
            <CardDescription>Breakdown of taught vs missing vs late lectures this week</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {schoolPerformance.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={schoolPerformance.map(s => ({ name: s.school, taught: s.totalNoTaught, untaught: s.noUntaught, late: s.late ?? s.noLate ?? s.lateCount ?? s.lateClasses ?? 0 }))} margin={{ top: 20, right: 30, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} />
                  <XAxis dataKey="name" axisLine={false} tickLine={false} />
                  <YAxis axisLine={false} tickLine={false} />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)' }}
                    cursor={{ fill: 'transparent' }}
                  />
                  <Bar dataKey="taught" name="Taught" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="late" name="Late" fill={COLORS.secondary} radius={[4, 4, 0, 0]} barSize={30} />
                  <Bar dataKey="untaught" name="Untaught" fill={COLORS.destructive} radius={[4, 4, 0, 0]} barSize={30} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                <div>No school performance data available</div>
                <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                  Retry
                </Button>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Overall Attendance</CardTitle>
            <CardDescription>Daily student presence trends</CardDescription>
          </CardHeader>
          <CardContent className="h-[300px]">
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={attendanceChartData}>
                  <defs>
                    <linearGradient id="colorPresent" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor={COLORS.primary} stopOpacity={0.1}/>
                      <stop offset="95%" stopColor={COLORS.primary} stopOpacity={0}/>
                    </linearGradient>
                  </defs>
                  <XAxis dataKey="day" axisLine={false} tickLine={false} />
                  <Tooltip />
                  <Area type="monotone" dataKey="present" stroke={COLORS.primary} fillOpacity={1} fill="url(#colorPresent)" strokeWidth={3} />
                </AreaChart>
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
      </div>

      {/* Worst Performers Section */}
      <WorstPerformers maxItems={5} showExport={true} />

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Recent Lecture Records</CardTitle>
            <CardDescription>Latest teaching entries submitted by faculty.</CardDescription>
          </div>
          <Button variant="ghost" size="sm" className="gap-1"> View All <ArrowRight size={16} /></Button>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Status</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Time & Venue</TableHead>
                <TableHead>School</TableHead>
                <TableHead className="text-right">Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {recentLectures.length > 0 ? (
                recentLectures.map((lecture: any, idx: number) => (
                  <TableRow key={lecture.id || idx}>
                    <TableCell>
                      <StatusBadge status={lecture.comment || lecture.status} />
                    </TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{lecture.courseUnit || lecture.course}</div>
                      <div className="text-xs text-gray-500">{lecture.courseCode || lecture.code}</div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                         <Avatar className="h-6 w-6">
                          <AvatarFallback className="text-[10px] bg-[#015F2B]/10 text-[#015F2B]">
                            {(lecture.lecturerName || lecture.lecturer).split(' ').map((n: string) => n[0]).join('')}
                          </AvatarFallback>
                        </Avatar>
                        <span className="text-sm">{lecture.lecturerName || lecture.lecturer}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{lecture.timeForStarting && lecture.timeOutForEnding ? `${lecture.timeForStarting} - ${lecture.timeOutForEnding}` : lecture.time}</div>
                      <div className="text-xs text-muted-foreground">{lecture.venue}</div>
                    </TableCell>
                    <TableCell className="text-sm">{lecture.school || 'N/A'}</TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost">
                        <MoreHorizontal size={16} />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="text-center py-10">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="text-muted-foreground">No recent lecture records available</div>
                      <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                        Retry
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Filter Dialog */}
      <Dialog open={filterOpen} onOpenChange={setFilterOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Filter Dashboard</DialogTitle>
            <DialogDescription>Filter dashboard data by date range, school, or department</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-muted-foreground">Filter functionality coming soon. Use the individual screen filters for now.</p>
          </div>
        </DialogContent>
      </Dialog>

      {/* Record Lecture Dialog */}
      <Dialog open={recordLectureOpen} onOpenChange={setRecordLectureOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Record Lecture</DialogTitle>
            <DialogDescription>Create a new lecture attendance record</DialogDescription>
          </DialogHeader>
          <QAAttendanceForm
            onSuccess={() => {
              setRecordLectureOpen(false);
              toast.success('Lecture record created successfully');
              fetchData();
            }}
            onCancel={() => setRecordLectureOpen(false)}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}

// --- Lecturer Dashboard ---
function LecturerDashboard() {
  const navigate = useNavigate();
  const [staffStats, setStaffStats] = useState<any>(null);
  const [timetable, setTimetable] = useState<any[]>([]);
  const [myRecords, setMyRecords] = useState<{ data: any[]; total: number }>({ data: [], total: 0 });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [stats, classes, recordsRes] = await Promise.all([
          (await import('@/services/staff.service')).staffService.getDashboardStats(),
          (await import('@/services/academic.service')).academicService.getTimetable(),
          qaService.getMyLectureRecords(),
        ]);
        setStaffStats(stats);
        setTimetable(Array.isArray(classes) ? classes : []);
        setMyRecords(recordsRes);
      } catch (error) {
        console.error('Error fetching lecturer dashboard:', error);
      }
    };
    fetchData();
  }, []);

  const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
  };

  const isClassLive = (startTime: string, endTime: string): boolean => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    const currentMinutes = now.getHours() * 60 + now.getMinutes();
    const startMinutes = parseTimeToMinutes(startTime);
    const endMinutes = parseTimeToMinutes(endTime);
    if (startMinutes === null || endMinutes === null) return false;
    return currentMinutes >= startMinutes && currentMinutes <= endMinutes;
  };

  const todaySchedule = timetable.filter((c: any) => {
    const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
    return c.day === dayNames[new Date().getDay()];
  }).sort((a: any, b: any) => {
    const aStart = parseTimeToMinutes(a.startTime || '') || 0;
    const bStart = parseTimeToMinutes(b.startTime || '') || 0;
    return aStart - bStart;
  }).slice(0, 5).map((c: any) => {
    const live = isClassLive(c.startTime || '', c.endTime || '');
    return {
      id: c.id,
      time: c.startTime && c.endTime ? `${c.startTime} - ${c.endTime}` : 'TBA',
      course: c.course?.name || 'Unknown',
      room: c.venue?.name || 'TBA',
      venue: c.venue?.name || 'TBA',
      status: live ? 'Live' : 'Upcoming',
      type: 'Lecture',
      classId: c.id,
      startTime: c.startTime,
      endTime: c.endTime,
      isLive: live,
    };
  });

  // Attendance chart: group my records by year-month, count TAUGHT, last 6 months
  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const attendanceChartData = (() => {
    const byKey: Record<string, number> = {};
    const records = myRecords.data || [];
    records.forEach((r: any) => {
      const d = r.date ? new Date(r.date) : null;
      if (!d) return;
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      if (!byKey[key]) byKey[key] = 0;
      if ((r.comment || '').toUpperCase() === 'TAUGHT') byKey[key] += 1;
    });
    const sorted = Object.entries(byKey).sort((a, b) => a[0].localeCompare(b[0])).slice(-6);
    return sorted.map(([key, present]) => {
      const [y, m] = key.split('-');
      return { month: monthNames[parseInt(m, 10) - 1], present };
    });
  })();
  const recentUntaught = (myRecords.data || []).filter((r: any) => {
    const d = r.date ? new Date(r.date) : null;
    if (!d) return false;
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    return d >= weekAgo && (r.comment || '').toUpperCase() === 'UNTAUGHT';
  });

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome, {staffStats?.staffName ?? 'Lecturer'}</h1>
          <p className="text-gray-500">Here is your schedule and performance for today.</p>
        </div>
        <div className="flex gap-3">
          <Button className="bg-[#015F2B] hover:bg-[#014022] gap-2 shadow-lg hover:shadow-xl transition-all">
            <MapPin size={18} /> Mark Presence
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Card className="md:col-span-1 bg-gradient-to-br from-[#015F2B] to-[#027A3A] text-white border-none shadow-md">
          <CardContent className="pt-6">
            <div className="flex items-center gap-4 mb-6">
              <Avatar className="h-16 w-16 border-2 border-white/20">
                <AvatarFallback>{(staffStats?.staffName ?? 'L').split(' ').map((n: string) => n[0]).join('').slice(0, 2)}</AvatarFallback>
              </Avatar>
              <div>
                <h3 className="text-lg font-bold">{staffStats?.staffName ?? 'Lecturer'}</h3>
                <p className="text-sm text-green-100">{staffStats?.role ?? 'Lecturer'}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4 mt-4">
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-green-100 mb-1">Teaching Score</p>
                <p className="text-2xl font-bold">{staffStats?.attendanceRate ?? '-'}</p>
              </div>
              <div className="bg-white/10 rounded-lg p-3">
                <p className="text-xs text-green-100 mb-1">Classes (period)</p>
                <p className="text-2xl font-bold">{timetable.length}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle className="flex justify-between items-center">
              Today's Schedule
              <span className="text-xs font-normal text-muted-foreground bg-gray-100 px-2 py-1 rounded">
                {new Date().toLocaleDateString()}
              </span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {(todaySchedule.length > 0 ? todaySchedule : [
                { time: '08:00 AM', course: 'No classes today', room: '-', venue: '-', status: 'Upcoming', type: 'Lecture', id: null },
              ]).map((item: any, i: number) => (
                <div key={i} className={`flex items-start gap-4 p-3 rounded-lg hover:bg-gray-50 transition-colors border ${item.isLive ? 'border-green-300 bg-green-50/30' : 'border-transparent hover:border-gray-100'}`}>
                  <div className="w-20 text-sm font-semibold text-gray-500 pt-1">{item.time}</div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className="font-semibold text-gray-900">{item.course}</h4>
                      {item.isLive && (
                        <Badge className="bg-green-500 text-white hover:bg-green-600 border-green-600 animate-pulse">
                          Live
                        </Badge>
                      )}
                    </div>
                    <p className="text-sm text-gray-500 mb-2">
                      <span className="font-medium">{item.venue}</span> • {item.type}
                    </p>
                    {item.status === 'In Progress' && !item.isLive && (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-200 border-green-200">Processing</Badge>
                    )}
                  </div>
                  {item.id && item.course !== 'No classes today' ? (
                    <Button 
                      size="sm" 
                      variant="outline" 
                      className="shrink-0"
                      onClick={() => navigate('/timetable')}
                    >
                      View Details
                    </Button>
                  ) : null}
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Analytics Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
             <CardTitle>Attendance History</CardTitle>
             <CardDescription>Your monthly attendance record.</CardDescription>
          </CardHeader>
          <CardContent className="h-[250px]">
            {attendanceChartData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={attendanceChartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                  <XAxis dataKey="month" axisLine={false} tickLine={false} />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="present" fill={COLORS.primary} radius={[4, 4, 0, 0]} barSize={40} />
                </BarChart>
              </ResponsiveContainer>
            ) : (
              <div className="flex items-center justify-center h-full text-gray-400 text-sm">
                No attendance data available for the selected period
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                {recentUntaught.length > 0 && (
                  <div className="flex p-4 border rounded-md border-l-4 border-l-[#F6A000] bg-orange-50/50">
                    <AlertTriangle className="text-[#F6A000] w-5 h-5 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">Missing Attendance Record</h4>
                      <p className="text-sm text-gray-600">
                        You have {recentUntaught.length} untaught/missing attendance entries in the last 7 days.
                        {recentUntaught[0]?.courseUnit && ` e.g. "${recentUntaught[0].courseUnit}"`}
                      </p>
                    </div>
                  </div>
                )}
                <div className="flex p-4 border rounded-md border-l-4 border-l-[#015F2B] bg-green-50/50">
                  <CheckCircle className="text-[#015F2B] w-5 h-5 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Performance Review</h4>
                    <p className="text-sm text-gray-600">Your monthly teaching report is ready to view. Teaching score: {staffStats?.attendanceRate ?? '—'}.</p>
                  </div>
                </div>
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// --- Student Dashboard ---
function StudentDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState<any>(null);
  const [myClasses, setMyClasses] = useState<{ time: string; course: string; lecturer: string; venue: string; status: string; attendancePct: number; isLive?: boolean }[]>([]);
  const [classesLoading, setClassesLoading] = useState(true);
  const [thresholds, setThresholds] = useState<{ attendance: { present: number; atRisk: number }; student?: { excellent: number; good: number; warning: number; critical: number } } | null>(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const data = await (await import('@/services/student.service')).studentService.getDashboardStats();
        setStats(data);
      } catch (error) {
        console.error('Error fetching student dashboard:', error);
      }
    };
    fetchData();
  }, []);

  useEffect(() => {
    (async () => {
      try {
        const t = await (await import('@/services/settings.service')).settingsService.getPerformanceThresholds();
        setThresholds(t);
      } catch {
        setThresholds(null);
      }
    })();
  }, []);

  const parseTimeToMinutes = (timeStr: string): number | null => {
    if (!timeStr) return null;
    const parts = timeStr.split(':');
    if (parts.length < 2) return null;
    const hours = parseInt(parts[0], 10);
    const minutes = parseInt(parts[1], 10);
    if (isNaN(hours) || isNaN(minutes)) return null;
    return hours * 60 + minutes;
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

  useEffect(() => {
    if (!user?.id) {
      setClassesLoading(false);
      return;
    }
    const load = async () => {
      setClassesLoading(true);
      try {
        const enrollmentService = (await import('@/services/enrollment.service')).enrollmentService;
        const studentService = (await import('@/services/student.service')).studentService;
        const settingsService = (await import('@/services/settings.service')).settingsService;
        const timetableService = (await import('@/services/timetable.service')).timetableService;
        const th = thresholds ?? await settingsService.getPerformanceThresholds();
        const attThresholds = th.attendance ?? { present: 75, atRisk: 0 };

        const student = await studentService.getStudentByUserId();
        if (!student) {
          setMyClasses([]);
          return;
        }

        const today = new Date().getDay();
        const timetable = await timetableService.getMyTimetable();
        const todayTimetableClasses = timetable.filter((c: any) => {
          return c.dayOfWeek === today;
        });

        const enrollments = await enrollmentService.getStudentEnrollments(student.id);
        const enrollmentMap = new Map(enrollments.map((e: any) => [e.classId, e]));
        
        const withAttendance = await Promise.all(
          todayTimetableClasses.map(async (classItem: any) => {
            const enrollment = enrollmentMap.get(classItem.id);
            const dayOfWeek = classItem.dayOfWeek ?? null;
            const live = isClassLive(classItem.startTime || '', classItem.endTime || '', dayOfWeek);
            
            const time = classItem.startTime && classItem.endTime
              ? `${classItem.startTime} - ${classItem.endTime}`
              : '—';
            const course = classItem.course?.name || '—';
            const lecturer = classItem.lecturer?.name || '—';
            const venue = classItem.venue?.name || '—';
            let attendancePct = 0;
            if (enrollment) {
              try {
                const att = await studentService.getStudentAttendance(student.id, { classId: classItem.id });
                const arr = Array.isArray(att) ? att : [];
                const present = arr.filter((r: any) => r.status === 'Present').length;
                attendancePct = arr.length > 0 ? Math.round((present / arr.length) * 100) : 0;
              } catch (_) {}
            }
            const status = live ? 'Live' : attendancePct >= attThresholds.present ? 'Present' : attendancePct > attThresholds.atRisk ? 'At Risk' : 'Upcoming';
            return { time, course, lecturer, venue, status, attendancePct, isLive: live, dayOfWeek, startTime: classItem.startTime, endTime: classItem.endTime };
          })
        );
        
        const sortedClasses = withAttendance.sort((a, b) => {
          const aStart = parseTimeToMinutes(a.startTime || '') || 0;
          const bStart = parseTimeToMinutes(b.startTime || '') || 0;
          return aStart - bStart;
        });
        
        setMyClasses(sortedClasses.slice(0, 10));
      } catch (e) {
        setMyClasses([]);
      } finally {
        setClassesLoading(false);
      }
    };
    load();
  }, [user?.id, thresholds]);

  return (
     <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Hi, {stats?.studentName?.split(' ')[0] ?? 'Student'}</h1>
          <p className="text-gray-500">{stats?.program ?? '-'} • Year {stats?.year ?? '-'} • Semester {stats?.semester ?? '-'}</p>
        </div>
        <Button className="bg-[#015F2B] hover:bg-[#014022] gap-2 w-full md:w-auto">
            <MapPin size={18} /> Mark Presence
        </Button>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-[#015F2B]">{stats?.attendanceRate ?? 0}%</span>
            <span className="text-xs text-muted-foreground mt-1">Attendance Rate</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-gray-900">{stats?.classesToday ?? 0}</span>
            <span className="text-xs text-muted-foreground mt-1">Classes Today</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-[#F6A000]">{stats?.assignmentsPending ?? 0}</span>
            <span className="text-xs text-muted-foreground mt-1">Assignments</span>
        </Card>
        <Card className="p-4 flex flex-col justify-center items-center text-center">
            <span className="text-3xl font-bold text-gray-900">{stats?.gpa ?? '-'}</span>
            <span className="text-xs text-muted-foreground mt-1">Current GPA</span>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2">
            <CardHeader>
                <CardTitle>Today's Classes</CardTitle>
                <CardDescription>Your classes scheduled for today with live status and venues.</CardDescription>
            </CardHeader>
            <CardContent>
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Time</TableHead>
                            <TableHead>Course</TableHead>
                            <TableHead>Venue</TableHead>
                            <TableHead>Status</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {classesLoading ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">Loading classes...</TableCell></TableRow>
                        ) : myClasses.length === 0 ? (
                            <TableRow><TableCell colSpan={4} className="text-center py-6 text-muted-foreground">No classes enrolled yet.</TableCell></TableRow>
                        ) : (
                            myClasses.map((row, i) => (
                                <TableRow key={i} className={row.isLive ? 'bg-green-50/50' : ''}>
                                    <TableCell className="font-medium">{row.time}</TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-2">
                                            <span>{row.course}</span>
                                            {row.isLive && (
                                                <Badge className="bg-green-500 text-white hover:bg-green-600 border-green-600 animate-pulse text-[10px] px-1.5 py-0">
                                                    Live
                                                </Badge>
                                            )}
                                        </div>
                                        <div className="text-xs text-muted-foreground">{row.lecturer}</div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-medium">{row.venue}</span>
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={
                                            row.isLive 
                                              ? 'bg-green-500 text-white border-green-600 animate-pulse' 
                                              : row.status === 'Present' 
                                                ? 'bg-green-100 text-green-800 border-green-200' 
                                                : row.status === 'At Risk' 
                                                  ? 'bg-orange-100 text-orange-800 border-orange-200' 
                                                  : ''
                                        }>
                                            {row.status}
                                        </Badge>
                                    </TableCell>
                                </TableRow>
                            ))
                        )}
                    </TableBody>
                </Table>
            </CardContent>
        </Card>

        <Card>
            <CardHeader>
                <CardTitle>Attendance Limit</CardTitle>
                <CardDescription>
                  Per-class attendance ({thresholds?.attendance?.present ?? 75}% threshold)
                </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                {classesLoading ? (
                    <p className="text-sm text-muted-foreground">Loading...</p>
                ) : myClasses.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No classes to show.</p>
                ) : (
                    myClasses.map((row, i) => {
                      const warningLevel = thresholds?.student?.warning ?? 70;
                      return (
                        <div key={i} className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="truncate">{row.course}</span>
                                <span className={`font-bold ${row.attendancePct < warningLevel ? 'text-[#F6A000]' : ''}`}>{row.attendancePct}%</span>
                            </div>
                            <Progress value={row.attendancePct} className={`h-2 ${row.attendancePct < warningLevel ? '[&>div]:bg-[#F6A000]' : ''}`} />
                            {row.attendancePct < warningLevel && row.attendancePct > 0 && (
                                <p className="text-xs text-red-500">Warning: Below {warningLevel}% threshold</p>
                            )}
                        </div>
                      );
                    })
                )}
            </CardContent>
        </Card>
      </div>
     </div>
  );
}

// --- Staff Dashboard ---
function StaffDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [checkInHistory, setCheckInHistory] = useState<{ date: string; checkIn: string; checkOut: string; status: string }[]>([]);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const staffService = (await import('@/services/staff.service')).staffService;
        const [data, history] = await Promise.all([
          staffService.getDashboardStats(),
          staffService.getCheckInHistory(),
        ]);
        setStats(data);
        setCheckInHistory(Array.isArray(history) ? history : []);
      } catch (error) {
        console.error('Error fetching staff dashboard:', error);
      }
    };
    fetchData();
  }, []);

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Welcome, {stats?.staffName ?? 'Staff'}</h1>
          <p className="text-gray-500">{stats?.role ?? 'Staff'}</p>
        </div>
        <div className="flex gap-3">
           <Button 
             className="bg-[#015F2B] hover:bg-[#014022] gap-2 shadow-lg hover:shadow-xl transition-all"
             onClick={() => navigate('/presence')}
           >
            <MapPin size={18} /> Mark Presence
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <StatsCard icon={CheckCircle} label="Attendance Rate" value={stats?.attendanceRate ?? '-'} color="text-[#015F2B]" />
        <StatsCard icon={Calendar} label="Present This Month" value={stats?.presentDays ?? '-'} description={stats?.workingDaysInMonth != null ? `Out of ${stats.workingDaysInMonth} working days` : undefined} color="text-blue-600" />
        <StatsCard icon={Clock} label="Total Hours" value={stats?.totalHours ?? '-'} description="Year to date" color="text-[#F6A000]" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>My Attendance</CardTitle>
            <CardDescription>Recent check-in activity.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>Time In</TableHead>
                  <TableHead>Time Out</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {checkInHistory.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                      No check-in records yet. Check-in feature will appear here when available.
                    </TableCell>
                  </TableRow>
                ) : (
                  checkInHistory.map((row, i) => (
                    <TableRow key={i}>
                      <TableCell className="font-medium">{row.date}</TableCell>
                      <TableCell>{row.checkIn}</TableCell>
                      <TableCell>{row.checkOut}</TableCell>
                      <TableCell>
                        <Badge variant={row.status === 'Late' ? 'secondary' : 'default'} className={
                          row.status === 'Present' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200' : 'bg-orange-100 text-orange-800'
                        }>
                          {row.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            <div className="mt-4 text-center">
              <Button 
                variant="ghost" 
                className="text-[#015F2B]"
                onClick={() => navigate('/attendance-history')}
              >
                View Full History <ArrowRight size={16} className="ml-2" />
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
             <CardTitle>Notifications</CardTitle>
          </CardHeader>
          <CardContent>
             <div className="space-y-4">
                <div className="flex p-4 border rounded-md border-l-4 border-l-blue-600 bg-blue-50/50">
                  <Shield className="text-blue-600 w-5 h-5 mr-3 mt-0.5" />
                  <div>
                    <h4 className="font-semibold text-sm text-gray-900">Check-in reminder</h4>
                    <p className="text-sm text-gray-600">Ensure you check in when you arrive. Staff check-in history is available in Attendance History.</p>
                  </div>
                </div>
                {checkInHistory.length > 0 && (
                  <div className="flex p-4 border rounded-md border-l-4 border-l-[#015F2B] bg-green-50/50">
                    <CheckCircle className="text-[#015F2B] w-5 h-5 mr-3 mt-0.5" />
                    <div>
                      <h4 className="font-semibold text-sm text-gray-900">Attendance recorded</h4>
                      <p className="text-sm text-gray-600">You have {checkInHistory.length} check-in record(s) on file.</p>
                    </div>
                  </div>
                )}
             </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function ManagementDashboard() {
  const navigate = useNavigate();
  const [stats, setStats] = useState<any>(null);
  const [teachingRangeMgmt, setTeachingRangeMgmt] = useState<TeachingRange>('last_30_days');
  const [teachingStatsByRange, setTeachingStatsByRange] = useState<{
    scheduledCount: number;
    taughtCount: number;
    untaughtCount: number;
    cancelledCount: number;
    teachingRateFromScheduled: number | null;
  } | null>(null);
  const [departmentData, setDepartmentData] = useState<any[]>([]);
  const [topStaff, setTopStaff] = useState<any[]>([]);
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([]);
  const [teachingRate, setTeachingRate] = useState<number | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [staffOnLeave, setStaffOnLeave] = useState<number | null>(null);
  const [criticalAlerts, setCriticalAlerts] = useState<number>(0);
  const [thresholds, setThresholds] = useState<{ attendance: { present: number; atRisk: number } }>({ attendance: { present: 75, atRisk: 0 } });
  const [attendanceTrendValue, setAttendanceTrendValue] = useState<{ value: number; positive: boolean } | null>(null);
  const rangeLabelMgmt: Record<TeachingRange, string> = { today: 'Today', yesterday: 'Yesterday', this_week: 'This week', last_30_days: 'Last 30 days' };

  useEffect(() => {
    (async () => {
      try {
        const t = await (await import('@/services/settings.service')).settingsService.getPerformanceThresholds();
        setThresholds({ attendance: t.attendance });
      } catch {
        // keep default
      }
    })();
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      try {
        const [dashboardStats, teachingByRange, staff, trends, deptDist] = await Promise.all([
          analyticsService.getDashboardStats(),
          analyticsService.getTeachingStatsByRange(teachingRangeMgmt),
          analyticsService.getTopPerformingStaff(5),
          analyticsService.getAttendanceTrends(30),
          analyticsService.getDepartmentDistribution(),
        ]);
        setStats(dashboardStats);
        if (teachingByRange) setTeachingStatsByRange(teachingByRange);
        else setTeachingStatsByRange(null);
        const d = dashboardStats as Record<string, unknown> | null | undefined;
        // Calculate teaching rate from dashboard stats
        if (d?.recentQARecords != null && d?.totalLectures != null) {
          const totalLectures = (d.totalLectures as number) || 1;
          const taughtLectures = (d.recentQARecords as number) || 0;
          const calculatedRate = totalLectures > 0 ? (taughtLectures / totalLectures) * 100 : 0;
          setTeachingRate(Math.round(calculatedRate * 10) / 10);
        } else if (d?.teachingRatePercent != null) {
          setTeachingRate(d.teachingRatePercent as number);
        }
        
        // Use API data for department distribution
        if (deptDist?.departments && deptDist.departments.length > 0) {
          setDepartmentData(deptDist.departments.map((d: any) => ({
            name: d.name,
            value: d.studentCount || 0,
          })));
        } else {
          setDepartmentData([]);
        }
        
        setTopStaff(Array.isArray(staff) ? staff : []);
        const trendData = Array.isArray(trends) && trends.length > 0 ? trends : [];
        setAttendanceTrend(trendData);
        
        // Calculate trend from attendance data
        if (trendData.length >= 2) {
          const recent = trendData[trendData.length - 1] as { present: number; absent: number };
          const previous = trendData[trendData.length - 2] as { present: number; absent: number };
          const recentRate = recent.present / (recent.present + recent.absent) * 100;
          const previousRate = previous.present / (previous.present + previous.absent) * 100;
          const diff = recentRate - previousRate;
          setAttendanceTrendValue({ value: Math.abs(diff), positive: diff >= 0 });
        }
        
        // Staff on leave - only show if backend provides this data
        // No estimation - only real data from API
        try {
          // Check if backend API provides staff on leave data
          // If not available, set to null (will show nothing)
          setStaffOnLeave(null); // Only show if backend provides real data
        } catch (e) {
          setStaffOnLeave(null);
        }
        
        // Calculate critical alerts from worst performers API data
        // Uses real API data - counts students with attendance rate < 50% from API
        try {
          const worstPerformers = await analyticsService.getWorstPerformingStudents(10);
          const criticalCount = Array.isArray(worstPerformers) 
            ? worstPerformers.filter((s: any) => (s.attendanceRate || 0) < 50).length 
            : 0;
          setCriticalAlerts(criticalCount);
        } catch (e) {
          setCriticalAlerts(0); // Show 0 if API fails (no estimation)
        }
      } catch (error: any) {
        console.error('Error fetching management dashboard data:', error);
        setError(error?.message || 'Failed to load dashboard data');
        toast.error('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [retryCount, teachingRangeMgmt]);

  const lineChartData = attendanceTrend.length > 0
    ? attendanceTrend.slice(-5).map((t: any) => ({ m: t.day, current: t.present, last: t.absent }))
    : [];
  
  const PIE_COLORS = ['#015F2B', '#F6A000', '#0088FE', '#FF8042'];

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">University Overview</h1>
          <p className="text-gray-500">Executive summary of campus operations.</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
             <Select value={teachingRangeMgmt} onValueChange={(v) => setTeachingRangeMgmt(v as TeachingRange)}>
               <SelectTrigger className="w-[150px]">
                 <SelectValue placeholder="Time range" />
               </SelectTrigger>
               <SelectContent>
                 <SelectItem value="today">Today</SelectItem>
                 <SelectItem value="yesterday">Yesterday</SelectItem>
                 <SelectItem value="this_week">This week</SelectItem>
                 <SelectItem value="last_30_days">Last 30 days</SelectItem>
               </SelectContent>
             </Select>
             <Button variant="outline" onClick={async () => {
               try {
                 const report = await reportService.generateReport(
                   'dashboard-overview',
                   'Dashboard Overview Report',
                   {},
                   { 
                     stats,
                     teachingRate,
                     departmentData,
                     lineChartData,
                     topStaff,
                   }
                 );
                 await reportService.downloadReport(report.id);
               } catch (error: any) {
                 console.error('Download failed:', error);
                 toast.error(`Failed to download report: ${error?.message || 'Unknown error'}`);
               }
             }}>Download Report</Button>
        </div>
      </div>

      {error && (
        <Card className="border-red-200 bg-red-50">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-red-800 font-medium">Failed to load dashboard data</p>
                <p className="text-red-600 text-sm mt-1">{error}</p>
              </div>
              <Button variant="outline" onClick={() => setRetryCount(prev => prev + 1)}>
                Retry
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

       <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard 
          icon={Building} 
          label="Active Staff" 
          value={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.totalStaff || "0")} 
          description={staffOnLeave != null ? `${staffOnLeave} on leave today` : undefined} 
        />
        <StatsCard 
          icon={Users} 
          label="Students Present" 
          value={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (stats?.totalStudents || "0")} 
          trend={attendanceTrendValue || undefined} 
        />
        <StatsCard 
          icon={CheckCircle} 
          label={`Teaching Rate (${rangeLabelMgmt[teachingRangeMgmt]})`} 
          value={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : (teachingStatsByRange?.teachingRateFromScheduled != null ? `${teachingStatsByRange.teachingRateFromScheduled.toFixed(1)}%` : teachingRate != null ? `${teachingRate.toFixed(1)}%` : <span className="text-gray-400">0</span>)} 
          description={teachingStatsByRange != null ? `Scheduled: ${teachingStatsByRange.scheduledCount} · Taught: ${teachingStatsByRange.taughtCount} · Untaught: ${teachingStatsByRange.untaughtCount} · Cancelled: ${teachingStatsByRange.cancelledCount}` : undefined}
          trend={teachingRate != null && attendanceTrendValue ? attendanceTrendValue : undefined} 
        />
        <StatsCard 
          icon={AlertTriangle} 
          label="Critical Alerts" 
          value={loading ? <Loader2 className="h-4 w-4 animate-spin" /> : String(criticalAlerts)} 
          description={criticalAlerts > 0 ? "Requires attention" : undefined} 
          color="text-red-600" 
        />
      </div>

      {/* Worst Performers Section */}
      <WorstPerformers maxItems={5} showExport={true} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Card>
              <CardHeader>
                  <CardTitle>Department Distribution</CardTitle>
                  <CardDescription>Student population by school</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px] flex justify-center">
                {departmentData.length > 0 ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={departmentData}
                        innerRadius={60}
                        outerRadius={100}
                        fill="#8884d8"
                        paddingAngle={5}
                        dataKey="value"
                      >
                        {departmentData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="flex flex-col items-center justify-center h-full text-gray-400">
                    <div className="text-sm font-medium mb-2">No Department Data Available</div>
                    <div className="text-xs">Department distribution data is not available at this time.</div>
                  </div>
                )}
              </CardContent>
          </Card>

          <Card>
              <CardHeader>
                  <CardTitle>Attendance Trends</CardTitle>
                  <CardDescription>Comparison: This Year vs Last Year</CardDescription>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                   <LineChart data={lineChartData}>
                       <CartesianGrid vertical={false} strokeDasharray="3 3"/>
                       <XAxis dataKey="m" />
                       <YAxis />
                       <Tooltip />
                       <Line type="monotone" dataKey="current" stroke={COLORS.primary} strokeWidth={3} />
                       <Line type="monotone" dataKey="last" stroke={COLORS.muted} strokeWidth={3} />
                   </LineChart>
                </ResponsiveContainer>
              </CardContent>
          </Card>
      </div>

      <Card>
          <CardHeader>
              <CardTitle>Top Performing Staff</CardTitle>
          </CardHeader>
          <CardContent>
              <Table>
                  <TableHeader>
                      <TableRow>
                          <TableHead>Staff Name</TableHead>
                          <TableHead>Department</TableHead>
                          <TableHead>Classes</TableHead>
                          <TableHead>Attendance</TableHead>
                          <TableHead className="text-right">Score</TableHead>
                      </TableRow>
                  </TableHeader>
                  <TableBody>
                      {topStaff.length > 0 ? (
                        topStaff.map((row: any, i: number) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.name}</TableCell>
                            <TableCell>{row.department}</TableCell>
                            <TableCell>{row.classes ?? 0}</TableCell>
                            <TableCell>{row.attendance ?? '—'}</TableCell>
                            <TableCell className="text-right font-bold text-[#015F2B]">{row.score ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-8 text-gray-400">
                            No staff performance data available
                          </TableCell>
                        </TableRow>
                      )}
                  </TableBody>
              </Table>
          </CardContent>
      </Card>
    </div>
  );
}

// --- Helper Components ---

function StatsCard({ icon: Icon, label, value, change, description, color }: any) {
    const isPositive = change && change.startsWith('+');
    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex items-center justify-between space-y-0 pb-2">
                    <p className="text-sm font-medium text-muted-foreground">{label}</p>
                    <Icon className={`h-4 w-4 ${color || 'text-muted-foreground'}`} />
                </div>
                <div className="flex items-end justify-between mt-2">
                     <h2 className="text-3xl font-bold tracking-tight">{value}</h2>
                     {change && (
                         <span className={`text-xs px-2 py-1 rounded-full ${isPositive ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                             {change}
                         </span>
                     )}
                </div>
                {description && <p className="text-xs text-muted-foreground mt-2">{description}</p>}
            </CardContent>
        </Card>
    );
}

function StatusBadge({ status }: { status: string }) {
    if (status === 'Taught' || status === 'Present') {
        return <Badge className="bg-[#015F2B]/10 text-[#015F2B] border-[#015F2B]/20 hover:bg-[#015F2B]/20 shadow-none font-medium">{status}</Badge>;
    }
    if (status === 'Untaught' || status === 'Absent') {
        return <Badge className="bg-red-50 text-red-700 border-red-200 hover:bg-red-100 shadow-none font-medium">{status}</Badge>;
    }
    if (status === 'Late' || status === 'Warning') {
        return <Badge className="bg-[#F6A000]/10 text-[#F6A000] border-[#F6A000]/20 hover:bg-[#F6A000]/20 shadow-none font-medium">{status}</Badge>;
    }
    return <Badge variant="outline">{status}</Badge>;
}
