import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  CloudOff,
  LogIn,
  LogOut,
  QrCode,
  RefreshCw,
  Search,
  Undo2,
  Users,
  Wifi,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { Link } from 'react-router';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { BadgeScannerDialog } from '@/components/attendance/BadgeScannerDialog';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorCode, getApiErrorMessage } from '@/lib/api';
import {
  applyDirection,
  buildQueuedEvent,
  findByBadge,
  formatClock,
  formatDuration,
  isNetworkError,
  isOnCampus,
  loadCachedRoster,
  loadQueue,
  newClientEventId,
  saveCachedRoster,
  saveQueue,
  searchRoster,
  suggestedDirection,
  type QueuedEvent,
} from '@/lib/attendance-desk';
import {
  staffAttendanceService,
  type AttendanceCaptureSource,
  type AttendanceDirection,
  type RecordedEvent,
  type Roster,
} from '@/services/staff-attendance.service';

const SYNC_INTERVAL_MS = 30_000;
const ROSTER_REFRESH_MS = 5 * 60_000;
const BADGE_PREFIX = 'KCU1.';
const RECENT_LIMIT = 8;
const STATE_CONFLICT_CODES = new Set(['ALREADY_CHECKED_IN', 'NOT_CHECKED_IN', 'ENTRIES_MUST_ALTERNATE']);

function directionLabel(direction: AttendanceDirection) {
  return direction === 'In' ? 'Checked in' : 'Checked out';
}

function initials(name: string) {
  const parts = name.split(/\s+/).filter(Boolean);
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase();
}

function DirectionBadge({ direction }: { direction: AttendanceDirection }) {
  return direction === 'In' ? (
    <Badge className="bg-green-100 text-green-800 hover:bg-green-100">In</Badge>
  ) : (
    <Badge className="bg-slate-200 text-slate-800 hover:bg-slate-200">Out</Badge>
  );
}

