import {
  INITIAL_ATTENDANCE,
  INITIAL_DOCUMENTS,
  INITIAL_EMPLOYEES,
  INITIAL_LEAVE_REQUESTS,
  INITIAL_ONBOARDING,
} from './mock-data';
import type {
  HrAttendanceRecord,
  HrDocument,
  HrEmployee,
  HrLeaveRequest,
  HrOnboardingCase,
  LeaveRequestStatus,
} from './types';

const STORAGE_KEY = 'kcu-hr-demo-store-v1';

type HrDemoStore = {
  employees: HrEmployee[];
  leaveRequests: HrLeaveRequest[];
  attendance: HrAttendanceRecord[];
  onboarding: HrOnboardingCase[];
  documents: HrDocument[];
};

function defaultStore(): HrDemoStore {
  return {
    employees: [...INITIAL_EMPLOYEES],
    leaveRequests: [...INITIAL_LEAVE_REQUESTS],
    attendance: [...INITIAL_ATTENDANCE],
    onboarding: [...INITIAL_ONBOARDING],
    documents: [...INITIAL_DOCUMENTS],
  };
}

function stripLegacyAppraisalFields(raw: Record<string, unknown>): HrDemoStore {
  const base = defaultStore();
  return {
    employees: Array.isArray(raw.employees) ? (raw.employees as HrEmployee[]) : base.employees,
    leaveRequests: Array.isArray(raw.leaveRequests)
      ? (raw.leaveRequests as HrLeaveRequest[])
      : base.leaveRequests,
    attendance: Array.isArray(raw.attendance) ? (raw.attendance as HrAttendanceRecord[]) : base.attendance,
    onboarding: Array.isArray(raw.onboarding) ? (raw.onboarding as HrOnboardingCase[]) : base.onboarding,
    documents: Array.isArray(raw.documents) ? (raw.documents as HrDocument[]) : base.documents,
  };
}

function readStore(): HrDemoStore {
  if (typeof window === 'undefined') return defaultStore();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultStore();
    const parsed = JSON.parse(raw) as Record<string, unknown>;
    const store = stripLegacyAppraisalFields(parsed);
    if ('appraisalCycles' in parsed || 'appraisalReviews' in parsed) {
      writeStore(store);
    }
    return store;
  } catch {
    return defaultStore();
  }
}

function writeStore(store: HrDemoStore) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(store));
}

export function resetHrDemoStore() {
  writeStore(defaultStore());
}

export function getHrEmployees(): HrEmployee[] {
  return readStore().employees;
}

export function getHrLeaveRequests(): HrLeaveRequest[] {
  return readStore().leaveRequests;
}

export function getHrAttendance(): HrAttendanceRecord[] {
  return readStore().attendance;
}

export function getHrOnboarding(): HrOnboardingCase[] {
  return readStore().onboarding;
}

export function getHrDocuments(): HrDocument[] {
  return readStore().documents;
}

export function updateLeaveRequestStatus(id: string, status: LeaveRequestStatus, reviewedBy: string) {
  const store = readStore();
  store.leaveRequests = store.leaveRequests.map((r) =>
    r.id === id
      ? { ...r, status, reviewedBy, reviewedAt: new Date().toISOString() }
      : r
  );
  if (status === 'Approved') {
    const req = store.leaveRequests.find((r) => r.id === id);
    if (req) {
      store.employees = store.employees.map((e) =>
        e.id === req.employeeId
          ? {
              ...e,
              leaveBalanceDays: Math.max(0, e.leaveBalanceDays - req.days),
              status: req.startDate <= new Date().toISOString().slice(0, 10) ? 'On Leave' : e.status,
            }
          : e
      );
    }
  }
  writeStore(store);
}
