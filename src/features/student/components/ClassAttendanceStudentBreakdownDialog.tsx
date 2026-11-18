/**
 * Shows how one student's row in the Reports → Student Attendance summary was calculated:
 * the formula, per-course-unit subtotals (and which classes were used), and every expected
 * session including the ones the student was not marked for.
 */
import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { studentService } from '@/services/student.service';
import { formatWeightedAttendedCount } from '@/lib/attendance-metrics';
import type {
  ClassAttendanceSessionStatus,
  ClassAttendanceStudentBreakdown,
  ClassAttendanceSummaryRow,
} from '@/types/student';

const STATUS_LABEL: Record<ClassAttendanceSessionStatus, string> = {
  Present: 'Present',
  Late: 'Late (counts ½)',
  Absent: 'Absent (missed)',
  Excused: 'Excused (not counted)',
  NotMarked: 'Not marked (not counted)',
};

const STATUS_CLASS: Record<ClassAttendanceSessionStatus, string> = {
  Present: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  Late: 'bg-amber-100 text-amber-800 border-amber-200',
  Absent: 'bg-red-100 text-red-800 border-red-200',
  Excused: 'bg-slate-100 text-slate-700 border-slate-200',
  NotMarked: 'bg-orange-50 text-orange-700 border-orange-200',
};

type StatusFilter = 'all' | ClassAttendanceSessionStatus;

const FILTER_LABEL: Record<StatusFilter, string> = {
  all: 'All',
  Present: 'Present',
  Late: 'Late',
  Absent: 'Absent',
  Excused: 'Excused',
  NotMarked: 'Not marked',
};

const SESSIONS_PAGE_SIZE = 50;

function courseLabel(row: { courseCode: string | null; courseName: string | null }) {
  return [row.courseCode, row.courseName].filter(Boolean).join(' · ') || '—';
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** The row clicked in the report table. */
  row: ClassAttendanceSummaryRow | null;
  /** Exactly the query params the report was generated with. */
  reportParams: Record<string, string | number> | null;
}

