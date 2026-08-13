import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";
import { enrollmentService, studentService, settingsService, academicService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { computeAttendanceFromRecords } from '@/lib/attendance-metrics';
import { AcademicTermFilter, TERM_FILTER_ACTIVE, TERM_FILTER_ALL } from '@/components/AcademicTermFilter';
import { useAcademicTermFilterState } from '@/hooks/useAcademicTermFilterState';

export default function StudentClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<{ student: { excellent: number; good: number; warning: number; critical: number } } | null>(null);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const { termFilter, academicTermId, termStartDate, termEndDate, onTermChange } =
    useAcademicTermFilterState();

  useEffect(() => {
    settingsService.getPerformanceThresholds().then(setThresholds).catch(() => setThresholds(null));
    academicService.getActiveAcademicTerm().then((t) => setActiveTermId(t?.id ?? null)).catch(() => setActiveTermId(null));
  }, []);

  useEffect(() => {
    loadStudentClasses();
  }, [user, thresholds, termFilter, academicTermId, termStartDate, termEndDate, activeTermId]);

  const loadStudentClasses = async () => {
    if (!user?.id) return;

    try {
      setLoading(true);

      const student = await studentService.getStudentByUserId();
      if (!student) {
        console.error('Student record not found for user');
        setClasses([]);
        return;
      }

      const enrollments = await enrollmentService.getStudentEnrollments(student.id);
      const th = thresholds ?? await settingsService.getPerformanceThresholds().catch(() => null);
      const studentTh = th?.student ?? { excellent: 80, good: 70, warning: 60, critical: 50 };

      const filtered = (enrollments as any[]).filter((enrollment) => {
        const classTermId = enrollment.class?.academicTermId ?? null;
        if (termFilter === TERM_FILTER_ALL) return true;
        if (termFilter === TERM_FILTER_ACTIVE) {
          return classTermId === activeTermId || classTermId == null;
        }
        return classTermId === academicTermId;
      });

      const classesWithAttendance = await Promise.all(
        filtered.map(async (enrollment: any) => {
          const classData = enrollment.class;
          const studentId = enrollment.studentId ?? student.id;
          let attendance = 0;
          try {
            const attendanceRecords = await studentService.getStudentAttendance(studentId, {
              classId: enrollment.classId,
              ...(termStartDate ? { startDate: termStartDate } : {}),
              ...(termEndDate ? { endDate: termEndDate } : {}),
            });
            attendance = computeAttendanceFromRecords(attendanceRecords, {
              percentageDecimalPlaces: 0,
            }).percentage;
          } catch (err) {
            console.warn('Could not load attendance for class', enrollment.classId, err);
          }

          const status = attendance >= studentTh.good ? 'Good' : attendance >= studentTh.warning ? 'Warning' : 'Critical';

          const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
          const dayName = classData?.dayOfWeek !== null && classData?.dayOfWeek !== undefined 
            ? dayNames[classData.dayOfWeek] 
            : '';
          const timeStr = classData?.startTime && classData?.endTime
            ? `${classData.startTime} - ${classData.endTime}`
            : '';
          const schedule = dayName && timeStr ? `${dayName} ${timeStr}` : 'Not scheduled';
          
          return {
            code: classData?.course?.code || '',
            name: classData?.course?.name || classData?.name || '',
            schedule,
            lecturer: classData?.lecturer ? `${classData.lecturer.firstName} ${classData.lecturer.lastName}` : 'Not assigned',
            venue: classData?.venue?.name || 'Not assigned',
            attendance,
            status,
          };
        })
      );

      setClasses(classesWithAttendance);
    } catch (error) {
      console.error('Error loading student classes:', error);
      setClasses([]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">My Classes</h1>
          <p className="text-gray-500">View your enrolled courses and attendance status.</p>
        </div>

        <AcademicTermFilter value={termFilter} onChange={onTermChange} triggerClassName="w-[260px]" />

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No classes found for this term.
            </CardContent>
          </Card>
        ) : (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BookOpen className="h-5 w-5" /> Enrolled classes
            </CardTitle>
            <CardDescription>Attendance for the selected academic term.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Code</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Schedule</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Venue</TableHead>
                  <TableHead>Attendance</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {classes.map((c, i) => (
                  <TableRow key={`${c.code}-${i}`}>
                    <TableCell className="font-medium">{c.code || '—'}</TableCell>
                    <TableCell>{c.name || '—'}</TableCell>
                    <TableCell className="text-sm text-muted-foreground">{c.schedule}</TableCell>
                    <TableCell>{c.lecturer}</TableCell>
                    <TableCell>{c.venue}</TableCell>
                    <TableCell className="w-[140px]">
                      <div className="flex items-center gap-2">
                        <Progress value={c.attendance} className="h-2" />
                        <span className="text-sm tabular-nums">{c.attendance}%</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Badge
                        className={
                          c.status === 'Good'
                            ? 'bg-green-100 text-green-800'
                            : c.status === 'Warning'
                              ? 'bg-amber-100 text-amber-800'
                              : 'bg-red-100 text-red-800'
                        }
                      >
                        {c.status}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
        )}
    </div>
  );
}
