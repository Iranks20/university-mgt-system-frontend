import api from '@/lib/api';
import type { AccessGrant, AccessScope } from '@/contexts/AuthContext';

export interface SystemSettings {
  [category: string]: {
    [key: string]: string;
  };
}

export type AdminRole =
  | 'QA'
  | 'QAClinicals'
  | 'ClinicalCoordinator'
  | 'Lecturer'
  | 'Student'
  | 'Staff'
  | 'HR'
  | 'Timekeeper'
  | 'Management'
  | 'Admin';

export interface RolePermissionsSnapshot {
  roles: AdminRole[];
  permissions: string[];
  permissionGroups?: Array<{ key: string; label: string; codes: string[] }>;
  byRole: Record<string, string[]>;
}

export interface PermissionGroupRow {
  id: string;
  key: string;
  name: string;
  sortOrder: number;
  isActive: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export interface PermissionCatalogRow {
  id: string;
  code: string;
  label: string | null;
  description: string | null;
  groupId: string | null;
  group: { id: string; key: string; name: string; sortOrder: number; isActive: boolean } | null;
  sortOrder: number;
  isVisible: boolean;
  createdAt?: string;
  updatedAt?: string;
}

export type AccessScopeMode = 'University' | 'OrgUnit';

export interface CustomRoleRow {
  id: string;
  code: string;
  name: string;
  description: string | null;
  isActive: boolean;
  scopeMode?: AccessScopeMode;
  isPositionProfile?: boolean;
  linkedUnitCount?: number;
  userCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

export interface AccessProfileRef {
  id: string;
  code: string;
  name: string;
  scopeMode: AccessScopeMode;
}

export interface PositionAccessUnit {
  id: string;
  name: string;
  code: string | null;
  unitType: string;
  parentId: string | null;
  headTitle: string | null;
  headAccessRole: AccessProfileRef | null;
  memberAccessRole: AccessProfileRef | null;
  appointmentCount: number;
}

export interface PositionAccessSnapshot {
  units: PositionAccessUnit[];
  profiles: (AccessProfileRef & { isPositionProfile: boolean })[];
}

export interface UserAccessDetails {
  user: { id: string; role: string; email: string; name: string };
  permissions: string[];
  scope: AccessScope;
  grants: AccessGrant[];
  directScope: { schoolIds: string[]; departmentIds: string[]; programIds: string[] };
}

export interface CreatedUserResult {
  id: string;
  email: string;
  name: string;
  role: string;
  temporaryPassword: string | null;
}

export interface PasswordResetResult {
  message: string;
  temporaryPassword: string | null;
}

export interface LecturerLoginResult {
  staffId: string;
  email: string;
  emailChanged: boolean;
  passwordChanged: boolean;
}

export const LECTURER_PASSWORD_MIN_LENGTH = 8;

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

  resetUserPassword: async (id: string, newPassword?: string): Promise<PasswordResetResult> => {
    try {
      return await api.post<PasswordResetResult>(
        `/admin/users/${id}/reset-password`,
        newPassword?.trim() ? { newPassword: newPassword.trim() } : {}
      );
    } catch (error) {
      console.error('Error resetting password:', error);
      throw error;
    }
  },

  unlockUser: async (id: string): Promise<{ message: string }> => {
    return await api.post<{ message: string }>(`/admin/users/${id}/unlock`);
  },

  getUserAccess: async (id: string): Promise<UserAccessDetails> => {
    return api.get<UserAccessDetails>(`/admin/users/${id}/access`);
  },

  setUserOrgScopes: async (
    id: string,
    scopes: { schoolIds: string[]; departmentIds: string[]; programIds: string[] }
  ): Promise<UserAccessDetails> => {
    return api.put<UserAccessDetails>(`/admin/users/${id}/org-scopes`, scopes);
  },

  listPositionAccess: async (): Promise<PositionAccessSnapshot> => {
    return api.get<PositionAccessSnapshot>('/admin/position-access');
  },

  setUnitPositionAccess: async (
    unitId: string,
    payload: { headAccessRoleId?: string | null; memberAccessRoleId?: string | null }
  ): Promise<PositionAccessUnit> => {
    return api.put<PositionAccessUnit>(`/admin/position-access/${unitId}`, payload);
  },

  updateLecturerLogin: async (
    staffId: string,
    input: { email?: string; newPassword?: string }
  ): Promise<LecturerLoginResult> => {
    const res = await api.patch<{ data: LecturerLoginResult } | LecturerLoginResult>(
      `/admin/lecturers/${staffId}/login`,
      input
    );
    return ((res as { data?: LecturerLoginResult }).data ?? res) as LecturerLoginResult;
  },

