import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { academicService } from '@/services/academic.service';
import { timetableService, type LecturerWorkloadRow, type TimetableExpectationResponse } from '@/services/timetable.service';
import { ExpectedSessionsDialog, fmtHours } from './ExpectedSessionsDialog';
import { useDebounced } from '@/hooks/useDebounced';

const PAGE_SIZE = 50;
const ALL = 'all';

type Props = {
  scopedDateRange?: { dateFrom: string; dateTo: string };
  academicTermId?: string;
};

function downloadCsv(filename: string, headers: string[], rows: Array<Array<string | number>>) {
  const csv = [headers.join(','), ...rows.map((r) => r.map((c) => `"${String(c ?? '').replace(/"/g, '""')}"`).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = filename;
  link.click();
  URL.revokeObjectURL(link.href);
}

export function QALecturerWorkload({ scopedDateRange, academicTermId }: Props) {
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [schoolId, setSchoolId] = useState(ALL);
  const [departmentId, setDepartmentId] = useState(ALL);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [minWeeklyHours, setMinWeeklyHours] = useState('');
  const debouncedMin = useDebounced(minWeeklyHours.trim());
  const [result, setResult] = useState<TimetableExpectationResponse<LecturerWorkloadRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<LecturerWorkloadRow | null>(null);

  useEffect(() => {
    academicService.getSchools().then((s) => setSchools(s.map((x) => ({ id: x.id, name: x.name })))).catch(() => setSchools([]));
  }, []);

  useEffect(() => {
    academicService
      .getDepartments(schoolId === ALL ? undefined : schoolId)
      .then((d) => setDepartments(d.map((x) => ({ id: x.id, name: x.name }))))
      .catch(() => setDepartments([]));
  }, [schoolId]);

  const baseParams = useMemo(
    () => ({
      ...(scopedDateRange ? { dateFrom: scopedDateRange.dateFrom, dateTo: scopedDateRange.dateTo } : {}),
      ...(academicTermId ? { academicTermId } : {}),
      ...(schoolId !== ALL ? { schoolId } : {}),
      ...(departmentId !== ALL ? { departmentId } : {}),
      ...(debouncedSearch ? { search: debouncedSearch } : {}),
      ...(debouncedMin && !Number.isNaN(Number(debouncedMin)) ? { minWeeklyHours: Number(debouncedMin) } : {}),
    }),
    [scopedDateRange, academicTermId, schoolId, departmentId, debouncedSearch, debouncedMin]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableService.getLecturerWorkload({ ...baseParams, page, limit: PAGE_SIZE });
      setResult(res);
    } catch {
      toast.error('Failed to load lecturer workload');
      setResult(null);
    } finally {
      setLoading(false);
    }
  }, [baseParams, page]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    setPage(1);
  }, [schoolId, departmentId, debouncedSearch, debouncedMin, scopedDateRange]);

  const rows = result?.data ?? [];
  const summary = result?.summary;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    try {
      const all: LecturerWorkloadRow[] = [];
      let p = 1;
      let total = Infinity;
      while (all.length < total) {
        const res = await timetableService.getLecturerWorkload({ ...baseParams, page: p, limit: 200 });
        total = res.total ?? 0;
        all.push(...(res.data ?? []));
        if (!res.data?.length) break;
        p += 1;
      }
      downloadCsv(
        `lecturer-workload-${result?.scope?.dateFrom ?? ''}-${result?.scope?.dateTo ?? ''}.csv`,
        ['Lecturer', 'Staff No.', 'Classes', 'Courses', 'Hours per Week', 'Term Expected Hours', 'Elapsed Expected Hours', 'Taught Hours', 'No Record Hours', 'Lost Hours', 'Remaining Hours', 'Coverage %'],
        all.map((r) => [
          r.lecturerName,
          r.staffNumber ?? '',
          r.assignedClassCount,
          r.courseCount,
          fmtHours(r.weeklyHours),
          fmtHours(r.timetableExpectedHours),
          fmtHours(r.elapsedExpectedHours),
          fmtHours(r.actualTaughtHours),
          fmtHours(r.noRecordHours),
          fmtHours(r.lostHours),
          fmtHours(r.remainingHours),
          r.coveragePercent ?? '',
        ])
      );
      toast.success('Workload export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Lecturer Workload</CardTitle>
        <CardDescription>
          Planned teaching load from assigned timetable classes: hours per week and for the whole term, compared with hours taught so far. Set a minimum weekly-hours filter to surface overload.
          {result?.scope ? ` · ${result.scope.dateFrom} to ${result.scope.dateTo}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Lecturers assigned</p><p className="text-xl font-semibold">{summary?.lecturerCount ?? '—'}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Term expected hours</p><p className="text-xl font-semibold">{fmtHours(summary?.timetableExpectedHours)}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Taught hours (elapsed)</p><p className="text-xl font-semibold">{fmtHours(summary?.timetableTaughtHours)}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Lost hours (elapsed)</p><p className="text-xl font-semibold text-red-600">{fmtHours(summary?.lostHours)}</p></div>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-[240px]" placeholder="Search lecturer or staff no…" value={search} onChange={(e) => setSearch(e.target.value)} />
          <Combobox
            className="w-[220px]"
            options={[{ value: ALL, label: 'All schools' }, ...schools.map((s) => ({ value: s.id, label: s.name }))]}
            value={schoolId}
            onValueChange={(v) => { setSchoolId(v || ALL); setDepartmentId(ALL); }}
            placeholder="School"
            searchPlaceholder="Search schools..."
            emptyText="No school found."
            initialDisplayCount={50}
          />
          <Combobox
            className="w-[220px]"
            options={[{ value: ALL, label: 'All departments' }, ...departments.map((d) => ({ value: d.id, label: d.name }))]}
            value={departmentId}
            onValueChange={(v) => setDepartmentId(v || ALL)}
            placeholder="Department"
            searchPlaceholder="Search departments..."
            emptyText="No department found."
            initialDisplayCount={50}
          />
          <Input className="w-[170px]" type="number" min="0" step="0.5" placeholder="Min hrs/week" value={minWeeklyHours} onChange={(e) => setMinWeeklyHours(e.target.value)} />
          <Button variant="outline" onClick={handleExport} disabled={exporting || loading}>
            <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          {summary && summary.unassignedClassCount ? (
            <span className="text-sm text-amber-700">{summary.unassignedClassCount} class(es) have no lecturer</span>
          ) : null}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Lecturer</TableHead>
                <TableHead className="text-right">Classes</TableHead>
                <TableHead className="text-right">Hrs/week</TableHead>
                <TableHead className="text-right">Term hrs</TableHead>
                <TableHead className="text-right">Elapsed hrs</TableHead>
                <TableHead className="text-right">Taught hrs</TableHead>
                <TableHead className="text-right">No record</TableHead>
                <TableHead className="text-right">Lost hrs</TableHead>
                <TableHead className="text-right">Remaining hrs</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">Loading workload…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={11} className="py-8 text-center text-muted-foreground">No lecturer workload for this scope.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.lecturerId}>
                  <TableCell className="font-medium">{r.lecturerName}{r.staffNumber ? <span className="block text-xs text-muted-foreground">{r.staffNumber}</span> : null}</TableCell>
                  <TableCell className="text-right">{r.assignedClassCount}</TableCell>
                  <TableCell className="text-right font-medium">{fmtHours(r.weeklyHours)}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.timetableExpectedHours)}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.elapsedExpectedHours)}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.actualTaughtHours)}</TableCell>
                  <TableCell className="text-right">{r.noRecordSessions ?? 0} · {fmtHours(r.noRecordHours)}h</TableCell>
                  <TableCell className="text-right">{fmtHours(r.lostHours)}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.remainingHours)}</TableCell>
                  <TableCell className="text-right">{r.coveragePercent != null ? `${r.coveragePercent}%` : '—'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" className="text-[#015F2B]" onClick={() => setSelected(r)}>View</Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">{result?.total ?? 0} lecturers</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}><ChevronLeft className="h-4 w-4" /> Previous</Button>
            <span className="text-sm">Page {page} of {totalPages}</span>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>Next <ChevronRight className="h-4 w-4" /></Button>
          </div>
        </div>
      </CardContent>

      <ExpectedSessionsDialog
        open={Boolean(selected)}
        onOpenChange={(open) => !open && setSelected(null)}
        title={selected ? `Sessions · ${selected.lecturerName}` : 'Sessions'}
        lecturerId={selected?.lecturerId}
        dateFrom={result?.scope?.dateFrom}
        dateTo={result?.scope?.dateTo}
      />
    </Card>
  );
}
