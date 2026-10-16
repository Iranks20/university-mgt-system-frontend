import { useEffect, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { TablePagination } from '@/components/ui/table-pagination';
import { emptyPage, type Paged } from '@/lib/pagination';
import { usePaging } from '@/hooks/usePaging';
import { useDebounced } from '@/hooks/useDebounced';
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
  const [staff, setStaff] = useState<Paged<Staff>>(() => emptyPage());
  const [loading, setLoading] = useState(true);
  const [counts, setCounts] = useState<{ pool: number; probation: number } | null>(null);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const paging = usePaging(debouncedSearch);

  useEffect(() => {
    let cancelled = false;
    Promise.all([
      staffService.getStaff({ onboarding: true, limit: 1 }),
      staffService.getStaff({ onboarding: true, status: 'Probation', limit: 1 }),
    ]).then(([pool, probation]) => {
      if (!cancelled) setCounts({ pool: pool.total, probation: probation.total });
    });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    staffService
      .getStaff({
        onboarding: true,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        page: paging.page,
        limit: paging.pageSize,
      })
      .then((result) => {
        if (!cancelled) setStaff({ ...result, data: result.data ?? [] });
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, paging.page, paging.pageSize]);

  const probationCount = counts?.probation ?? 0;
  const newHireCount = counts ? counts.pool - counts.probation : 0;

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
            <div className="text-2xl font-bold">{counts ? counts.pool : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-purple-700">Probation</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts ? probationCount : '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-[#015F2B]">New hires (≤90 days)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{counts ? newHireCount : '—'}</div>
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
              placeholder="Search name or staff number…"
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
              ) : staff.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                    No probation or recent-hire staff found
                  </TableCell>
                </TableRow>
              ) : (
                staff.data.map((s) => (
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
          <TablePagination
            page={paging.page}
            pageSize={paging.pageSize}
            total={staff.total}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
            disabled={loading}
          />
        </CardContent>
      </Card>
    </HrPageShell>
  );
}
