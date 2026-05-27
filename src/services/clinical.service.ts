import api from '@/lib/api';

type Paged<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages?: number };

function toClinicalTimeHm(value: string | null | undefined): string | null | undefined {
  if (value == null || value === '') return null;
  const m = /^([01]?\d|2[0-3]):([0-5]\d)(?::([0-5]\d))?$/.exec(String(value).trim());
  if (!m) return null;
  return `${m[1].padStart(2, '0')}:${m[2].padStart(2, '0')}`;
}

export const clinicalService = {
  getSites: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    status?: 'active' | 'inactive' | 'all';
  }): Promise<Paged<any>> => {
    try {
      const res = await api.get<Paged<any>>('/clinical/sites', params as any);
      return { data: res?.data ?? [], total: res?.total ?? 0, page: res?.page ?? 1, pageSize: res?.pageSize ?? 50 };
    } catch (error) {
      console.error('Error fetching clinical sites:', error);
      return { data: [], total: 0, page: 1, pageSize: 50 };
    }
  },

  deleteSite: async (id: string): Promise<{ outcome: 'deleted' | 'deactivated'; enrolledStudentCount: number; data: any }> => {
    return api.delete(`/clinical/sites/${id}`);
  },

  createSite: async (payload: { code: string; name: string; location?: string; description?: string; isActive?: boolean }) => {
    return api.post('/clinical/sites', payload);
  },

  updateSite: async (id: string, payload: { code?: string; name?: string; location?: string; description?: string; isActive?: boolean }) => {
    return api.put(`/clinical/sites/${id}`, payload);
  },

  getInstructorDirectory: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    clinicalSiteId?: string;
    scope?: 'all' | 'university' | 'external' | 'teaching';
  }): Promise<Paged<any>> => {
    try {
      const res = await api.get<Paged<any> | any[]>('/clinical/instructors/directory', params as Record<string, unknown>);
      if (Array.isArray(res)) {
        return { data: res, total: res.length, page: 1, pageSize: res.length };
      }
      return {
        data: res?.data ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 50,
      };
    } catch (error) {
      console.error('Error fetching instructor directory:', error);
      return { data: [], total: 0, page: 1, pageSize: 50 };
    }
  },

  searchUnlinkedLecturers: async (params?: {
    search?: string;
    limit?: number;
  }): Promise<Array<{ staffId: string; staffNumber: string; fullName: string; email: string }>> => {
    try {
      const res = await api.get<
        { data: Array<{ staffId: string; staffNumber: string; fullName: string; email: string }> } | Array<unknown>
      >('/clinical/instructors/unlinked-lecturers', params as Record<string, unknown>);
      if (Array.isArray(res)) return res as Array<{ staffId: string; staffNumber: string; fullName: string; email: string }>;
      return res?.data ?? [];
    } catch (error) {
      console.error('Error fetching unlinked lecturers:', error);
      return [];
    }
  },

  linkInstructorFromLecturer: async (payload: {
    staffId: string;
    cadre?: string;
    clinicalSiteIds?: string[];
  }) => {
    return api.post('/clinical/instructors/from-lecturer', payload);
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

  createInstructor: async (payload: { fullName: string; cadre?: string; phone?: string; email?: string; clinicalSiteIds?: string[]; isActive?: boolean }) => {
    return api.post('/clinical/instructors', payload);
  },

  updateInstructor: async (
    id: string,
    payload: { fullName?: string; cadre?: string; phone?: string; email?: string; clinicalSiteIds?: string[]; isActive?: boolean }
  ) => {
    return api.put(`/clinical/instructors/${id}`, payload);
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
    programIntakeId?: string | null;
    cohort?: string;
    year?: number | null;
    semester?: number | null;
    intakeType?: 'Day' | 'Evening' | 'Weekend' | null;
    startDate?: string;
    endDate?: string;
    isActive?: boolean;
  }) => {
    return api.post('/clinical/rotations', payload);
  },

  updateRotation: async (
    id: string,
    payload: {
      name?: string;
      clinicalSiteId?: string;
      programId?: string | null;
      programIntakeId?: string | null;
      cohort?: string;
      year?: number | null;
      semester?: number | null;
      intakeType?: 'Day' | 'Evening' | 'Weekend' | null;
      startDate?: string;
      endDate?: string;
      isActive?: boolean;
    }
  ) => {
    return api.put(`/clinical/rotations/${id}`, payload);
  },

  getClinicalProgramIntakes: async (params?: {
    programId?: string;
    year?: number;
    semester?: number;
    intakeType?: 'Day' | 'Evening' | 'Weekend';
  }): Promise<Array<{ id: string; programId: string; year: number; semester: number; intakeType: string; label: string }>> => {
    try {
      const res = await api.get<any[] | { data: any[] }>('/clinical/program-intakes', params as any);
      const raw = Array.isArray(res) ? res : res?.data ?? [];
      return Array.isArray(raw) ? raw : [];
    } catch (error) {
      console.error('Error fetching clinical program intakes:', error);
      return [];
    }
  },

  getClinicalClasses: async (params: {
    programIntakeId: string;
    page?: number;
    limit?: number;
    search?: string;
  }): Promise<Paged<any> & { meta?: { cohortStudentCount?: number } }> => {
    try {
      const res = await api.get<Paged<any> & { meta?: { cohortStudentCount?: number } }>('/clinical/classes', params as any);
      return {
        data: res?.data ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 100,
        meta: (res as any)?.meta,
      };
    } catch (error) {
      console.error('Error fetching clinical classes:', error);
      return { data: [], total: 0, page: 1, pageSize: 100 };
    }
  },

  getRotationRoster: async (rotationId: string, params?: { status?: string }): Promise<any[]> => {
    try {
      const res = await api.get<any[] | { data: any[] }>(`/clinical/rotations/${rotationId}/students`, params as any);
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching rotation roster:', error);
      return [];
    }
  },

  getSessionRoster: async (sessionId: string): Promise<any[]> => {
    try {
      const res = await api.get<any[] | { data: any[] }>(`/clinical/sessions/${sessionId}/roster`);
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching session roster:', error);
      return [];
    }
  },

  searchSessionInstructorPicker: async (params?: {
    search?: string;
    clinicalSiteId?: string;
    limit?: number;
  }): Promise<Array<{ kind: 'clinical' | 'lecturer'; id: string; label: string; description?: string }>> => {
    try {
      type PickerRow = { kind: 'clinical' | 'lecturer'; id: string; label: string; description?: string };
      const res = await api.get<PickerRow[] | { data: PickerRow[] }>(
        '/clinical/instructor-picker',
        params as Record<string, unknown>
      );
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching session instructor picker:', error);
      return [];
    }
  },

  getEligibleStudents: async (params?: {
    page?: number;
    limit?: number;
    search?: string;
    programId?: string;
    programIntakeId?: string;
    classId?: string;
    year?: number;
    semester?: number;
    clinicalRotationId?: string;
    includeIneligible?: boolean;
  }): Promise<
    Paged<any> & {
      meta?: { summary?: { total: number; canEnroll: number; onRotation: number; blocked: number } };
    }
  > => {
    try {
      const query: Record<string, string | number | boolean | undefined> = {
        page: params?.page,
        limit: params?.limit,
        search: params?.search,
        programId: params?.programId,
        programIntakeId: params?.programIntakeId,
        classId: params?.classId,
        year: params?.year,
        semester: params?.semester,
        clinicalRotationId: params?.clinicalRotationId,
        includeIneligible: params?.includeIneligible ? 'true' : undefined,
      };
      const res = await api.get<Paged<any>>('/clinical/eligible-students', query);
      return {
        data: res?.data ?? [],
        total: res?.total ?? 0,
        page: res?.page ?? 1,
        pageSize: res?.pageSize ?? 100,
        meta: (res as any)?.meta,
      };
    } catch (error) {
      console.error('Error fetching eligible students:', error);
      return { data: [], total: 0, page: 1, pageSize: 100 };
    }
  },

  addRotationStudents: async (rotationId: string, payload: { studentIds: string[]; startDate?: string | null }) => {
    return api.post(`/clinical/rotations/${rotationId}/students`, payload);
  },

  bulkEnrollRotation: async (
    rotationId: string,
    payload?: { classId?: string; programIntakeId?: string; year?: number; semester?: number }
  ): Promise<{ roster: any[]; enrolled: number }> => {
    const res = await api.post<any[] | { data: any[]; meta?: { enrolled?: number } }>(
      `/clinical/rotations/${rotationId}/students/bulk-enroll`,
      payload ?? {}
    );
    const roster = Array.isArray(res) ? res : (res as any)?.data ?? [];
    const enrolled = (res as any)?.meta?.enrolled ?? roster.length;
    return { roster, enrolled };
  },

  updateRotationStudent: async (
    rotationId: string,
    studentId: string,
    payload: { status?: 'Active' | 'Completed' | 'Withdrawn'; startDate?: string | null; endDate?: string | null }
  ) => {
    return api.patch(`/clinical/rotations/${rotationId}/students/${studentId}`, payload);
  },

  removeRotationStudent: async (rotationId: string, studentId: string) => {
    return api.delete(`/clinical/rotations/${rotationId}/students/${studentId}`);
  },

  getProgramPolicies: async (status: 'active' | 'inactive' | 'all' = 'active'): Promise<any[]> => {
    try {
      const res = await api.get<any[] | { data: any[] }>('/clinical/program-policies', { status });
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching program clinical policies:', error);
      return [];
    }
  },

  getClinicalPrograms: async (): Promise<Array<{ id: string; name: string; code?: string }>> => {
    try {
      const res = await api.get<Array<{ id: string; name: string; code?: string }> | { data: any[] }>(
        '/clinical/programs'
      );
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching clinical programs:', error);
      return [];
    }
  },

  upsertProgramPolicy: async (
    programId: string,
    payload: { minYear: number; minSemester: number; isActive?: boolean }
  ) => {
    return api.put(`/clinical/program-policies/${programId}`, payload);
  },

  getDashboardOverview: async (): Promise<{
    totals: {
      sites: number;
      activeRotations: number;
      studentsOnPlacement: number;
      pendingVerification: number;
      totalSessions: number;
    };
    sites: Array<{
      clinicalSiteId: string;
      clinicalSiteName: string;
      clinicalSiteCode: string;
      activeRotations: number;
      studentsOnPlacement: number;
      pendingSessions: number;
      totalSessions: number;
    }>;
  }> => {
    try {
      const res = await api.get<{ data: any } | any>('/clinical/dashboard/overview');
      return (res as any)?.data ?? res;
    } catch (error) {
      console.error('Error fetching clinical dashboard:', error);
      return {
        totals: { sites: 0, activeRotations: 0, studentsOnPlacement: 0, pendingVerification: 0, totalSessions: 0 },
        sites: [],
      };
    }
  },

  copyRotationRoster: async (
    sourceRotationId: string,
    payload: { targetRotationId: string; copyStatuses?: Array<'Active' | 'Completed' | 'Withdrawn'> }
  ) => {
    const res = await api.post<{ data: { copied: number; skipped: number; roster: any[] } }>(
      `/clinical/rotations/${sourceRotationId}/copy-roster`,
      payload
    );
    return (res as any)?.data ?? res;
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
    staffId?: string | null;
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

  getAssignments: async (params?: { clinicalSiteId?: string }): Promise<any[]> => {
    try {
      const res = await api.get<any[] | { data: any[] }>('/clinical/assignments', params as any);
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching clinical assignments:', error);
      return [];
    }
  },

  getAssignableUsers: async (): Promise<any[]> => {
    try {
      const res = await api.get<any[] | { data: any[] }>('/clinical/assignable-users');
      return Array.isArray(res) ? res : res?.data ?? [];
    } catch (error) {
      console.error('Error fetching assignable clinical users:', error);
      return [];
    }
  },

  createAssignment: async (payload: { userId: string; clinicalSiteId: string; isPrimary?: boolean }) => {
    return api.post('/clinical/assignments', payload);
  },

  deleteAssignment: async (id: string) => {
    return api.delete(`/clinical/assignments/${id}`);
  },

  previewReport: async (
    reportType: string,
    params: Record<string, string | number | undefined>
  ): Promise<any> => {
    const res = await api.get<{ data: any } | any>(`/clinical/reports/${reportType}/preview`, params as any);
    return (res as any)?.data ?? res;
  },

  exportReport: async (reportType: string, params: Record<string, string | number | undefined>): Promise<void> => {
    const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
    const token = typeof window !== 'undefined' ? localStorage.getItem('kcu-token') : null;
    const query = new URLSearchParams(params as Record<string, string>).toString();
    const url = `${base}/clinical/reports/${reportType}/export?${query}`;
    const response = await fetch(url, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(err.message || 'Export failed');
    }
    const disposition = response.headers.get('Content-Disposition') || '';
    const match = /filename="?([^";]+)"?/.exec(disposition);
    const filename = match?.[1] || `${reportType}.xlsx`;
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    window.URL.revokeObjectURL(downloadUrl);
  },
};

export const CLINICAL_QA_REPORT_TYPES = [
  { id: 'daily-student-register', label: 'Daily Student Register' },
  { id: 'student-attendance-summary', label: 'Student Summary' },
  { id: 'weekly-attendance-summary', label: 'Weekly Summary' },
  { id: 'lecturer-teaching-sessions', label: 'Teaching Sessions' },
  { id: 'course-topic-attendance', label: 'Topic Attendance' },
  { id: 'individual-student-attendance', label: 'Individual Student' },
] as const;
