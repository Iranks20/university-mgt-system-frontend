import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { academicService } from '@/services/academic.service';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';

type DeptRow = { id: string; name: string; schoolName: string; head: string; staff: string; students: string; attendance: string; status: string };

export default function ManagementDepartments() {
  const [rows, setRows] = useState<DeptRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDept, setSelectedDept] = useState<DeptRow | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const [schools, depts] = await Promise.all([
          academicService.getSchools(),
          academicService.getDepartments(),
        ]);
        const schoolList = Array.isArray(schools) ? schools : [];
        const deptList = Array.isArray(depts) ? depts : [];
        const schoolMap: Record<string, string> = {};
        schoolList.forEach((s: any) => { schoolMap[s.id] = s.name; });
        
        // Load stats for each department
        const rowsWithStats = await Promise.all(
          deptList.map(async (d: any) => {
            try {
              const stats = await academicService.getDepartmentStats(d.id);
              return {
                id: d.id,
                name: d.name || 'Unknown',
                schoolName: schoolMap[d.schoolId] || 'Unknown',
                head: stats.headOfDepartment?.name || 'Not assigned',
                staff: stats.staffCount.toString(),
                students: stats.studentCount.toString(),
                attendance: stats.attendanceRate > 0 ? `${stats.attendanceRate.toFixed(1)}%` : 'No data',
                status: stats.status ?? 'Active',
              };
            } catch (error) {
              // If stats fail, use defaults
              return {
                id: d.id,
                name: d.name || 'Unknown',
                schoolName: schoolMap[d.schoolId] || 'Unknown',
                head: 'Error loading',
                staff: '—',
                students: '—',
                attendance: 'Error',
                status: '—',
              };
            }
          })
        );
        
        setRows(rowsWithStats);
      } catch (e: any) {
        console.error('Error loading departments:', e);
        setError(e?.message || 'Failed to load departments');
        toast.error('Failed to load departments. Please try again.');
        setRows([]);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [retryCount]);

  return (
    <>
    <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900">Schools & Departments</h1>
          <p className="text-gray-500">Performance metrics by faculty (from academic API).</p>
        </div>

        <div className="grid gap-6">
          <Card>
            <CardHeader>
              <CardTitle>Departmental Performance</CardTitle>
              <CardDescription>Overview of departments across all schools.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>School</TableHead>
                    <TableHead>Head of Department</TableHead>
                    <TableHead>Staff Count</TableHead>
                    <TableHead>Student Count</TableHead>
                    <TableHead>Attendance Rate</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loading ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6"><Loader2 className="h-5 w-5 animate-spin mx-auto text-gray-400" /></TableCell></TableRow>
                  ) : error ? (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center py-6">
                        <div className="flex flex-col items-center gap-2">
                          <p className="text-red-600">{error}</p>
                          <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>Retry</Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : rows.length === 0 ? (
                    <TableRow><TableCell colSpan={8} className="text-center py-6 text-muted-foreground">No departments found.</TableCell></TableRow>
                  ) : (
                    rows.map((dept) => (
                      <TableRow key={dept.id}>
                        <TableCell className="font-medium">{dept.name === 'Unknown' ? <span className="text-gray-400">Unknown</span> : dept.name}</TableCell>
                        <TableCell>{dept.schoolName === 'Unknown' ? <span className="text-gray-400">Unknown</span> : dept.schoolName}</TableCell>
                        <TableCell>{dept.head === 'Not assigned' || dept.head === 'Error loading' ? <span className="text-gray-400">{dept.head}</span> : dept.head}</TableCell>
                        <TableCell>{dept.staff === '—' ? <span className="text-gray-400">—</span> : dept.staff}</TableCell>
                        <TableCell>{dept.students === '—' ? <span className="text-gray-400">—</span> : dept.students}</TableCell>
                        <TableCell className="font-bold">{dept.attendance === 'No data' || dept.attendance === 'Error' ? <span className="text-gray-400">{dept.attendance}</span> : dept.attendance}</TableCell>
                        <TableCell>
                          {dept.status !== '—' ? (
                            <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">{dept.status}</Badge>
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedDept(dept);
                              setDetailsOpen(true);
                            }}
                          >
                             Details <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </div>
      </div>

      <Dialog open={detailsOpen} onOpenChange={setDetailsOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Department Details</DialogTitle>
            <DialogDescription>
              {selectedDept?.name ?? 'Department'} — overview and metrics.
            </DialogDescription>
          </DialogHeader>
          {selectedDept && (
            <div className="space-y-4 pt-2">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <span className="text-muted-foreground">Department</span>
                <span className="font-medium">{selectedDept.name}</span>
                <span className="text-muted-foreground">School</span>
                <span className="font-medium">{selectedDept.schoolName}</span>
                <span className="text-muted-foreground">Head of Department</span>
                <span className="font-medium">{selectedDept.head}</span>
                <span className="text-muted-foreground">Staff Count</span>
                <span className="font-medium">{selectedDept.staff}</span>
                <span className="text-muted-foreground">Student Count</span>
                <span className="font-medium">{selectedDept.students}</span>
                <span className="text-muted-foreground">Attendance Rate</span>
                <span className="font-bold text-[#015F2B]">{selectedDept.attendance}</span>
                <span className="text-muted-foreground">Status</span>
                <span>
                  {selectedDept.status !== '—' ? (
                    <Badge variant="default" className="bg-green-100 text-green-800 border-green-200">{selectedDept.status}</Badge>
                  ) : (
                    <span className="text-muted-foreground">—</span>
                  )}
                </span>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
