import { describe, it, expect, vi, beforeEach } from 'vitest';
import { analyticsService } from '@/services/analytics.service';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('AnalyticsService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getManagementOverview', () => {
    it('should fetch and return management overview data', async () => {
      const mockData = {
        totalEnrolment: 12450,
        avgAttendance: 88.4,
        activeCourses: 342,
        staffPresent: 92,
        strategicGoals: [
          { name: 'Increase Student Retention', progress: 75 },
          { name: 'Campus Digitalization', progress: 40 },
        ],
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockData });

      const result = await analyticsService.getManagementOverview();

      expect(api.get).toHaveBeenCalledWith('/analytics/management-overview');
      expect(result).toEqual(mockData);
    });

    it('should handle array response format', async () => {
      const mockData = {
        totalEnrolment: 1000,
        avgAttendance: 85,
      };

      vi.mocked(api.get).mockResolvedValue([mockData]);

      const result = await analyticsService.getManagementOverview();

      expect(result).toEqual(mockData);
    });

    it('should return null on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await analyticsService.getManagementOverview();

      expect(result).toBeNull();
    });
  });

  describe('getLecturerQualityTrend', () => {
    it('should fetch and return quality trend data', async () => {
      const mockData = [
        { month: 'Jan', score: 88 },
        { month: 'Feb', score: 92 },
      ];

      vi.mocked(api.get).mockResolvedValue({ data: mockData });

      const result = await analyticsService.getLecturerQualityTrend(6);

      expect(api.get).toHaveBeenCalledWith('/analytics/lecturer-quality-trend', { months: '6' });
      expect(result).toEqual(mockData);
    });

    it('should handle array response format', async () => {
      const mockData = [{ month: 'Jan', score: 88 }];
      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await analyticsService.getLecturerQualityTrend(6);

      expect(result).toEqual(mockData);
    });

    it('should return empty array on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await analyticsService.getLecturerQualityTrend(6);

      expect(result).toEqual([]);
    });
  });

  describe('getLecturerComplianceTrend', () => {
    it('should fetch and return compliance trend data', async () => {
      const mockData = [
        { month: 'Jan', rate: 95 },
        { month: 'Feb', rate: 98 },
      ];

      vi.mocked(api.get).mockResolvedValue({ data: mockData });

      const result = await analyticsService.getLecturerComplianceTrend(6);

      expect(api.get).toHaveBeenCalledWith('/analytics/lecturer-compliance-trend', { months: '6' });
      expect(result).toEqual(mockData);
    });

    it('should return empty array on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await analyticsService.getLecturerComplianceTrend(6);

      expect(result).toEqual([]);
    });
  });

  describe('getTeachingStatsByRange', () => {
    it('should fetch and return teaching stats for range', async () => {
      const mockData = {
        range: 'last_30_days',
        scheduledCount: 100,
        taughtCount: 85,
        untaughtCount: 10,
        cancelledCount: 3,
        substitutedCount: 2,
        conductedCount: 87,
        teachingRateFromScheduled: 87,
        teachingRateFromRecorded: 89.5,
      };

      vi.mocked(api.get).mockResolvedValue({ data: mockData });

      const result = await analyticsService.getTeachingStatsByRange('last_30_days');

      expect(api.get).toHaveBeenCalledWith('/analytics/teaching-stats-by-range', { range: 'last_30_days' });
      expect(result).toEqual(mockData);
    });

    it('should return null on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await analyticsService.getTeachingStatsByRange('today');

      expect(result).toBeNull();
    });
  });
});
