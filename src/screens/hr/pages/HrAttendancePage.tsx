import { useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { getHrAttendance } from '@/features/hr/hr-demo-store';
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

function attendanceStatusBadge(status: string) {
  const colors: Record<string, string> = {
    Present: 'bg-green-100 text-green-800',
    Late: 'bg-amber-100 text-amber-800',
    Absent: 'bg-red-100 text-red-800',
    'On Leave': 'bg-blue-100 text-blue-800',
  };
  return <Badge className={colors[status] || ''}>{status}</Badge>;
}

export default function HrAttendancePage() {
  const [records] = useState(() => getHrAttendance());
  const [search, setSearch] = useState('');
  const [dept, setDept] = useState('All');
  const [date, setDate] = useState('2026-06-05');

  const departments = useMemo(
    () => ['All', ...new Set(records.map((r) => r.department))],
    [records]
  );

  const filtered = records.filter((r) => {
    const matchDept = dept === 'All' || r.department === dept;
    const matchDate = r.date === date;
    const q = search.toLowerCase();
    const matchSearch = !q || r.employeeName.toLowerCase().includes(q);
    return matchDept && matchDate && matchSearch;
  });

  const summary = {
    present: filtered.filter((r) => r.status === 'Present').length,
    late: filtered.filter((r) => r.status === 'Late').length,
    absent: filtered.filter((r) => r.status === 'Absent').length,
    onLeave: filtered.filter((r) => r.status === 'On Leave').length,
  };

  return (
    <HrPageShell
      title="Staff Attendance"
      description="Daily attendance register from staff check-in records — integrates with existing timeclock."
      actions={
        <Button variant="outline" onClick={() => toast.info('Monthly export will connect to backend')}>
          <Download className="h-4 w-4 mr-2" /> Export Register
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
              <div className="text-2xl font-bold">{s.value}</div>
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
            <Input className="pl-9" placeholder="Search employee..." value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={dept} onValueChange={setDept}>
            <SelectTrigger className="sm:w-48"><SelectValue /></SelectTrigger>
            <SelectContent>
              {departments.map((d) => <SelectItem key={d} value={d}>{d}</SelectItem>)}
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
              {filtered.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.employeeName}</TableCell>
                  <TableCell>{r.department}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.checkIn}</TableCell>
                  <TableCell>{r.checkOut || '—'}</TableCell>
                  <TableCell>{r.hours > 0 ? r.hours.toFixed(1) : '—'}</TableCell>
                  <TableCell>{attendanceStatusBadge(r.status)}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </HrPageShell>
  );
}
