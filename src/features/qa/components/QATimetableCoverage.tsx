import { useCallback, useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { toast } from 'sonner';
import { academicService } from '@/services/academic.service';
import { timetableService, type TimetableCoverageRow, type TimetableExpectationResponse } from '@/services/timetable.service';
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

export function QATimetableCoverage({ scopedDateRange, academicTermId }: Props) {
  const [schools, setSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; name: string }>>([]);
  const [schoolId, setSchoolId] = useState(ALL);
  const [departmentId, setDepartmentId] = useState(ALL);
  const [search, setSearch] = useState('');
  const debouncedSearch = useDebounced(search.trim());
  const [result, setResult] = useState<TimetableExpectationResponse<TimetableCoverageRow> | null>(null);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [selected, setSelected] = useState<TimetableCoverageRow | null>(null);

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
    }),
    [scopedDateRange, academicTermId, schoolId, departmentId, debouncedSearch]
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await timetableService.getTimetableCoverage({ ...baseParams, page, limit: PAGE_SIZE });
      setResult(res);
    } catch {
      toast.error('Failed to load timetable coverage');
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
  }, [schoolId, departmentId, debouncedSearch, scopedDateRange]);

  const rows = result?.data ?? [];
  const summary = result?.summary;
  const totalPages = Math.max(1, Math.ceil((result?.total ?? 0) / PAGE_SIZE));

  const handleExport = async () => {
    setExporting(true);
    try {
      const all: TimetableCoverageRow[] = [];
      let p = 1;
      let total = Infinity;
      while (all.length < total) {
        const res = await timetableService.getTimetableCoverage({ ...baseParams, page: p, limit: 200 });
        total = res.total ?? 0;
        all.push(...(res.data ?? []));
        if (!res.data?.length) break;
        p += 1;
      }
      downloadCsv(
        `timetable-coverage-${result?.scope?.dateFrom ?? ''}-${result?.scope?.dateTo ?? ''}.csv`,
        ['Class', 'Course Code', 'Course', 'School', 'Department', 'Lecturer', 'Day', 'Time', 'Weekly Hours', 'Timetable Sessions', 'Timetable Hours', 'Elapsed Hours', 'Taught Hours', 'No Record Sessions', 'No Record Hours', 'Lost Hours', 'Coverage %'],
        all.map((r) => [
          r.className,
          r.courseCode ?? '',
          r.courseName ?? '',
          r.schoolName ?? '',
          r.departmentName ?? '',
          r.lecturerName ?? 'Unassigned',
          r.dayName ?? '',
          r.startTime && r.endTime ? `${r.startTime}-${r.endTime}` : '',
          r.weeklyHours,
          r.timetableExpectedSessions ?? 0,
          fmtHours(r.timetableExpectedHours),
          fmtHours(r.elapsedExpectedHours),
          fmtHours(r.timetableTaughtHours),
          r.noRecordSessions ?? 0,
          fmtHours(r.noRecordHours),
          fmtHours(r.lostHours),
          r.coveragePercent ?? '',
        ])
      );
      toast.success('Coverage export downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Timetable Coverage</CardTitle>
        <CardDescription>
          Every class scheduled in the selected term, expanded from the timetable. Timetable expected is separate from the QA-record expected used in other summaries.
          {result?.scope ? ` · ${result.scope.academicTermName ?? 'Selected period'}: ${result.scope.dateFrom} to ${result.scope.dateTo}` : ''}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Classes</p><p className="text-xl font-semibold">{summary?.classCount ?? '—'}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Timetable sessions</p><p className="text-xl font-semibold">{summary?.timetableExpectedSessions ?? '—'}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">Timetable hours</p><p className="text-xl font-semibold">{fmtHours(summary?.timetableExpectedHours)}</p></div>
          <div className="rounded-md border p-3"><p className="text-xs text-muted-foreground">No record (elapsed)</p><p className="text-xl font-semibold text-red-600">{summary?.noRecordSessions ?? '—'} sess · {fmtHours(summary?.noRecordHours)}h</p></div>
        </div>

        <div className="flex flex-wrap gap-2 items-end">
          <Input className="w-[260px]" placeholder="Search class, course or lecturer…" value={search} onChange={(e) => setSearch(e.target.value)} />
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
          <Button variant="outline" onClick={handleExport} disabled={exporting || loading}>
            <Download className="mr-2 h-4 w-4" /> {exporting ? 'Exporting…' : 'Export CSV'}
          </Button>
          {summary && summary.unassignedClassCount ? (
            <span className="text-sm text-amber-700">{summary.unassignedClassCount} unassigned class(es)</span>
          ) : null}
        </div>

        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Pattern</TableHead>
                <TableHead className="text-right">Hrs/week</TableHead>
                <TableHead className="text-right">TT sess.</TableHead>
                <TableHead className="text-right">TT hours</TableHead>
                <TableHead className="text-right">Taught hrs</TableHead>
                <TableHead className="text-right">No record</TableHead>
                <TableHead className="text-right">Lost hrs</TableHead>
                <TableHead className="text-right">Coverage</TableHead>
                <TableHead className="text-right">Sessions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">Loading coverage…</TableCell></TableRow>
              ) : rows.length === 0 ? (
                <TableRow><TableCell colSpan={12} className="py-8 text-center text-muted-foreground">No scheduled classes for this scope.</TableCell></TableRow>
              ) : rows.map((r) => (
                <TableRow key={r.classId}>
                  <TableCell className="font-medium">{r.className}</TableCell>
                  <TableCell>{r.courseCode ? `${r.courseCode} · ` : ''}{r.courseName ?? '—'}</TableCell>
                  <TableCell>{r.lecturerName ?? <span className="text-amber-700">Unassigned</span>}</TableCell>
                  <TableCell className="whitespace-nowrap">{r.dayName ?? '—'} {r.startTime ?? ''}{r.endTime ? `–${r.endTime}` : ''}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.weeklyHours)}</TableCell>
                  <TableCell className="text-right">{r.timetableExpectedSessions ?? 0}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.timetableExpectedHours)}</TableCell>
                  <TableCell className="text-right">{fmtHours(r.timetableTaughtHours)}</TableCell>
                  <TableCell className="text-right">{r.noRecordSessions ?? 0} · {fmtHours(r.noRecordHours)}h</TableCell>
                  <TableCell className="text-right">{fmtHours(r.lostHours)}</TableCell>
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
          <span className="text-sm text-muted-foreground">{result?.total ?? 0} classes</span>
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
        title={selected ? `Sessions · ${selected.className}` : 'Sessions'}
        classId={selected?.classId}
        dateFrom={result?.scope?.dateFrom}
        dateTo={result?.scope?.dateTo}
      />
    </Card>
  );
}
