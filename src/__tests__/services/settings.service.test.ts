import { describe, it, expect, vi, beforeEach } from 'vitest';
import { settingsService } from '@/services/settings.service';
import api from '@/lib/api';

// Mock the API client
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
  },
}));

describe('settingsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    settingsService.clearCache();
  });

  describe('getPerformanceThresholds', () => {
    it('should fetch thresholds from API and cache them', async () => {
      const mockThresholds = {
        student: {
          excellent: 85,
          good: 75,
          warning: 65,
          critical: 55,
        },
        lecturer: {
          excellent: 95,
          good: 85,
          warning: 75,
          critical: 65,
        },
        attendance: {
          present: 80,
          atRisk: 0,
        },
      };

      vi.mocked(api.get).mockResolvedValue(mockThresholds);

      const result = await settingsService.getPerformanceThresholds();

      expect(result).toEqual(mockThresholds);
      expect(api.get).toHaveBeenCalledWith('/settings/performance-thresholds');
      expect(api.get).toHaveBeenCalledTimes(1);

      // Second call should use cache
      const result2 = await settingsService.getPerformanceThresholds();
      expect(result2).toEqual(mockThresholds);
      expect(api.get).toHaveBeenCalledTimes(1); // Still only called once
    });

    it('should return default thresholds if API fails', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await settingsService.getPerformanceThresholds();

      expect(result).toEqual(settingsService.getDefaultThresholds());
      expect(result.student.excellent).toBe(80);
      expect(result.lecturer.excellent).toBe(90);
      expect(result.attendance.present).toBe(75);
    });

    it('should handle null/undefined API response', async () => {
      vi.mocked(api.get).mockResolvedValue(null as any);

      const result = await settingsService.getPerformanceThresholds();

      expect(result).toEqual(settingsService.getDefaultThresholds());
    });

    it('should handle concurrent requests without duplicate API calls', async () => {
      const mockThresholds = {
        student: { excellent: 85, good: 75, warning: 65, critical: 55 },
        lecturer: { excellent: 95, good: 85, warning: 75, critical: 65 },
        attendance: { present: 80, atRisk: 0 },
      };

      vi.mocked(api.get).mockResolvedValue(mockThresholds);

      // Make multiple concurrent requests
      const [result1, result2, result3] = await Promise.all([
        settingsService.getPerformanceThresholds(),
        settingsService.getPerformanceThresholds(),
        settingsService.getPerformanceThresholds(),
      ]);

      expect(result1).toEqual(mockThresholds);
      expect(result2).toEqual(mockThresholds);
      expect(result3).toEqual(mockThresholds);
      // Should only call API once due to promise caching
      expect(api.get).toHaveBeenCalledTimes(1);
    });
  });

  describe('clearCache', () => {
    it('should clear cached thresholds', async () => {
      const mockThresholds = {
        student: { excellent: 85, good: 75, warning: 65, critical: 55 },
        lecturer: { excellent: 95, good: 85, warning: 75, critical: 65 },
        attendance: { present: 80, atRisk: 0 },
      };

      vi.mocked(api.get).mockResolvedValue(mockThresholds);

      // First call
      await settingsService.getPerformanceThresholds();
      expect(api.get).toHaveBeenCalledTimes(1);

      // Clear cache
      settingsService.clearCache();

      // Second call should fetch again
      await settingsService.getPerformanceThresholds();
      expect(api.get).toHaveBeenCalledTimes(2);
    });
  });

  describe('getDefaultThresholds', () => {
    it('should return default threshold values', () => {
      const defaults = settingsService.getDefaultThresholds();

      expect(defaults.student.excellent).toBe(80);
      expect(defaults.student.good).toBe(70);
      expect(defaults.student.warning).toBe(60);
      expect(defaults.student.critical).toBe(50);

      expect(defaults.lecturer.excellent).toBe(90);
      expect(defaults.lecturer.good).toBe(80);
      expect(defaults.lecturer.warning).toBe(70);
      expect(defaults.lecturer.critical).toBe(60);

      expect(defaults.attendance.present).toBe(75);
      expect(defaults.attendance.atRisk).toBe(0);
    });
  });
});
