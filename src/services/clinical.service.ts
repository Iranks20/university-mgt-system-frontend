import api from '@/lib/api';

type Paged<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages?: number };

function toClinicalTimeHm(value: string | null | undefined): string | null | undefined {
  if (value == null || value === '') return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value).trim());
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
}

export const clinicalService = {
  getSites: async (params?: { page?: number; limit?: number; search?: string }): Promise<Paged<any>> => {
    try {
      const res = await api.get<Paged<any>>('/clinical/sites', params as any);
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 50 };
    } catch (error) {
      console.error('Error fetching clinical sites:', error);
      return { data: [], total: 0, page: 1, pageSize: 50 };
    }
  },

  createSite: async (payload: { code: string; name: string; location?: string; description?: string; isActive?: boolean }) => {
    return api.post('/clinical/sites', payload);
  },

  updateSite: async (id: string, payload: { code?: string; name?: string; location?: string; description?: string; isActive?: boolean }) => {
    return api.put(`/clinical/sites/${id}`, payload);
  },

  getInstructors: async (params?: { page?: number; limit?: number; search?: string; clinicalSiteId?: string }): Promise<Paged<any>> => {
    try {
      const res = await api.get<Paged<any>>('/clinical/instructors', params as any);
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 50 };
    } catch (error) {
      console.error('Error fetching clinical instructors:', error);
      return { data: [], total: 0, page: 1, pageSize: 50 };
    }
  },

  createInstructor: async (payload: { fullName: string; cadre?: string; phone?: string; email?: string; clinicalSiteIds?: string[] }) => {
    return api.post('/clinical/instructors', payload);
  },

  getRotations: async (params?: { page?: number; limit?: number; search?: string; clinicalSiteId?: string }): Promise<Paged<any>> => {
    try {
      const res = await api.get<Paged<any>>('/clinical/rotations', params as any);
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 50 };
    } catch (error) {
      console.error('Error fetching clinical rotations:', error);
      return { data: [], total: 0, page: 1, pageSize: 50 };
    }
  },

  createRotation: async (payload: {
    name: string;
    clinicalSiteId: string;
    programId?: string | null;
    cohort?: string;
    year?: number | null;
    intakeType?: 'Day' | 'Evening' | 'Weekend' | null;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) => {
    return api.post('/clinical/rotations', payload);
  },

  getSessions: async (params?: { page?: number; limit?: number; search?: string; clinicalSiteId?: string }): Promise<Paged<any>> => {
    try {
      const res = await api.get<Paged<any>>('/clinical/sessions', params as any);
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 50 };
    } catch (error) {
      console.error('Error fetching clinical sessions:', error);
      return { data: [], total: 0, page: 1, pageSize: 50 };
    }
  },

  createSession: async (payload: {
    clinicalSiteId: string;
    clinicalRotationId?: string | null;
    clinicalInstructorId?: string | null;
    instructorName?: string | null;
    topic: string;
    date: string;
    startTime?: string | null;
    endTime?: string | null;
    notes?: string | null;
  }) => {
    const startTime = toClinicalTimeHm(payload.startTime ?? null);
    const endTime = toClinicalTimeHm(payload.endTime ?? null);
    return api.post('/clinical/sessions', { ...payload, startTime, endTime });
  },

  markAttendance: async (
    sessionId: string,
    payload: { attendances: Array<{ studentId: string; status: 'Present' | 'Absent' | 'Late' | 'Excused'; remarks?: string }> }
  ) => {
    return api.post(`/clinical/sessions/${sessionId}/attendance`, payload);
  },

  verifySession: async (sessionId: string) => {
    return api.post(`/clinical/sessions/${sessionId}/verify`, {});
  },

  getSiteSummary: async (params?: { dateFrom?: string; dateTo?: string }): Promise<any[]> => {
    try {
      const res = await api.get<{ data: any[] } | any[]>('/clinical/reports/site-summary', params as any);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    } catch (error) {
      console.error('Error fetching site summary:', error);
      return [];
    }
  },

  getInstructorFrequency: async (params?: { dateFrom?: string; dateTo?: string }): Promise<any[]> => {
    try {
      const res = await api.get<{ data: any[] } | any[]>('/clinical/reports/instructor-frequency', params as any);
      return Array.isArray(res) ? res : (res as any)?.data ?? [];
    } catch (error) {
      console.error('Error fetching instructor frequency:', error);
      return [];
    }
  },
};
