export type Time12hParts = {
  hour: string;
  minute: string;
  period: 'AM' | 'PM';
};

export function normalizeTime24(value: string | null | undefined): string {
  if (!value) return '';
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.includes('T')) {
    const d = new Date(trimmed);
    if (!Number.isNaN(d.getTime())) {
      return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
    }
  }
  const match = trimmed.match(/^(\d{1,2}):(\d{2})/);
  if (!match) return '';
  const hours = parseInt(match[1], 10);
  const minutes = parseInt(match[2], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) {
    return '';
  }
  return `${String(hours).padStart(2, '0')}:${String(minutes).padStart(2, '0')}`;
}

export function parseTime24To12(value: string | null | undefined): Time12hParts | null {
  const normalized = normalizeTime24(value);
  if (!normalized) return null;
  const [hourPart, minutePart] = normalized.split(':');
  let hour = parseInt(hourPart, 10);
  const period: 'AM' | 'PM' = hour >= 12 ? 'PM' : 'AM';
  if (hour === 0) hour = 12;
  else if (hour > 12) hour -= 12;
  return {
    hour: String(hour).padStart(2, '0'),
    minute: minutePart,
    period,
  };
}

export function formatTime12To24(hour: string, minute: string, period: 'AM' | 'PM'): string {
  let h = parseInt(hour, 10);
  const m = parseInt(minute, 10);
  if (Number.isNaN(h) || Number.isNaN(m) || h < 1 || h > 12 || m < 0 || m > 59) return '';
  if (period === 'AM') {
    if (h === 12) h = 0;
  } else if (h !== 12) {
    h += 12;
  }
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

export function formatTime24Display(value: string | null | undefined): string {
  const parts = parseTime24To12(value);
  if (!parts) return '';
  return `${parts.hour}:${parts.minute} ${parts.period}`;
}