  updateStaffLogin: async (
    staffId: string,
    input: { email?: string; newPassword?: string }
  ): Promise<LecturerLoginResult> => {
    const res = await api.patch<{ data: LecturerLoginResult } | LecturerLoginResult>(
      `/admin/staff/${staffId}/login`,
      input
    );
    return ((res as { data?: LecturerLoginResult }).data ?? res) as LecturerLoginResult;
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

  getRolePermissions: async (): Promise<RolePermissionsSnapshot> => {
    try {
      const response = await api.get<{ data: RolePermissionsSnapshot }>('/admin/role-permissions');
      const data = response?.data ?? response;
      return data as RolePermissionsSnapshot;
    } catch (error) {
      console.error('Error fetching role permissions:', error);
      throw error;
    }
  },

  listPermissionGroups: async (params?: { includeInactive?: boolean }): Promise<PermissionGroupRow[]> => {
    const query = new URLSearchParams();
    if (params?.includeInactive) query.set('includeInactive', 'true');
    const res = await api.get<{ data: PermissionGroupRow[] }>(
      '/admin/permission-groups' + (query.toString() ? `?${query.toString()}` : '')
    );
    const data = (res as any)?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  createPermissionGroup: async (payload: { key: string; name: string; sortOrder?: number; isActive?: boolean }): Promise<PermissionGroupRow> => {
    const res = await api.post<{ data: PermissionGroupRow }>('/admin/permission-groups', payload);
    return (res as any)?.data ?? (res as any);
  },

  updatePermissionGroup: async (id: string, payload: { name?: string; sortOrder?: number; isActive?: boolean }): Promise<PermissionGroupRow> => {
    const res = await api.put<{ data: PermissionGroupRow }>(`/admin/permission-groups/${id}`, payload);
    return (res as any)?.data ?? (res as any);
  },

  deletePermissionGroup: async (id: string): Promise<{ message: string }> => {
    return await api.delete<{ message: string }>(`/admin/permission-groups/${id}`);
  },

  getPermissionsCatalog: async (): Promise<PermissionCatalogRow[]> => {
    const res = await api.get<{ data: PermissionCatalogRow[] }>('/admin/permissions');
    const data = (res as any)?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  updatePermissionMetadata: async (code: string, payload: { label?: string | null; description?: string | null; groupId?: string | null; sortOrder?: number; isVisible?: boolean }): Promise<{ message: string }> => {
    return await api.put<{ message: string }>(`/admin/permissions/${encodeURIComponent(code)}`, payload);
  },

  updateRolePermissions: async (role: string, permissionCodes: string[]): Promise<RolePermissionsSnapshot> => {
    try {
      const response = await api.put<{ data: RolePermissionsSnapshot }>(`/admin/role-permissions/${role}`, { permissionCodes });
      const data = response?.data ?? response;
      return data as RolePermissionsSnapshot;
    } catch (error) {
      console.error('Error updating role permissions:', error);
      throw error;
    }
  },

  listCustomRoles: async (params?: { search?: string; includeInactive?: boolean }): Promise<CustomRoleRow[]> => {
    const query = new URLSearchParams();
    if (params?.search?.trim()) query.set('search', params.search.trim());
    if (params?.includeInactive) query.set('includeInactive', 'true');
    const res = await api.get<{ data: CustomRoleRow[] }>('/admin/custom-roles' + (query.toString() ? `?${query.toString()}` : ''));
    const data = (res as any)?.data ?? res;
    return Array.isArray(data) ? data : [];
  },

  createCustomRole: async (payload: {
    code: string;
    name: string;
    description?: string | null;
    isActive?: boolean;
    scopeMode?: AccessScopeMode;
  }): Promise<CustomRoleRow> => {
    const res = await api.post<{ data: CustomRoleRow }>('/admin/custom-roles', payload);
    return (res as any)?.data ?? (res as any);
  },

  updateCustomRole: async (
    id: string,
    payload: { name?: string; description?: string | null; isActive?: boolean; scopeMode?: AccessScopeMode }
  ): Promise<CustomRoleRow> => {
    const res = await api.put<{ data: CustomRoleRow }>(`/admin/custom-roles/${id}`, payload);
    return (res as any)?.data ?? (res as any);
  },

  deleteCustomRole: async (id: string): Promise<{ message: string }> => {
    return await api.delete<{ message: string }>(`/admin/custom-roles/${id}`);
  },

  getCustomRolePermissions: async (id: string): Promise<{ role: CustomRoleRow; permissionCodes: string[] }> => {
    const res = await api.get<{ data: { role: CustomRoleRow; permissionCodes: string[] } }>(`/admin/custom-roles/${id}/permissions`);
    return (res as any)?.data ?? (res as any);
  },

  setCustomRolePermissions: async (id: string, permissionCodes: string[]): Promise<{ role: CustomRoleRow; permissionCodes: string[] }> => {
    const res = await api.put<{ data: { role: CustomRoleRow; permissionCodes: string[] } }>(`/admin/custom-roles/${id}/permissions`, { permissionCodes });
    return (res as any)?.data ?? (res as any);
  },

  setUserCustomRoles: async (userId: string, customRoleIds: string[]): Promise<{ message: string }> => {
    return await api.put<{ message: string }>(`/admin/users/${userId}/custom-roles`, { customRoleIds });
  },

  syncSystemRbac: async (): Promise<{
    rolesSynced: number;
    usersReconciled: number;
    userAssignmentsRemoved: number;
  }> => {
    const res = await api.post<{
      data: { rolesSynced: number; usersReconciled: number; userAssignmentsRemoved: number };
    }>('/admin/rbac/sync-system-roles');
    return (res as any)?.data ?? (res as any);
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
