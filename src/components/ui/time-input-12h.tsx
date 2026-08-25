import { useEffect, useMemo, useState } from 'react';
import { formatTime12To24, parseTime24To12 } from '@/lib/time-format';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/lib/utils';

const HOURS = Array.from({ length: 12 }, (_, i) => String(i + 1).padStart(2, '0'));
const MINUTES = Array.from({ length: 60 }, (_, i) => String(i).padStart(2, '0'));

type TimeInput12hProps = {
  value: string;
  onChange: (value: string) => void;
  disabled?: boolean;
  className?: string;
};

export function TimeInput12h({ value, onChange, disabled, className }: TimeInput12hProps) {
  const parsed = useMemo(() => parseTime24To12(value), [value]);
  const [hour, setHour] = useState(parsed?.hour ?? '');
  const [minute, setMinute] = useState(parsed?.minute ?? '');
  const [period, setPeriod] = useState<'AM' | 'PM'>(parsed?.period ?? 'AM');

  useEffect(() => {
    const next = parseTime24To12(value);
    setHour(next?.hour ?? '');
    setMinute(next?.minute ?? '');
    setPeriod(next?.period ?? 'AM');
  }, [value]);

  const emitChange = (nextHour: string, nextMinute: string, nextPeriod: 'AM' | 'PM') => {
    if (!nextHour || !nextMinute) {
      onChange('');
      return;
    }
    onChange(formatTime12To24(nextHour, nextMinute, nextPeriod));
  };

  return (
    <div className={cn('flex items-center gap-0.5 min-w-[168px]', className)}>
      <Select
        value={hour || undefined}
        disabled={disabled}
        onValueChange={(v) => {
          setHour(v);
          emitChange(v, minute || '00', period);
        }}
      >
        <SelectTrigger className="h-8 w-[52px] px-1.5 text-xs" aria-label="Hour">
          <SelectValue placeholder="Hr" />
        </SelectTrigger>
        <SelectContent>
          {HOURS.map((h) => (
            <SelectItem key={h} value={h}>
              {h}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <span className="text-xs text-muted-foreground">:</span>
      <Select
        value={minute || undefined}
        disabled={disabled}
        onValueChange={(v) => {
          setMinute(v);
          emitChange(hour || '12', v, period);
        }}
      >
        <SelectTrigger className="h-8 w-[52px] px-1.5 text-xs" aria-label="Minute">
          <SelectValue placeholder="Min" />
        </SelectTrigger>
        <SelectContent className="max-h-48">
          {MINUTES.map((m) => (
            <SelectItem key={m} value={m}>
              {m}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Select
        value={period}
        disabled={disabled}
        onValueChange={(v) => {
          const nextPeriod = v as 'AM' | 'PM';
          setPeriod(nextPeriod);
          emitChange(hour || '12', minute || '00', nextPeriod);
        }}
      >
        <SelectTrigger className="h-8 w-[56px] px-1.5 text-xs" aria-label="AM or PM">
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="AM">AM</SelectItem>
          <SelectItem value="PM">PM</SelectItem>
        </SelectContent>
      </Select>
    </div>
  );
}
