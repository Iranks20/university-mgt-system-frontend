import { Badge } from '@/components/ui/badge';
import { STAFF_DAY_STATUS_OPTIONS, type StaffDayStatus } from '@/services/staff-attendance.service';

const STATUS_CLASS: Record<StaffDayStatus, string> = {
  Present: 'bg-green-100 text-green-800 hover:bg-green-100',
  OnCampus: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
  MissingCheckOut: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
  MissingCheckIn: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
  Absent: 'bg-red-100 text-red-800 hover:bg-red-100',
  OnLeave: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
};

const STATUS_LABEL = Object.fromEntries(STAFF_DAY_STATUS_OPTIONS.map((o) => [o.value, o.label])) as Record<
  StaffDayStatus,
  string
>;

export const ATTENDANCE_SOURCE_LABEL: Record<string, string> = {
  QrScan: 'Badge scan',
  Search: 'Name search',
  Correction: 'HR correction',
  Migrated: 'Old check-in record',
};

export function StaffDayStatusBadge({ status }: { status: StaffDayStatus }) {
  return <Badge className={STATUS_CLASS[status]}>{STATUS_LABEL[status]}</Badge>;
}
