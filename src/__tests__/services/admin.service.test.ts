import { describe, it, expect, vi, beforeEach } from 'vitest';
import { adminService } from '@/services/admin.service';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('AdminService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getSettings', () => {
    it('should fetch and return grouped settings', async () => {
      const mockData = {
        Geofence: {
          'geofence.name': 'Main Campus',
          'geofence.latitude': '0.3476',
        },
        Attendance: {
          'attendance.lateThreshold': '15',
        },
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockData });

      const result = await adminService.getSettings();

      expect(api.get).toHaveBeenCalledWith('/admin/settings');
      expect(result).toEqual(mockData);
    });

    it('should handle direct object response', async () => {
      const mockData = { Geofence: {} };
      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await adminService.getSettings();

      expect(result).toEqual(mockData);
    });

    it('should return empty object on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await adminService.getSettings();

      expect(result).toEqual({});
    });
  });

  describe('updateSettings', () => {
    it('should update settings in bulk', async () => {
      const settings = {
        'geofence.name': 'Test Campus',
        'attendance.lateThreshold': '20',
      };

      const mockResponse = [{ key: 'geofence.name', value: 'Test Campus' }];
      vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

      const result = await adminService.updateSettings(settings);

      expect(api.put).toHaveBeenCalledWith('/admin/settings', { settings });
      expect(result).toEqual({ data: mockResponse });
    });

    it('should throw error on failure', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Network error'));

      await expect(
        adminService.updateSettings({ 'test.key': 'value' })
      ).rejects.toThrow();
    });
  });

  describe('getSetting', () => {
    it('should fetch a single setting', async () => {
      const mockResponse = { data: { value: 'test-value' } };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await adminService.getSetting('test.key');

      expect(api.get).toHaveBeenCalledWith('/admin/settings/test.key');
      expect(result).toBe('test-value');
    });

    it('should return null on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await adminService.getSetting('test.key');

      expect(result).toBeNull();
    });
  });

  describe('updateSetting', () => {
    it('should update a single setting', async () => {
      const mockResponse = { key: 'test.key', value: 'new-value' };
      vi.mocked(api.put).mockResolvedValue({ data: mockResponse });

      const result = await adminService.updateSetting('test.key', 'new-value');

      expect(api.put).toHaveBeenCalledWith('/admin/settings/test.key', { value: 'new-value' });
      expect(result).toEqual({ data: mockResponse });
    });
  });

  describe('getAuditLog', () => {
    it('should fetch audit log with default params', async () => {
      const mockResponse = {
        data: [
          { id: '1', userId: 'u1', userName: 'Admin', userEmail: 'admin@test.com', action: 'LOGIN', entity: 'Auth', entityId: null, details: null, ipAddress: null, userAgent: null, createdAt: '2025-01-01T00:00:00Z' },
        ],
        total: 1,
        page: 1,
        pageSize: 20,
      };
      vi.mocked(api.get).mockResolvedValue(mockResponse);

      const result = await adminService.getAuditLog();

      expect(api.get).toHaveBeenCalledWith('/admin/audit-log?');
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
      expect(result.page).toBe(1);
      expect(result.pageSize).toBe(20);
    });

    it('should pass query params when provided', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [], total: 0, page: 2, pageSize: 10 });

      await adminService.getAuditLog({ page: 2, limit: 10, action: 'LOGIN' });

      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('page=2'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('limit=10'));
      expect(api.get).toHaveBeenCalledWith(expect.stringContaining('action=LOGIN'));
    });

    it('should throw on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      await expect(adminService.getAuditLog()).rejects.toThrow();
    });
  });

  describe('getStrategicGoals', () => {
    it('should fetch strategic goals', async () => {
      const mockGoals = [{ name: 'Goal A', progress: 75 }, { name: 'Goal B', progress: 50 }];
      vi.mocked(api.get).mockResolvedValue(mockGoals);

      const result = await adminService.getStrategicGoals();

      expect(api.get).toHaveBeenCalledWith('/admin/strategic-goals');
      expect(result).toEqual(mockGoals);
    });

    it('should return empty array on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await adminService.getStrategicGoals();

      expect(result).toEqual([]);
    });
  });

  describe('updateStrategicGoals', () => {
    it('should update strategic goals', async () => {
      const goals = [{ name: 'Increase enrolment', progress: 80 }];
      vi.mocked(api.put).mockResolvedValue(goals);

      const result = await adminService.updateStrategicGoals(goals);

      expect(api.put).toHaveBeenCalledWith('/admin/strategic-goals', { goals });
      expect(result).toEqual(goals);
    });

    it('should throw on error', async () => {
      vi.mocked(api.put).mockRejectedValue(new Error('Network error'));

      await expect(
        adminService.updateStrategicGoals([{ name: 'X', progress: 0 }])
      ).rejects.toThrow();
    });
  });
});
