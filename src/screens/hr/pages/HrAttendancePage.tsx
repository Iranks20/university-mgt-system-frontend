import { useCallback, useEffect, useMemo, useState } from 'react';
import { Download, RefreshCw, Search, Wrench } from 'lucide-react';
import { toast } from 'sonner';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablePagination } from '@/components/ui/table-pagination';
import { StaffDayStatusBadge } from '@/components/hr/attendance/StaffDayStatusBadge';
import {
  AttendanceCorrectionDialog,
  type CorrectionTarget,
} from '@/components/hr/attendance/AttendanceCorrectionDialog';
import { StaffDayEventsSheet, type DayEventsTarget } from '@/components/hr/attendance/StaffDayEventsSheet';
import { StaffTimesheetDialog, type TimesheetTarget } from '@/components/hr/attendance/StaffTimesheetDialog';
import { academicService } from '@/services/academic.service';
import { organizationService } from '@/services/organization.service';
import { hrReportsService } from '@/services/hr-reports.service';
import {
  STAFF_DAY_STATUS_OPTIONS,
  staffAttendanceService,
  type DailyRegister,
  type ExceptionRow,
  type MonthlyRow,
  type OnCampusRow,
  type ScopeFilter,
  type StaffDayStatus,
} from '@/services/staff-attendance.service';
import { getApiErrorMessage } from '@/lib/api';
import { buildOfficeOptions } from '@/lib/office-options';
import { emptyPage, type Paged } from '@/lib/pagination';
import { usePaging } from '@/hooks/usePaging';
import { useDebounced } from '@/hooks/useDebounced';
import { formatClock, formatDateKey, formatDuration, localDateKey, shiftDateKey } from '@/lib/attendance-desk';

type TabKey = 'daily' | 'on-campus' | 'monthly' | 'exceptions';

const SUMMARY_CARDS: Array<{ key: keyof DailyRegister['summary']; status: StaffDayStatus; color: string }> = [
  { key: 'present', status: 'Present', color: 'text-green-700' },
  { key: 'onCampus', status: 'OnCampus', color: 'text-emerald-700' },
  { key: 'missingCheckOut', status: 'MissingCheckOut', color: 'text-amber-700' },
  { key: 'missingCheckIn', status: 'MissingCheckIn', color: 'text-orange-700' },
  { key: 'absent', status: 'Absent', color: 'text-red-700' },
  { key: 'onLeave', status: 'OnLeave', color: 'text-blue-700' },
];

const STATUS_LABEL = Object.fromEntries(STAFF_DAY_STATUS_OPTIONS.map((o) => [o.value, o.label]));

function EmptyRow({ colSpan, text }: { colSpan: number; text: string }) {
  return (
    <TableRow>
      <TableCell colSpan={colSpan} className="py-8 text-center text-gray-500">
        {text}
      </TableCell>
    </TableRow>
  );
}

function EmployeeCell({ name, staffNumber }: { name: string; staffNumber: string }) {
  return (
    <div>
      <div className="font-medium text-gray-900">{name}</div>
      <div className="text-xs text-gray-500">{staffNumber}</div>
    </div>
  );
}

