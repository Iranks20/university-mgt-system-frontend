import api from '@/lib/api';

export const analyticsService = {
  getLecturerPerformance: async (lecturerId?: string, startDate?: string, endDate?: string) => {
    try {
      const params: Record<string, string> = {};
      if (lecturerId) params.lecturerId = lecturerId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      return await api.get('/analytics/lecturer-performance', params);
    } catch (error) {
      console.error('Error fetching lecturer performance:', error);
      return null;
    }
  },

  getStudentPerformance: async (studentId?: string, startDate?: string, endDate?: string) => {
    try {
      const params: Record<string, string> = {};
      if (studentId) params.studentId = studentId;
      if (startDate) params.startDate = startDate;
      if (endDate) params.endDate = endDate;
      return await api.get('/analytics/student-performance', params);
    } catch (error) {
      console.error('Error fetching student performance:', error);
      return null;
    }
  },

  getWorstPerformingLecturers: async (limit: number = 10) => {
    try {
      const response = await api.get<unknown>('/analytics/worst-lecturers', { limit: String(limit) });
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching worst lecturers:', error);
      return [];
    }
  },

  getWorstPerformingStudents: async (limit: number = 10, dateFrom?: string, dateTo?: string) => {
    try {
      const params: Record<string, string> = { limit: String(limit) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const response = await api.get<unknown>('/analytics/worst-students', params);
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching worst students:', error);
      return [];
    }
  },

  getDashboardStats: async () => {
    try {
      const response = await api.get<unknown>('/analytics/dashboard-stats');
      const r = response as unknown as { data?: unknown } | unknown[];
      return Array.isArray(r) ? r[0] : (r as { data?: unknown })?.data ?? r ?? null;
    } catch (error) {
      console.error('Error fetching dashboard stats:', error);
      return null;
    }
  },

  getAttendanceTrends: async (days: number = 7) => {
    try {
      const response = await api.get<unknown>('/analytics/attendance-trends', { days: String(days) });
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching attendance trends:', error);
      return [];
    }
  },

  getRecentLectures: async (limit: number = 10) => {
    try {
      const response = await api.get<unknown>('/analytics/recent-lectures', { limit: String(limit) });
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching recent lectures:', error);
      return [];
    }
  },

  getLecturerQualityTrend: async (months: number = 6): Promise<{ month: string; score: number }[]> => {
    try {
      const response = await api.get<unknown>('/analytics/lecturer-quality-trend', { months: String(months) });
      const r = response as unknown as { data?: { month: string; score: number }[] } | { month: string; score: number }[];
      return Array.isArray(r) ? r : (r as { data?: { month: string; score: number }[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching lecturer quality trend:', error);
      return [];
    }
  },

  getLecturerComplianceTrend: async (months: number = 6): Promise<{ month: string; rate: number }[]> => {
    try {
      const response = await api.get<unknown>('/analytics/lecturer-compliance-trend', { months: String(months) });
      const r = response as unknown as { data?: { month: string; rate: number }[] } | { month: string; rate: number }[];
      return Array.isArray(r) ? r : (r as { data?: { month: string; rate: number }[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching lecturer compliance trend:', error);
      return [];
    }
  },

  getAttendanceDistribution: async () => {
    try {
      const response = await api.get<unknown>('/analytics/attendance-distribution');
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching attendance distribution:', error);
      return [];
    }
  },

  getManagementOverview: async (): Promise<Record<string, unknown> | null> => {
    try {
      const response = await api.get<unknown>('/analytics/management-overview');
      const r = response as { data?: unknown } | unknown[] | null;
      const out = Array.isArray(r) ? r[0] : (r as { data?: unknown })?.data ?? (r as Record<string, unknown>) ?? null;
      return out as Record<string, unknown> | null;
    } catch (error) {
      console.error('Error fetching management overview:', error);
      return null;
    }
  },

  getTopPerformingStaff: async (limit: number = 10, dateFrom?: string, dateTo?: string) => {
    try {
      const params: Record<string, string> = { limit: String(limit) };
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;
      const response = await api.get<unknown>('/analytics/top-performing-staff', params);
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data ?? [];
    } catch (error) {
      console.error('Error fetching top performing staff:', error);
      return [];
    }
  },

  getDepartmentDistribution: async (): Promise<{ departments: { name: string; studentCount: number; staffCount: number }[] } | null> => {
    try {
      const response = await api.get<unknown>('/analytics/department-distribution');
      const r = response as { data?: unknown } | null;
      return (r?.data ?? r ?? null) as { departments: { name: string; studentCount: number; staffCount: number }[] } | null;
    } catch (error) {
      console.error('Error fetching department distribution:', error);
      return null;
    }
  },

  getStudentAcademicPerformance: async (studentId: string): Promise<{ academicScore: number; gpa: number; courses: { courseCode: string; score: number }[] } | null> => {
    try {
      const response = await api.get<unknown>(`/analytics/students/${studentId}/academic-performance`);
      const r = response as { data?: unknown } | null;
      return (r?.data ?? r ?? null) as { academicScore: number; gpa: number; courses: { courseCode: string; score: number }[] } | null;
    } catch (error) {
      console.error('Error fetching student academic performance:', error);
      return null;
    }
  },

  getTimeLostStats: async (): Promise<{ totalHours: number; bySchool: { school: string; hours: number }[]; byLecturer: { lecturerId: string; hours: number }[] } | null> => {
    try {
      const response = await api.get<unknown>('/analytics/time-lost');
      const r = response as { data?: unknown } | null;
      return (r?.data ?? r ?? null) as { totalHours: number; bySchool: { school: string; hours: number }[]; byLecturer: { lecturerId: string; hours: number }[] } | null;
    } catch (error) {
      console.error('Error fetching time lost stats:', error);
      return null;
    }
  },

  getTeachingStatsByRange: async (range: 'today' | 'yesterday' | 'this_week' | 'last_30_days'): Promise<{
    range: string;
    scheduledCount: number;
    taughtCount: number;
    untaughtCount: number;
    cancelledCount: number;
    substitutedCount: number;
    conductedCount: number;
    teachingRateFromScheduled: number | null;
    teachingRateFromRecorded: number | null;
  } | null> => {
    try {
      const response = await api.get<unknown>('/analytics/teaching-stats-by-range', { range });
      const r = response as { data?: unknown } | null;
      return (r?.data ?? r ?? null) as {
        range: string;
        scheduledCount: number;
        taughtCount: number;
        untaughtCount: number;
        cancelledCount: number;
        substitutedCount: number;
        conductedCount: number;
        teachingRateFromScheduled: number | null;
        teachingRateFromRecorded: number | null;
      } | null;
    } catch (error) {
      console.error('Error fetching teaching stats by range:', error);
      return null;
    }
  },
};
