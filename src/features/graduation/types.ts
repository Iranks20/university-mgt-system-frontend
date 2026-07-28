export type GraduationEventStatus = 'Planning' | 'Confirmed' | 'Completed';

export type GraduationCommitteeType =
  | 'steering'
  | 'finance'
  | 'venue'
  | 'program'
  | 'logistics'
  | 'seating'
  | 'av'
  | 'decor'
  | 'media';

export interface GraduationChecklistItem {
  id: string;
  label: string;
  done: boolean;
}

export interface GraduationEvent {
  id: string;
  title: string;
  cohort: string;
  ceremonyDate: string;
  venue: string;
  overallBudget: number | null;
  status: GraduationEventStatus;
  createdAt: string;
  updatedAt: string;
}

export interface GraduationCommittee {
  id: string;
  eventId: string;
  type: GraduationCommitteeType;
  memberUserIds: string[];
  notes: string;
  checklist: GraduationChecklistItem[];
  updatedAt: string;
}

export interface GraduationStoreSnapshot {
  activeEventId: string | null;
  events: GraduationEvent[];
  committees: GraduationCommittee[];
}

export interface GraduationCommitteeMeta {
  type: GraduationCommitteeType;
  slug: string;
  name: string;
  shortName: string;
  description: string;
  canViewRegistrations: boolean;
}

export interface GraduationCommitteeProgress {
  type: GraduationCommitteeType;
  name: string;
  shortName: string;
  total: number;
  done: number;
  percent: number;
  memberCount: number;
  updatedAt: string;
}

export type CommitteeWorkspaceSection = 'members' | 'expenses' | 'suppliers' | 'activities';

export interface GraduationCommitteeMemberRecord {
  id: string;
  userId: string | null;
  fullName: string;
  roleTitle: string;
  organization: string;
  email: string;
  phone: string;
  notes: string;
  createdByName: string;
  updatedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraduationCommitteeExpenseRecord {
  id: string;
  description: string;
  amount: number;
  vendor: string;
  expenseDate: string;
  status: string;
  notes: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraduationCommitteeSupplierRecord {
  id: string;
  companyName: string;
  serviceDescription: string;
  contactName: string;
  contactPhone: string;
  contactEmail: string;
  estimatedCost: number | null;
  status: string;
  notes: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
}

export interface GraduationCommitteeActivityRecord {
  id: string;
  title: string;
  description: string;
  status: string;
  assignedTo: string;
  dueDate: string;
  recordedByName: string;
  createdAt: string;
  updatedAt: string;
}
