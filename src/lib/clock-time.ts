const TWELVE_HOUR_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?\s*([AaPp][Mm])$/;
const TWENTY_FOUR_HOUR_RE = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/;

export type ParsedClockTime = { hours: number; minutes: number; seconds: number };

export function parseClockTime(raw: string | null | undefined): ParsedClockTime | null {
  if (!raw) return null;
  const value = String(raw).trim();
  if (!value) return null;

  const twelveHour = value.match(TWELVE_HOUR_RE);
  if (twelveHour) {
    let hours = parseInt(twelveHour[1], 10);
    const minutes = parseInt(twelveHour[2], 10);
    const seconds = twelveHour[3] ? parseInt(twelveHour[3], 10) : 0;
    const meridiem = twelveHour[4].toUpperCase();
    if (hours < 1 || hours > 12 || minutes > 59 || seconds > 59) return null;
    if (hours === 12) hours = 0;
    if (meridiem === 'PM') hours += 12;
    return { hours, minutes, seconds };
  }

  const twentyFourHour = value.match(TWENTY_FOUR_HOUR_RE);
  if (twentyFourHour) {
    const hours = parseInt(twentyFourHour[1], 10);
    const minutes = parseInt(twentyFourHour[2], 10);
    const seconds = twentyFourHour[3] ? parseInt(twentyFourHour[3], 10) : 0;
    if (hours > 23 || minutes > 59 || seconds > 59) return null;
    return { hours, minutes, seconds };
  }

  return null;
}

export function normalizeClockTime(
  raw: string | null | undefined,
  opts?: { withSeconds?: boolean }
): string | null {
  const parsed = parseClockTime(raw);
  if (!parsed) return null;
  const hh = parsed.hours.toString().padStart(2, '0');
  const mm = parsed.minutes.toString().padStart(2, '0');
  if (opts?.withSeconds) {
    const ss = parsed.seconds.toString().padStart(2, '0');
    return `${hh}:${mm}:${ss}`;
  }
  return `${hh}:${mm}`;
}

export function clockTimeToMinutes(raw: string | null | undefined): number | null {
  const parsed = parseClockTime(raw);
  if (!parsed) return null;
  return parsed.hours * 60 + parsed.minutes + parsed.seconds / 60;
}

export function isValidClockTime(raw: string | null | undefined): boolean {
  return parseClockTime(raw) !== null;
}

export function formatClockTimeForDisplay(raw: string | null | undefined): string {
  const normalized = normalizeClockTime(raw);
  if (normalized) return normalized;
  return raw ? String(raw) : '';
}
