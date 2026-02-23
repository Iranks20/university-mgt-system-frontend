import api from '@/lib/api';

export type NotificationType = 'Enrollment' | 'Warning' | 'Info' | 'System';

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  message: string;
  link: string | null;
  readAt: string | null;
  createdAt: string;
}

export interface NotificationsResponse {
  data: Notification[];
  total: number;
  unreadCount: number;
}

export const notificationService = {
  getNotifications: async (params?: { limit?: number; offset?: number; unreadOnly?: boolean }): Promise<NotificationsResponse> => {
    const res = await api.get<{ notifications?: Notification[]; total?: number; unreadCount?: number }>('/notifications', params as Record<string, string>);
    if (res && typeof res === 'object' && 'notifications' in res)
      return { data: res.notifications ?? [], total: res.total ?? 0, unreadCount: res.unreadCount ?? 0 };
    return { data: Array.isArray(res) ? res : [], total: 0, unreadCount: 0 };
  },

  getUnreadCount: async (): Promise<number> => {
    const res = await api.get<{ count: number }>('/notifications/unread-count');
    if (res && typeof res === 'object' && 'count' in res) return (res as { count: number }).count;
    return 0;
  },

  markAsRead: async (id: string): Promise<Notification> => {
    return api.put<Notification>(`/notifications/${id}/read`);
  },

  markAllAsRead: async (): Promise<void> => {
    await api.put('/notifications/read-all');
  },
};
