import { Badge } from '@/components/ui/badge';
import type {
  AppraisalReviewStatus,
  EmploymentStatus,
  HrAppraisalCycle,
  LeaveRequestStatus,
} from '@/features/hr/types';

export function employmentStatusBadge(status: EmploymentStatus) {
  const map: Record<EmploymentStatus, string> = {
    Active: 'bg-green-100 text-green-800',
    'On Leave': 'bg-blue-100 text-blue-800',
    Suspended: 'bg-orange-100 text-orange-800',
    Terminated: 'bg-red-100 text-red-800',
    Probation: 'bg-purple-100 text-purple-800',
  };
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>;
}

export function leaveStatusBadge(status: LeaveRequestStatus) {
  const map: Record<LeaveRequestStatus, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Approved: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
    Cancelled: 'bg-gray-100 text-gray-700',
  };
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>;
}

export function appraisalStatusBadge(status: AppraisalReviewStatus) {
  const map: Record<AppraisalReviewStatus, string> = {
    'Not Started': 'bg-gray-100 text-gray-700',
    'Self Assessment Pending': 'bg-amber-100 text-amber-800',
    'Supervisor Review': 'bg-blue-100 text-blue-800',
    'HR Review': 'bg-indigo-100 text-indigo-800',
    Completed: 'bg-green-100 text-green-800',
    Overdue: 'bg-red-100 text-red-800',
  };
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>;
}

export function cycleStatusBadge(status: HrAppraisalCycle['status']) {
  const map: Record<HrAppraisalCycle['status'], string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Open: 'bg-green-100 text-green-800',
    Review: 'bg-blue-100 text-blue-800',
    Closed: 'bg-slate-100 text-slate-700',
  };
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>;
}
