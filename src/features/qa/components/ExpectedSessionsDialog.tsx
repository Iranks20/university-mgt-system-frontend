import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { timetableService, type ExpectedSessionRow } from '@/services/timetable.service';

const PAGE_SIZE = 50;

const OUTCOME_LABEL: Record<ExpectedSessionRow['outcome'], string> = {
  taught: 'Taught',
  untaught: 'Recorded untaught',
  pending: 'Pending action',
  no_record: 'No record',
  cancelled: 'Cancelled',
  scheduled: 'Scheduled (future)',
};

export function fmtHours(value: number | null | undefined): string {
  if (value == null || Number.isNaN(value)) return '—';
  return String(Math.round(value * 10) / 10);
}

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  classId?: string;
  lecturerId?: string;
  dateFrom?: string;
  dateTo?: string;
  academicTermId?: string;
  initialOutcome?: string;
};

export function ExpectedSessionsDialog({
  open,
  onOpenChange,
  title,
  classId,
  lecturerId,
  dateFrom,
  dateTo,
  academicTermId,
  initialOutcome = 'all',
}: Props) {
  const [rows, setRows] = useState<ExpectedSessionRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [outcome, setOutcome] = useState(initialOutcome);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open) {
      setOutcome(initialOutcome);
      setPage(1);
    }
  }, [open, initialOutcome, classId, lecturerId]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setLoading(true);
    timetableService
      .getExpectedSessions({
        ...(dateFrom ? { dateFrom } : {}),
        ...(dateTo ? { dateTo } : {}),
        ...(academicTermId ? { academicTermId } : {}),
        ...(classId ? { classId } : {}),
        ...(lecturerId ? { lecturerId } : {}),
        ...(outcome !== 'all' ? { outcome } : {}),
        page,
        limit: PAGE_SIZE,
      })
      .then((res) => {
        if (cancelled) return;
        setRows(res.data ?? []);
        setTotal(res.total ?? 0);
      })
      .catch(() => {
        if (!cancelled) {
          setRows([]);
          setTotal(0);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, classId, lecturerId, dateFrom, dateTo, academicTermId, outcome, page]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-4xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            Dated sessions from the timetable pattern for the selected term. No record and pending sessions are the investigation list.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center gap-2">
          <Select
            value={outcome}
            onValueChange={(v) => {
              setOutcome(v);
              setPage(1);
            }}
          >
            <SelectTrigger className="w-[220px]">
              <SelectValue placeholder="Outcome" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All outcomes</SelectItem>
              <SelectItem value="taught">Taught</SelectItem>
              <SelectItem value="untaught">Recorded untaught</SelectItem>
              <SelectItem value="no_record">No record</SelectItem>
              <SelectItem value="pending">Pending action</SelectItem>
              <SelectItem value="scheduled">Scheduled (future)</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
          <span className="text-sm text-muted-foreground">{total} sessions</span>
        </div>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Date</TableHead>
                <TableHead>Class</TableHead>
                <TableHead>Course</TableHead>
                <TableHead>Lecturer</TableHead>
                <TableHead>Time</TableHead>
                <TableHead className="text-right">Hours</TableHead>
                <TableHead>Outcome</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">Loading sessions…</TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">No sessions for this filter.</TableCell>
                </TableRow>
              ) : (
                rows.map((r, i) => (
                  <TableRow key={`${r.classId}-${r.date}-${r.startTime}-${i}`}>
                    <TableCell className="whitespace-nowrap">{r.date}</TableCell>
                    <TableCell>{r.className}</TableCell>
                    <TableCell>{r.courseCode ? `${r.courseCode} · ` : ''}{r.courseName ?? '—'}</TableCell>
                    <TableCell>{r.lecturerName ?? 'Unassigned'}</TableCell>
                    <TableCell className="whitespace-nowrap">{r.startTime}–{r.endTime}</TableCell>
                    <TableCell className="text-right">{fmtHours(r.durationHours)}</TableCell>
                    <TableCell>
                      <Badge variant={r.outcome === 'taught' ? 'default' : r.outcome === 'no_record' || r.outcome === 'pending' ? 'destructive' : 'secondary'}>
                        {OUTCOME_LABEL[r.outcome]}
                      </Badge>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-muted-foreground">Page {page} of {totalPages}</span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
              <ChevronLeft className="h-4 w-4" /> Previous
            </Button>
            <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
              Next <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
