export function parseClockTimeToMinutes(value: string | null | undefined): number | null {
  if (!value || !value.includes(':')) return null;
  const parts = value.trim().split(':');
  if (parts.length < 2) return null;
  const hour = parseInt(parts[0] || '0', 10);
  const minute = parseInt(parts[1] || '0', 10);
  if (Number.isNaN(hour) || Number.isNaN(minute)) return null;
  return hour * 60 + minute;
}

export function formatMinutesAsHhMm(totalMinutes: number): string {
  const safeMinutes = Math.max(0, Math.floor(totalMinutes));
  const hours = Math.floor(safeMinutes / 60);
  const minutes = safeMinutes % 60;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`;
}

export function calculateLectureTimeLost(params: {
  timeForStarting?: string | null;
  timeOutForEnding?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
}): string | null {
  const scheduledStart = parseClockTimeToMinutes(params.timeForStarting);
  const scheduledEnd = parseClockTimeToMinutes(params.timeOutForEnding);
  const checkIn = parseClockTimeToMinutes(params.checkInTime);
  const checkOut = parseClockTimeToMinutes(params.checkOutTime);
  if (
    scheduledStart == null ||
    scheduledEnd == null ||
    checkIn == null ||
    checkOut == null
  ) {
    return null;
  }
  const scheduledDurationMinutes = scheduledEnd - scheduledStart;
  const actualDurationMinutes = Math.max(0, checkOut - checkIn);
  return formatMinutesAsHhMm(Math.max(0, scheduledDurationMinutes - actualDurationMinutes));
}

export function calculateLectureLessonTimeout(params: {
  timeOutForEnding?: string | null;
  checkOutTime?: string | null;
}): string | null {
  const scheduledEnd = parseClockTimeToMinutes(params.timeOutForEnding);
  const checkOut = parseClockTimeToMinutes(params.checkOutTime);
  if (scheduledEnd == null || checkOut == null) return null;
  return formatMinutesAsHhMm(Math.max(0, checkOut - scheduledEnd));
}

export function normalizeStoredTimeLost(value: string | null | undefined): string {
  if (!value || value === '0') return '00:00';
  const parts = value.trim().split(':');
  if (parts.length >= 2) {
    return formatMinutesAsHhMm(
      (parseInt(parts[0] || '0', 10) || 0) * 60 + (parseInt(parts[1] || '0', 10) || 0)
    );
  }
  return '00:00';
}

export function resolveLectureTimeLost(record: {
  timeForStarting?: string | null;
  timeOutForEnding?: string | null;
  checkInTime?: string | null;
  checkOutTime?: string | null;
  timeLost?: string | null;
}): string {
  return (
    calculateLectureTimeLost(record) ??
    normalizeStoredTimeLost(record.timeLost)
  );
}

export function parseTimeLostToMinutes(value: string | null | undefined): number {
  if (!value || value === '0') return 0;
  const parts = value.trim().split(':');
  if (parts.length >= 2) {
    const hours = parseInt(parts[0] || '0', 10) || 0;
    const minutes = parseInt(parts[1] || '0', 10) || 0;
    const seconds = parts.length >= 3 ? parseInt(parts[2] || '0', 10) || 0 : 0;
    return hours * 60 + minutes + seconds / 60;
  }
  return 0;
}
