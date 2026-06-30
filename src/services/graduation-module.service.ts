import api from '@/lib/api';

import type {

  GraduationCommittee,

  GraduationCommitteeType,

  GraduationEvent,

  GraduationCommitteeMemberRecord,

  GraduationCommitteeExpenseRecord,

  GraduationCommitteeSupplierRecord,

  GraduationCommitteeActivityRecord,

  CommitteeWorkspaceSection,

  GraduationCommitteeProgress,

} from '@/features/graduation/types';



export type GraduationModuleAccess = {

  canManageEvent: boolean;

  canViewAllCommittees: boolean;

  canViewRegistrations: boolean;

  assignedCommitteeTypes: GraduationCommitteeType[];

};



export type GraduationDashboardPayload = {

  activeEvent: GraduationEvent | null;

  committeeProgress: GraduationCommitteeProgress[];

  overallPercent: number;

  access: GraduationModuleAccess;

};



export type GraduationCommitteeListItem = GraduationCommitteeProgress & {

  slug: string;

  canView: boolean;

};



export type GraduationCommitteeWorkspace = {

  event: GraduationEvent;

  committee: {

    id: string;

    eventId: string;

    type: GraduationCommitteeType;

    notes: string;

    updatedAt: string;

  };

  sections: CommitteeWorkspaceSection[];

  members: GraduationCommitteeMemberRecord[];

  expenses: GraduationCommitteeExpenseRecord[];

  suppliers: GraduationCommitteeSupplierRecord[];

  activities: GraduationCommitteeActivityRecord[];

  canEdit: boolean;

};



export const graduationModuleService = {

  getDashboard: async (): Promise<GraduationDashboardPayload> => {

    return api.get<GraduationDashboardPayload>('/graduation/dashboard');

  },



  getActiveEvent: async (): Promise<GraduationEvent | null> => {

    return api.get<GraduationEvent | null>('/graduation/events/active');

  },



  createEvent: async (payload: {

    title: string;

    cohort: string;

    ceremonyDate?: string;

    venue?: string;

    overallBudget?: number | null;

    status?: GraduationEvent['status'];

  }): Promise<GraduationEvent> => {

    return api.post<GraduationEvent>('/graduation/events', payload);

  },



  updateEvent: async (

    id: string,

    payload: Partial<{

      title: string;

      cohort: string;

      ceremonyDate: string;

      venue: string;

      overallBudget: number | null;

      status: GraduationEvent['status'];

    }>

  ): Promise<GraduationEvent> => {

    return api.patch<GraduationEvent>(`/graduation/events/${id}`, payload);

  },



  listCommittees: async (): Promise<{

    event: GraduationEvent | null;

    committees: GraduationCommitteeListItem[];

  }> => {

    return api.get<{ event: GraduationEvent | null; committees: GraduationCommitteeListItem[] }>(

      '/graduation/committees'

    );

  },



  getCommitteeWorkspace: async (slug: string): Promise<GraduationCommitteeWorkspace> => {

    return api.get<GraduationCommitteeWorkspace>(`/graduation/committees/${slug}`);

  },



  updateCommitteeNotes: async (id: string, notes: string): Promise<GraduationCommittee> => {

    return api.patch<GraduationCommittee>(`/graduation/committees/${id}`, { notes });

  },



  createCommitteeMember: async (

    committeeId: string,

    payload: {

      fullName: string;

      roleTitle?: string;

      organization?: string;

      email?: string;

      phone?: string;

      notes?: string;

      userId?: string | null;

    }

  ): Promise<GraduationCommitteeMemberRecord> => {

    return api.post<GraduationCommitteeMemberRecord>(

      `/graduation/committees/${committeeId}/members`,

      payload

    );

  },



  updateCommitteeMember: async (

    committeeId: string,

    memberId: string,

    payload: {

      fullName: string;

      roleTitle?: string;

      organization?: string;

      email?: string;

      phone?: string;

      notes?: string;

      userId?: string | null;

    }

  ): Promise<GraduationCommitteeMemberRecord> => {

    return api.patch<GraduationCommitteeMemberRecord>(

      `/graduation/committees/${committeeId}/members/${memberId}`,

      payload

    );

  },



  deleteCommitteeMember: async (committeeId: string, memberId: string): Promise<void> => {

    await api.delete(`/graduation/committees/${committeeId}/members/${memberId}`);

  },



  createCommitteeExpense: async (

    committeeId: string,

    payload: {

      description: string;

      amount: number;

      vendor?: string;

      expenseDate?: string | null;

      status?: string;

      notes?: string;

    }

  ): Promise<GraduationCommitteeExpenseRecord> => {

    return api.post<GraduationCommitteeExpenseRecord>(

      `/graduation/committees/${committeeId}/expenses`,

      payload

    );

  },



  updateCommitteeExpense: async (

    committeeId: string,

    expenseId: string,

    payload: {

      description: string;

      amount: number;

      vendor?: string;

      expenseDate?: string | null;

      status?: string;

      notes?: string;

    }

  ): Promise<GraduationCommitteeExpenseRecord> => {

    return api.patch<GraduationCommitteeExpenseRecord>(

      `/graduation/committees/${committeeId}/expenses/${expenseId}`,

      payload

    );

  },



  deleteCommitteeExpense: async (committeeId: string, expenseId: string): Promise<void> => {

    await api.delete(`/graduation/committees/${committeeId}/expenses/${expenseId}`);

  },



  createCommitteeSupplier: async (

    committeeId: string,

    payload: {

      companyName: string;

      serviceDescription?: string;

      contactName?: string;

      contactPhone?: string;

      contactEmail?: string;

      estimatedCost?: number | null;

      status?: string;

      notes?: string;

    }

  ): Promise<GraduationCommitteeSupplierRecord> => {

    return api.post<GraduationCommitteeSupplierRecord>(

      `/graduation/committees/${committeeId}/suppliers`,

      payload

    );

  },



  updateCommitteeSupplier: async (

    committeeId: string,

    supplierId: string,

    payload: {

      companyName: string;

      serviceDescription?: string;

      contactName?: string;

      contactPhone?: string;

      contactEmail?: string;

      estimatedCost?: number | null;

      status?: string;

      notes?: string;

    }

  ): Promise<GraduationCommitteeSupplierRecord> => {

    return api.patch<GraduationCommitteeSupplierRecord>(

      `/graduation/committees/${committeeId}/suppliers/${supplierId}`,

      payload

    );

  },



  deleteCommitteeSupplier: async (committeeId: string, supplierId: string): Promise<void> => {

    await api.delete(`/graduation/committees/${committeeId}/suppliers/${supplierId}`);

  },



  createCommitteeActivity: async (

    committeeId: string,

    payload: {

      title: string;

      description?: string;

      status?: string;

      assignedTo?: string;

      dueDate?: string | null;

    }

  ): Promise<GraduationCommitteeActivityRecord> => {

    return api.post<GraduationCommitteeActivityRecord>(

      `/graduation/committees/${committeeId}/activities`,

      payload

    );

  },



  updateCommitteeActivity: async (

    committeeId: string,

    activityId: string,

    payload: {

      title: string;

      description?: string;

      status?: string;

      assignedTo?: string;

      dueDate?: string | null;

    }

  ): Promise<GraduationCommitteeActivityRecord> => {

    return api.patch<GraduationCommitteeActivityRecord>(

      `/graduation/committees/${committeeId}/activities/${activityId}`,

      payload

    );

  },



  deleteCommitteeActivity: async (committeeId: string, activityId: string): Promise<void> => {

    await api.delete(`/graduation/committees/${committeeId}/activities/${activityId}`);

  },

};

