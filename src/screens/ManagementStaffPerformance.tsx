import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { staffService } from '@/services/staff.service';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  Search, Filter, Download, UserCheck, UserX, Clock, 
  MoreHorizontal, ArrowUpDown, ChevronLeft, ChevronRight, Loader2
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { reportService } from "@/services/report.service";
import { toast } from 'sonner';

export default function ManagementStaffPerformance() {
  const [searchTerm, setSearchTerm] = useState('');
  const [departmentFilter, setDepartmentFilter] = useState<string>('All');
  const [statusFilter, setStatusFilter] = useState<string>('All');
  const [staffData, setStaffData] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [lateArrivals, setLateArrivals] = useState<number | null>(null);
  const [workDays, setWorkDays] = useState<number | null>(null);
  const [missedDays, setMissedDays] = useState<number | null>(null);

  useEffect(() => {
    const fetchStaff = async () => {
      setLoading(true);
      try {
        const params: any = {};
        if (searchTerm) params.search = searchTerm;
        if (departmentFilter !== 'All') params.department = departmentFilter;
        if (statusFilter !== 'All') params.status = statusFilter;
        
        const result = await staffService.getStaff(params);
        const staff = Array.isArray(result) ? result : result.data || [];
        const nonLecturerStaff = staff.filter((s: any) => s.role !== 'Lecturer');
        setStaffData(nonLecturerStaff);
        
        // Calculate metrics from staff data
        // Late arrivals: staff with performance score < threshold
        const lateCount = nonLecturerStaff.filter((s: any) => {
          const score = s.performanceScore != null ? s.performanceScore * 20 : 100;
          return score < 80; // Consider < 80% as late/absent
        }).length;
        setLateArrivals(lateCount);
        
        // Work days: only show if backend provides this data
        // No estimation - only real data from API
        setWorkDays(null);
        
        // Missed days: sum of missed days from staff records
        const totalMissed = nonLecturerStaff.reduce((sum: number, s: any) => sum + (s.missed ?? 0), 0);
        setMissedDays(totalMissed);
      } catch (error) {
        console.error('Error fetching staff:', error);
        setStaffData([]);
      } finally {
        setLoading(false);
      }
    };
    fetchStaff();
  }, [searchTerm, departmentFilter, statusFilter]);

  const clearFilters = () => {
    setSearchTerm('');
    setDepartmentFilter('All');
    setStatusFilter('All');
  };

  const avgAttendance = staffData.length > 0 && staffData.some((s: any) => s.performanceScore != null)
    ? (staffData.reduce((sum: number, s: any) => sum + (s.performanceScore != null ? s.performanceScore * 20 : 0), 0) / staffData.filter((s: any) => s.performanceScore != null).length).toFixed(1) + '%'
    : '—';
  const totalMissed = staffData.reduce((sum: number, s: any) => sum + (s.missed ?? 0), 0);
  const topPerformer = staffData.length > 0 && staffData.some((s: any) => s.performanceScore != null)
    ? staffData.reduce((best: any, s: any) => (s.performanceScore != null && (!best || s.performanceScore > best.performanceScore) ? s : best), null)
    : null;

  const handleExportReport = async () => {
    try {
      const result = await reportService.exportReport(
        'staff-performance',
        'excel',
        undefined
      );
      if (result?.downloadUrl) {
        window.open(result.downloadUrl, '_blank');
      } else if ((result as { content?: string })?.content) {
        // Fallback: create blob from content
        const blob = new Blob([(result as unknown as { content: string }).content], { type: 'text/csv' });
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = result.filename || `staff-performance-${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      }
    } catch (error: any) {
      console.error('Export failed:', error);
      toast.error(`Failed to export report: ${error?.message || 'Unknown error'}`);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Staff Performance</h1>
            <p className="text-gray-500">Comprehensive view of non-teaching staff attendance and performance metrics.</p>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" className="gap-2" onClick={handleExportReport}>
              <Download size={16} /> Export Report
            </Button>
          </div>
        </div>

        {/* Aggregate Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Average Attendance</p>
                <h2 className="text-3xl font-bold text-gray-900">{avgAttendance}</h2>
              </div>
              <div className="bg-green-100 p-3 rounded-full">
                <UserCheck className="w-6 h-6 text-[#015F2B]" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Days Missed</p>
                <h2 className="text-3xl font-bold text-red-600">{totalMissed}</h2>
              </div>
              <div className="bg-red-100 p-3 rounded-full">
                <UserX className="w-6 h-6 text-red-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Late Arrivals</p>
                <h2 className="text-3xl font-bold text-[#F6A000]">
                  {loading ? <Loader2 className="h-8 w-8 animate-spin text-gray-400" /> : (lateArrivals != null ? lateArrivals : '—')}
                </h2>
              </div>
              <div className="bg-orange-100 p-3 rounded-full">
                <Clock className="w-6 h-6 text-[#F6A000]" />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6 flex items-center justify-between">
              <div>
                <p className="text-sm font-medium text-muted-foreground">Top Performer</p>
                <h2 className="text-xl font-bold text-gray-900 truncate">
                  {topPerformer ? `${topPerformer.firstName} ${topPerformer.lastName}` : '—'}
                </h2>
              </div>
              <div className="bg-blue-100 p-3 rounded-full">
                <Badge className="bg-blue-600 hover:bg-blue-700">{topPerformer?.performanceScore?.toFixed(1) ?? '—'}</Badge>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filter Bar */}
        <Card>
          <CardContent className="p-4">
            <div className="space-y-4">
              <div className="flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                  <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                  <Input 
                    placeholder="Search by name, role or department..." 
                    className="pl-8"
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <Select value={departmentFilter} onValueChange={setDepartmentFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Departments</SelectItem>
                    {Array.from(new Set(staffData.map((s: any) => s.departmentId || s.dept))).map((dept: string) => (
                      <SelectItem key={dept} value={dept}>{dept}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="w-full md:w-[200px]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Status</SelectItem>
                    <SelectItem value="Excellent">Excellent</SelectItem>
                    <SelectItem value="Good">Good</SelectItem>
                    <SelectItem value="Average">Average</SelectItem>
                    <SelectItem value="Warning">Warning</SelectItem>
                    <SelectItem value="Critical">Critical</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                <Button variant="outline" onClick={clearFilters} className="gap-2">
                  <Filter className="h-4 w-4" /> Clear Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Staff Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Staff Members</CardTitle>
            <CardDescription>Performance based on attendance records and student feedback.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[300px]">Staff Member</TableHead>
                  <TableHead>Role</TableHead>
                  <TableHead>Department</TableHead>
                  <TableHead className="text-center">Attendance</TableHead>
                  <TableHead className="text-center">Work Days</TableHead>
                  <TableHead className="text-center">Missed</TableHead>
                  <TableHead className="text-center">Rating</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      Loading staff data...
                    </TableCell>
                  </TableRow>
                ) : staffData.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-8 text-gray-500">
                      No staff data found
                    </TableCell>
                  </TableRow>
                ) : (
                  staffData.map((staff: any) => (
                    <TableRow key={staff.id}>
                      <TableCell>
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9">
                            <AvatarFallback className="bg-[#015F2B]/10 text-[#015F2B] font-medium">
                              {(staff.firstName + ' ' + staff.lastName).split(' ').map((n: string) => n[0]).join('')}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <div className="font-medium text-gray-900">{staff.firstName} {staff.lastName}</div>
                            <div className="text-xs text-muted-foreground">{staff.staffNumber}</div>
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{staff.role}</TableCell>
                      <TableCell>{staff.departmentId || '—'}</TableCell>
                      <TableCell className="text-center font-bold text-gray-700">{staff.performanceScore ? `${(staff.performanceScore * 20).toFixed(0)}%` : '—'}</TableCell>
                      <TableCell className="text-center">{workDays != null ? workDays : '—'}</TableCell>
                      <TableCell className="text-center text-red-600 font-medium">{staff.missed ?? '—'}</TableCell>
                      <TableCell className="text-center">
                        <div className="inline-flex items-center px-2 py-1 rounded bg-gray-100 text-xs font-bold">
                          {staff.performanceScore ? `${staff.performanceScore.toFixed(1)}` : '—'} / 5.0
                        </div>
                      </TableCell>
                      <TableCell>
                        <Badge 
                          variant={staff.status === 'Inactive' ? 'destructive' : 'default'}
                          className={
                            staff.status === 'Active' ? 'bg-green-100 text-green-800 hover:bg-green-200 border-green-200 shadow-none' :
                            'shadow-none'
                          }
                        >
                          {staff.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            
            {/* Pagination */}
            <div className="flex items-center justify-end space-x-2 py-4">
              <Button variant="outline" size="sm" disabled>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              <Button variant="outline" size="sm">
                Next <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
  );
}
