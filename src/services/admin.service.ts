import api from '@/lib/api';

export interface SystemSettings {
  [category: string]: {
    [key: string]: string;
  };
}

export const adminService = {
  getSettings: async (): Promise<SystemSettings> => {
    try {
      const response = await api.get<{ data: SystemSettings }>('/admin/settings');
      return response?.data ?? response ?? {};
    } catch (error) {
      console.error('Error fetching settings:', error);
      return {};
    }
  },

  updateSettings: async (settings: Record<string, string>): Promise<any> => {
    try {
      return await api.put<any>('/admin/settings', { settings });
    } catch (error) {
      console.error('Error updating settings:', error);
      throw error;
    }
  },

  getSetting: async (key: string): Promise<string | null> => {
    try {
      const response = await api.get<{ data: { value: string } }>(`/admin/settings/${key}`);
      return response?.data?.value ?? null;
    } catch (error) {
      console.error('Error fetching setting:', error);
      return null;
    }
  },

  updateSetting: async (key: string, value: string): Promise<any> => {
    try {
      return await api.put<any>(`/admin/settings/${key}`, { value });
    } catch (error) {
      console.error('Error updating setting:', error);
      throw error;
    }
  },

  getUsers: async (params?: { page?: number; limit?: number; search?: string; role?: string }): Promise<{ data: any[]; total: number; page: number; pageSize: number }> => {
    try {
      const query = new URLSearchParams();
      if (params?.page != null) query.set('page', String(params.page));
      if (params?.limit != null) query.set('limit', String(params.limit));
      if (params?.search?.trim()) query.set('search', params.search.trim());
      if (params?.role && params.role !== 'all') query.set('role', params.role);
      const response = await api.get<{ data: any[]; total: number; page: number; pageSize: number }>('/admin/users' + (query.toString() ? '?' + query.toString() : ''));
      const out = response && typeof response === 'object' && 'data' in response ? response : { data: [], total: 0, page: 1, pageSize: 20 };
      return { data: Array.isArray(out.data) ? out.data : [], total: out.total ?? 0, page: out.page ?? 1, pageSize: out.pageSize ?? 20 };
    } catch (error) {
      console.error('Error fetching users:', error);
      throw error;
    }
  },

  createUser: async (data: { email: string; password: string; name: string; role: string }): Promise<any> => {
    try {
      const response = await api.post<{ data: any }>('/admin/users', data);
      return response?.data ?? response;
    } catch (error) {
      console.error('Error creating user:', error);
      throw error;
    }
  },

  getUserById: async (id: string): Promise<any> => {
    try {
      const response = await api.get<{ data: any }>(`/admin/users/${id}`);
      return response?.data ?? response;
    } catch (error) {
      console.error('Error fetching user:', error);
      throw error;
    }
  },

  updateUser: async (id: string, data: { name?: string; role?: string; isActive?: boolean }): Promise<any> => {
    try {
      return await api.put<any>(`/admin/users/${id}`, data);
    } catch (error) {
      console.error('Error updating user:', error);
      throw error;
    }
  },

  resetUserPassword: async (id: string, newPassword: string): Promise<any> => {
    try {
      return await api.post<any>(`/admin/users/${id}/reset-password`, { newPassword });
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  getAuditLog: async (params?: { page?: number; limit?: number; action?: string; entity?: string; userId?: string; startDate?: string; endDate?: string }): Promise<{ data: AuditLogEntry[]; total: number; page: number; pageSize: number }> => {
    try {
      const query = new URLSearchParams();
      if (params?.page != null) query.set('page', String(params.page));
      if (params?.limit != null) query.set('limit', String(params.limit));
      if (params?.action) query.set('action', params.action);
      if (params?.entity) query.set('entity', params.entity);
      if (params?.userId) query.set('userId', params.userId);
      if (params?.startDate) query.set('startDate', params.startDate);
      if (params?.endDate) query.set('endDate', params.endDate);
      const response = await api.get<{ data: AuditLogEntry[]; total: number; page: number; pageSize: number }>(`/admin/audit-log?${query.toString()}`);
      const out = response && typeof response === 'object' && 'total' in response ? response : { data: [], total: 0, page: 1, pageSize: 50 };
      return { data: Array.isArray(out.data) ? out.data : [], total: out.total ?? 0, page: out.page ?? 1, pageSize: out.pageSize ?? 50 };
    } catch (error) {
      console.error('Error fetching audit log:', error);
      throw error;
    }
  },

  getStrategicGoals: async (): Promise<{ name: string; progress: number }[]> => {
    try {
      const response = await api.get<{ data: { name: string; progress: number }[] }>('/admin/strategic-goals');
      const data = response?.data ?? response;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching strategic goals:', error);
      return [];
    }
  },

  updateStrategicGoals: async (goals: { name: string; progress: number }[]): Promise<{ name: string; progress: number }[]> => {
    try {
      const response = await api.put<{ data: { name: string; progress: number }[] }>('/admin/strategic-goals', { goals });
      const data = response?.data ?? response;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error updating strategic goals:', error);
      throw error;
    }
  },
};

export interface AuditLogEntry {
  id: string;
  userId: string | null;
  userName: string | null;
  userEmail: string | null;
  action: string;
  entity: string;
  entityId: string | null;
  details: string | null;
  ipAddress: string | null;
  userAgent: string | null;
  createdAt: string;
}
