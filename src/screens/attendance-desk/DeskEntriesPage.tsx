import { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowLeft, Search } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { getApiErrorMessage } from '@/lib/api';
import { emptyPage, type Paged } from '@/lib/pagination';
import { formatClock, formatDateKey, formatDuration, localDateKey, shiftDateKey } from '@/lib/attendance-desk';
import { usePaging } from '@/hooks/usePaging';
import { useDebounced } from '@/hooks/useDebounced';
import {
  staffAttendanceService,
  type DeskVisit,
  type DeskVisitStatus,
} from '@/services/staff-attendance.service';

const VISIT_STATUS: Record<DeskVisitStatus, { label: string; className: string }> = {
  OnCampus: { label: 'On campus', className: 'bg-green-100 text-green-800 hover:bg-green-100' },
  CheckedOut: { label: 'Checked out', className: 'bg-slate-200 text-slate-800 hover:bg-slate-200' },
  NotCheckedOut: { label: 'Not checked out', className: 'bg-amber-100 text-amber-800 hover:bg-amber-100' },
  NoCheckIn: { label: 'No check-in', className: 'bg-red-100 text-red-800 hover:bg-red-100' },
};

const STATUS_FILTERS: Array<{ value: 'all' | DeskVisitStatus; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'OnCampus', label: 'On campus' },
  { value: 'CheckedOut', label: 'Checked out' },
  { value: 'NotCheckedOut', label: 'Not checked out' },
  { value: 'NoCheckIn', label: 'No check-in' },
];

function TimeCell({ value }: { value: string | null }) {
  return value ? (
    <span className="font-medium tabular-nums text-gray-900">{formatClock(value)}</span>
  ) : (
    <span className="text-gray-400">—</span>
  );
}

export default function DeskEntriesPage() {
  const today = useMemo(() => localDateKey(), []);
  const [from, setFrom] = useState(shiftDateKey(today, -6));
  const [to, setTo] = useState(today);
  const [status, setStatus] = useState<'all' | DeskVisitStatus>('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [visits, setVisits] = useState<Paged<DeskVisit>>(() => emptyPage());
  const [loading, setLoading] = useState(false);
  const paging = usePaging(`${from}|${to}|${status}|${debouncedSearch}`);

  const load = useCallback(async () => {
    if (from > to) return;
    setLoading(true);
    try {
      setVisits(
        await staffAttendanceService.getVisits({
          from,
          to,
          ...(status !== 'all' ? { status } : {}),
          ...(debouncedSearch ? { search: debouncedSearch } : {}),
          page: paging.page,
          limit: paging.pageSize,
        })
      );
    } catch (error) {
      setVisits(emptyPage());
      toast.error(getApiErrorMessage(error, 'Could not load your entries'));
    } finally {
      setLoading(false);
    }
  }, [from, to, status, debouncedSearch, paging.page, paging.pageSize]);

  useEffect(() => {
    void load();
  }, [load]);

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">My Entries</h1>
          <p className="text-gray-500 mt-1">Check-ins and check-outs you have recorded at the desk.</p>
        </div>
        <Button variant="outline" asChild>
          <Link to="/attendance-desk">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to desk
          </Link>
        </Button>
      </div>

      <Card>
        <CardContent className="grid gap-3 sm:grid-cols-2 lg:grid-cols-[1fr_auto_auto_auto] lg:items-center">
          <div className="relative sm:col-span-2 lg:col-span-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or staff number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Input
            type="date"
            value={from}
            max={to}
            onChange={(e) => e.target.value && setFrom(e.target.value)}
            className="lg:w-40"
            aria-label="From date"
          />
          <Input
            type="date"
            value={to}
            min={from}
            max={today}
            onChange={(e) => e.target.value && setTo(e.target.value)}
            className="lg:w-40"
            aria-label="To date"
          />
          <Select value={status} onValueChange={(v) => setStatus(v as 'all' | DeskVisitStatus)}>
            <SelectTrigger className="w-full sm:col-span-2 lg:col-span-1 lg:w-44">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((f) => (
                <SelectItem key={f.value} value={f.value}>
                  {f.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card className="overflow-hidden py-0">
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Employee</TableHead>
                <TableHead className="hidden xl:table-cell">Works in</TableHead>
                <TableHead>Check in</TableHead>
                <TableHead>Check out</TableHead>
                <TableHead className="hidden lg:table-cell">Time on campus</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : visits.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-gray-500">
                    No entries for these filters
                  </TableCell>
                </TableRow>
              ) : (
                visits.data.map((v) => (
                  <TableRow key={v.id}>
                    <TableCell className="whitespace-nowrap">{formatDateKey(v.date)}</TableCell>
                    <TableCell>
                      <div className="font-medium text-gray-900">{v.employeeName}</div>
                      <div className="text-xs text-gray-500">{v.staffNumber}</div>
                    </TableCell>
                    <TableCell className="hidden text-sm text-gray-600 xl:table-cell">{v.worksIn ?? '—'}</TableCell>
                    <TableCell>
                      <TimeCell value={v.checkInAt} />
                    </TableCell>
                    <TableCell>
                      <TimeCell value={v.checkOutAt} />
                    </TableCell>
                    <TableCell className="hidden text-sm text-gray-600 lg:table-cell">
                      {v.status === 'CheckedOut' || v.status === 'OnCampus' ? formatDuration(v.minutes) : '—'}
                    </TableCell>
                    <TableCell>
                      <Badge className={`whitespace-nowrap ${VISIT_STATUS[v.status].className}`}>
                        {VISIT_STATUS[v.status].label}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={paging.page}
            pageSize={paging.pageSize}
            total={visits.total}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
            disabled={loading}
          />
        </CardContent>
      </Card>
    </div>
  );
}
