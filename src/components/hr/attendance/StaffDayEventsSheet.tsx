import { useCallback, useEffect, useState } from 'react';
import { Plus, QrCode } from 'lucide-react';
import { toast } from 'sonner';
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { getApiErrorMessage } from '@/lib/api';
import { formatClock, formatDateKey } from '@/lib/attendance-desk';
import { printStaffBadge } from '@/lib/staff-badge-print';
import { staffAttendanceService, type DayEvent, type DayEvents } from '@/services/staff-attendance.service';
import { ATTENDANCE_SOURCE_LABEL } from './StaffDayStatusBadge';

export type DayEventsTarget = { staffId: string; date: string };

type Props = {
  target: DayEventsTarget | null;
  refreshKey: number;
  onOpenChange: (open: boolean) => void;
  onAddEntry: (input: { staffId: string; employeeName: string; staffNumber: string; date: string }) => void;
  onChanged: () => void;
};

export function StaffDayEventsSheet({ target, refreshKey, onOpenChange, onAddEntry, onChanged }: Props) {
  const [data, setData] = useState<DayEvents | null>(null);
  const [loading, setLoading] = useState(false);
  const [voidTarget, setVoidTarget] = useState<DayEvent | null>(null);
  const [voidReason, setVoidReason] = useState('');
  const [voiding, setVoiding] = useState(false);

  const load = useCallback(async () => {
    if (!target) return;
    setLoading(true);
    try {
      setData(await staffAttendanceService.getDayEvents(target.staffId, target.date));
    } catch (error) {
      setData(null);
      toast.error(getApiErrorMessage(error, 'Could not load entries for this day'));
    } finally {
      setLoading(false);
    }
  }, [target]);

  useEffect(() => {
    if (target) void load();
    else setData(null);
  }, [target, load, refreshKey]);

  const printBadge = async (staffId: string) => {
    try {
      printStaffBadge(await staffAttendanceService.getBadge(staffId));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not print the badge'));
    }
  };

  const confirmVoid = async () => {
    if (!voidTarget || voidReason.trim().length < 3) return;
    setVoiding(true);
    try {
      await staffAttendanceService.voidEvent(voidTarget.id, voidReason.trim());
      toast.success('Entry voided');
      setVoidTarget(null);
      setVoidReason('');
      await load();
      onChanged();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not void this entry'));
    } finally {
      setVoiding(false);
    }
  };

  return (
    <>
      <Sheet open={Boolean(target)} onOpenChange={onOpenChange}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          <SheetHeader>
            <SheetTitle>{data?.employeeName ?? 'Attendance entries'}</SheetTitle>
            <SheetDescription>
              {data ? `${data.staffNumber} · ` : ''}
              {target ? formatDateKey(target.date) : ''}
            </SheetDescription>
          </SheetHeader>
          <div className="space-y-3 px-4 pb-6">
            <div className="flex justify-end gap-2">
              <Button size="sm" variant="outline" disabled={!data} onClick={() => data && void printBadge(data.staffId)}>
                <QrCode className="mr-2 h-4 w-4" /> Print badge
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!data}
                onClick={() =>
                  data &&
                  onAddEntry({
                    staffId: data.staffId,
                    employeeName: data.employeeName,
                    staffNumber: data.staffNumber,
                    date: data.date,
                  })
                }
              >
                <Plus className="mr-2 h-4 w-4" /> Add entry
              </Button>
            </div>
            {loading && <p className="text-sm text-gray-500">Loading…</p>}
            {!loading && data && data.events.length === 0 && (
              <p className="text-sm text-gray-500">No check-ins or check-outs on this day.</p>
            )}
            {data?.events.map((e) => (
              <div key={e.id} className={`rounded-md border p-3 ${e.voided ? 'bg-gray-50 opacity-70' : ''}`}>
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    {e.direction === 'In' ? (
                      <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In</Badge>
                    ) : (
                      <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200">Out</Badge>
                    )}
                    <span className={`text-lg font-semibold ${e.voided ? 'line-through' : ''}`}>
                      {formatClock(e.occurredAt)}
                    </span>
                  </div>
                  {!e.voided && (
                    <Button size="sm" variant="ghost" className="text-red-600" onClick={() => setVoidTarget(e)}>
                      Void
                    </Button>
                  )}
                </div>
                <div className="mt-1 space-y-0.5 text-xs text-gray-600">
                  <div>
                    {ATTENDANCE_SOURCE_LABEL[e.source] ?? e.source}
                    {e.recordedBy ? ` by ${e.recordedBy}` : ''}
                    {e.capturedOffline ? ' · captured offline' : ''}
                  </div>
                  {e.note && <div>Reason: {e.note}</div>}
                  {e.voided && (
                    <div className="text-red-700">
                      Voided{e.voidedBy ? ` by ${e.voidedBy}` : ''}
                      {e.voidReason ? `: ${e.voidReason}` : ''}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </SheetContent>
      </Sheet>

      <Dialog
        open={Boolean(voidTarget)}
        onOpenChange={(open) => {
          if (!open) {
            setVoidTarget(null);
            setVoidReason('');
          }
        }}
      >
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Void this entry?</DialogTitle>
            <DialogDescription>
              {voidTarget
                ? `${voidTarget.direction === 'In' ? 'Check-in' : 'Check-out'} at ${formatClock(voidTarget.occurredAt)}. It stays on record but no longer counts.`
                : ''}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <LabelWithInfo htmlFor="void-reason" info="Required. Saved with the entry and in the audit log.">
              Reason
            </LabelWithInfo>
            <Textarea
              id="void-reason"
              rows={3}
              maxLength={255}
              value={voidReason}
              onChange={(e) => setVoidReason(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setVoidTarget(null)} disabled={voiding}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={() => void confirmVoid()}
              disabled={voiding || voidReason.trim().length < 3}
            >
              {voiding ? 'Voiding…' : 'Void entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
