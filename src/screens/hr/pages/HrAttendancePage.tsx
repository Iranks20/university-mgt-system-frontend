import { useCallback, useEffect, useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Download, Search } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '@/services/staff.service';
import { academicService } from '@/services/academic.service';
import { hrReportsService } from '@/services/hr-reports.service';
import { getApiErrorMessage } from '@/lib/api';

type AttendanceRow = {
  id: string;
  staffId: string;
  employeeName: string;
  departmentId: string;
  department: string;
  date: string;
  checkIn: string | null;
  checkOut: string | null;
  hours: number;
  status: string;
};

function attendanceStatusBadge(status: string) {
  const colors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800',
    Late: 'bg-amber-100 text-amber-800',
    Absent: 'bg-red-100 text-red-800',
    'On Leave': 'bg-blue-100 text-blue-800',
  };
  return <Badge className={colors[status] || ''}>{status}</Badge>;
}

function formatTime(iso: string | null) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export default function HrAttendancePage() {
  const today = useMemo(() => new Date().toISOString().slice(0, 10), []);
  const [date, setDate] = useState(today);
  const [deptId, setDeptId] = useState('all');
  const [search, setSearch] = useState('');
  const [records, setRecords] = useState<AttendanceRow[]>([]);
  const [summary, setSummary] = useState({
    present: 0,
    late: 0,
    absent: 0,
    onLeave: 0,
  });
  const [departments, setDepartments] = useState<{ id: string; name: string }[]>([]);
  const [loading, setLoading] = useState(true);

  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    academicService
      .getDepartments()
      .then((depts) => setDepartments(depts.map((d) => ({ id: d.id, name: d.name }))))
      .catch(() => setDepartments([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const result = await staffService.getWorkforceCheckIns({
        date,
        departmentId: deptId === 'all' ? undefined : deptId,
      });
      setRecords(result.records);
      setSummary({
        present: result.summary.present,
        late: result.summary.late,
        absent: result.summary.absent,
        onLeave: result.summary.onLeave,
      });
    } catch {
      setRecords([]);
      setSummary({ present: 0, late: 0, absent: 0, onLeave: 0 });
      toast.error('Could not load attendance register');
    } finally {
      setLoading(false);
    }
  }, [date, deptId]);

  useEffect(() => {
    void load();
  }, [load]);

  const filtered = records.filter((r) => {
    const q = search.toLowerCase();
    return !q || r.employeeName.toLowerCase().includes(q);
  });

  return (
    <HrPageShell
      title="Staff Attendance"
      description="Daily check-in register"
      actions={
        <Button
          variant="outline"
          disabled={exporting}
          onClick={async () => {
            setExporting(true);
            try {
              const result = await hrReportsService.downloadExport({
                type: 'attendance',
                date,
              });
              toast.success(`Downloaded ${result.filename}`);
            } catch (error) {
              toast.error(getApiErrorMessage(error, 'Export failed'));
            } finally {
              setExporting(false);
            }
          }}
        >
          <Download className="h-4 w-4 mr-2" />
          {exporting ? 'Exporting…' : 'Export CSV'}
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-4">
        {[
          { label: 'Present', value: summary.present, color: 'text-green-600' },
          { label: 'Late', value: summary.late, color: 'text-amber-600' },
          { label: 'Absent', value: summary.absent, color: 'text-red-600' },
          { label: 'On Leave', value: summary.onLeave, color: 'text-blue-600' },
        ].map((s) => (
          <Card key={s.label}>
            <CardHeader className="pb-2">
              <CardTitle className={`text-sm ${s.color}`}>{s.label}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{loading ? '—' : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 sm:flex-row">
          <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="sm:w-44" />
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search employee..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={deptId} onValueChange={setDeptId}>
            <SelectTrigger className="sm:w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {departments.map((d) => (
                <SelectItem key={d.id} value={d.id}>
                  {d.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Check In</TableHead>
                <TableHead>Check Out</TableHead>
                <TableHead>Hours</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    Loading attendance…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No attendance rows for this date
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((r) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.employeeName}</TableCell>
                    <TableCell>{r.department}</TableCell>
                    <TableCell>{r.date}</TableCell>
                    <TableCell>{formatTime(r.checkIn)}</TableCell>
                    <TableCell>{formatTime(r.checkOut)}</TableCell>
                    <TableCell>{r.hours > 0 ? r.hours.toFixed(1) : '—'}</TableCell>
                    <TableCell>{attendanceStatusBadge(r.status)}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </HrPageShell>
  );
}
