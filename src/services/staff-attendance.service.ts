import api from '@/lib/api';
import type { Paged } from '@/lib/pagination';

export type AttendanceDirection = 'In' | 'Out';
export type AttendanceCaptureSource = 'QrScan' | 'Search';
export type StaffDayStatus =
  | 'Present'
  | 'OnCampus'
  | 'MissingCheckOut'
  | 'MissingCheckIn'
  | 'Absent'
  | 'OnLeave';

export const STAFF_DAY_STATUS_OPTIONS: Array<{ value: StaffDayStatus; label: string }> = [
  { value: 'Present', label: 'Present' },
  { value: 'OnCampus', label: 'On campus' },
  { value: 'MissingCheckOut', label: 'Missing check-out' },
  { value: 'MissingCheckIn', label: 'Missing check-in' },
  { value: 'Absent', label: 'Absent' },
  { value: 'OnLeave', label: 'On leave' },
];

export type RosterEntry = {
  id: string;
  staffNumber: string;
  name: string;
  jobTitle: string;
  worksIn: string | null;
  status: string;
  badgeCode: string;
  onCampusSince: string | null;
};

export type Roster = {
  serverTime: string;
  undoWindowMinutes: number;
  staff: RosterEntry[];
};

export type RecordedEvent = {
  id: string;
  staffId: string;
  staffNumber: string;
  employeeName: string;
  direction: AttendanceDirection;
  occurredAt: string;
  source: string;
  capturedOffline: boolean;
  undoUntil: string;
  voided?: boolean;
};

export type OfflineEvent = {
  staffId: string;
  direction: AttendanceDirection;
  source: AttendanceCaptureSource;
  clientEventId: string;
  occurredAt: string;
};

export type SyncResult = {
  clientEventId: string;
  status: 'recorded' | 'duplicate' | 'rejected';
  eventId?: string;
  message?: string;
};

export type DeskVisitStatus = 'OnCampus' | 'CheckedOut' | 'NotCheckedOut' | 'NoCheckIn';

export type DeskVisit = {
  id: string;
  staffId: string;
  staffNumber: string;
  employeeName: string;
  worksIn: string | null;
  date: string;
  checkInAt: string | null;
  checkOutAt: string | null;
  minutes: number;
  status: DeskVisitStatus;
};

export type ScopeFilter = { departmentId?: string; orgUnitId?: string; search?: string };

export type PageParams = { page: number; limit: number };

export type DailyRow = {
  staffId: string;
  staffNumber: string;
  employeeName: string;
  jobTitle: string;
  worksIn: string | null;
  date: string;
  firstIn: string | null;
  lastOut: string | null;
  minutes: number;
  entryCount: number;
  status: StaffDayStatus;
  statusLabel: string;
  hasOfflineEntries: boolean;
  hasCorrections: boolean;
};

export type DailyRegister = Paged<DailyRow> & {
  date: string;
  summary: {
    present: number;
    onCampus: number;
    missingCheckOut: number;
    missingCheckIn: number;
    absent: number;
    onLeave: number;
    total: number;
  };
};

export type OnCampusRow = {
  staffId: string;
  staffNumber: string;
  employeeName: string;
  jobTitle: string;
  worksIn: string | null;
  since: string;
  minutes: number;
};

export type DayEvent = {
  id: string;
  direction: AttendanceDirection;
  occurredAt: string;
  source: 'QrScan' | 'Search' | 'Correction' | 'Migrated';
  capturedOffline: boolean;
  note: string | null;
  recordedBy: string | null;
  recordedAt: string;
  voided: boolean;
  voidedAt: string | null;
  voidedBy: string | null;
  voidReason: string | null;
};

export type DayEvents = {
  staffId: string;
  employeeName: string;
  staffNumber: string;
  date: string;
  events: DayEvent[];
};

export type TimesheetDay = {
  date: string;
  status: StaffDayStatus;
  statusLabel: string;
  firstIn: string | null;
  lastOut: string | null;
  minutes: number;
  sessions: Array<{
    checkIn: string | null;
    checkOut: string | null;
    minutes: number;
    isOpen: boolean;
    missingCheckOut: boolean;
    missingCheckIn: boolean;
  }>;
};

