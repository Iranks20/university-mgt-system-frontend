import api from '@/lib/api';

export const enrollmentService = {
  getEnrollments: async (params?: { studentId?: string; classId?: string; status?: string; page?: number; limit?: number }) => {
    try {
      const response = await api.get('/enrollments', params);
      return Array.isArray(response) ? { data: response, total: response.length, page: 1, pageSize: response.length } : response;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  getStudentEnrollments: async (studentId: string) => {
    try {
      const response = await api.get<unknown>(`/enrollments/student/${studentId}`);
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      return [];
    }
  },

  getMyEnrollments: async () => {
    try {
      const response = await api.get<unknown>('/enrollments/me/enrollments');
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching my enrollments:', error);
      return [];
    }
  },

  getClassEnrollments: async (classId: string) => {
    try {
      const response = await api.get<unknown>(`/enrollments/class/${classId}`);
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching class enrollments:', error);
      return [];
    }
  },

  createEnrollment: async (data: { studentId: string; classId: string; status?: string }) => {
    try {
      return await api.post('/enrollments', data);
    } catch (error) {
      console.error('Error creating enrollment:', error);
      throw error;
    }
  },

  bulkEnroll: async (data: { studentIds: string[]; classId: string; status?: string }) => {
    try {
      return await api.post('/enrollments/bulk', data);
    } catch (error) {
      console.error('Error bulk enrolling:', error);
      throw error;
    }
  },

  updateEnrollment: async (id: string, data: { status?: string }) => {
    try {
      return await api.put(`/enrollments/${id}`, data);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      throw error;
    }
  },

  deleteEnrollment: async (id: string) => {
    try {
      await api.delete(`/enrollments/${id}`);
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      throw error;
    }
  },

  previewCourses: async (params: { departmentId?: string; programId?: string; program?: string; year?: number; semester?: number }) => {
    try {
      const response = await api.get('/enrollments/preview-courses', params);
      return Array.isArray(response) ? response : (response as any)?.data || [];
    } catch (error) {
      console.error('Error previewing courses:', error);
      return [];
    }
  },
};
