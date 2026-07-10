import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import type { AttendanceStatus } from '@/lib/attendance-metrics';

const STATUS_OPTIONS: AttendanceStatus[] = ['Present', 'Absent', 'Late', 'Excused'];

const TRIGGER_STYLES: Record<AttendanceStatus, string> = {
  Present: 'border-[#015F2B]/40 bg-[#015F2B]/5 text-[#015F2B]',
  Absent: 'border-red-200 bg-red-50 text-red-800',
  Late: 'border-amber-300 bg-amber-50 text-amber-900',
  Excused: 'border-blue-200 bg-blue-50 text-blue-800',
};

export type AttendanceStatusOrUnset = AttendanceStatus | null;

export interface AttendanceStatusSelectProps {
  value: AttendanceStatusOrUnset;
  onValueChange: (value: AttendanceStatus) => void;
  includeExcused?: boolean;
  allowUnset?: boolean;
  disabled?: boolean;
  className?: string;
  triggerClassName?: string;
}

export function AttendanceStatusSelect({
  value,
  onValueChange,
  includeExcused = false,
  allowUnset = false,
  disabled = false,
  className,
  triggerClassName,
}: AttendanceStatusSelectProps) {
  const options = includeExcused
    ? STATUS_OPTIONS
    : STATUS_OPTIONS.filter((s) => s !== 'Excused');
  const hasValue = value != null && options.includes(value);

  return (
    <Select
      value={hasValue ? value : undefined}
      onValueChange={(v) => onValueChange(v as AttendanceStatus)}
      disabled={disabled}
    >
      <SelectTrigger
        className={cn(
          'h-8 w-[112px] text-xs font-medium',
          hasValue ? TRIGGER_STYLES[value] : 'border-dashed text-muted-foreground',
          triggerClassName,
          className
        )}
      >
        <SelectValue placeholder={allowUnset || !hasValue ? 'Not marked' : 'Select'} />
      </SelectTrigger>
      <SelectContent>
        {options.map((status) => (
          <SelectItem key={status} value={status}>
            {status}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function parseAttendanceStatus(
  raw: string | null | undefined,
  includeExcused = false
): AttendanceStatusOrUnset {
  if (raw === 'Present' || raw === 'Absent' || raw === 'Late') return raw;
  if (includeExcused && raw === 'Excused') return 'Excused';
  return null;
}