export type Timesheet = {
  staffId: string;
  staffNumber: string;
  employeeName: string;
  jobTitle: string;
  worksIn: string | null;
  month: string;
  totals: { daysPresent: number; minutes: number; missingCheckOuts: number; missingCheckIns: number };
  days: TimesheetDay[];
};

export type MonthlyRow = {
  staffId: string;
  staffNumber: string;
  employeeName: string;
  jobTitle: string;
  worksIn: string | null;
  daysPresent: number;
  minutes: number;
  averageFirstIn: string | null;
  averageLastOut: string | null;
  missingCheckOuts: number;
  missingCheckIns: number;
};

export type ExceptionRow = {
  id: string;
  staffId: string;
  staffNumber: string;
  employeeName: string;
  worksIn: string | null;
  date: string;
  type: 'MissingCheckOut' | 'MissingCheckIn';
  recordedAt: string;
};

export type BadgeInfo = {
  staffId: string;
  staffNumber: string;
  employeeName: string;
  jobTitle: string;
  worksIn: string | null;
  badgeCode: string;
};

const BASE = '/staff-attendance';

export const staffAttendanceService = {
  getRoster: () => api.get<Roster>(`${BASE}/desk/roster`),

  getRecent: (limit = 8) => api.get<RecordedEvent[]>(`${BASE}/desk/recent`, { limit }),

  getVisits: (
    params: PageParams & { from?: string; to?: string; status?: DeskVisitStatus; search?: string }
  ) => api.get<Paged<DeskVisit>>(`${BASE}/desk/visits`, params),

  recordEvent: (input: {
    staffId: string;
    direction: AttendanceDirection;
    source: AttendanceCaptureSource;
    clientEventId: string;
  }) => api.post<{ event: RecordedEvent; staff: { onCampusSince: string | null } }>(`${BASE}/desk/events`, input),

  syncEvents: (events: OfflineEvent[]) =>
    api.post<{ results: SyncResult[] }>(`${BASE}/desk/events/sync`, { events }),

  undoEvent: (id: string) =>
    api.post<{ id: string; voided: boolean; staff: { onCampusSince: string | null } }>(
      `${BASE}/desk/events/${id}/undo`
    ),

  getDaily: (date: string, filter: ScopeFilter & PageParams & { status?: StaffDayStatus }) =>
    api.get<DailyRegister>(`${BASE}/register/daily`, { date, ...filter }),

  getOnCampus: (filter: ScopeFilter & PageParams) =>
    api.get<Paged<OnCampusRow>>(`${BASE}/register/on-campus`, filter),

  getDayEvents: (staffId: string, date: string) =>
    api.get<DayEvents>(`${BASE}/register/day-events`, { staffId, date }),

  getTimesheet: (staffId: string, month: string) =>
    api.get<Timesheet>(`${BASE}/register/timesheet/${staffId}`, { month }),

  getMonthly: (month: string, filter: ScopeFilter & PageParams) =>
    api.get<Paged<MonthlyRow> & { month: string; from?: string; to?: string }>(`${BASE}/register/monthly`, {
      month,
      ...filter,
    }),

  getExceptions: (from: string, to: string, filter: ScopeFilter & PageParams) =>
    api.get<Paged<ExceptionRow> & { from: string; to: string }>(`${BASE}/register/exceptions`, {
      from,
      to,
      ...filter,
    }),

  addCorrection: (input: { staffId: string; direction: AttendanceDirection; occurredAt: string; reason: string }) =>
    api.post<{ id: string; date: string }>(`${BASE}/corrections`, input),

  voidEvent: (id: string, reason: string) => api.post<{ id: string; voided: boolean }>(`${BASE}/events/${id}/void`, { reason }),

  getBadge: (staffId: string) => api.get<BadgeInfo>(`${BASE}/badges/${staffId}`),
};