export default function AttendanceDeskPage() {
  const { user } = useAuth();
  const userId = user?.id ?? 'anonymous';

  const [roster, setRoster] = useState<Roster | null>(() => loadCachedRoster(userId));
  const [queue, setQueue] = useState<QueuedEvent[]>(() => loadQueue(userId));
  const [recent, setRecent] = useState<RecordedEvent[]>([]);
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  const [rosterError, setRosterError] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedSource, setSelectedSource] = useState<AttendanceCaptureSource>('Search');
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [scannerOpen, setScannerOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

  const searchRef = useRef<HTMLInputElement | null>(null);
  const suggestedButtonRef = useRef<HTMLButtonElement | null>(null);
  const queueRef = useRef(queue);
  const syncingRef = useRef(false);

  const updateQueue = useCallback(
    (updater: (current: QueuedEvent[]) => QueuedEvent[]) => {
      setQueue((current) => {
        const next = updater(current);
        queueRef.current = next;
        saveQueue(userId, next);
        return next;
      });
    },
    [userId]
  );

  const updateRoster = useCallback(
    (updater: (current: Roster) => Roster) => {
      setRoster((current) => {
        if (!current) return current;
        const next = updater(current);
        saveCachedRoster(userId, next);
        return next;
      });
    },
    [userId]
  );

  const pendingQueue = useMemo(() => queue.filter((q) => !q.failedMessage), [queue]);
  const failedQueue = useMemo(() => queue.filter((q) => q.failedMessage), [queue]);

  const refreshRoster = useCallback(async () => {
    try {
      const fresh = await staffAttendanceService.getRoster();
      const withPending = queueRef.current
        .filter((q) => !q.failedMessage)
        .reduce((acc, q) => applyDirection(acc, q.staffId, q.direction, q.occurredAt), fresh);
      setRoster(withPending);
      saveCachedRoster(userId, withPending);
      setRosterError(null);
      setOnline(true);
    } catch (error) {
      if (isNetworkError(error)) {
        setOnline(false);
        setRosterError(null);
      } else {
        setRosterError(getApiErrorMessage(error, 'Could not load the staff list'));
      }
    }
  }, [userId]);

  const refreshRecent = useCallback(async () => {
    try {
      setRecent(await staffAttendanceService.getRecent(RECENT_LIMIT));
    } catch (error) {
      if (isNetworkError(error)) setOnline(false);
    }
  }, []);

  const syncQueue = useCallback(async () => {
    const pending = queueRef.current.filter((q) => !q.failedMessage);
    if (pending.length === 0 || syncingRef.current) return;
    syncingRef.current = true;
    setSyncing(true);
    try {
      const { results } = await staffAttendanceService.syncEvents(
        pending.map(({ staffId, direction, source, clientEventId, occurredAt }) => ({
          staffId,
          direction,
          source,
          clientEventId,
          occurredAt,
        }))
      );
      const byId = new Map(results.map((r) => [r.clientEventId, r]));
      updateQueue((current) =>
        current
          .filter((q) => {
            const result = byId.get(q.clientEventId);
            return !result || result.status === 'rejected';
          })
          .map((q) => {
            const result = byId.get(q.clientEventId);
            return result?.status === 'rejected'
              ? { ...q, failedMessage: result.message ?? 'The server refused this entry' }
              : q;
          })
      );
      const saved = results.filter((r) => r.status !== 'rejected').length;
      const rejected = results.length - saved;
      setOnline(true);
      if (saved > 0) toast.success(`${saved} saved ${saved === 1 ? 'entry' : 'entries'} synced`);
      if (rejected > 0) toast.error(`${rejected} ${rejected === 1 ? 'entry was' : 'entries were'} refused. See below.`);
      await Promise.all([refreshRoster(), refreshRecent()]);
    } catch (error) {
      if (isNetworkError(error)) setOnline(false);
      else toast.error(getApiErrorMessage(error, 'Sync failed'));
    } finally {
      syncingRef.current = false;
      setSyncing(false);
    }
  }, [refreshRecent, refreshRoster, updateQueue]);

  useEffect(() => {
    void refreshRoster();
    void refreshRecent();
    if (queueRef.current.some((q) => !q.failedMessage)) void syncQueue();
  }, [refreshRecent, refreshRoster, syncQueue]);

  useEffect(() => {
    const goOnline = () => {
      setOnline(true);
      void syncQueue();
      void refreshRoster();
      void refreshRecent();
    };
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    const syncTimer = window.setInterval(() => void syncQueue(), SYNC_INTERVAL_MS);
    const rosterTimer = window.setInterval(() => {
      if (queueRef.current.every((q) => q.failedMessage)) void refreshRoster();
    }, ROSTER_REFRESH_MS);
    const clockTimer = window.setInterval(() => setNow(Date.now()), 15_000);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
      window.clearInterval(syncTimer);
      window.clearInterval(rosterTimer);
      window.clearInterval(clockTimer);
    };
  }, [refreshRecent, refreshRoster, syncQueue]);

  const selected = useMemo(
    () => (selectedId ? roster?.staff.find((s) => s.id === selectedId) ?? null : null),
    [roster, selectedId]
  );
  const results = useMemo(() => (selected ? [] : searchRoster(roster, query)), [roster, query, selected]);
  const onCampusCount = useMemo(
    () => (roster ? roster.staff.filter((s) => isOnCampus(s, now)).length : 0),
    [roster, now]
  );
  const suggestion = selected ? suggestedDirection(selected, now) : 'In';
  const selectedOnCampus = selected ? isOnCampus(selected, now) : false;

  useEffect(() => {
    if (selected) suggestedButtonRef.current?.focus();
  }, [selected]);

  const resetSelection = useCallback(() => {
    setSelectedId(null);
    setQuery('');
    window.setTimeout(() => searchRef.current?.focus(), 0);
  }, []);

  const selectEntry = (id: string, source: AttendanceCaptureSource) => {
    setSelectedId(id);
    setSelectedSource(source);
  };

  const handleBadge = useCallback(
    (code: string) => {
      setScannerOpen(false);
      const entry = findByBadge(roster, code);
      if (!entry) {
        toast.error('Badge not recognised. Search by name or staff number instead.');
        return;
      }
      setQuery('');
      selectEntry(entry.id, 'QrScan');
    },
    [roster]
  );

  const undo = async (eventId: string, staffId: string) => {
    try {
      const result = await staffAttendanceService.undoEvent(eventId);
      updateRoster((current) => ({
        ...current,
        staff: current.staff.map((s) => (s.id === staffId ? { ...s, onCampusSince: result.staff.onCampusSince } : s)),
      }));
      setRecent((current) => current.map((e) => (e.id === eventId ? { ...e, voided: true } : e)));
      toast.success('Entry removed');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not undo this entry'));
    }
  };

  const record = async (direction: AttendanceDirection) => {
    if (!selected || busy) return;
    const entry = selected;
    const clientEventId = newClientEventId();
    const queueOffline = () => {
      const queued = buildQueuedEvent(entry, direction, selectedSource, clientEventId);
      updateQueue((current) => [...current, queued]);
      updateRoster((current) => applyDirection(current, entry.id, direction, queued.occurredAt));
      toast.success(`${directionLabel(direction)}: ${entry.name}`, {
        description: 'Saved on this device. It will sync when the connection is back.',
      });
      resetSelection();
    };

    if (!online) {
      queueOffline();
      return;
    }

    setBusy(true);
    try {
      const { event, staff } = await staffAttendanceService.recordEvent({
        staffId: entry.id,
        direction,
        source: selectedSource,
        clientEventId,
      });
      updateRoster((current) => ({
        ...current,
        staff: current.staff.map((s) => (s.id === entry.id ? { ...s, onCampusSince: staff.onCampusSince } : s)),
      }));
      setRecent((current) => [event, ...current.filter((e) => e.id !== event.id)].slice(0, RECENT_LIMIT));
      toast.success(`${directionLabel(direction)}: ${entry.name}`, {
        description: formatClock(event.occurredAt),
        action: { label: 'Undo', onClick: () => void undo(event.id, entry.id) },
      });
      resetSelection();
    } catch (error) {
      if (isNetworkError(error)) {
        setOnline(false);
        queueOffline();
      } else {
        toast.error(getApiErrorMessage(error, 'Could not save this entry'));
        if (STATE_CONFLICT_CODES.has(getApiErrorCode(error) ?? '')) {
          void refreshRoster();
          resetSelection();
        }
      }
    } finally {
      setBusy(false);
    }
  };

  const onSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return;
    e.preventDefault();
    const value = query.trim();
    if (value.startsWith(BADGE_PREFIX)) {
      handleBadge(value);
      return;
    }
    if (results.length === 1) selectEntry(results[0].id, 'Search');
  };

  const canUndo = (event: RecordedEvent) =>
    !event.voided &&
    new Date(event.undoUntil).getTime() > now &&
    !recent.some((other) => other.staffId === event.staffId && !other.voided && other.occurredAt > event.occurredAt);

  const visiblePending = [...pendingQueue].reverse().slice(0, RECENT_LIMIT);
  const hiddenPendingCount = pendingQueue.length - visiblePending.length;
  const visibleRecent = recent.slice(0, Math.max(0, RECENT_LIMIT - visiblePending.length));

  return (
    <div className="p-4 sm:p-6 space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Attendance Desk</h1>
          <p className="text-gray-500 mt-1">Check employees in when they arrive and out when they leave.</p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {online ? (
            <Badge className="gap-1 bg-green-100 text-green-800 hover:bg-green-100">
              <Wifi className="h-3.5 w-3.5" /> Online
            </Badge>
          ) : (
            <Badge className="gap-1 bg-amber-100 text-amber-800 hover:bg-amber-100">
              <CloudOff className="h-3.5 w-3.5" /> Offline, saving on this device
            </Badge>
          )}
          {pendingQueue.length > 0 && (
            <Button variant="outline" size="sm" onClick={() => void syncQueue()} disabled={syncing}>
              <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
              Sync {pendingQueue.length} waiting
            </Button>
          )}
          <Button variant="ghost" size="sm" onClick={() => void refreshRoster()}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh list
          </Button>
        </div>
      </div>

      {rosterError && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Staff list unavailable</AlertTitle>
          <AlertDescription>{rosterError}</AlertDescription>
        </Alert>
      )}
      {!roster && !rosterError && (
        <Alert>
          <AlertTitle>Loading the staff list…</AlertTitle>
          <AlertDescription>
            The list is kept on this device so the desk keeps working if the internet drops.
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-6 lg:grid-cols-5">
        <div className="space-y-6 lg:col-span-3">
          <Card>
            <CardContent className="space-y-4">
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <Input
                    ref={searchRef}
                    autoFocus
                    className="h-12 pl-10 text-base"
                    placeholder="Name or staff number, or scan a badge"
                    value={query}
                    onChange={(e) => {
                      setQuery(e.target.value);
                      setSelectedId(null);
                    }}
                    onKeyDown={onSearchKeyDown}
                    disabled={!roster}
                  />
                </div>
                <Button
                  type="button"
                  className="h-12 bg-[#015F2B] hover:bg-[#014022]"
                  onClick={() => setScannerOpen(true)}
                  disabled={!roster}
                >
                  <QrCode className="h-5 w-5 sm:mr-2" />
                  <span className="hidden sm:inline">Scan badge</span>
                </Button>
              </div>

              {!selected && query.trim() && (
                <div className="divide-y rounded-md border">
                  {results.length === 0 ? (
                    <p className="p-4 text-sm text-gray-500">No employee matches “{query.trim()}”.</p>
                  ) : (
                    results.map((r) => (
                      <button
                        key={r.id}
                        type="button"
                        className="flex w-full items-center justify-between gap-3 p-3 text-left hover:bg-gray-50"
                        onClick={() => selectEntry(r.id, 'Search')}
                      >
                        <div className="min-w-0">
                          <div className="truncate font-medium text-gray-900">{r.name}</div>
                          <div className="truncate font-mono text-xs text-gray-500">{r.staffNumber}</div>
                          <div className="truncate text-xs text-gray-500">
                            {r.jobTitle}
                            {r.worksIn ? ` · ${r.worksIn}` : ''}
                          </div>
                        </div>
                        {isOnCampus(r, now) ? (
                          <Badge className="shrink-0 bg-green-100 text-green-800 hover:bg-green-100">On campus</Badge>
                        ) : (
                          <Badge variant="outline" className="shrink-0">Not in</Badge>
                        )}
                      </button>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {selected && (
            <Card className="overflow-hidden border-2 border-[#015F2B]/30 py-0">
              <CardContent className="space-y-4 p-4 sm:p-6">
                <div className="flex items-start gap-3 sm:gap-4">
                  <div
                    className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#015F2B]/10 text-base font-semibold text-[#015F2B] sm:h-14 sm:w-14 sm:text-lg"
                    aria-hidden
                  >
                    {initials(selected.name)}
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2 className="break-words text-lg font-bold leading-tight text-gray-900 sm:text-2xl">
                      {selected.name}
                    </h2>
                    <div className="mt-1.5">
                      <span className="inline-block rounded bg-gray-100 px-1.5 py-0.5 font-mono text-xs text-gray-700">
                        {selected.staffNumber}
                      </span>
                    </div>
                    <div className="mt-1 break-words text-sm text-gray-700">{selected.jobTitle}</div>
                    {selected.worksIn && (
                      <div className="break-words text-sm text-gray-500">{selected.worksIn}</div>
                    )}
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="-mr-2 -mt-2 shrink-0"
                    onClick={resetSelection}
                    aria-label="Clear selection"
                  >
                    <X className="h-5 w-5" />
                  </Button>
                </div>

                {selected.status !== 'Active' && (
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertTitle>Employment status: {selected.status}</AlertTitle>
                    <AlertDescription>Record the entry if the person is on campus; HR will see the status.</AlertDescription>
                  </Alert>
                )}

                <div
                  className={`flex flex-wrap items-center justify-between gap-2 rounded-md border px-3 py-2.5 text-sm ${
                    selectedOnCampus ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-gray-50'
                  }`}
                >
                  <div className="flex min-w-0 items-center gap-2">
                    <span
                      className={`h-2.5 w-2.5 shrink-0 rounded-full ${selectedOnCampus ? 'bg-green-600' : 'bg-gray-400'}`}
                    />
                    {selectedOnCampus && selected.onCampusSince ? (
                      <span className="text-gray-800">
                        <span className="font-medium">On campus</span> since {formatClock(selected.onCampusSince)}
                        <span className="text-gray-500">
                          {' '}
                          · {formatDuration((now - new Date(selected.onCampusSince).getTime()) / 60000)}
                        </span>
                      </span>
                    ) : (
                      <span className="font-medium text-gray-700">Not checked in</span>
                    )}
                  </div>
                  {selectedSource === 'QrScan' && (
                    <Badge variant="outline" className="gap-1 bg-white font-normal">
                      <QrCode className="h-3 w-3" /> Badge scanned
                    </Badge>
                  )}
                </div>

                <Button
                  ref={suggestedButtonRef}
                  className={`h-14 w-full text-base sm:h-16 sm:text-lg ${
                    suggestion === 'In' ? 'bg-[#015F2B] hover:bg-[#014022]' : 'bg-slate-800 hover:bg-slate-900'
                  }`}
                  disabled={busy}
                  onClick={() => void record(suggestion)}
                >
                  {suggestion === 'In' ? (
                    <>
                      <LogIn className="mr-2 h-5 w-5" /> Check in
                    </>
                  ) : (
                    <>
                      <LogOut className="mr-2 h-5 w-5" /> Check out
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>

        <div className="space-y-6 lg:col-span-2">
          <Card>
            <CardContent className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-full bg-[#015F2B]/10 text-[#015F2B]">
                <Users className="h-6 w-6" />
              </div>
              <div>
                <div className="text-2xl font-bold">{roster ? onCampusCount : '—'}</div>
                <div className="text-sm text-gray-500">On campus now</div>
              </div>
            </CardContent>
          </Card>

          {failedQueue.length > 0 && (
            <Card className="border-red-200">
              <CardHeader>
                <CardTitle className="text-base text-red-700">Entries the server refused</CardTitle>
                <CardDescription>Tell HR so they can add these as corrections.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-2">
                {failedQueue.map((q) => (
                  <div key={q.clientEventId} className="flex items-start justify-between gap-2 rounded-md border p-2 text-sm">
                    <div>
                      <div className="font-medium">
                        {q.employeeName} · {directionLabel(q.direction)} {formatClock(q.occurredAt)}
                      </div>
                      <div className="text-xs text-red-700">{q.failedMessage}</div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => updateQueue((current) => current.filter((c) => c.clientEventId !== q.clientEventId))}
                    >
                      Dismiss
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          <Card>
            <CardHeader className="flex flex-row items-start justify-between gap-2 space-y-0">
              <div>
                <CardTitle className="text-base">Recent entries</CardTitle>
                <CardDescription>Your last {RECENT_LIMIT} entries from the past 24 hours.</CardDescription>
              </div>
              <Button variant="link" size="sm" className="h-auto p-0 text-[#015F2B]" asChild>
                <Link to="/attendance-entries">View all</Link>
              </Button>
            </CardHeader>
            <CardContent className="space-y-2">
              {visiblePending.length === 0 && visibleRecent.length === 0 && (
                <p className="text-sm text-gray-500">Nothing recorded yet.</p>
              )}
              {hiddenPendingCount > 0 && (
                <p className="text-xs text-amber-700">
                  {hiddenPendingCount} more {hiddenPendingCount === 1 ? 'entry is' : 'entries are'} waiting to sync.
                </p>
              )}
              {visiblePending.map((q) => (
                <div key={q.clientEventId} className="flex items-center justify-between gap-2 rounded-md border border-dashed p-2">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{q.employeeName}</div>
                    <div className="text-xs text-amber-700">Waiting to sync · {formatClock(q.occurredAt)}</div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DirectionBadge direction={q.direction} />
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => {
                        updateQueue((current) => current.filter((c) => c.clientEventId !== q.clientEventId));
                        void refreshRoster();
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                </div>
              ))}
              {visibleRecent.map((e) => (
                <div
                  key={e.id}
                  className={`flex items-center justify-between gap-2 rounded-md border p-2 ${e.voided ? 'opacity-50' : ''}`}
                >
                  <div className="min-w-0">
                    <div className={`truncate text-sm font-medium ${e.voided ? 'line-through' : ''}`}>{e.employeeName}</div>
                    <div className="text-xs text-gray-500">
                      {formatClock(e.occurredAt)}
                      {e.capturedOffline ? ' · captured offline' : ''}
                      {e.voided ? ' · undone' : ''}
                    </div>
                  </div>
                  <div className="flex items-center gap-1">
                    <DirectionBadge direction={e.direction} />
                    {canUndo(e) && (
                      <Button variant="ghost" size="sm" onClick={() => void undo(e.id, e.staffId)}>
                        <Undo2 className="mr-1 h-4 w-4" /> Undo
                      </Button>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>

      <BadgeScannerDialog open={scannerOpen} onOpenChange={setScannerOpen} onDetected={handleBadge} />
    </div>
  );
}