export default function HrAttendancePage() {
  const today = useMemo(() => localDateKey(), []);
  const [tab, setTab] = useState<TabKey>('daily');
  const [worksIn, setWorksIn] = useState('all');
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [worksInOptions, setWorksInOptions] = useState<Array<{ value: string; label: string }>>([]);

  const [date, setDate] = useState(today);
  const [statusFilter, setStatusFilter] = useState<'all' | StaffDayStatus>('all');
  const [daily, setDaily] = useState<DailyRegister | null>(null);
  const [dailyLoading, setDailyLoading] = useState(false);

  const [onCampus, setOnCampus] = useState<Paged<OnCampusRow>>(() => emptyPage());
  const [onCampusLoading, setOnCampusLoading] = useState(false);

  const [month, setMonth] = useState(today.slice(0, 7));
  const [monthly, setMonthly] = useState<Paged<MonthlyRow>>(() => emptyPage());
  const [monthlyLoading, setMonthlyLoading] = useState(false);

  const [exFrom, setExFrom] = useState(shiftDateKey(today, -6));
  const [exTo, setExTo] = useState(today);
  const [exceptions, setExceptions] = useState<Paged<ExceptionRow>>(() => emptyPage());
  const [exceptionsLoading, setExceptionsLoading] = useState(false);

  const [dayTarget, setDayTarget] = useState<DayEventsTarget | null>(null);
  const [dayRefreshKey, setDayRefreshKey] = useState(0);
  const [timesheetTarget, setTimesheetTarget] = useState<TimesheetTarget | null>(null);
  const [correctionTarget, setCorrectionTarget] = useState<CorrectionTarget | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    Promise.all([
      academicService.getDepartments().catch(() => []),
      organizationService.getTree().catch(() => null),
    ]).then(([departments, tree]) => {
      const deptOptions = (departments as Array<{ id: string; name: string }>)
        .map((d) => ({ value: `dept:${d.id}`, label: `Department · ${d.name}` }))
        .sort((a, b) => a.label.localeCompare(b.label));
      const officeOptions = tree
        ? buildOfficeOptions(tree.units).map((o) => ({ value: `unit:${o.id}`, label: `Office · ${o.label}` }))
        : [];
      setWorksInOptions([...officeOptions, ...deptOptions]);
    });
  }, []);

  const scope = useMemo<ScopeFilter>(() => {
    const filter: ScopeFilter = {};
    if (worksIn.startsWith('dept:')) filter.departmentId = worksIn.slice(5);
    if (worksIn.startsWith('unit:')) filter.orgUnitId = worksIn.slice(5);
    if (debouncedSearch) filter.search = debouncedSearch;
    return filter;
  }, [worksIn, debouncedSearch]);

  const scopeKey = `${worksIn}|${debouncedSearch}`;
  const dailyPaging = usePaging(`${scopeKey}|${date}|${statusFilter}`);
  const onCampusPaging = usePaging(scopeKey);
  const monthlyPaging = usePaging(`${scopeKey}|${month}`);
  const exceptionsPaging = usePaging(`${scopeKey}|${exFrom}|${exTo}`);

  const loadDaily = useCallback(async () => {
    setDailyLoading(true);
    try {
      setDaily(
        await staffAttendanceService.getDaily(date, {
          ...scope,
          ...(statusFilter !== 'all' ? { status: statusFilter } : {}),
          page: dailyPaging.page,
          limit: dailyPaging.pageSize,
        })
      );
    } catch (error) {
      setDaily(null);
      toast.error(getApiErrorMessage(error, 'Could not load the daily register'));
    } finally {
      setDailyLoading(false);
    }
  }, [date, scope, statusFilter, dailyPaging.page, dailyPaging.pageSize]);

  const loadOnCampus = useCallback(async () => {
    setOnCampusLoading(true);
    try {
      setOnCampus(
        await staffAttendanceService.getOnCampus({
          ...scope,
          page: onCampusPaging.page,
          limit: onCampusPaging.pageSize,
        })
      );
    } catch (error) {
      setOnCampus(emptyPage());
      toast.error(getApiErrorMessage(error, 'Could not load who is on campus'));
    } finally {
      setOnCampusLoading(false);
    }
  }, [scope, onCampusPaging.page, onCampusPaging.pageSize]);

  const loadMonthly = useCallback(async () => {
    if (!/^\d{4}-\d{2}$/.test(month)) return;
    setMonthlyLoading(true);
    try {
      setMonthly(
        await staffAttendanceService.getMonthly(month, {
          ...scope,
          page: monthlyPaging.page,
          limit: monthlyPaging.pageSize,
        })
      );
    } catch (error) {
      setMonthly(emptyPage());
      toast.error(getApiErrorMessage(error, 'Could not load the monthly summary'));
    } finally {
      setMonthlyLoading(false);
    }
  }, [month, scope, monthlyPaging.page, monthlyPaging.pageSize]);

  const loadExceptions = useCallback(async () => {
    if (!exFrom || !exTo || exFrom > exTo) return;
    setExceptionsLoading(true);
    try {
      setExceptions(
        await staffAttendanceService.getExceptions(exFrom, exTo, {
          ...scope,
          page: exceptionsPaging.page,
          limit: exceptionsPaging.pageSize,
        })
      );
    } catch (error) {
      setExceptions(emptyPage());
      toast.error(getApiErrorMessage(error, 'Could not load exceptions'));
    } finally {
      setExceptionsLoading(false);
    }
  }, [exFrom, exTo, scope, exceptionsPaging.page, exceptionsPaging.pageSize]);

  useEffect(() => {
    if (tab === 'daily') void loadDaily();
  }, [tab, loadDaily]);
  useEffect(() => {
    if (tab === 'on-campus') void loadOnCampus();
  }, [tab, loadOnCampus]);
  useEffect(() => {
    if (tab === 'monthly') void loadMonthly();
  }, [tab, loadMonthly]);
  useEffect(() => {
    if (tab === 'exceptions') void loadExceptions();
  }, [tab, loadExceptions]);

  const reloadCurrent = useCallback(() => {
    if (tab === 'daily') void loadDaily();
    if (tab === 'on-campus') void loadOnCampus();
    if (tab === 'monthly') void loadMonthly();
    if (tab === 'exceptions') void loadExceptions();
  }, [tab, loadDaily, loadOnCampus, loadMonthly, loadExceptions]);

  const afterChange = useCallback(() => {
    setDayRefreshKey((k) => k + 1);
    reloadCurrent();
  }, [reloadCurrent]);

  const exportCurrent = async () => {
    setExporting(true);
    try {
      const result =
        tab === 'monthly'
          ? await hrReportsService.downloadExport({ type: 'attendance-monthly', month })
          : await hrReportsService.downloadExport({ type: 'attendance', date });
      toast.success(`Downloaded ${result.filename}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  return (
    <HrPageShell
      title="Staff Attendance"
      description="Check-ins and check-outs recorded by the timekeeper at the attendance desk"
      actions={
        <Button variant="outline" disabled={exporting || tab === 'on-campus' || tab === 'exceptions'} onClick={() => void exportCurrent()}>
          <Download className="mr-2 h-4 w-4" />
          {exporting ? 'Exporting…' : tab === 'monthly' ? 'Export month' : 'Export day'}
        </Button>
      }
    >
      <Card>
        <CardContent className="flex flex-col gap-3 pt-6 sm:flex-row">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name or staff number"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Combobox
            className="sm:w-80"
            options={[{ value: 'all', label: 'All offices and departments' }, ...worksInOptions]}
            value={worksIn}
            onValueChange={(v) => setWorksIn(v || 'all')}
            placeholder="Works in"
            searchPlaceholder="Search offices and departments..."
            emptyText="Nothing found."
            initialDisplayCount={50}
          />
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as TabKey)}>
        <TabsList className="flex-wrap">
          <TabsTrigger value="daily">Daily register</TabsTrigger>
          <TabsTrigger value="on-campus">On campus now</TabsTrigger>
          <TabsTrigger value="monthly">Monthly summary</TabsTrigger>
          <TabsTrigger value="exceptions">Exceptions</TabsTrigger>
        </TabsList>

        <TabsContent value="daily" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={date} max={today} onChange={(e) => e.target.value && setDate(e.target.value)} className="w-44" />
            <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as 'all' | StaffDayStatus)}>
              <SelectTrigger className="w-52">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All statuses</SelectItem>
                {STAFF_DAY_STATUS_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>
                    {o.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-500">{formatDateKey(date)}</span>
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-6">
            {SUMMARY_CARDS.map((c) => (
              <button
                key={c.key}
                type="button"
                onClick={() => setStatusFilter((current) => (current === c.status ? 'all' : c.status))}
                className={`rounded-lg border bg-white p-3 text-left transition hover:shadow-sm ${
                  statusFilter === c.status ? 'ring-2 ring-[#015F2B]' : ''
                }`}
              >
                <div className={`text-xs font-medium ${c.color}`}>{STATUS_LABEL[c.status]}</div>
                <div className="text-2xl font-bold">{daily && !dailyLoading ? daily.summary[c.key] : '—'}</div>
              </button>
            ))}
          </div>

          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Works in</TableHead>
                    <TableHead>First in</TableHead>
                    <TableHead>Last out</TableHead>
                    <TableHead>Time on campus</TableHead>
                    <TableHead>Entries</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {dailyLoading ? (
                    <EmptyRow colSpan={7} text="Loading attendance…" />
                  ) : !daily || daily.data.length === 0 ? (
                    <EmptyRow colSpan={7} text="No employees match these filters" />
                  ) : (
                    daily.data.map((r) => (
                      <TableRow
                        key={r.staffId}
                        className="cursor-pointer"
                        onClick={() => setDayTarget({ staffId: r.staffId, date: r.date })}
                      >
                        <TableCell>
                          <EmployeeCell name={r.employeeName} staffNumber={r.staffNumber} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{r.worksIn ?? '—'}</TableCell>
                        <TableCell>{formatClock(r.firstIn)}</TableCell>
                        <TableCell>{formatClock(r.lastOut)}</TableCell>
                        <TableCell>{r.minutes > 0 ? formatDuration(r.minutes) : '—'}</TableCell>
                        <TableCell>{r.entryCount || '—'}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap items-center gap-1">
                            <StaffDayStatusBadge status={r.status} />
                            {r.hasCorrections && <Badge variant="outline">Corrected</Badge>}
                            {r.hasOfflineEntries && <Badge variant="outline">Offline</Badge>}
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={dailyPaging.page}
                pageSize={dailyPaging.pageSize}
                total={daily?.total ?? 0}
                onPageChange={dailyPaging.setPage}
                onPageSizeChange={dailyPaging.setPageSize}
                disabled={dailyLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="on-campus" className="space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-gray-600">
              {onCampusLoading ? 'Loading…' : `${onCampus.total} ${onCampus.total === 1 ? 'person' : 'people'} checked in and not yet checked out`}
            </p>
            <Button variant="ghost" size="sm" onClick={() => void loadOnCampus()}>
              <RefreshCw className="mr-2 h-4 w-4" /> Refresh
            </Button>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Works in</TableHead>
                    <TableHead>Checked in at</TableHead>
                    <TableHead>On campus for</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {onCampusLoading ? (
                    <EmptyRow colSpan={5} text="Loading…" />
                  ) : onCampus.data.length === 0 ? (
                    <EmptyRow colSpan={5} text="Nobody is checked in right now" />
                  ) : (
                    onCampus.data.map((r) => (
                      <TableRow
                        key={r.staffId}
                        className="cursor-pointer"
                        onClick={() => setDayTarget({ staffId: r.staffId, date: localDateKey(new Date(r.since)) })}
                      >
                        <TableCell>
                          <EmployeeCell name={r.employeeName} staffNumber={r.staffNumber} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{r.jobTitle}</TableCell>
                        <TableCell className="text-sm text-gray-600">{r.worksIn ?? '—'}</TableCell>
                        <TableCell>{formatClock(r.since)}</TableCell>
                        <TableCell>{formatDuration(r.minutes)}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={onCampusPaging.page}
                pageSize={onCampusPaging.pageSize}
                total={onCampus.total}
                onPageChange={onCampusPaging.setPage}
                onPageSizeChange={onCampusPaging.setPageSize}
                disabled={onCampusLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="monthly" className="space-y-4">
          <div className="flex items-center gap-3">
            <Input type="month" value={month} max={today.slice(0, 7)} onChange={(e) => e.target.value && setMonth(e.target.value)} className="w-44" />
            <span className="text-sm text-gray-500">Select an employee to open their timesheet.</span>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Works in</TableHead>
                    <TableHead>Days on campus</TableHead>
                    <TableHead>Total time</TableHead>
                    <TableHead>Usual arrival</TableHead>
                    <TableHead>Usual departure</TableHead>
                    <TableHead>Missing check-outs</TableHead>
                    <TableHead>Missing check-ins</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {monthlyLoading ? (
                    <EmptyRow colSpan={8} text="Loading…" />
                  ) : monthly.data.length === 0 ? (
                    <EmptyRow colSpan={8} text="No employees match these filters" />
                  ) : (
                    monthly.data.map((r) => (
                      <TableRow
                        key={r.staffId}
                        className="cursor-pointer"
                        onClick={() => setTimesheetTarget({ staffId: r.staffId, month })}
                      >
                        <TableCell>
                          <EmployeeCell name={r.employeeName} staffNumber={r.staffNumber} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{r.worksIn ?? '—'}</TableCell>
                        <TableCell>{r.daysPresent}</TableCell>
                        <TableCell>{r.minutes > 0 ? formatDuration(r.minutes) : '—'}</TableCell>
                        <TableCell>{r.averageFirstIn ?? '—'}</TableCell>
                        <TableCell>{r.averageLastOut ?? '—'}</TableCell>
                        <TableCell className={r.missingCheckOuts > 0 ? 'font-semibold text-amber-700' : ''}>
                          {r.missingCheckOuts}
                        </TableCell>
                        <TableCell className={r.missingCheckIns > 0 ? 'font-semibold text-orange-700' : ''}>
                          {r.missingCheckIns}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={monthlyPaging.page}
                pageSize={monthlyPaging.pageSize}
                total={monthly.total}
                onPageChange={monthlyPaging.setPage}
                onPageSizeChange={monthlyPaging.setPageSize}
                disabled={monthlyLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="exceptions" className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <Input type="date" value={exFrom} max={exTo} onChange={(e) => e.target.value && setExFrom(e.target.value)} className="w-44" />
            <span className="text-sm text-gray-500">to</span>
            <Input type="date" value={exTo} min={exFrom} max={today} onChange={(e) => e.target.value && setExTo(e.target.value)} className="w-44" />
            <span className="text-sm text-gray-500">Check-ins without a check-out, and check-outs without a check-in.</span>
          </div>
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Date</TableHead>
                    <TableHead>Employee</TableHead>
                    <TableHead>Works in</TableHead>
                    <TableHead>Issue</TableHead>
                    <TableHead>Recorded</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {exceptionsLoading ? (
                    <EmptyRow colSpan={6} text="Loading…" />
                  ) : exceptions.data.length === 0 ? (
                    <EmptyRow colSpan={6} text="No exceptions in this period" />
                  ) : (
                    exceptions.data.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>{formatDateKey(r.date)}</TableCell>
                        <TableCell>
                          <EmployeeCell name={r.employeeName} staffNumber={r.staffNumber} />
                        </TableCell>
                        <TableCell className="text-sm text-gray-600">{r.worksIn ?? '—'}</TableCell>
                        <TableCell>
                          <StaffDayStatusBadge status={r.type} />
                        </TableCell>
                        <TableCell>
                          {r.type === 'MissingCheckOut' ? 'In' : 'Out'} at {formatClock(r.recordedAt)}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-1">
                            <Button size="sm" variant="ghost" onClick={() => setDayTarget({ staffId: r.staffId, date: r.date })}>
                              View day
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() =>
                                setCorrectionTarget({
                                  staffId: r.staffId,
                                  employeeName: r.employeeName,
                                  staffNumber: r.staffNumber,
                                  date: r.date,
                                  direction: r.type === 'MissingCheckOut' ? 'Out' : 'In',
                                })
                              }
                            >
                              <Wrench className="mr-1 h-4 w-4" /> Fix
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <TablePagination
                page={exceptionsPaging.page}
                pageSize={exceptionsPaging.pageSize}
                total={exceptions.total}
                onPageChange={exceptionsPaging.setPage}
                onPageSizeChange={exceptionsPaging.setPageSize}
                disabled={exceptionsLoading}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <StaffDayEventsSheet
        target={dayTarget}
        refreshKey={dayRefreshKey}
        onOpenChange={(open) => !open && setDayTarget(null)}
        onAddEntry={(input) => setCorrectionTarget(input)}
        onChanged={reloadCurrent}
      />
      <StaffTimesheetDialog
        target={timesheetTarget}
        onOpenChange={(open) => !open && setTimesheetTarget(null)}
        onOpenDay={(input) => setDayTarget(input)}
      />
      <AttendanceCorrectionDialog
        target={correctionTarget}
        onOpenChange={(open) => !open && setCorrectionTarget(null)}
        onSaved={afterChange}
      />
    </HrPageShell>
  );
}
