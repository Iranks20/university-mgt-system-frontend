import React, { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import { Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { studentService, type ChangeStudentStatusPayload, type StudentStatusLogEntry } from '@/services/student.service';
import {
  isReturningToActive,
  isLeavingActive,
  STUDENT_LIFECYCLE_STATUSES,
  STUDENT_STATUS_CHANGE_REASONS,
  studentStatusLabel,
  type StudentLifecycleStatus,
} from '@/lib/student-lifecycle';
import { getApiErrorMessage } from '@/lib/api';

type StudentStatusTarget = {
  id: string;
  name: string;
  status: string;
  year?: number;
  semester?: number;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targets: StudentStatusTarget[];
  onCompleted?: () => void;
};

function todayIsoDate(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function StudentStatusDialog({ open, onOpenChange, targets, onCompleted }: Props) {
  const single = targets.length === 1 ? targets[0] : null;
  const [status, setStatus] = useState<StudentLifecycleStatus>('OnLeave');
  const [reason, setReason] = useState<string>(STUDENT_STATUS_CHANGE_REASONS[0]);
  const [notes, setNotes] = useState('');
  const [effectiveDate, setEffectiveDate] = useState(todayIsoDate());
  const [disablePortalAccess, setDisablePortalAccess] = useState(true);
  const [reEnrollOnActivate, setReEnrollOnActivate] = useState(true);
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [busy, setBusy] = useState(false);
  const [history, setHistory] = useState<StudentStatusLogEntry[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setEffectiveDate(todayIsoDate());
    setNotes('');
    setReason(STUDENT_STATUS_CHANGE_REASONS[0]);
    if (single) {
      setYear(String(single.year ?? 1));
      setSemester(String(single.semester ?? 1));
      if (single.status === 'Active') {
        setStatus('OnLeave');
      } else {
        setStatus('Active');
      }
    } else {
      setStatus('OnLeave');
      setYear('1');
      setSemester('1');
    }
  }, [open, single?.id, single?.status, single?.year, single?.semester]);

  useEffect(() => {
    if (!open || !single?.id) {
      setHistory([]);
      return;
    }
    setHistoryLoading(true);
    studentService
      .getStudentStatusHistory(single.id, { limit: 8 })
      .then((res) => setHistory(res.data ?? []))
      .catch(() => setHistory([]))
      .finally(() => setHistoryLoading(false));
  }, [open, single?.id]);

  const returningActive = isReturningToActive(status);
  const leavingActive = single ? isLeavingActive(single.status, status) : status !== 'Active';

  const payloadBase = useMemo(
    (): ChangeStudentStatusPayload => ({
      status,
      reason,
      notes: notes.trim() || null,
      effectiveDate,
      disablePortalAccess,
      reEnrollOnActivate,
      ...(returningActive ? { year: parseInt(year, 10), semester: parseInt(semester, 10) } : {}),
    }),
    [status, reason, notes, effectiveDate, disablePortalAccess, reEnrollOnActivate, returningActive, year, semester]
  );

  const handleSubmit = async () => {
    if (!reason.trim()) {
      toast.error('Reason is required');
      return;
    }
    if (returningActive && (!year || !semester)) {
      toast.error('Year and semester are required when returning to Active');
      return;
    }
    setBusy(true);
    try {
      if (targets.length === 1) {
        await studentService.changeStudentStatus(targets[0].id, payloadBase);
        toast.success(`Status updated to ${studentStatusLabel(status)}`);
      } else {
        const result = await studentService.bulkChangeStudentStatus({
          ...payloadBase,
          studentIds: targets.map((t) => t.id),
        });
        toast.success(`Updated ${result.succeeded} student(s)${result.failed ? `, ${result.failed} failed` : ''}`);
        if (result.failed > 0) {
          const firstError = result.results.find((row) => !row.success)?.message;
          if (firstError) toast.warning(firstError);
        }
      }
      onOpenChange(false);
      onCompleted?.();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to change student status'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {targets.length === 1 ? 'Change student status' : `Change status (${targets.length} students)`}
          </DialogTitle>
          <DialogDescription>
            {leavingActive
              ? 'The student will be removed from attendance rosters and class lists. Historical attendance is kept.'
              : returningActive
                ? 'The student will return to Active standing and can be re-enrolled on current classes.'
                : 'Update student lifecycle status with audit history.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {targets.length === 1 ? (
            <div className="rounded-md border bg-muted/30 p-3 text-sm">
              <div className="font-medium">{targets[0].name}</div>
              <div className="text-muted-foreground mt-1">
                Current: {studentStatusLabel(targets[0].status)}
                {targets[0].year != null ? ` · Y${targets[0].year} S${targets[0].semester ?? '—'}` : ''}
              </div>
            </div>
          ) : (
            <div className="rounded-md border bg-muted/30 p-3 text-sm text-muted-foreground">
              Bulk update applies the same status, reason, and effective date to all selected students.
              Returning to Active requires the same year/semester for every selected student.
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label>New status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as StudentLifecycleStatus)}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STUDENT_LIFECYCLE_STATUSES.map((value) => (
                    <SelectItem key={value} value={value}>
                      {studentStatusLabel(value)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Effective date</Label>
              <Input type="date" className="mt-1" value={effectiveDate} onChange={(e) => setEffectiveDate(e.target.value)} />
            </div>
          </div>

          <div>
            <Label>Reason</Label>
            <Select value={reason} onValueChange={setReason}>
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STUDENT_STATUS_CHANGE_REASONS.map((item) => (
                  <SelectItem key={item} value={item}>
                    {item}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Notes (optional)</Label>
            <Textarea
              className="mt-1"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Additional context for registry records"
              rows={3}
            />
          </div>

          {returningActive ? (
            <div className="grid grid-cols-2 gap-4 rounded-md border border-[#015F2B]/30 bg-[#015F2B]/5 p-4">
              <div>
                <Label>Year on return</Label>
                <Select value={year} onValueChange={setYear}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[1, 2, 3, 4, 5, 6].map((y) => (
                      <SelectItem key={y} value={String(y)}>
                        Year {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Semester on return</Label>
                <Select value={semester} onValueChange={setSemester}>
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ) : null}

          <div className="space-y-3 rounded-md border p-3">
            {leavingActive || status !== 'Active' ? (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="disable-portal"
                  checked={disablePortalAccess}
                  onCheckedChange={(checked) => setDisablePortalAccess(checked === true)}
                />
                <LabelWithInfo
                  htmlFor="disable-portal"
                  info="Prevents the student from signing in to the portal while not Active."
                >
                  Disable portal login
                </LabelWithInfo>
              </div>
            ) : null}
            {returningActive ? (
              <div className="flex items-start gap-2">
                <Checkbox
                  id="re-enroll"
                  checked={reEnrollOnActivate}
                  onCheckedChange={(checked) => setReEnrollOnActivate(checked === true)}
                />
                <LabelWithInfo
                  htmlFor="re-enroll"
                  info="Auto-enrolls the student on Active-term classes for their program cohort."
                >
                  Re-enroll on Active-term classes
                </LabelWithInfo>
              </div>
            ) : null}
          </div>

          {single && (
            <div className="rounded-md border p-3 space-y-2">
              <p className="text-sm font-medium">Status history</p>
              {historyLoading ? (
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </p>
              ) : history.length === 0 ? (
                <p className="text-sm text-muted-foreground">No status changes recorded yet.</p>
              ) : (
                <ul className="space-y-2 text-sm">
                  {history.map((entry) => (
                    <li key={entry.id} className="border-b pb-2 last:border-0 last:pb-0">
                      <div className="font-medium">
                        {entry.fromStatus ? studentStatusLabel(entry.fromStatus) : '—'} → {studentStatusLabel(entry.toStatus)}
                      </div>
                      <div className="text-muted-foreground text-xs mt-0.5">
                        {entry.reason || 'No reason'}
                        {entry.effectiveDate ? ` · effective ${String(entry.effectiveDate).slice(0, 10)}` : ''}
                        {entry.enrollmentsDropped > 0 ? ` · dropped ${entry.enrollmentsDropped} enrollment(s)` : ''}
                        {entry.reEnrolled ? ' · re-enrolled' : ''}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={busy}>
            Cancel
          </Button>
          <Button type="button" className="bg-[#015F2B] hover:bg-[#014a22]" disabled={busy} onClick={handleSubmit}>
            {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {returningActive ? 'Return to Active' : `Set ${studentStatusLabel(status)}`}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
