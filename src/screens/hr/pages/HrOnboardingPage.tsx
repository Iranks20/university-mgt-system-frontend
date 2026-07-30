import { useEffect, useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Search, UserPlus } from 'lucide-react';
import { Link } from 'react-router';
import { Button } from '@/components/ui/button';
import { staffService } from '@/services/staff.service';
import type { Staff } from '@/types';

function daysSince(hireDate: string | Date) {
  const start = new Date(hireDate);
  const now = new Date();
  return Math.floor((now.getTime() - start.getTime()) / 86400000);
}

function formatDate(value: string | Date) {
  return new Date(value).toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

export default function HrOnboardingPage() {
  const [staff, setStaff] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const result = await staffService.getStaff({ limit: 500 });
        if (!cancelled) setStaff(result.data ?? []);
      } catch {
        if (!cancelled) setStaff([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const onboardingPool = useMemo(() => {
    return staff
      .filter((s) => s.status !== 'Terminated' && s.status !== 'Inactive')
      .filter((s) => {
        if (s.status === 'Probation') return true;
        return daysSince(s.hireDate) <= 90;
      })
      .sort((a, b) => new Date(b.hireDate).getTime() - new Date(a.hireDate).getTime());
  }, [staff]);

  const filtered = onboardingPool.filter((s) => {
    const q = search.toLowerCase();
    if (!q) return true;
    const name = `${s.firstName} ${s.lastName}`.toLowerCase();
    return (
      name.includes(q) ||
      s.staffNumber.toLowerCase().includes(q) ||
      (s.departmentName ?? '').toLowerCase().includes(q)
    );
  });

  const probationCount = onboardingPool.filter((s) => s.status === 'Probation').length;
  const newHireCount = onboardingPool.filter((s) => s.status !== 'Probation').length;

  return (
    <HrPageShell
      title="Onboarding"
      description="Probation and recent hires (≤90 days)"
      actions={
        <Button variant="outline" asChild>
          <Link to="/hr/employees">
            <UserPlus className="h-4 w-4 mr-2" /> Manage staff
          </Link>
        </Button>
      }
    >
      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-gray-600">In onboarding pool</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : onboardingPool.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700">Probation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : probationCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#015F2B]">New hires (≤90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{loading ? '—' : newHireCount}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Staff</CardTitle>
          <div className="relative max-w-sm pt-2">
            <Search className="absolute left-3 top-5 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search name, staff number, department…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Staff no.</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Hire date</TableHead>
                <TableHead>Days since hire</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Account</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No probation or recent-hire staff found
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((s) => (
                  <TableRow key={s.id}>
                    <TableCell className="font-medium">
                      {s.firstName} {s.lastName}
                    </TableCell>
                    <TableCell>{s.staffNumber}</TableCell>
                    <TableCell>{s.departmentName ?? '—'}</TableCell>
                    <TableCell>{formatDate(s.hireDate)}</TableCell>
                    <TableCell>{daysSince(s.hireDate)}</TableCell>
                    <TableCell>
                      <Badge
                        className={
                          s.status === 'Probation'
                            ? 'bg-purple-100 text-purple-800'
                            : 'bg-green-100 text-green-800'
                        }
                      >
                        {s.status ?? 'Active'}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {s.userId ? (
                        <Badge className="bg-green-100 text-green-800">Linked</Badge>
                      ) : (
                        <Badge className="bg-amber-100 text-amber-800">No user</Badge>
                      )}
                    </TableCell>
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
