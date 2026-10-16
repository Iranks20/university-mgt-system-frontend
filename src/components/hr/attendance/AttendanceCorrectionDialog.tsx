import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { getApiErrorMessage } from '@/lib/api';
import { staffAttendanceService, type AttendanceDirection } from '@/services/staff-attendance.service';

export type CorrectionTarget = {
  staffId: string;
  employeeName: string;
  staffNumber: string;
  date: string;
  direction?: AttendanceDirection;
};

type Props = {
  target: CorrectionTarget | null;
  onOpenChange: (open: boolean) => void;
  onSaved: () => void;
};

const DEFAULT_TIME: Record<AttendanceDirection, string> = { In: '08:00', Out: '17:00' };

export function AttendanceCorrectionDialog({ target, onOpenChange, onSaved }: Props) {
  const [direction, setDirection] = useState<AttendanceDirection>('In');
  const [date, setDate] = useState('');
  const [time, setTime] = useState(DEFAULT_TIME.In);
  const [reason, setReason] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!target) return;
    const initial = target.direction ?? 'In';
    setDirection(initial);
    setDate(target.date);
    setTime(DEFAULT_TIME[initial]);
    setReason('');
  }, [target]);

  const occurredAt = date && time ? new Date(`${date}T${time}`) : null;
  const inFuture = occurredAt ? occurredAt.getTime() > Date.now() : false;
  const valid = Boolean(occurredAt) && !Number.isNaN(occurredAt?.getTime()) && !inFuture && reason.trim().length >= 3;

  const save = async () => {
    if (!target || !occurredAt || !valid) return;
    setSaving(true);
    try {
      await staffAttendanceService.addCorrection({
        staffId: target.staffId,
        direction,
        occurredAt: occurredAt.toISOString(),
        reason: reason.trim(),
      });
      toast.success(`${direction === 'In' ? 'Check-in' : 'Check-out'} added for ${target.employeeName}`);
      onSaved();
      onOpenChange(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not add the entry'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Add attendance entry</DialogTitle>
          <DialogDescription>
            {target ? `${target.employeeName} · ${target.staffNumber}` : ''}
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <LabelWithInfo info="Whether the employee arrived (check in) or left (check out) at this time.">
              Entry type
            </LabelWithInfo>
            <Select
              value={direction}
              onValueChange={(v) => {
                const next = v as AttendanceDirection;
                setDirection(next);
                setTime(DEFAULT_TIME[next]);
              }}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="In">Check in</SelectItem>
                <SelectItem value="Out">Check out</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-2">
              <LabelWithInfo htmlFor="correction-date" info="The calendar day the employee actually arrived or left.">
                Date
              </LabelWithInfo>
              <Input id="correction-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div className="space-y-2">
              <LabelWithInfo htmlFor="correction-time" info="The real time of arrival or departure, not the time you are entering it. It cannot be in the future.">
                Time
              </LabelWithInfo>
              <Input id="correction-time" type="time" value={time} onChange={(e) => setTime(e.target.value)} />
            </div>
          </div>
          <div className="space-y-2">
            <LabelWithInfo
              htmlFor="correction-reason"
              info="Required. Kept on the record and in the audit log, for example: forgot to check out, confirmed by supervisor."
            >
              Reason
            </LabelWithInfo>
            <Textarea
              id="correction-reason"
              rows={3}
              maxLength={255}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          {inFuture && <p className="text-sm text-red-600">The date and time cannot be in the future.</p>}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => void save()} disabled={!valid || saving}>
            {saving ? 'Saving…' : 'Add entry'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
