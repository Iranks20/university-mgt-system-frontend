export const STUDENT_LIFECYCLE_STATUSES = [
  'Active',
  'OnLeave',
  'Withdrawn',
  'Suspended',
  'Completed',
] as const;

export type StudentLifecycleStatus = (typeof STUDENT_LIFECYCLE_STATUSES)[number];

export const STUDENT_STATUS_CHANGE_REASONS = [
  'Discontinued — fees',
  'Discontinued — academic',
  'Discontinued — personal',
  'Dead year / repeat',
  'Medical leave',
  'Suspended — disciplinary',
  'Returning student',
  'Graduated',
  'Administrative correction',
  'Other',
] as const;

export function studentStatusLabel(status: string | null | undefined): string {
  switch (status) {
    case 'Active':
      return 'Active';
    case 'OnLeave':
      return 'On leave';
    case 'Withdrawn':
      return 'Withdrawn';
    case 'Suspended':
      return 'Suspended';
    case 'Completed':
      return 'Completed';
    case 'Inactive':
      return 'Inactive';
    default:
      return status?.trim() || 'Unknown';
  }
}

export function studentStatusBadgeClass(status: string): string {
  switch (status) {
    case 'Active':
      return 'bg-[#015F2B] hover:bg-[#015F2B]/90';
    case 'OnLeave':
      return 'bg-amber-600 hover:bg-amber-700';
    case 'Withdrawn':
      return 'bg-slate-600 hover:bg-slate-700';
    case 'Suspended':
      return 'bg-red-700 hover:bg-red-800';
    case 'Completed':
      return 'bg-blue-700 hover:bg-blue-800';
    default:
      return '';
  }
}

export function isReturningToActive(status: StudentLifecycleStatus): boolean {
  return status === 'Active';
}

export function isLeavingActive(currentStatus: string, nextStatus: StudentLifecycleStatus): boolean {
  return currentStatus === 'Active' && nextStatus !== 'Active';
}
