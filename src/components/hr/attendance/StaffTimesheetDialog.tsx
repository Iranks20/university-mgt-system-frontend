import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { getApiErrorMessage } from '@/lib/api';
import { formatClock, formatDateKey, formatDuration } from '@/lib/attendance-desk';
import { staffAttendanceService, type Timesheet } from '@/services/staff-attendance.service';
import { StaffDayStatusBadge } from './StaffDayStatusBadge';

export type TimesheetTarget = { staffId: string; month: string };

type Props = {
  target: TimesheetTarget | null;
  onOpenChange: (open: boolean) => void;
  onOpenDay: (input: { staffId: string; date: string }) => void;
};

export function StaffTimesheetDialog({ target, onOpenChange, onOpenDay }: Props) {
  const [data, setData] = useState<Timesheet | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!target) {
      setData(null);
      return;
    }
    let active = true;
    setLoading(true);
    staffAttendanceService
      .getTimesheet(target.staffId, target.month)
      .then((result) => active && setData(result))
      .catch((error) => {
        if (active) toast.error(getApiErrorMessage(error, 'Could not load the timesheet'));
      })
      .finally(() => active && setLoading(false));
    return () => {
      active = false;
    };
  }, [target]);

  return (
    <Dialog open={Boolean(target)} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle>{data ? `${data.employeeName} · timesheet` : 'Timesheet'}</DialogTitle>
          <DialogDescription>
            {data ? `${data.staffNumber} · ${data.jobTitle}${data.worksIn ? ` · ${data.worksIn}` : ''} · ${data.month}` : ''}
          </DialogDescription>
        </DialogHeader>
        {loading && <p className="text-sm text-gray-500">Loading…</p>}
        {data && (
          <>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              {[
                { label: 'Days on campus', value: String(data.totals.daysPresent) },
                { label: 'Time on campus', value: formatDuration(data.totals.minutes) },
                { label: 'Missing check-outs', value: String(data.totals.missingCheckOuts) },
                { label: 'Missing check-ins', value: String(data.totals.missingCheckIns) },
              ].map((s) => (
                <div key={s.label} className="rounded-md border p-3">
                  <div className="text-xs text-gray-500">{s.label}</div>
                  <div className="text-lg font-semibold">{s.value}</div>
                </div>
              ))}
            </div>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
                  <TableHead>First in</TableHead>
                  <TableHead>Last out</TableHead>
                  <TableHead>Time on campus</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {data.days.map((d) => (
                  <TableRow
                    key={d.date}
                    className="cursor-pointer"
                    onClick={() => onOpenDay({ staffId: data.staffId, date: d.date })}
                  >
                    <TableCell>{formatDateKey(d.date)}</TableCell>
                    <TableCell>{formatClock(d.firstIn)}</TableCell>
                    <TableCell>{formatClock(d.lastOut)}</TableCell>
                    <TableCell>{d.minutes > 0 ? formatDuration(d.minutes) : '—'}</TableCell>
                    <TableCell>
                      <StaffDayStatusBadge status={d.status} />
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
