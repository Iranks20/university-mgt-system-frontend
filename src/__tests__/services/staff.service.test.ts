import { describe, it, expect, vi, beforeEach } from 'vitest';
import { staffService } from '@/services/staff.service';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('StaffService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getLecturerStudentRating', () => {
    it('should fetch and return student rating data', async () => {
      const mockData = {
        rating: 4.8,
        maxRating: 5.0,
        totalRatings: 45,
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await staffService.getLecturerStudentRating();

      expect(api.get).toHaveBeenCalledWith('/staff/me/student-rating');
      expect(result).toEqual(mockData);
    });

    it('should return null on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await staffService.getLecturerStudentRating();

      expect(result).toBeNull();
    });
  });

  describe('getLecturerDepartmentRank', () => {
    it('should fetch and return department rank data', async () => {
      const mockData = {
        rank: 2,
        totalLecturers: 10,
        performance: 95.5,
      };

      vi.mocked(api.get).mockResolvedValue(mockData);

      const result = await staffService.getLecturerDepartmentRank();

      expect(api.get).toHaveBeenCalledWith('/staff/me/department-rank');
      expect(result).toEqual(mockData);
    });

    it('should return null on error', async () => {
      vi.mocked(api.get).mockRejectedValue(new Error('Network error'));

      const result = await staffService.getLecturerDepartmentRank();

      expect(result).toBeNull();
    });
  });
});
