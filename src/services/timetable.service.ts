import api from '@/lib/api';

export interface TimetableClass {
  id: string;
  name: string;
  courseId: string;
  lecturerId: string | null;
  venueId: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  enrolledCount: number;
  course: {
    id: string;
    code: string;
    name: string;
    level: number;
    semester: number;
    department: {
      id: string;
      name: string;
      code: string;
      school: {
        id: string;
        name: string;
        code: string;
      } | null;
    };
    program?: {
      id: string;
      name: string;
      code: string;
    } | null;
  };
  venue: {
    id: string;
    name: string;
    code: string;
  } | null;
  lecturer: {
    id: string;
    name: string;
  } | null;
}

export interface TimetableImportResult {
  success: boolean;
  summary: {
    totalRows: number;
    processed?: number;
    skipped?: number;
    departmentsCreated?: number;
    departmentsMatched?: number;
    coursesCreated?: number;
    coursesMatched?: number;
    venuesCreated?: number;
    venuesMatched?: number;
    classesCreated?: number;
    classesUpdated?: number;
    lecturersMatched?: number;
    lecturersUnmatched?: number;
  };
  errors: Array<{ row: number; error: string; data?: any }>;
  warnings: Array<{ row: number; warning: string; data?: any }>;
}

export interface TimetableQuery {
  programId?: string;
  program?: string;
  year?: number;
  semester?: number;
  day?: string;
  courseCode?: string;
  page?: number;
  limit?: number;
  sortBy?: 'program' | 'day' | 'time' | 'course';
  sortOrder?: 'asc' | 'desc';
}

export interface UpdateClassDto {
  name?: string;
  lecturerId?: string | null;
  venueId?: string | null;
  dayOfWeek?: number;
  startTime?: string;
  endTime?: string;
  capacity?: number;
  courseId?: string;
}

export const timetableService = {
  importTimetable: async (
    file: File,
    dryRun: boolean,
    params: { programId: string; year: number; semester: number }
  ): Promise<TimetableImportResult> => {
    const formData = new FormData();
    formData.append('file', file);
    formData.append('dryRun', String(dryRun));
    formData.append('programId', params.programId);
    formData.append('year', String(params.year));
    formData.append('semester', String(params.semester));

    const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
    const response = await fetch(`${base}/timetable/import`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${localStorage.getItem('kcu-token')}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.message || 'Import failed');
    }

    const data = await response.json();
    return data.data || data;
  },

  getTimetable: async (query?: TimetableQuery): Promise<{ data: TimetableClass[]; total: number; page: number; pageSize: number }> => {
    const params = new URLSearchParams();
    if (query?.programId) params.append('programId', query.programId);
    if (query?.program) params.append('program', query.program);
    if (query?.year != null) params.append('year', String(query.year));
    if (query?.semester != null) params.append('semester', String(query.semester));
    if (query?.day) params.append('day', query.day);
    if (query?.courseCode) params.append('courseCode', query.courseCode);
    if (query?.page) params.append('page', String(query.page));
    if (query?.limit) params.append('limit', String(query.limit));
    if (query?.sortBy) params.append('sortBy', query.sortBy);
    if (query?.sortOrder) params.append('sortOrder', query.sortOrder);

    const res = await api.get<{ data: TimetableClass[]; total: number; page: number; pageSize: number }>(`/timetable?${params.toString()}`);
    if (res && typeof res === 'object' && 'data' in res) {
      return res as { data: TimetableClass[]; total: number; page: number; pageSize: number };
    }
    return { data: Array.isArray(res) ? res : [], total: 0, page: 1, pageSize: 50 };
  },

  getStudentTimetable: async (studentId: string, date?: string): Promise<TimetableClass[]> => {
    const params = date ? `?date=${date}` : '';
    const res = await api.get<TimetableClass[]>(`/timetable/student/${studentId}${params}`);
    return Array.isArray(res) ? res : [];
  },

  getMyTimetable: async (date?: string): Promise<TimetableClass[]> => {
    const params = date ? `?date=${date}` : '';
    const res = await api.get<TimetableClass[]>(`/timetable/me${params}`);
    return Array.isArray(res) ? res : [];
  },

  updateClass: async (id: string, dto: UpdateClassDto): Promise<TimetableClass> => {
    return api.put<TimetableClass>(`/timetable/class/${id}`, dto);
  },

  downloadTemplate: async (format: 'csv' | 'excel'): Promise<void> => {
    const token = localStorage.getItem('kcu-token');
    const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
    const url = `${base}/timetable/template?format=${format}`;
    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
      },
    });

    if (!response.ok) {
      throw new Error('Failed to download template');
    }

    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = format === 'excel' ? 'timetable_template.xlsx' : 'timetable_template.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  deleteClass: async (id: string): Promise<{ success: boolean; message: string }> => {
    return api.delete<{ success: boolean; message: string }>(`/timetable/class/${id}`);
  },

  getScheduledSessions: async (params: {
    dateFrom: string;
    dateTo: string;
    schoolId?: string;
    courseId?: string;
    lecturerId?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> => {
    const query: Record<string, string> = {
      dateFrom: params.dateFrom,
      dateTo: params.dateTo,
    };
    if (params.schoolId) query.schoolId = params.schoolId;
    if (params.courseId) query.courseId = params.courseId;
    if (params.lecturerId) query.lecturerId = params.lecturerId;
    if (params.page != null) query.page = String(params.page);
    if (params.limit != null) query.limit = String(params.limit);
    const res = await api.get<{ data: any[]; total: number; page: number; pageSize: number }>('/timetable/scheduled-sessions', query);
    return Array.isArray(res) ? { data: res, total: res.length, page: 1, pageSize: res.length } : (res as any);
  },

  getMyScheduledSessions: async (params: { dateFrom: string; dateTo: string; page?: number; limit?: number }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> => {
    const query: Record<string, string> = { dateFrom: params.dateFrom, dateTo: params.dateTo };
    if (params.page != null) query.page = String(params.page);
    if (params.limit != null) query.limit = String(params.limit);
    const res = await api.get<{ data: any[]; total: number; page: number; pageSize: number }>('/timetable/my-scheduled-sessions', query);
    return Array.isArray(res) ? { data: res, total: res.length, page: 1, pageSize: res.length } : (res as any);
  },

  getScheduledCountBySchool: async (dateFrom: string, dateTo: string): Promise<{ schoolName: string; scheduledCount: number }[]> => {
    const res = await api.get<{ schoolName: string; scheduledCount: number }[] | { data: { schoolName: string; scheduledCount: number }[] }>(
      '/timetable/scheduled-count-by-school',
      { dateFrom, dateTo }
    );
    const arr = Array.isArray(res) ? res : (res as { data?: { schoolName: string; scheduledCount: number }[] })?.data ?? [];
    return arr;
  },
};
