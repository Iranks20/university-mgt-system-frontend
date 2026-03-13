import api from '@/lib/api';

export interface CancellationRequest {
  id: string;
  timetableId: string;
  requestedById: string;
  reason: string;
  status: 'Pending' | 'Approved' | 'Rejected';
  reviewedById: string | null;
  reviewedAt: string | null;
  rejectionReason: string | null;
  compensationDate?: string | null;
  compensationStartTime?: string | null;
  compensationEndTime?: string | null;
  compensationVenue?: string | null;
  compensationTimetableId?: string | null;
  compensationTimetable?: { id: string; date: string; startTime: string; endTime: string; venue: string } | null;
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
  className?: string;
  courseCode?: string | null;
  courseName?: string | null;
}

export interface SubmitCancellationPayload {
  timetableId: string;
  reason: string;
  compensationDate?: string;
  compensationStartTime?: string;
  compensationEndTime?: string;
  compensationVenue?: string;
}

export interface ListCancellationsQuery {
  status?: 'Pending' | 'Approved' | 'Rejected';
  page?: number;
  limit?: number;
}

export interface PaginatedCancellations {
  data: CancellationRequest[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export const cancellationsService = {
  submit: (payload: SubmitCancellationPayload): Promise<CancellationRequest> =>
    api.post<CancellationRequest>('/cancellations', payload),

  listMine: (query?: ListCancellationsQuery): Promise<PaginatedCancellations> => {
    const params: Record<string, string> = {};
    if (query?.status) params.status = query.status;
    if (query?.page) params.page = String(query.page);
    if (query?.limit) params.limit = String(query.limit);
    return api.get<PaginatedCancellations>('/cancellations/mine', Object.keys(params).length ? params : undefined);
  },

  listPending: (query?: { page?: number; limit?: number }): Promise<PaginatedCancellations> => {
    const params: Record<string, string> = {};
    if (query?.page) params.page = String(query.page);
    if (query?.limit) params.limit = String(query.limit);
    return api.get<PaginatedCancellations>('/cancellations/pending', Object.keys(params).length ? params : undefined);
  },

  listHistory: (query?: { page?: number; limit?: number }): Promise<PaginatedCancellations> => {
    const params: Record<string, string> = {};
    if (query?.page) params.page = String(query.page);
    if (query?.limit) params.limit = String(query.limit);
    return api.get<PaginatedCancellations>('/cancellations/history', Object.keys(params).length ? params : undefined);
  },

  getById: (id: string): Promise<CancellationRequest> =>
    api.get<CancellationRequest>(`/cancellations/${id}`),

  approve: (id: string): Promise<CancellationRequest> =>
    api.post<CancellationRequest>(`/cancellations/${id}/approve`, {}),

  reject: (id: string, rejectionReason?: string): Promise<CancellationRequest> =>
    api.post<CancellationRequest>(`/cancellations/${id}/reject`, { rejectionReason: rejectionReason ?? undefined }),
};
