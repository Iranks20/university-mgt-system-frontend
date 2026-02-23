import { describe, it, expect, vi, beforeEach } from 'vitest';
import { notificationService } from '@/services/notification.service';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('NotificationService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getNotifications', () => {
    it('should return notifications with total and unreadCount', async () => {
      const mockRes = {
        notifications: [
          { id: '1', userId: 'u1', type: 'Enrollment', title: 'Enrolled', message: 'You were enrolled.', link: '/student-classes', readAt: null, createdAt: '2025-01-01T00:00:00Z' },
        ],
        total: 1,
        unreadCount: 1,
      };
      vi.mocked(api.get).mockResolvedValue(mockRes);

      const result = await notificationService.getNotifications();

      expect(api.get).toHaveBeenCalledWith('/notifications', undefined);
      expect(result.data).toEqual(mockRes.notifications);
      expect(result.total).toBe(1);
      expect(result.unreadCount).toBe(1);
    });

    it('should return empty data when response has no notifications key', async () => {
      vi.mocked(api.get).mockResolvedValue([]);

      const result = await notificationService.getNotifications();

      expect(result.data).toEqual([]);
      expect(result.total).toBe(0);
      expect(result.unreadCount).toBe(0);
    });
  });

  describe('getUnreadCount', () => {
    it('should return count from API', async () => {
      vi.mocked(api.get).mockResolvedValue({ count: 3 });

      const result = await notificationService.getUnreadCount();

      expect(api.get).toHaveBeenCalledWith('/notifications/unread-count');
      expect(result).toBe(3);
    });
  });

  describe('markAsRead', () => {
    it('should call PUT and return notification', async () => {
      const notif = { id: 'n1', userId: 'u1', type: 'Info', title: 'T', message: 'M', link: null, readAt: '2025-01-01T00:00:00Z', createdAt: '2025-01-01T00:00:00Z' };
      vi.mocked(api.put).mockResolvedValue(notif);

      const result = await notificationService.markAsRead('n1');

      expect(api.put).toHaveBeenCalledWith('/notifications/n1/read');
      expect(result).toEqual(notif);
    });
  });

  describe('markAllAsRead', () => {
    it('should call PUT read-all', async () => {
      vi.mocked(api.put).mockResolvedValue(undefined);

      await notificationService.markAllAsRead();

      expect(api.put).toHaveBeenCalledWith('/notifications/read-all');
    });
  });
});
