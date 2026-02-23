import Components from "../components"
import React, { useState, useEffect } from 'react';
import { MapPin, CheckCircle, Loader2, ArrowRight, LogIn, LogOut, Clock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { useRole } from '@/components/RoleProvider';
import { qaService, studentService, staffService } from '@/services';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export default function Presence() {
  return <PresenceContent />;
}

function PresenceContent() {
  const { role } = useRole();
  const { user } = useAuth();
  const [checkInTime, setCheckInTime] = useState<string | null>(null);
  const [checkOutTime, setCheckOutTime] = useState<string | null>(null);
  const [isCheckedIn, setIsCheckedIn] = useState(false);
  const [attendanceRecorded, setAttendanceRecorded] = useState(false);
  const [lectureRecordId, setLectureRecordId] = useState<string | null>(null);
  type CurrentClass = { id?: string; course: string; code: string; venue: string; time: string; lecturer: string };
  const [currentClass, setCurrentClass] = useState<CurrentClass | null>(null);
  const [currentClassLoading, setCurrentClassLoading] = useState(true);
  const [currentClassError, setCurrentClassError] = useState<string | null>(null);
  const [checkInOutLoading, setCheckInOutLoading] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);

  const syncLecturerStateFromRecord = (record: { id?: string; checkInTime?: string | null; checkOutTime?: string | null } | null) => {
    if (!record) {
      setCheckInTime(null);
      setCheckOutTime(null);
      setLectureRecordId(null);
      setIsCheckedIn(false);
      return;
    }
    setLectureRecordId(record.id ?? null);
    setCheckInTime(record.checkInTime ?? null);
    setCheckOutTime(record.checkOutTime ?? null);
    setIsCheckedIn(!!record.checkInTime && !record.checkOutTime);
  };

  const hasCheckedIn = !!checkInTime;
  const hasCheckedOut = !!checkOutTime;

  const refreshLecturerState = async () => {
    if (role === 'Lecturer' && currentClass?.id) {
      try {
        const record = await qaService.getTodayRecordForClass(currentClass.id);
        syncLecturerStateFromRecord(record);
      } catch (e) {
        syncLecturerStateFromRecord(null);
      }
    }
  };

  useEffect(() => {
    const load = async () => {
      setCurrentClassLoading(true);
      setCurrentClassError(null);
      try {
        const data = await (await import('@/services/academic.service')).academicService.getCurrentClass();
        if (data) {
          setCurrentClass({
            id: data.id,
            course: data.course,
            code: data.code,
            venue: data.venue,
            time: data.time,
            lecturer: data.lecturer,
          });
        } else {
          setCurrentClass(null);
          setCurrentClassError('No class is currently in session. Attendance can only be marked during scheduled class times.');
        }
      } catch (error) {
        console.error('Error loading current class:', error);
        setCurrentClassError('Unable to load current session. Please refresh the page.');
        setCurrentClass(null);
      } finally {
        setCurrentClassLoading(false);
      }
    };
    load();
    const interval = setInterval(load, 60000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (role !== 'Lecturer' || !currentClass?.id) return;
    refreshLecturerState();
    
    const handleCheckInOutChange = () => {
      refreshLecturerState();
    };
    
    const handleFocus = () => {
      refreshLecturerState();
    };
    
    window.addEventListener('check-in-out-changed', handleCheckInOutChange);
    window.addEventListener('focus', handleFocus);
    
    return () => {
      window.removeEventListener('check-in-out-changed', handleCheckInOutChange);
      window.removeEventListener('focus', handleFocus);
    };
  }, [role, currentClass?.id]);

  const formatTime = (date: Date): string => {
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    const seconds = date.getSeconds().toString().padStart(2, '0');
    return `${hours}:${minutes}:${seconds}`;
  };

  const getCurrentLocation = (): Promise<{ latitude: number; longitude: number }> => {
    return new Promise((resolve, reject) => {
      if (!navigator.geolocation) {
        reject(new Error('Geolocation is not supported by your browser'));
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (position) => {
          resolve({
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          });
        },
        (err) => {
          reject(new Error(
            err.code === 1
              ? 'Location permission denied. Please enable location access.'
              : err.code === 2
                ? 'Location unavailable. Please try again.'
                : 'Failed to get location'
          ));
        },
        { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
      );
    });
  };

  const handleCheckIn = async () => {
    if (role === 'Staff') {
      setLocationLoading(true);
      try {
        const location = await getCurrentLocation();
        await staffService.recordCheckIn(`${location.latitude},${location.longitude}`);
        setAttendanceRecorded(true);
        toast.success('Check-in recorded');
      } catch (error: any) {
        console.error('Error recording staff check-in:', error);
        toast.error(error?.message || 'Failed to record check-in');
      } finally {
        setLocationLoading(false);
      }
      return;
    }

    if (role === 'Lecturer' && currentClass?.id) {
      setCheckInOutLoading(true);
      setLocationLoading(true);
      try {
        const location = await getCurrentLocation();
        const result = await qaService.checkIn(currentClass.id, location.latitude, location.longitude);
        const rec = result.record;
        setLectureRecordId(rec?.id ?? null);
        setCheckInTime(rec?.checkInTime ?? formatTime(new Date()));
        setCheckOutTime(rec?.checkOutTime ?? null);
        setIsCheckedIn(!!rec?.checkInTime && !rec?.checkOutTime);
        setAttendanceRecorded(true);
        window.dispatchEvent(new CustomEvent('check-in-out-changed', { detail: { classId: currentClass.id, action: 'check-in' } }));
        if (result.alreadyCheckedIn) {
          toast.info('You are already checked in for this class.');
        } else {
          toast.success('Check-in recorded');
        }
      } catch (error: any) {
        const msg = error?.message || 'Check-in failed';
        const code = (error as any)?.code;
        if (code === 'LOCATION_VERIFICATION_FAILED') {
          toast.error(msg);
        } else if (code === 'ALREADY_CHECKED_IN') {
          const record = await qaService.getTodayRecordForClass(currentClass.id);
          syncLecturerStateFromRecord(record);
          if (record?.checkOutTime) {
            toast.info('You have already checked out for this class today. Check-in is no longer available.');
          } else {
            toast.info('You are already checked in for this class.');
          }
        } else {
          const record = await qaService.getTodayRecordForClass(currentClass.id).catch(() => null);
          if (record) {
            syncLecturerStateFromRecord(record);
            if (record.checkOutTime) {
              toast.info('You have already checked out for this class today. Check-in is no longer available.');
            }
          } else {
            toast.error(msg);
          }
        }
      } finally {
        setCheckInOutLoading(false);
        setLocationLoading(false);
      }
    }
  };

  const handleCheckOut = async () => {
    if (role === 'Staff') {
      try {
        await staffService.recordCheckOut();
        setAttendanceRecorded(true);
        toast.success('Check-out recorded');
      } catch (error: any) {
        console.error('Error recording staff check-out:', error);
        toast.error(`Failed to record check-out: ${error?.message || 'Unknown error'}`);
      }
      return;
    }

    if (role === 'Lecturer' && currentClass?.id) {
      setCheckInOutLoading(true);
      try {
        if (lectureRecordId) {
          const timeStr = formatTime(new Date());
          await qaService.updateCheckOut(lectureRecordId, timeStr);
        } else {
          await qaService.checkOut(currentClass.id);
        }
        const record = await qaService.getTodayRecordForClass(currentClass.id);
        syncLecturerStateFromRecord(record);
        setAttendanceRecorded(true);
        window.dispatchEvent(new CustomEvent('check-in-out-changed', { detail: { classId: currentClass.id, action: 'check-out' } }));
        toast.success('Check-out recorded');
      } catch (error: any) {
        const code = (error as any)?.code;
        const msg = error?.message || 'Check-out failed';
        const record = await qaService.getTodayRecordForClass(currentClass.id);
        syncLecturerStateFromRecord(record ?? null);
        if (code === 'NO_CHECK_IN') {
          toast.warning('No active check-in found. Check in first, or you may have already checked out.');
        } else if (code === 'ALREADY_CHECKED_OUT') {
          toast.info('You have already checked out for this class today.');
        } else {
          toast.error(msg);
        }
      } finally {
        setCheckInOutLoading(false);
      }
    }
  };

  const calculateDuration = (start: string, end?: string | null): string => {
    if (!start) return '00:00:00';
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        const hours = parseInt(parts[0], 10) || 0;
        const minutes = parseInt(parts[1], 10) || 0;
        const seconds = parts.length >= 3 ? (parseInt(parts[2], 10) || 0) : 0;
        return hours * 3600 + minutes * 60 + seconds;
      }
      return 0;
    };

    const startSeconds = parseTime(start);
    const endSeconds = end ? parseTime(end) : (() => {
      const now = new Date();
      return now.getHours() * 3600 + now.getMinutes() * 60 + now.getSeconds();
    })();
    
    const diff = endSeconds - startSeconds;
    if (diff < 0) return '00:00:00';
    
    const hours = Math.floor(diff / 3600);
    const minutes = Math.floor((diff % 3600) / 60);
    const seconds = diff % 60;
    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const [liveDuration, setLiveDuration] = useState<string>('00:00:00');

  useEffect(() => {
    if (!checkInTime || checkOutTime) {
      setLiveDuration(checkInTime && checkOutTime ? calculateDuration(checkInTime, checkOutTime) : '00:00:00');
      return;
    }
    
    const interval = setInterval(() => {
      if (checkInTime && !checkOutTime) {
        setLiveDuration(calculateDuration(checkInTime));
      }
    }, 1000);
    
    return () => clearInterval(interval);
  }, [checkInTime, checkOutTime]);

  const handleMarkAttendance = async () => {
    if (role === 'Student' && currentClass?.id) {
      setLocationLoading(true);
      try {
        const location = await getCurrentLocation();
        await studentService.markAttendance({
          classId: currentClass.id,
          latitude: location.latitude,
          longitude: location.longitude,
          timestamp: new Date().toISOString(),
        });
        setAttendanceRecorded(true);
        toast.success('Attendance marked successfully');
      } catch (error: any) {
        console.error('Error marking attendance:', error);
        const code = (error as any)?.code;
        if (code === 'LOCATION_VERIFICATION_FAILED') {
          toast.error(error?.message || 'Location verification failed. You must be within the allowed zone.');
        } else {
          toast.error(error?.message || 'Failed to mark attendance');
        }
      } finally {
        setLocationLoading(false);
      }
    }
  };

  return (
      <div className="max-w-md mx-auto py-12 px-4 animate-in fade-in duration-500">
        <div className="text-center mb-8">
          <div className="h-16 w-16 bg-[#015F2B]/10 text-[#015F2B] rounded-full flex items-center justify-center mx-auto mb-4">
            <MapPin size={32} />
          </div>
          <h1 className="text-2xl font-bold text-gray-900">Mark Attendance</h1>
          <p className="text-gray-500">Verify your physical presence on campus.</p>
        </div>

        <Card className="border-2 shadow-lg relative overflow-hidden">
          <CardHeader className="text-center">
            <CardTitle className="text-lg">Current Session</CardTitle>
            <CardDescription>You are marking attendance for:</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {currentClassLoading ? (
              <div className="p-8 flex flex-col items-center justify-center gap-3 text-muted-foreground">
                <Loader2 className="h-8 w-8 animate-spin" />
                <p className="text-sm">Loading current session...</p>
              </div>
            ) : currentClassError ? (
              <Alert variant="destructive">
                <AlertTitle>{currentClassError}</AlertTitle>
              </Alert>
            ) : !currentClass ? (
              <div className="p-6 text-center text-muted-foreground border rounded-lg bg-gray-50">
                <p className="font-medium">No current session</p>
                <p className="text-sm mt-1">There is no class currently in session. Attendance can only be marked during scheduled class times.</p>
              </div>
            ) : (
            <div className="p-4 bg-green-50 rounded-lg border border-green-200 text-center">
               <div className="flex items-center justify-center gap-2 mb-2">
                 <Badge className="bg-green-500 text-white hover:bg-green-600 border-green-600 animate-pulse">
                   Live Session
                 </Badge>
               </div>
               <h3 className="font-bold text-lg text-[#015F2B]">{currentClass.course}</h3>
               <p className="text-sm text-gray-500 mb-2">{currentClass.code}</p>
               <div className="flex items-center justify-center gap-2 mt-3">
                 <Badge variant="outline" className="font-medium border-gray-300">
                   <MapPin className="mr-1 h-3 w-3" />
                   {currentClass.venue}
                 </Badge>
                 <Badge variant="outline" className="font-medium border-gray-300">
                   <Clock className="mr-1 h-3 w-3" />
                   {currentClass.time}
                 </Badge>
               </div>
            </div>
            )}

                {/* Check-in/Check-out for Lecturers */}
                {role === 'Lecturer' && currentClass && (
                  <div className="border rounded-lg p-4 space-y-4 bg-blue-50 border-blue-200">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label className="text-base font-semibold text-gray-900">Lesson Attendance Tracking</Label>
                        <p className="text-sm text-gray-600">Record your check-in and check-out times</p>
                      </div>
                      {checkInTime && (
                        <Badge variant="default" className="bg-green-100 text-green-800">
                          <Clock className="mr-1 h-3 w-3" />
                          {checkOutTime ? calculateDuration(checkInTime, checkOutTime) : liveDuration}
                        </Badge>
                      )}
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Check-In</Label>
                        <div className="flex gap-2">
                          <Input
                            value={checkInTime || ''}
                            placeholder="Not checked in"
                            readOnly
                            className="bg-white text-sm"
                          />
                          {!hasCheckedIn ? (
                            <Button
                              type="button"
                              onClick={handleCheckIn}
                              disabled={checkInOutLoading || locationLoading}
                              variant="default"
                              className="bg-[#015F2B] hover:bg-[#014022]"
                              size="sm"
                            >
                              {checkInOutLoading || locationLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogIn className="h-4 w-4" />
                              )}
                            </Button>
                          ) : (
                            <div className="flex items-center justify-center px-3 py-2 bg-green-50 border border-green-200 rounded-md">
                              <LogIn className="h-4 w-4 text-green-600" />
                            </div>
                          )}
                        </div>
                        {checkInTime && (
                          <p className="text-xs text-green-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {checkInTime}
                          </p>
                        )}
                      </div>

                      <div className="space-y-2">
                        <Label className="text-sm font-medium">Check-Out</Label>
                        <div className="flex gap-2">
                          <Input
                            value={checkOutTime || ''}
                            placeholder="Not checked out"
                            readOnly
                            className="bg-white text-sm"
                          />
                          {hasCheckedIn && !hasCheckedOut ? (
                            <Button
                              type="button"
                              onClick={handleCheckOut}
                              disabled={checkInOutLoading}
                              variant="default"
                              className="bg-[#015F2B] hover:bg-[#014022]"
                              size="sm"
                            >
                              {checkInOutLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                <LogOut className="h-4 w-4" />
                              )}
                            </Button>
                          ) : hasCheckedOut ? (
                            <div className="flex items-center justify-center px-3 py-2 bg-blue-50 border border-blue-200 rounded-md">
                              <LogOut className="h-4 w-4 text-blue-600" />
                            </div>
                          ) : null}
                        </div>
                        {checkOutTime && (
                          <p className="text-xs text-blue-600 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {checkOutTime}
                          </p>
                        )}
                      </div>
                    </div>

                    {checkInTime && (
                      <div className="pt-3 border-t border-blue-300">
                        <div className="flex items-center justify-center gap-2">
                          <Clock className="h-4 w-4 text-gray-500" />
                          <span className="text-sm text-gray-600">Total Lesson Duration:</span>
                          <span className="text-base font-bold text-[#015F2B]">
                            {checkOutTime ? calculateDuration(checkInTime, checkOutTime) : liveDuration}
                          </span>
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {role === 'Student' && currentClass && (
                  <div className="pt-4 border-t">
                    <Button
                      onClick={handleMarkAttendance}
                      className="w-full bg-[#015F2B] hover:bg-[#014022] h-12 text-lg"
                      disabled={locationLoading || attendanceRecorded}
                    >
                      {locationLoading ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          Verifying location...
                        </>
                      ) : attendanceRecorded ? (
                        <>
                          <CheckCircle className="mr-2 h-5 w-5" />
                          Attendance Marked
                        </>
                      ) : (
                        <>
                          <MapPin className="mr-2 h-5 w-5" />
                          Mark Attendance
                        </>
                      )}
                    </Button>
                    <p className="text-xs text-center text-muted-foreground mt-2">
                      Location will be verified automatically when you mark attendance.
                    </p>
                  </div>
                )}
              </CardContent>
              <CardFooter className="flex-col gap-2">
                {role === 'Lecturer' && checkInTime && !checkOutTime && (
                  <div className="w-full p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                    <p className="text-xs text-yellow-800 text-center">
                      <Clock className="inline h-3 w-3 mr-1" />
                      Lesson in progress. Remember to check out when finished.
                    </p>
                  </div>
                )}
              </CardFooter>

            {attendanceRecorded && role === 'Student' && (
              <CardContent className="py-8">
                <div className="text-center space-y-4">
                  <div className="mx-auto h-16 w-16 bg-[#015F2B] rounded-full flex items-center justify-center shadow-lg">
                    <CheckCircle className="h-8 w-8 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">Attendance Marked!</h3>
                    <p className="text-gray-500 mt-2">Your presence for <span className="font-medium text-gray-900">{currentClass?.course ?? 'this session'}</span> has been recorded.</p>
                  </div>
                  <Button variant="outline" onClick={() => { setAttendanceRecorded(false); }} className="gap-2">
                    Mark Another <ArrowRight size={16} />
                  </Button>
                </div>
              </CardContent>
            )}
        </Card>
        
        <p className="text-center text-xs text-gray-400 mt-8">
          KCU Quality Assurance System v1.0 • GPS verification (Kampala zone)
        </p>
      </div>
  );
}

function AlertCircleIcon(props: any) {
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
      <circle cx="12" cy="12" r="10" />
      <line x1="12" x2="12" y1="8" y2="12" />
      <line x1="12" x2="12.01" y1="16" y2="16" />
    </svg>
  );
}
