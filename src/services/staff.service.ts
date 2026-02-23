import api from '@/lib/api';
import type { Staff, Lecturer } from '@/types';

export const staffService = {
  getStaff: async (params?: { search?: string; role?: string; department?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Staff[]; total: number; page: number; pageSize: number }> => {
    try {
      const response = await api.get<{ data: Staff[]; total: number; page: number; pageSize: number }>('/staff', params);
      return Array.isArray(response) ? { data: response, total: response.length, page: 1, pageSize: response.length } : response;
    } catch (error) {
      console.error('Error fetching staff:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  getStaffById: async (id: string): Promise<Staff | null> => {
    try {
      return await api.get<Staff>(`/staff/${id}`);
    } catch (error) {
      console.error('Error fetching staff:', error);
      return null;
    }
  },

  getLecturers: async (params?: { search?: string; department?: string; status?: string; page?: number; limit?: number }): Promise<{ data: Lecturer[]; total: number; page: number; pageSize: number }> => {
    try {
      const response = await api.get<{ data: Lecturer[]; total: number; page: number; pageSize: number }>('/staff/lecturers', params);
      return Array.isArray(response) ? { data: response, total: response.length, page: 1, pageSize: response.length } : response;
    } catch (error) {
      console.error('Error fetching lecturers:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  createStaff: async (staffData: Omit<Staff, 'id' | 'hireDate'>): Promise<Staff> => {
    try {
      return await api.post<Staff>('/staff', staffData);
    } catch (error) {
      console.error('Error creating staff:', error);
      throw error;
    }
  },

  getDashboardStats: async (): Promise<{
    attendanceRate: string;
    presentDays: string;
    totalHours: string;
    staffName: string;
    role: string;
    departmentId: string;
  } | null> => {
    try {
      return await api.get<any>('/staff/me/dashboard-stats');
    } catch (error) {
      console.error('Error fetching staff dashboard stats:', error);
      return null;
    }
  },

  getLecturerStudentRating: async (): Promise<{ rating: number; maxRating: number; totalRatings: number } | null> => {
    try {
      return await api.get<any>('/staff/me/student-rating');
    } catch (error) {
      console.error('Error fetching lecturer student rating:', error);
      return null;
    }
  },

  getLecturerDepartmentRank: async (): Promise<{ rank: number; totalLecturers: number; performance: number } | null> => {
    try {
      return await api.get<any>('/staff/me/department-rank');
    } catch (error) {
      console.error('Error fetching lecturer department rank:', error);
      return null;
    }
  },

  recordCheckIn: async (location?: string): Promise<void> => {
    await api.post('/staff/me/check-in', location != null ? { location } : {});
  },

  recordCheckOut: async (): Promise<void> => {
    await api.post('/staff/me/check-out', {});
  },

  getCheckInHistory: async (): Promise<{ date: string; checkIn: string; checkOut: string; status: string }[]> => {
    try {
      const response = await api.get<any>('/staff/me/check-in-history');
      const data = Array.isArray(response) ? response : (response?.data ?? []);
      return data.map((r: any) => ({
        date: r.date ? new Date(r.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : '—',
        checkIn: r.checkInAt ? new Date(r.checkInAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
        checkOut: r.checkOutAt ? new Date(r.checkOutAt).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' }) : '—',
        status: r.status || 'Present',
      }));
    } catch (error) {
      console.error('Error fetching staff check-in history:', error);
      return [];
    }
  },

  updateStaff: async (id: string, staff: Partial<Staff>): Promise<Staff> => {
    try {
      return await api.put<Staff>(`/staff/${id}`, staff);
    } catch (error) {
      console.error('Error updating staff:', error);
      throw error;
    }
  },

  deleteStaff: async (id: string): Promise<void> => {
    try {
      await api.delete(`/staff/${id}`);
    } catch (error) {
      console.error('Error deleting staff:', error);
      throw error;
    }
  },

  getStaffStudentRating: async (id: string): Promise<{ rating: number; maxRating: number; totalRatings: number } | null> => {
    try {
      const response = await api.get<any>(`/staff/${id}/student-rating`);
      return response?.data ?? response ?? null;
    } catch (error) {
      console.error('Error fetching staff student rating:', error);
      return null;
    }
  },

  importStaff: async (file: File, createAccounts: boolean = false): Promise<{ imported: number; failed: number; errors?: string[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createAccounts', String(createAccounts));
      return await api.post<{ imported: number; failed: number; errors?: string[] }>('/staff/import', formData);
    } catch (error) {
      console.error('Error importing staff:', error);
      throw error;
    }
  },
};
