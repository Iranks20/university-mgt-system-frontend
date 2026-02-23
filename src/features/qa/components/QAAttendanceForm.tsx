/**
 * QA Attendance Form Component
 * For recording lecturer attendance
 */

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { CalendarIcon, Clock, LogIn, LogOut } from 'lucide-react';
import { format } from 'date-fns';
import { qaService, academicService } from '@/services';
import type { QALecturerRecord } from '@/types/qa';
import { Badge } from '@/components/ui/badge';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

interface QAAttendanceFormProps {
  onSuccess?: () => void;
  onCancel?: () => void;
}

export function QAAttendanceForm({ onSuccess, onCancel }: QAAttendanceFormProps) {
  const [formData, setFormData] = useState<Partial<QALecturerRecord>>({
    status: 'Present',
  });
  const [scheduledDate, setScheduledDate] = useState<Date | undefined>(new Date());
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [schools, setSchools] = useState<string[]>([]);
  const [departments, setDepartments] = useState<string[]>([]);
  const [courses, setCourses] = useState<Array<{ code: string; name: string }>>([]);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [departmentsLoading, setDepartmentsLoading] = useState(false);
  const [coursesLoading, setCoursesLoading] = useState(false);

  // Load schools, departments, and courses on mount
  useEffect(() => {
    loadSchools();
    loadCourses();
  }, []);

  // Load departments when school changes
  useEffect(() => {
    if (formData.school) {
      loadDepartments(formData.school);
    } else {
      setDepartments([]);
    }
  }, [formData.school]);

  const loadSchools = async () => {
    setSchoolsLoading(true);
    try {
      const schoolList = await qaService.getSchools();
      setSchools(schoolList);
    } catch (error) {
      console.error('Error loading schools:', error);
      toast.error('Failed to load schools');
    } finally {
      setSchoolsLoading(false);
    }
  };

  const loadDepartments = async (school: string) => {
    setDepartmentsLoading(true);
    try {
      // Try to get departments - API may support school filtering via schoolId parameter
      // If school filtering is needed, we'd need to get schoolId from school name first
      const deptList = await academicService.getDepartments();
      // Filter departments by school if schoolId is available
      // For now, show all departments - backend API should support school filtering
      const filtered = deptList.filter((d: any) => {
        // If schoolId is available in department, filter by it
        // Otherwise show all departments
        return !school || school === 'All' || !d.schoolId || d.schoolId === school;
      });
      setDepartments(filtered.map((d: any) => d.name || d));
    } catch (error) {
      console.error('Error loading departments:', error);
      // No fallback - show empty list if API fails
      // This ensures we only show real API data
      setDepartments([]);
      toast.error('Failed to load departments. Please try again.');
    } finally {
      setDepartmentsLoading(false);
    }
  };

  const loadCourses = async () => {
    setCoursesLoading(true);
    try {
      const res = await academicService.getCourses({ limit: 50 });
      setCourses((res.data ?? []).map((c: any) => ({ code: c.code || '', name: c.name || '' })));
    } catch (error) {
      console.error('Error loading courses:', error);
      toast.error('Failed to load courses');
    } finally {
      setCoursesLoading(false);
    }
  };

  const handleCourseCodeChange = (code: string) => {
    const selectedCourse = courses.find(c => c.code === code);
    setFormData({
      ...formData,
      courseCode: code,
      courseName: selectedCourse?.name || '',
    });
  };

  // Format time as HH:MM:SS
  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  // Handle check-in
  const handleCheckIn = () => {
    const now = new Date();
    const timeStr = formatTime(now);
    setCheckInTime(timeStr);
    setIsCheckedIn(true);
    setFormData({
      ...formData,
      actualStartTime: now,
    });
  };

  // Handle check-out
  const handleCheckOut = () => {
    const now = new Date();
    const timeStr = formatTime(now);
    setCheckOutTime(timeStr);
    setIsCheckedIn(false);
    setFormData({
      ...formData,
      actualEndTime: now,
    });
  };

  // Calculate duration from check-in to check-out
  const calculateDuration = (start: string, end: string): string => {
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 0;
    };

    const startMinutes = parseTime(start);
    const endMinutes = parseTime(end);
    const diff = endMinutes - startMinutes;
    
    if (diff < 0) return '00:00:00';
    
    const hours = Math.floor(diff / 60);
    const minutes = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);

    try {
      if (!scheduledDate) {
        toast.warning('Please select a scheduled date');
        return;
      }

      await qaService.createRecord({
        ...formData,
        scheduledDate,
        actualStartTime: checkInTime ? formData.actualStartTime : undefined,
        actualEndTime: checkOutTime ? formData.actualEndTime : undefined,
      } as QALecturerRecord);

      // Reset form
      setFormData({ status: 'Present' });
      setScheduledDate(new Date());
      
      onSuccess?.();
    } catch (error) {
      console.error('Error creating QA record:', error);
      toast.error('Failed to create record. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Record Lecturer Attendance</CardTitle>
        <CardDescription>Enter details for the attendance record</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="lecturerName">Lecturer Name *</Label>
              <Input
                id="lecturerName"
                value={formData.lecturerName || ''}
                onChange={(e) => setFormData({ ...formData, lecturerName: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staffNumber">Staff Number *</Label>
              <Input
                id="staffNumber"
                value={formData.staffNumber || ''}
                onChange={(e) => setFormData({ ...formData, staffNumber: e.target.value })}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="school">School *</Label>
              {schoolsLoading ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading schools...</span>
                </div>
              ) : (
                <Select
                  value={formData.school || ''}
                  onValueChange={(value) => setFormData({ ...formData, school: value, department: '' })}
                  required
                >
                  <SelectTrigger id="school">
                    <SelectValue placeholder="Select a school" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map(school => (
                      <SelectItem key={school} value={school}>{school}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="department">Department *</Label>
              {departmentsLoading ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading departments...</span>
                </div>
              ) : formData.school ? (
                <Select
                  value={formData.department || ''}
                  onValueChange={(value) => setFormData({ ...formData, department: value })}
                  required
                >
                  <SelectTrigger id="department">
                    <SelectValue placeholder="Select a department" />
                  </SelectTrigger>
                  <SelectContent>
                    {departments.length > 0 ? (
                      departments.map(dept => (
                        <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                      ))
                    ) : (
                      <SelectItem value="" disabled>No departments available</SelectItem>
                    )}
                  </SelectContent>
                </Select>
              ) : (
                <Input
                  id="department"
                  value={formData.department || ''}
                  onChange={(e) => setFormData({ ...formData, department: e.target.value })}
                  placeholder="Select a school first"
                  disabled
                  required
                />
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="courseCode">Course Code *</Label>
              {coursesLoading ? (
                <div className="flex items-center gap-2 p-2 border rounded">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span className="text-sm text-gray-500">Loading courses...</span>
                </div>
              ) : (
                <Select
                  value={formData.courseCode || ''}
                  onValueChange={handleCourseCodeChange}
                  required
                >
                  <SelectTrigger id="courseCode">
                    <SelectValue placeholder="Select a course" />
                  </SelectTrigger>
                  <SelectContent>
                    {courses.map(course => (
                      <SelectItem key={course.code} value={course.code}>
                        {course.code} - {course.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="courseName">Course Name *</Label>
              <Input
                id="courseName"
                value={formData.courseName || ''}
                onChange={(e) => setFormData({ ...formData, courseName: e.target.value })}
                placeholder="Auto-filled when course code is selected"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Scheduled Date *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal"
                  >
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {scheduledDate ? format(scheduledDate, 'PPP') : 'Pick a date'}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <Calendar
                    mode="single"
                    selected={scheduledDate}
                    onSelect={setScheduledDate}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>

            <div className="space-y-2">
              <Label htmlFor="scheduledTime">Scheduled Time *</Label>
              <Input
                id="scheduledTime"
                placeholder="08:00 - 10:00"
                value={formData.scheduledTime || ''}
                onChange={(e) => setFormData({ ...formData, scheduledTime: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="venue">Venue *</Label>
              <Input
                id="venue"
                value={formData.venue || ''}
                onChange={(e) => setFormData({ ...formData, venue: e.target.value })}
                required
              />
            </div>
          </div>

          {/* Check-in/Check-out Section */}
          <div className="border rounded-lg p-4 space-y-4 bg-gray-50">
            <div className="flex items-center justify-between">
              <div>
                <Label className="text-base font-semibold">Attendance Tracking</Label>
                <p className="text-sm text-gray-500">Record actual check-in and check-out times</p>
              </div>
              {checkInTime && checkOutTime && (
                <Badge variant="default" className="bg-green-100 text-green-800">
                  <Clock className="mr-1 h-3 w-3" />
                  Duration: {calculateDuration(checkInTime, checkOutTime)}
                </Badge>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Check-In Time</Label>
                <div className="flex gap-2">
                  <Input
                    value={checkInTime || ''}
                    placeholder="Not checked in"
                    readOnly
                    className="bg-white"
                  />
                  <Button
                    type="button"
                    onClick={handleCheckIn}
                    disabled={isCheckedIn}
                    variant={isCheckedIn ? "outline" : "default"}
                    className={isCheckedIn ? "" : "bg-[#015F2B] hover:bg-[#014022]"}
                  >
                    <LogIn className="mr-2 h-4 w-4" />
                    {checkInTime ? 'Checked In' : 'Check In'}
                  </Button>
                </div>
                {checkInTime && (
                  <p className="text-xs text-green-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Checked in at {checkInTime}
                  </p>
                )}
              </div>

              <div className="space-y-2">
                <Label>Check-Out Time</Label>
                <div className="flex gap-2">
                  <Input
                    value={checkOutTime || ''}
                    placeholder="Not checked out"
                    readOnly
                    className="bg-white"
                  />
                  <Button
                    type="button"
                    onClick={handleCheckOut}
                    disabled={!isCheckedIn || !!checkOutTime}
                    variant={checkOutTime ? "outline" : "default"}
                    className={checkOutTime ? "" : "bg-[#015F2B] hover:bg-[#014022]"}
                  >
                    <LogOut className="mr-2 h-4 w-4" />
                    {checkOutTime ? 'Checked Out' : 'Check Out'}
                  </Button>
                </div>
                {checkOutTime && (
                  <p className="text-xs text-blue-600 flex items-center gap-1">
                    <Clock className="h-3 w-3" />
                    Checked out at {checkOutTime}
                  </p>
                )}
              </div>
            </div>

            {checkInTime && checkOutTime && (
              <div className="pt-2 border-t">
                <div className="grid grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-500">Lesson Duration:</span>
                    <span className="ml-2 font-semibold">{calculateDuration(checkInTime, checkOutTime)}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Scheduled Duration:</span>
                    <span className="ml-2 font-semibold">{formData.scheduledTime || 'N/A'}</span>
                  </div>
                  <div>
                    <span className="text-gray-500">Status:</span>
                    <Badge variant="default" className="ml-2 bg-green-100 text-green-800">
                      Completed
                    </Badge>
                  </div>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="status">Status *</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData({ ...formData, status: value as QALecturerRecord['status'] })}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Present">Present</SelectItem>
                <SelectItem value="Absent">Absent</SelectItem>
                <SelectItem value="Late">Late</SelectItem>
                <SelectItem value="Cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="remarks">Remarks</Label>
            <Textarea
              id="remarks"
              value={formData.remarks || ''}
              onChange={(e) => setFormData({ ...formData, remarks: e.target.value })}
              rows={3}
            />
          </div>

          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button type="submit" disabled={isSubmitting}>
              {isSubmitting ? 'Saving...' : 'Save Record'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
