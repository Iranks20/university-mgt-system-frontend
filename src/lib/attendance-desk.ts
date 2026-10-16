import type {
  AttendanceCaptureSource,
  AttendanceDirection,
  OfflineEvent,
  Roster,
  RosterEntry,
} from '@/services/staff-attendance.service';

export const OPEN_SESSION_HOURS = 16;

export type QueuedEvent = OfflineEvent & {
  employeeName: string;
  staffNumber: string;
  failedMessage?: string;
};

const rosterKey = (userId: string) => `kcu-attendance-roster:${userId}`;
const queueKey = (userId: string) => `kcu-attendance-queue:${userId}`;

function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

export function loadCachedRoster(userId: string): Roster | null {
  return readJson<Roster | null>(rosterKey(userId), null);
}

export function saveCachedRoster(userId: string, roster: Roster): void {
  localStorage.setItem(rosterKey(userId), JSON.stringify(roster));
}

export function loadQueue(userId: string): QueuedEvent[] {
  return readJson<QueuedEvent[]>(queueKey(userId), []);
}

export function saveQueue(userId: string, queue: QueuedEvent[]): void {
  localStorage.setItem(queueKey(userId), JSON.stringify(queue));
}

export function newClientEventId(): string {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => b.toString(16).padStart(2, '0')).join('');
}

export function isNetworkError(error: unknown): boolean {
  if (typeof navigator !== 'undefined' && !navigator.onLine) return true;
  return error instanceof TypeError;
}

export function isOnCampus(entry: Pick<RosterEntry, 'onCampusSince'>, now = Date.now()): boolean {
  if (!entry.onCampusSince) return false;
  return now - new Date(entry.onCampusSince).getTime() <= OPEN_SESSION_HOURS * 60 * 60 * 1000;
}

export function suggestedDirection(entry: Pick<RosterEntry, 'onCampusSince'>, now = Date.now()): AttendanceDirection {
  return isOnCampus(entry, now) ? 'Out' : 'In';
}

export function applyDirection(
  roster: Roster,
  staffId: string,
  direction: AttendanceDirection,
  occurredAt: string
): Roster {
  return {
    ...roster,
    staff: roster.staff.map((s) =>
      s.id === staffId ? { ...s, onCampusSince: direction === 'In' ? occurredAt : null } : s
    ),
  };
}

export function findByBadge(roster: Roster | null, code: string): RosterEntry | null {
  const trimmed = code.trim();
  if (!roster || !trimmed) return null;
  return roster.staff.find((s) => s.badgeCode === trimmed) ?? null;
}

export function searchRoster(roster: Roster | null, query: string, limit = 8): RosterEntry[] {
  if (!roster) return [];
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [];
  const exact = roster.staff.find((s) => s.staffNumber.toLowerCase() === query.trim().toLowerCase());
  const matches = roster.staff.filter((s) => {
    const haystack = `${s.name} ${s.staffNumber}`.toLowerCase();
    return tokens.every((t) => haystack.includes(t));
  });
  const ordered = exact ? [exact, ...matches.filter((m) => m.id !== exact.id)] : matches;
  return ordered.slice(0, limit);
}

export function buildQueuedEvent(
  entry: RosterEntry,
  direction: AttendanceDirection,
  source: AttendanceCaptureSource,
  clientEventId: string,
  occurredAt = new Date().toISOString()
): QueuedEvent {
  return {
    staffId: entry.id,
    direction,
    source,
    clientEventId,
    occurredAt,
    employeeName: entry.name,
    staffNumber: entry.staffNumber,
  };
}

export function formatDuration(minutes: number): string {
  const safe = Math.max(0, Math.round(minutes));
  const hours = Math.floor(safe / 60);
  const mins = safe % 60;
  if (hours === 0) return `${mins} min`;
  return `${hours} h ${String(mins).padStart(2, '0')} min`;
}

export function localDateKey(date = new Date()): string {
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}`;
}

export function shiftDateKey(key: string, days: number): string {
  const [y, m, d] = key.split('-').map(Number);
  return localDateKey(new Date(y, m - 1, d + days));
}

export function formatDateKey(key: string): string {
  const [y, m, d] = key.split('-').map(Number);
  return new Date(y, m - 1, d).toLocaleDateString('en-GB', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function formatClock(iso: string | null | undefined): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' });
}
