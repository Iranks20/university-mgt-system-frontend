import api from '@/lib/api';

export interface SubstitutionRequest {
  id: string;
  timetableId: string;
  requestedById: string;
  proposedSubstituteId: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  requestedAt: string;
  createdAt: string;
  updatedAt: string;
  timetable: {
    id: string;
    date: string;
    startTime: string;
    endTime: string;
    venue: string;
    status: string;
    classId: string;
  };
  requestedBy: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  proposedSubstitute: {
    id: string;
    firstName: string;
    lastName: string;
    email?: string;
  };
  className?: string;
  courseCode?: string | null;
  courseName?: string | null;
}

export interface SubmitSubstitutionPayload {
  timetableId: string;
  proposedSubstituteId: string;
  reason: string;
}

export interface ListSubstitutionsQuery {
  status?: 'Pending' | 'Approved' | 'Rejected';
  page?: number;
  limit?: number;
}

export interface PaginatedSubstitutions {
  data: SubstitutionRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface SubstituteCandidate {
  id: string;
  name: string;
  departmentId: string | null;
  departmentName: string | null;
}

export const substitutionsService = {
  submit: (payload: SubmitSubstitutionPayload): Promise<SubstitutionRequest> =>
    api.post<SubstitutionRequest>('/substitutions', payload),

  listCandidates: (): Promise<SubstituteCandidate[]> =>
    api.get<SubstituteCandidate[]>('/substitutions/candidates'),

  listMine: (query?: ListSubstitutionsQuery): Promise<PaginatedSubstitutions> => {
    const params: Record<string, string> = {};
    if (query?.status) params.status = query.status;
    if (query?.page) params.page = String(query.page);
    if (query?.limit) params.limit = String(query.limit);
    return api.get<PaginatedSubstitutions>(
      '/substitutions/mine',
      Object.keys(params).length ? params : undefined
    );
  },

  listPending: (query?: { page?: number; limit?: number }): Promise<PaginatedSubstitutions> => {
    const params: Record<string, string> = {};
    if (query?.page) params.page = String(query.page);
    if (query?.limit) params.limit = String(query.limit);
    return api.get<PaginatedSubstitutions>(
      '/substitutions/pending',
      Object.keys(params).length ? params : undefined
    );
  },

  listHistory: (query?: { page?: number; limit?: number }): Promise<PaginatedSubstitutions> => {
    const params: Record<string, string> = {};
    if (query?.page) params.page = String(query.page);
    if (query?.limit) params.limit = String(query.limit);
    return api.get<PaginatedSubstitutions>(
      '/substitutions/history',
      Object.keys(params).length ? params : undefined
    );
  },

  getById: (id: string): Promise<SubstitutionRequest> =>
    api.get<SubstitutionRequest>(`/substitutions/${id}`),

  approve: (id: string): Promise<SubstitutionRequest> =>
    api.post<SubstitutionRequest>(`/substitutions/${id}/approve`, {}),

  reject: (id: string, rejectionReason?: string): Promise<SubstitutionRequest> =>
    api.post<SubstitutionRequest>(`/substitutions/${id}/reject`, {
      rejectionReason: rejectionReason ?? undefined,
    }),
};
