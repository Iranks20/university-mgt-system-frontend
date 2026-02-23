import React, { useState, useEffect } from 'react';
import Components from "@/components";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Eye, Download } from "lucide-react";
import { academicService, enrollmentService, studentService, qaService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { exportLectureRecordsToCSV } from '@/utils/excel';
import { toast } from 'sonner';

export default function LecturerCourseAttendance() {
  const { user } = useAuth();
  const [courses, setCourses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedSession, setSelectedSession] = useState<any>(null);

  useEffect(() => {
    loadLecturerCourses();
  }, [user]);

  const loadLecturerCourses = async () => {
    if (!user?.id) return;
    
    try {
      setLoading(true);
      
      const timetable = await academicService.getTimetable();
      if (!timetable || timetable.length === 0) {
        setCourses([]);
        return;
      }
      
      const lecturerClassIds = new Set(timetable.map((item: any) => item.id));
      
      const classesRes = await academicService.getClasses({ limit: 50 });
      const allClasses = classesRes.data ?? [];
      const lecturerClasses = allClasses.filter((c: any) => lecturerClassIds.has(c.id));
      
      const coursesWithStats = await Promise.all(
        lecturerClasses.map(async (classData: any) => {
          const enrollments = await enrollmentService.getClassEnrollments(classData.id);
          const studentIds = enrollments.map((e: any) => e.studentId);
          
          // Get QA lecture records for this class
          // Note: QAFilter doesn't have classId/lecturerId, so we'll filter by className
          const allRecords = await qaService.getLectureRecords();
          const recordsArray = Array.isArray(allRecords) ? allRecords : (allRecords as any)?.data || [];
          const lectureRecords = recordsArray.filter((r: any) => 
            r.className === classData.name || r.class === classData.name
          );
          
          // Calculate attendance from student attendance records
          // Use ALL students, not a sample, to get accurate data
          let totalAttendance = 0;
          let totalSessions = 0;
          let hasAttendanceData = false;
          
          for (const studentId of studentIds) {
            try {
              const attendance = await studentService.getStudentAttendance(studentId, {
                classId: classData.id,
              });
              if (attendance && attendance.length > 0) {
                hasAttendanceData = true;
                const present = attendance.filter((a: any) => a.status === 'Present').length;
                totalAttendance += present;
                totalSessions += attendance.length;
              }
            } catch (error) {
              // Skip students with no attendance data
              continue;
            }
          }
          
          // Only calculate average if we have real attendance data
          const avgAttendance = hasAttendanceData && totalSessions > 0 
            ? Math.round((totalAttendance / totalSessions) * 100) 
            : null;
          
          // Get recent sessions from lecture records
          // Sort by date descending and take most recent 5
          const sortedRecords = [...lectureRecords].sort((a: any, b: any) => {
            const dateA = a.date ? new Date(a.date).getTime() : 0;
            const dateB = b.date ? new Date(b.date).getTime() : 0;
            return dateB - dateA;
          });
          
          const recentSessions = await Promise.all(
            sortedRecords
              .slice(0, 5)
              .map(async (record: any) => {
                const date = record.date ? new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—';
                
                // Fetch actual attendance data for this session
                let present: number | null = null;
                let absent: number | null = null;
                
                try {
                  // Get attendance records for this class on this date
                  const sessionDate = record.date ? new Date(record.date).toISOString().split('T')[0] : null;
                  if (sessionDate && classData.id) {
                    // Fetch attendance for all enrolled students for this class on this date
                    const attendancePromises = studentIds.map(async (studentId: string) => {
                      try {
                        const attendance = await studentService.getStudentAttendance(studentId, {
                          classId: classData.id,
                          startDate: sessionDate,
                          endDate: sessionDate,
                        });
                        return attendance.length > 0 ? attendance[0] : null;
                      } catch (error) {
                        return null;
                      }
                    });
                    
                    const attendanceResults = await Promise.all(attendancePromises);
                    const presentRecords = attendanceResults.filter((a: any) => a && a.status === 'Present');
                    const absentRecords = attendanceResults.filter((a: any) => a && a.status === 'Absent');
                    
                    present = presentRecords.length;
                    absent = absentRecords.length;
                  } else {
                    // No real data available - set to null to show "—"
                    present = null;
                    absent = null;
                  }
                } catch (error) {
                  console.warn(`Error fetching attendance for session ${record.id}:`, error);
                  // No real data available - set to null to show "—"
                  present = null;
                  absent = null;
                }
                
                return {
                  date,
                  topic: record.courseUnit || record.class || record.className || '—',
                  present: present ?? null, // null means no real data available
                  absent: absent ?? null, // null means no real data available
                  hasRealData: present !== null && absent !== null, // Track if we have real data
                  recordId: record.id,
                };
              })
          );
          
          return {
            code: classData.course?.code || '',
            name: classData.course?.name || classData.name,
            students: enrollments.length,
            avgAttendance: avgAttendance !== null ? `${avgAttendance}%` : '—',
            hasAvgAttendanceData: avgAttendance !== null,
            lastSession: lectureRecords.length > 0 && lectureRecords[0].date 
              ? new Date(lectureRecords[0].date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
              : '—',
            classId: classData.id,
            recentSessions,
          };
        })
      );
      
      setCourses(coursesWithStats);
    } catch (error) {
      console.error('Error loading lecturer courses:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExportReport = async (course: typeof courses[0]) => {
    try {
      const records = await qaService.getLectureRecords({ 
        courseCode: course.code,
        lecturerName: user?.name 
      });
      const recordList = Array.isArray(records) ? records : (records as any)?.data || [];
      if (recordList.length > 0) {
        exportLectureRecordsToCSV(recordList, `Course_${course.code}_${new Date().toISOString().split('T')[0]}.xlsx`);
      } else {
        toast.warning('No lecture records found for this course.');
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export report: ${error?.message || 'Unknown error'}`);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Attendance</h1>
          <p className="text-gray-500">Track and manage attendance for your assigned courses.</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <p className="text-gray-500">Loading courses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Course Attendance</h1>
          <p className="text-gray-500">Track and manage attendance for your assigned courses.</p>
        </div>

        {courses.length === 0 ? (
          <div className="flex items-center justify-center py-12">
            <p className="text-gray-500">No courses assigned.</p>
          </div>
        ) : (
        <div className="grid gap-6">
          {courses.map((course) => (
            <Card key={course.code}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <div>
                  <CardTitle className="text-lg text-[#015F2B]">{course.name}</CardTitle>
                  <CardDescription>{course.code}</CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExportReport(course)}>
                  <Download className="mr-2 h-4 w-4" /> Export Report
                </Button>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                   <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Enrolled Students</p>
                      <p className="text-xl font-bold">{course.students}</p>
                   </div>
                   <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Average Attendance</p>
                      {course.hasAvgAttendanceData ? (
                        <p className="text-xl font-bold text-[#015F2B]">{course.avgAttendance}</p>
                      ) : (
                        <p className="text-xl font-bold text-gray-400">—</p>
                      )}
                   </div>
                   <div className="bg-gray-50 p-3 rounded-md">
                      <p className="text-sm text-gray-500">Last Session</p>
                      <p className="text-xl font-bold">{course.lastSession}</p>
                   </div>
                </div>
                <div>
                  <h4 className="text-sm font-semibold mb-2">Recent Sessions</h4>
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Topic</TableHead>
                        <TableHead>Present</TableHead>
                        <TableHead>Absent</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {course.recentSessions && course.recentSessions.length > 0 ? (
                        course.recentSessions.map((session: any, idx: number) => (
                          <TableRow key={idx}>
                            <TableCell>{session.date}</TableCell>
                            <TableCell>{session.topic}</TableCell>
                            <TableCell>
                              {session.hasRealData && session.present !== null ? (
                                <Badge variant="outline" className="text-green-600 bg-green-50 border-green-200">{session.present}</Badge>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell>
                              {session.hasRealData && session.absent !== null ? (
                                <Badge variant="outline" className="text-red-600 bg-red-50 border-red-200">{session.absent}</Badge>
                              ) : (
                                <span className="text-gray-400">—</span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button 
                                variant="ghost" 
                                size="sm"
                                onClick={() => {
                                  setSelectedSession({ ...session, courseName: course.name, courseCode: course.code });
                                  setDetailsOpen(true);
                                }}
                              >
                                <Eye className="h-4 w-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      ) : (
                        <TableRow>
                          <TableCell colSpan={5} className="text-center py-4 text-muted-foreground text-sm">
                            No sessions recorded yet
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        )}

        {/* Session Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Session Details</DialogTitle>
              <DialogDescription>
                Attendance details for {selectedSession?.courseName} - {selectedSession?.topic}
              </DialogDescription>
            </DialogHeader>
            {selectedSession && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-500">Date</p>
                    <p className="text-lg font-semibold">{selectedSession.date}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Topic</p>
                    <p className="text-lg font-semibold">{selectedSession.topic}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Present</p>
                    {selectedSession.hasRealData && selectedSession.present !== null ? (
                      <p className="text-xl font-bold text-green-600">{selectedSession.present}</p>
                    ) : (
                      <p className="text-xl font-bold text-gray-400">—</p>
                    )}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-500">Absent</p>
                    {selectedSession.hasRealData && selectedSession.absent !== null ? (
                      <p className="text-xl font-bold text-red-600">{selectedSession.absent}</p>
                    ) : (
                      <p className="text-xl font-bold text-gray-400">—</p>
                    )}
                  </div>
                </div>
                {selectedSession.hasRealData && selectedSession.present !== null && selectedSession.absent !== null && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-500">
                      Total enrolled: {selectedSession.present + selectedSession.absent}
                    </p>
                    <p className="text-sm text-gray-500">
                      Attendance rate: {selectedSession.present + selectedSession.absent > 0 
                        ? Math.round((selectedSession.present / (selectedSession.present + selectedSession.absent)) * 100)
                        : 0}%
                    </p>
                  </div>
                )}
                {!selectedSession.hasRealData && (
                  <div className="pt-4 border-t">
                    <p className="text-sm text-gray-400 italic">
                      Attendance data not available for this session. Real attendance records are required.
                    </p>
                  </div>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
  );
}
