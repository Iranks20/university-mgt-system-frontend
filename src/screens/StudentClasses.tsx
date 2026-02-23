import React, { useState, useEffect } from 'react';
import Components from "@/components";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BookOpen } from "lucide-react";
import { enrollmentService, studentService, settingsService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';

export default function StudentClasses() {
  const { user } = useAuth();
  const [classes, setClasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [thresholds, setThresholds] = useState<{ student: { excellent: number; good: number; warning: number; critical: number } } | null>(null);

  useEffect(() => {
    settingsService.getPerformanceThresholds().then(setThresholds).catch(() => setThresholds(null));
  }, []);

  useEffect(() => {
    loadStudentClasses();
  }, [user, thresholds]);

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

      const classesWithAttendance = await Promise.all(
        enrollments.map(async (enrollment: any) => {
          const classData = enrollment.class;
          const studentId = enrollment.studentId ?? user?.id;
          let attendance = 0;
          try {
            const attendanceRecords = await studentService.getStudentAttendance(studentId, {
              classId: enrollment.classId,
            });
            const presentCount = attendanceRecords.filter((r: any) => r.status === 'Present').length;
            const totalCount = attendanceRecords.length;
            attendance = totalCount > 0 ? Math.round((presentCount / totalCount) * 100) : 0;
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

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">Loading classes...</p>
          </div>
        ) : classes.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">No classes enrolled yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {classes.map((cls) => (
              <Card key={cls.code}>
                <CardContent className="p-6">
                   <div className="flex flex-col md:flex-row justify-between gap-4">
                      <div className="flex gap-4">
                         <div className="h-12 w-12 rounded-lg bg-green-100 flex items-center justify-center shrink-0">
                            <BookOpen className="text-[#015F2B]" />
                         </div>
                         <div>
                            <h3 className="font-bold text-lg text-gray-900">{cls.name}</h3>
                            <div className="flex items-center gap-2 text-sm text-gray-500">
                               <span className="font-medium text-gray-700">{cls.code}</span>
                               <span>•</span>
                               <span className={cls.lecturer === 'Not assigned' ? 'text-gray-400' : ''}>{cls.lecturer}</span>
                            </div>
                            <p className={`text-sm mt-1 ${cls.schedule === 'Not scheduled' ? 'text-gray-400' : 'text-gray-500'}`}>{cls.schedule}</p>
                            <p className={`text-sm mt-1 ${cls.venue === 'Not assigned' ? 'text-gray-400' : 'text-gray-600 font-medium'}`}>
                              Venue: {cls.venue}
                            </p>
                         </div>
                      </div>
                      
                      <div className="min-w-[200px] space-y-2">
                         <div className="flex justify-between text-sm items-center">
                            <span className="text-gray-500">Attendance</span>
                            <span className={`font-bold ${cls.attendance < (thresholds?.student?.good ?? 75) ? 'text-red-600' : 'text-[#015F2B]'}`}>
                              {cls.attendance}%
                            </span>
                         </div>
                         <Progress 
                           value={cls.attendance} 
                           className={`h-2 ${cls.attendance < (thresholds?.student?.good ?? 75) ? '[&>div]:bg-red-600' : '[&>div]:bg-[#015F2B]'}`} 
                         />
                         <div className="flex justify-end">
                            {cls.attendance < (thresholds?.student?.good ?? 75) ? (
                               <Badge variant="destructive" className="text-[10px] px-2 py-0.5">At Risk</Badge>
                            ) : (
                               <Badge variant="outline" className="text-[10px] px-2 py-0.5 text-green-700 bg-green-50 border-green-200">On Track</Badge>
                            )}
                         </div>
                      </div>
                   </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>
  );
}
