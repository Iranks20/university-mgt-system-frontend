import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { UserCheck, RefreshCw } from 'lucide-react';
import { academicService, enrollmentService, qaService, studentService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import { computeAttendanceFromRecords } from '@/lib/attendance-metrics';
import { AcademicTermFilter } from '@/components/AcademicTermFilter';
import { useAcademicTermFilterState } from '@/hooks/useAcademicTermFilterState';
import { isLectureTaught, lectureCommentLabel } from '@/lib/lecture-outcome';
import {
  SessionAttendanceDialog,
  type SessionAttendanceTarget,
} from '@/features/student';
import type { QALectureRecord } from '@/types/qa';

type CourseCard = {
  classId: string;
  name: string;
  code: string;
  className: string;
  students: number;
  avgAttendance: string | null;
  hasAvgAttendanceData: boolean;
  lastSession: string;
};

function toDateKey(value: string | Date | undefined | null): string {
  if (!value) return '';
  if (typeof value === 'string') return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function todayKey() {
  const now = new Date();
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export default function LecturerCourseAttendance() {
  const { user } = useAuth();
  const { termFilter, academicTermId, classStatusHint, termStartDate, termEndDate, onTermChange } =
    useAcademicTermFilterState();
  const [courses, setCourses] = useState<CourseCard[]>([]);
  const [loading, setLoading] = useState(true);
  const [markDate, setMarkDate] = useState(todayKey());
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [markableSessions, setMarkableSessions] = useState<
    Array<{
      classId: string;
      className: string;
      courseUnit: string;
      comment: string;
      timeForStarting: string;
      date: string;
    }>
  >([]);
  const [awaitingSessions, setAwaitingSessions] = useState<
    Array<{ classId: string; className: string; courseUnit: string; comment: string; date: string }>
  >([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [dialogTarget, setDialogTarget] = useState<SessionAttendanceTarget | null>(null);

  const loadCourses = async () => {
    if (!user?.id) return;
    try {
      setLoading(true);
      const timetable = await academicService.getTimetable({
        ...(academicTermId ? { academicTermId } : {}),
        classStatus: classStatusHint,
      });
      if (!timetable || timetable.length === 0) {
        setCourses([]);
        return;
      }

      const coursesWithStats = await Promise.all(
        timetable.map(async (classData: any) => {
          const enrollments = await enrollmentService.getClassEnrollments(classData.id, {
            roster: true,
          });
          const studentIds = enrollments.map((e: any) => e.studentId);

          let totalAttendance = 0;
          let totalSessions = 0;
          let hasAttendanceData = false;

          for (const studentId of studentIds.slice(0, 40)) {
            try {
              const attendance = await studentService.getStudentAttendance(studentId, {
                classId: classData.id,
                ...(termStartDate ? { startDate: termStartDate } : {}),
                ...(termEndDate ? { endDate: termEndDate } : {}),
              });
              if (attendance && attendance.length > 0) {
                hasAttendanceData = true;
                const metrics = computeAttendanceFromRecords(attendance);
                totalAttendance += metrics.attended;
                totalSessions += metrics.expected;
              }
            } catch {
              continue;
            }
          }

          const avgAttendance =
            hasAttendanceData && totalSessions > 0
              ? `${Math.round((totalAttendance / totalSessions) * 100)}%`
              : null;

          return {
            classId: classData.id,
            name: classData.course?.name || classData.name || 'Course',
            code: classData.course?.code || '—',
            className: classData.name || 'Class',
            students: enrollments.length,
            avgAttendance,
            hasAvgAttendanceData: hasAttendanceData && totalSessions > 0,
            lastSession: '—',
          } as CourseCard;
        })
      );

      setCourses(coursesWithStats);
    } catch (error) {
      console.error('Error loading lecturer courses:', error);
      setCourses([]);
      toast.error('Failed to load assigned courses');
    } finally {
      setLoading(false);
    }
  };

  const loadMarkableSessions = async () => {
    setSessionsLoading(true);
    try {
      const { data } = await qaService.getMyLectureRecords();
      const forDate = (data || []).filter((r: QALectureRecord) => toDateKey(r.date) === markDate);
      const taught = forDate
        .filter((r) => isLectureTaught(r.comment) && (r as any).classId)
        .map((r) => ({
          classId: String((r as any).classId),
          className: r.class || (r as any).className || 'Class',
          courseUnit: r.courseUnit || '—',
          comment: String(r.comment || ''),
          timeForStarting: r.timeForStarting || '',
          date: markDate,
        }));
      const awaiting = forDate
        .filter((r) => !isLectureTaught(r.comment) && (r as any).classId)
        .map((r) => ({
          classId: String((r as any).classId),
          className: r.class || (r as any).className || 'Class',
          courseUnit: r.courseUnit || '—',
          comment: String(r.comment || ''),
          date: markDate,
        }));

      const uniqueTaught = new Map<string, (typeof taught)[number]>();
      taught.forEach((s) => {
        const key = `${s.classId}|${s.date}|${s.timeForStarting}`;
        if (!uniqueTaught.has(key)) uniqueTaught.set(key, s);
      });
      setMarkableSessions([...uniqueTaught.values()]);
      setAwaitingSessions(awaiting);
    } catch (error) {
      console.error('Error loading markable sessions:', error);
      setMarkableSessions([]);
      setAwaitingSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  useEffect(() => {
    loadCourses();
  }, [user, termFilter, academicTermId, classStatusHint, termStartDate, termEndDate]);

  useEffect(() => {
    loadMarkableSessions();
  }, [markDate, user?.id]);

  const openMarkDialog = (session: { classId: string; className: string; date: string }) => {
    setDialogTarget({
      classId: session.classId,
      className: session.className,
      date: session.date,
    });
    setDialogOpen(true);
  };

  const openMarkForClass = (course: CourseCard) => {
    setDialogTarget({
      classId: course.classId,
      className: course.className,
      date: markDate,
    });
    setDialogOpen(true);
  };

  const markableClassIds = useMemo(
    () => new Set(markableSessions.map((s) => s.classId)),
    [markableSessions]
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Attendance</h1>
        </div>
        <AcademicTermFilter value={termFilter} onChange={onTermChange} triggerClassName="w-[240px]" />
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading…</p>
        </div>
      </div>
    );
  }

  const hasNothing =
    courses.length === 0 && markableSessions.length === 0 && awaitingSessions.length === 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Attendance</h1>
          <p className="text-gray-500">Mark attendance for your classes after a lecture is recorded as taught.</p>
        </div>
        <div className="flex flex-wrap items-end gap-3">
          <AcademicTermFilter value={termFilter} onChange={onTermChange} triggerClassName="w-[240px]" />
          <div className="space-y-1">
            <Label htmlFor="mark-date" className="text-xs text-muted-foreground">
              Date
            </Label>
            <Input
              id="mark-date"
              type="date"
              value={markDate}
              onChange={(e) => setMarkDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="gap-2"
            onClick={() => {
              loadMarkableSessions();
              loadCourses();
            }}
          >
            <RefreshCw className="h-4 w-4" /> Refresh
          </Button>
        </div>
      </div>

      {sessionsLoading ? (
        <p className="text-sm text-muted-foreground py-8 text-center">Loading sessions…</p>
      ) : hasNothing ? (
        <p className="text-sm text-muted-foreground py-8 text-center">
          No classes or sessions to show for this term and date.
        </p>
      ) : (
        <>
          {(markableSessions.length > 0 || awaitingSessions.length > 0) && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="text-lg">Sessions · {markDate}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {markableSessions.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Course unit</TableHead>
                          <TableHead>Time</TableHead>
                          <TableHead>Outcome</TableHead>
                          <TableHead className="text-right" />
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {markableSessions.map((session) => (
                          <TableRow key={`${session.classId}-${session.timeForStarting}`}>
                            <TableCell className="font-medium">{session.className}</TableCell>
                            <TableCell>{session.courseUnit}</TableCell>
                            <TableCell>{session.timeForStarting || '—'}</TableCell>
                            <TableCell>
                              <Badge className="bg-green-100 text-green-800 hover:bg-green-100">
                                {lectureCommentLabel(session.comment)}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <Button
                                size="sm"
                                className="bg-[#015F2B] hover:bg-[#014022] gap-2"
                                onClick={() => openMarkDialog(session)}
                              >
                                <UserCheck className="h-4 w-4" /> Mark students
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {awaitingSessions.length > 0 && (
                  <div className="rounded-md border overflow-hidden">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Class</TableHead>
                          <TableHead>Course unit</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {awaitingSessions.map((session, idx) => (
                          <TableRow key={`${session.classId}-await-${idx}`}>
                            <TableCell>{session.className}</TableCell>
                            <TableCell>{session.courseUnit}</TableCell>
                            <TableCell>
                              <Badge variant="secondary">{lectureCommentLabel(session.comment)}</Badge>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {courses.length > 0 && (
            <div className="grid gap-4">
              {courses.map((course) => (
                <Card key={course.classId}>
                  <CardHeader className="flex flex-row items-center justify-between pb-2 gap-3">
                    <div>
                      <CardTitle className="text-lg text-[#015F2B]">{course.name}</CardTitle>
                      <CardDescription>
                        {course.code} · {course.className}
                      </CardDescription>
                    </div>
                    {markableClassIds.has(course.classId) && (
                      <Button
                        size="sm"
                        className="bg-[#015F2B] hover:bg-[#014022] gap-2"
                        onClick={() => openMarkForClass(course)}
                      >
                        <UserCheck className="h-4 w-4" /> Mark students
                      </Button>
                    )}
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Enrolled</p>
                        <p className="text-xl font-bold">{course.students}</p>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md">
                        <p className="text-sm text-gray-500">Avg attendance</p>
                        {course.hasAvgAttendanceData ? (
                          <p className="text-xl font-bold text-[#015F2B]">{course.avgAttendance}</p>
                        ) : (
                          <p className="text-xl font-bold text-gray-400">—</p>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </>
      )}

      <SessionAttendanceDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        target={dialogTarget}
        onSaved={() => {
          loadMarkableSessions();
          loadCourses();
        }}
      />
    </div>
  );
}
