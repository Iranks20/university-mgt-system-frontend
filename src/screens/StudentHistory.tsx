import React, { useState, useEffect } from 'react';
import Components from "@/components";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { 
  Calendar, Download, MapPin, Filter, Search, 
  ArrowUpRight, ArrowDownLeft, Clock, CheckCircle, XCircle 
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Label } from "@/components/ui/label";
import { useRole } from "@/components/RoleProvider";
import { useAuth } from "@/contexts/AuthContext";
import { format } from "date-fns";
import { enrollmentService } from "@/services/enrollment.service";
import { studentService } from "@/services/student.service";
import { staffService } from "@/services/staff.service";
import { exportAttendanceHistoryToCSV } from "@/utils/excel";

export default function AttendanceHistory() {
  return <AttendanceHistoryContent />;
}

function AttendanceHistoryContent() {
  const { role } = useRole();
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [studentHistory, setStudentHistory] = useState<any[]>([]);
  const [staffHistory, setStaffHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(role === 'Student' || role === 'Staff');
  const [dateFrom, setDateFrom] = useState<Date | undefined>();
  const [dateTo, setDateTo] = useState<Date | undefined>();
  const [dateRangeOpen, setDateRangeOpen] = useState(false);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState<any | null>(null);

  useEffect(() => {
    if (role !== 'Student' || !user?.id) {
      if (role !== 'Staff') setHistoryLoading(false);
      return;
    }
    const load = async () => {
      setHistoryLoading(true);
      try {
        const student = await studentService.getStudentByUserId();
        if (!student?.id) {
          setStudentHistory([]);
          return;
        }
        const studentId = student.id;

        const enrollments = await enrollmentService.getStudentEnrollments(studentId);
        const byClassId = new Map(
          (enrollments as any[]).map((e: any) => [
            e.classId,
            {
              code: e?.class?.course?.code ?? '',
              name: e?.class?.course?.name ?? e?.class?.name ?? '',
            },
          ])
        );
        const params: any = {};
        if (dateFrom) params.startDate = dateFrom.toISOString().split('T')[0];
        if (dateTo) params.endDate = dateTo.toISOString().split('T')[0];
        const list = await studentService.getStudentAttendance(studentId, params);
        const arr = Array.isArray(list) ? list : [];
        setStudentHistory(arr.map((r: any) => ({
          id: r.id,
          date: r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
          time: r.markedAt ? new Date(r.markedAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
          course: byClassId.get(r.classId)?.code || r.classId || '—',
          type: 'Lecture',
          location: r.location || '—',
          status: r.status || 'Present',
          rawData: r, // Store raw data for details dialog
        })));
      } catch (e) {
        setStudentHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, [role, user?.id, dateFrom, dateTo]);

  useEffect(() => {
    if (role !== 'Staff') return;
    const load = async () => {
      setHistoryLoading(true);
      try {
        // Note: staffService.getCheckInHistory() may need date range support
        const list = await staffService.getCheckInHistory();
        const arr = Array.isArray(list) ? list : [];
        let filtered = arr;
        if (dateFrom || dateTo) {
          filtered = arr.filter((r: any) => {
            if (!r.date) return false;
            const recordDate = new Date(r.date);
            if (dateFrom && recordDate < dateFrom) return false;
            if (dateTo && recordDate > dateTo) return false;
            return true;
          });
        }
        setStaffHistory(filtered.map((r: any, i: number) => ({
          id: String(i),
          date: r.date ?? '—',
          checkIn: r.checkIn ?? '—',
          checkOut: r.checkOut ?? '—',
          duration: r.checkOut && r.checkIn ? '—' : 'Active',
          location: r.location || '—',
          status: r.status || 'Present',
          rawData: r, // Store raw data for details dialog
        })));
      } catch (e) {
        setStaffHistory([]);
      } finally {
        setHistoryLoading(false);
      }
    };
    load();
  }, [role, dateFrom, dateTo]);

  const data: any[] = role === 'Staff' ? staffHistory : studentHistory;

  const handleExportCSV = () => {
    exportAttendanceHistoryToCSV(data, role === 'Staff' ? 'Staff' : 'Student');
  };

  return (
      <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Attendance History</h1>
            <p className="text-gray-500">
              {role === 'Staff' 
                ? 'Record of your daily check-ins and check-outs.' 
                : 'Log of your class attendance and participation.'}
            </p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportCSV}>
              <Download size={16} /> Export CSV
            </Button>
          </div>
        </div>

        {/* Filters */}
        <Card>
          <CardContent className="p-4 flex flex-col md:flex-row gap-4 items-center justify-between">
            <div className="relative w-full md:w-96">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input 
                placeholder={role === 'Staff' ? "Search by date..." : "Search by course or date..."}
                className="pl-8"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="flex gap-2 w-full md:w-auto">
               <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="w-[150px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="present">Present</SelectItem>
                    <SelectItem value="late">Late</SelectItem>
                    <SelectItem value="absent">Absent</SelectItem>
                  </SelectContent>
               </Select>
               <Popover open={dateRangeOpen} onOpenChange={setDateRangeOpen}>
                 <PopoverTrigger asChild>
                   <Button variant="outline" className="gap-2">
                     <Calendar className="h-4 w-4" /> Date Range
                   </Button>
                 </PopoverTrigger>
                 <PopoverContent className="w-auto p-0" align="end">
                   <div className="p-4 space-y-4">
                     <div>
                       <Label className="text-sm font-medium mb-2 block">From Date</Label>
                       <CalendarComponent
                         mode="single"
                         selected={dateFrom}
                         onSelect={(date) => {
                           setDateFrom(date);
                           if (date && dateTo && date > dateTo) {
                             setDateTo(undefined);
                           }
                         }}
                         initialFocus
                       />
                     </div>
                     <div>
                       <Label className="text-sm font-medium mb-2 block">To Date</Label>
                       <CalendarComponent
                         mode="single"
                         selected={dateTo}
                         onSelect={(date) => {
                           if (!dateFrom || !date || date >= dateFrom) {
                             setDateTo(date);
                           }
                         }}
                         disabled={(date) => dateFrom ? date < dateFrom : false}
                         initialFocus
                       />
                     </div>
                     <div className="flex gap-2 pt-2 border-t">
                       <Button 
                         variant="outline" 
                         size="sm" 
                         onClick={() => {
                           setDateFrom(undefined);
                           setDateTo(undefined);
                         }}
                       >
                         Clear
                       </Button>
                       <Button 
                         size="sm" 
                         onClick={() => setDateRangeOpen(false)}
                         className="bg-[#015F2B]"
                       >
                         Apply
                       </Button>
                     </div>
                   </div>
                 </PopoverContent>
               </Popover>
            </div>
          </CardContent>
        </Card>

        {/* Stats Summary - Optional */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
           <Card>
             <CardContent className="p-4 flex items-center justify-between">
                <div>
                   <p className="text-xs font-medium text-muted-foreground">Total Present</p>
                   <h3 className="text-2xl font-bold text-[#015F2B]">
                     {data.filter((d: any) => d.status === 'Present' || d.status === 'Late').length}
                   </h3>
                </div>
                <CheckCircle className="text-[#015F2B] opacity-20 h-8 w-8" />
             </CardContent>
           </Card>
           <Card>
             <CardContent className="p-4 flex items-center justify-between">
                <div>
                   <p className="text-xs font-medium text-muted-foreground">Late Arrivals</p>
                   <h3 className="text-2xl font-bold text-[#F6A000]">
                     {data.filter((d: any) => d.status === 'Late').length}
                   </h3>
                </div>
                <Clock className="text-[#F6A000] opacity-20 h-8 w-8" />
             </CardContent>
           </Card>
           {role !== 'Staff' && (
             <Card>
               <CardContent className="p-4 flex items-center justify-between">
                  <div>
                     <p className="text-xs font-medium text-muted-foreground">Missed Classes</p>
                     <h3 className="text-2xl font-bold text-red-600">
                       {data.filter((d: any) => d.status === 'Absent').length}
                     </h3>
                  </div>
                  <XCircle className="text-red-600 opacity-20 h-8 w-8" />
               </CardContent>
             </Card>
           )}
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  {role === 'Staff' ? (
                    <>
                      <TableHead>Check In</TableHead>
                      <TableHead>Check Out</TableHead>
                      <TableHead>Duration</TableHead>
                    </>
                  ) : (
                    <>
                      <TableHead>Time</TableHead>
                      <TableHead>Course</TableHead>
                      <TableHead>Location</TableHead>
                    </>
                  )}
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {historyLoading ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading attendance...</TableCell></TableRow>
                ) : data.length === 0 ? (
                  <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">{role === 'Student' ? 'No attendance records yet.' : 'No records.'}</TableCell></TableRow>
                ) : (
                  data.map((record: any) => (
                  <TableRow key={record.id}>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4 text-gray-400" />
                        <span className="font-medium">{record.date}</span>
                      </div>
                    </TableCell>
                    
                    {role === 'Staff' ? (
                      <>
                        <TableCell>
                           <div className="flex items-center gap-1 text-xs text-green-700 font-medium bg-green-50 px-2 py-1 rounded w-fit">
                             <ArrowUpRight size={12} /> {record.checkIn}
                           </div>
                        </TableCell>
                        <TableCell>
                           {record.checkOut !== '-' ? (
                             <div className="flex items-center gap-1 text-xs text-blue-700 font-medium bg-blue-50 px-2 py-1 rounded w-fit">
                               <ArrowDownLeft size={12} /> {record.checkOut}
                             </div>
                           ) : (
                             <span className="text-gray-400 italic text-xs">Active</span>
                           )}
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{record.duration}</TableCell>
                      </>
                    ) : (
                      <>
                        <TableCell className="text-sm">{record.time}</TableCell>
                        <TableCell>
                           <div className="font-medium">{record.course}</div>
                           <div className="text-xs text-gray-500">{record.type}</div>
                        </TableCell>
                         <TableCell>
                           <div className="flex items-center gap-1 text-sm text-gray-600">
                             <MapPin className="h-3 w-3" /> {record.location}
                           </div>
                        </TableCell>
                      </>
                    )}

                    <TableCell>
                      <Badge 
                        variant={
                          record.status === 'Present' ? 'default' : 
                          record.status === 'Late' ? 'secondary' : 
                          record.status === 'Absent' ? 'destructive' : 'outline'
                        }
                        className={
                          record.status === 'Present' ? 'bg-[#015F2B]/10 text-[#015F2B] border-[#015F2B]/20 hover:bg-[#015F2B]/20 shadow-none' :
                          record.status === 'Late' ? 'bg-[#F6A000]/10 text-[#F6A000] border-[#F6A000]/20 hover:bg-[#F6A000]/20 shadow-none' : 
                          record.status === 'Excused' ? 'bg-blue-100 text-blue-800 border-blue-200 hover:bg-blue-200 shadow-none' : ''
                        }
                      >
                        {record.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                       <Button 
                         variant="ghost" 
                         size="sm" 
                         className="h-8 text-xs"
                         onClick={() => {
                           setSelectedRecord(record);
                           setDetailsOpen(true);
                         }}
                       >
                         Details
                       </Button>
                    </TableCell>
                  </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        {/* Date Range Display */}
        {(dateFrom || dateTo) && (
          <div className="text-sm text-gray-600 flex items-center gap-2">
            <Calendar className="h-4 w-4" />
            <span>
              {dateFrom ? format(dateFrom, 'MMM dd, yyyy') : 'Start'} - {dateTo ? format(dateTo, 'MMM dd, yyyy') : 'End'}
            </span>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={() => {
                setDateFrom(undefined);
                setDateTo(undefined);
              }}
            >
              Clear
            </Button>
          </div>
        )}

        {/* Details Dialog */}
        <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Attendance Record Details</DialogTitle>
              <DialogDescription>
                Complete information for this attendance record
              </DialogDescription>
            </DialogHeader>
            {selectedRecord && (
              <div className="space-y-4 py-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Date</Label>
                    <p className="text-sm font-medium">{selectedRecord.date}</p>
                  </div>
                  {role === 'Student' ? (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Time</Label>
                        <p className="text-sm font-medium">{selectedRecord.time}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Course</Label>
                        <p className="text-sm font-medium">{selectedRecord.course}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Type</Label>
                        <p className="text-sm font-medium">{selectedRecord.type}</p>
                      </div>
                    </>
                  ) : (
                    <>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Check-In</Label>
                        <p className="text-sm font-medium">{selectedRecord.checkIn}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Check-Out</Label>
                        <p className="text-sm font-medium">{selectedRecord.checkOut}</p>
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-500">Duration</Label>
                        <p className="text-sm font-medium">{selectedRecord.duration}</p>
                      </div>
                    </>
                  )}
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Location</Label>
                    <p className="text-sm font-medium">{selectedRecord.location}</p>
                  </div>
                  <div>
                    <Label className="text-sm font-medium text-gray-500">Status</Label>
                    <Badge 
                      variant={selectedRecord.status === 'Present' ? 'default' : 'secondary'}
                      className={selectedRecord.status === 'Present' ? 'bg-[#015F2B]/10 text-[#015F2B]' : ''}
                    >
                      {selectedRecord.status}
                    </Badge>
                  </div>
                </div>
                {selectedRecord.rawData && (
                  <div className="pt-4 border-t">
                    <Label className="text-sm font-medium text-gray-500">Additional Details</Label>
                    <pre className="text-xs bg-gray-50 p-2 rounded mt-2 overflow-auto">
                      {JSON.stringify(selectedRecord.rawData, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDetailsOpen(false)}>Close</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
  );
}