export default function ClassAttendanceStudentBreakdownDialog({ open, onOpenChange, row, reportParams }: Props) {
  const [data, setData] = useState<ClassAttendanceStudentBreakdown | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [visibleCount, setVisibleCount] = useState(SESSIONS_PAGE_SIZE);

  useEffect(() => {
    if (!open || !row || !reportParams) return;
    let cancelled = false;
    setData(null);
    setError(null);
    setStatusFilter('all');
    setVisibleCount(SESSIONS_PAGE_SIZE);
    setLoading(true);
    studentService
      .getClassAttendanceStudentBreakdown(reportParams, row.studentId)
      .then((result) => {
        if (!cancelled) setData(result);
      })
      .catch((e: { message?: string }) => {
        if (!cancelled) setError(e?.message || 'Could not load attendance details for this student.');
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, row, reportParams]);

  const filteredSessions = useMemo(() => {
    const sessions = data?.sessions ?? [];
    return statusFilter === 'all' ? sessions : sessions.filter((s) => s.status === statusFilter);
  }, [data, statusFilter]);

  const summary = data?.summary;
  const rowChanged =
    !!summary &&
    !!row &&
    (summary.expectedAttendance !== row.expectedAttendance ||
      summary.totalAttendedClasses !== row.totalAttendedClasses ||
      summary.totalMissedClasses !== row.totalMissedClasses);

  const statusCounts: Record<ClassAttendanceSessionStatus, number> = {
    Present: summary?.presentSessions ?? 0,
    Late: summary?.totalLateClasses ?? 0,
    Absent: summary?.totalMissedClasses ?? 0,
    Excused: summary?.totalExcusedClasses ?? 0,
    NotMarked: summary?.totalNotMarkedClasses ?? 0,
  };
  const markedCount = summary ? summary.presentSessions + summary.totalLateClasses + summary.totalMissedClasses : 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-6xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
        <DialogHeader>
          <DialogTitle>Attendance calculation details</DialogTitle>
          <DialogDescription>
            {row ? `${row.studentName} · ${row.registrationNumber}` : ''}
            {data?.filters.startDate || data?.filters.endDate
              ? ` · ${data?.filters.startDate ?? '…'} to ${data?.filters.endDate ?? '…'}`
              : ' · all dates'}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
            <Loader2 className="h-5 w-5 animate-spin" />
            Loading attendance details…
          </div>
        ) : error ? (
          <p className="py-8 text-center text-sm text-red-600">{error}</p>
        ) : data && summary ? (
          <div className="min-w-0 space-y-6 py-2">
            {rowChanged ? (
              <p className="rounded-md border border-amber-200 bg-amber-50 p-2 text-xs text-amber-800">
                Attendance has changed since the report was generated. Click Generate report again to refresh the
                table.
              </p>
            ) : null}

            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-7">
              {[
                { label: 'Expected', value: String(summary.expectedAttendance) },
                { label: 'Attended', value: formatWeightedAttendedCount(summary.totalAttendedClasses) },
                { label: 'Late', value: String(summary.totalLateClasses) },
                { label: 'Missed', value: String(summary.totalMissedClasses) },
                { label: 'Excused', value: String(summary.totalExcusedClasses) },
                { label: 'Not marked', value: String(summary.totalNotMarkedClasses) },
                { label: 'Percentage', value: `${summary.percentage.toFixed(2)}%` },
              ].map((item) => (
                <div key={item.label} className="rounded-md border p-3">
                  <p className="text-xs font-medium text-muted-foreground">{item.label}</p>
                  <p className="text-lg font-semibold">{item.value}</p>
                </div>
              ))}
            </div>

            <div className="space-y-1 rounded-md border bg-muted/30 p-3 text-sm">
              <p className="font-medium">How these numbers were worked out</p>
              <ul className="list-disc space-y-0.5 pl-5">
                <li>
                  <strong>Expected</strong> = every session the student&apos;s class was marked for, per course unit they
                  take (a course unit on the same day counts once) = {summary.expectedAttendance}
                </li>
                <li>
                  Of these: Present {summary.presentSessions} · Late {summary.totalLateClasses} · Absent{' '}
                  {summary.totalMissedClasses} · Excused {summary.totalExcusedClasses} · Not marked{' '}
                  {summary.totalNotMarkedClasses}
                </li>
                <li>
                  <strong>Attended</strong> = Present ({summary.presentSessions}) + ½ × Late ({summary.totalLateClasses}) ={' '}
                  {formatWeightedAttendedCount(summary.totalAttendedClasses)}
                </li>
                <li>
                  <strong>Percentage</strong> = Attended ÷ (Present + Late + Absent) ={' '}
                  {formatWeightedAttendedCount(summary.totalAttendedClasses)} ÷ {markedCount} ={' '}
                  {summary.percentage.toFixed(2)}%
                </li>
              </ul>
              <p className="text-xs text-muted-foreground">
                Sessions where the student was not marked, and excused sessions, are shown but not counted against the
                student.
              </p>
              {summary.mergedSessions > 0 ? (
                <p className="text-xs text-amber-700">
                  {summary.mergedSessions} session(s) had marks in more than one class for the same course unit on the same
                  day (e.g. combined cohort classes). Each is counted once, using the best mark.
                </p>
              ) : null}
              {summary.marksWithoutActiveEnrollment > 0 ? (
                <p className="text-xs text-muted-foreground">
                  {summary.marksWithoutActiveEnrollment} mark(s) are in classes where the student&apos;s enrollment is
                  dropped or missing; they are still counted because the student was marked.
                </p>
              ) : null}
            </div>

            <div className="space-y-2">
              <h3 className="text-sm font-semibold">By course unit</h3>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Course unit</TableHead>
                      <TableHead>Class(es) used</TableHead>
                      <TableHead className="text-right">Expected</TableHead>
                      <TableHead className="text-right">Present</TableHead>
                      <TableHead className="text-right">Late</TableHead>
                      <TableHead className="text-right">Absent</TableHead>
                      <TableHead className="text-right">Excused</TableHead>
                      <TableHead className="text-right">Not marked</TableHead>
                      <TableHead className="text-right">%</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {data.byCourse.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={9} className="py-6 text-center text-muted-foreground">
                          This student has no marks or active enrollments in the classes covered by this report.
                        </TableCell>
                      </TableRow>
                    ) : (
                      data.byCourse.map((c) => (
                        <TableRow key={c.courseKey}>
                          <TableCell className="font-medium">{courseLabel(c)}</TableCell>
                          <TableCell className="text-xs">
                            {c.classNames.join(', ')}
                            <span className="ml-1 text-muted-foreground">
                              ({c.basis === 'marked' ? 'marked in' : 'enrolled, never marked'})
                            </span>
                          </TableCell>
                          <TableCell className="text-right">{c.expected}</TableCell>
                          <TableCell className="text-right">{c.present}</TableCell>
                          <TableCell className="text-right">{c.late}</TableCell>
                          <TableCell className="text-right">{c.absent}</TableCell>
                          <TableCell className="text-right">{c.excused}</TableCell>
                          <TableCell className="text-right">{c.notMarked}</TableCell>
                          <TableCell className="text-right">
                            {c.present + c.late + c.absent > 0 ? `${c.percentage.toFixed(2)}%` : '—'}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold">Sessions ({filteredSessions.length})</h3>
                <div className="flex flex-wrap gap-1">
                  {(['all', 'Present', 'Late', 'Absent', 'Excused', 'NotMarked'] as StatusFilter[]).map((key) => {
                    const count = key === 'all' ? summary.expectedAttendance : statusCounts[key];
                    if (key !== 'all' && count === 0) return null;
                    return (
                      <Button
                        key={key}
                        size="sm"
                        variant={statusFilter === key ? 'default' : 'outline'}
                        className={statusFilter === key ? 'bg-[#015F2B] hover:bg-[#014022]' : ''}
                        onClick={() => {
                          setStatusFilter(key);
                          setVisibleCount(SESSIONS_PAGE_SIZE);
                        }}
                      >
                        {FILTER_LABEL[key]} ({count})
                      </Button>
                    );
                  })}
                </div>
              </div>
              <div className="overflow-x-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Date</TableHead>
                      <TableHead>Course unit</TableHead>
                      <TableHead>Class</TableHead>
                      <TableHead>Counted as</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSessions.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={5} className="py-6 text-center text-muted-foreground">
                          No sessions.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredSessions.slice(0, visibleCount).map((s) => (
                        <TableRow key={s.sessionKey}>
                          <TableCell className="whitespace-nowrap">{s.date}</TableCell>
                          <TableCell>{courseLabel(s)}</TableCell>
                          <TableCell className="text-xs">
                            {s.marks.length > 0
                              ? s.marks.map((m, i) => (
                                  <div key={`${m.classId}-${i}`}>
                                    {m.className}
                                    {s.marks.length > 1 ? ` — ${m.status}` : ''}
                                    {!m.enrolled ? (
                                      <span className="ml-1 text-muted-foreground">(no active enrollment)</span>
                                    ) : null}
                                  </div>
                                ))
                              : s.classNames.join(', ')}
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className={STATUS_CLASS[s.status]}>
                              {STATUS_LABEL[s.status]}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{s.remarks || ''}</TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
              {filteredSessions.length > visibleCount ? (
                <div className="flex justify-center">
                  <Button variant="outline" size="sm" onClick={() => setVisibleCount((n) => n + SESSIONS_PAGE_SIZE)}>
                    Show more ({filteredSessions.length - visibleCount} remaining)
                  </Button>
                </div>
              ) : null}
            </div>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
