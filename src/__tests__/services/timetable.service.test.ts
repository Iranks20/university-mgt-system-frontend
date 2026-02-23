import { describe, it, expect, vi, beforeEach } from 'vitest';
import { timetableService } from '@/services/timetable.service';

vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    put: vi.fn(),
  },
}));

vi.mock('localStorage', () => ({
  getItem: vi.fn(() => 'mock-token'),
}));

describe('TimetableService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getTimetable', () => {
    it('should return timetable data with pagination', async () => {
      const mockResponse = {
        data: [
          {
            id: '1',
            name: 'BBA 1.2',
            course: { code: 'BBA 1201', name: 'Business Statistics', department: { name: 'BBA' }, level: 1, semester: 2 },
            dayOfWeek: 1,
            startTime: '08:00',
            endTime: '10:00',
            venue: { name: 'C4' },
            lecturer: { name: 'Dr. John' },
          },
        ],
        total: 1,
        page: 1,
        pageSize: 50,
      };
      const api = await import('@/lib/api');
      vi.mocked(api.default.get).mockResolvedValue(mockResponse);

      const result = await timetableService.getTimetable({ program: 'BBA' });

      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('getMyTimetable', () => {
    it('should return student timetable', async () => {
      const mockResponse = [
        {
          id: '1',
          name: 'BBA 1.2',
          course: { code: 'BBA 1201', name: 'Business Statistics' },
          dayOfWeek: 1,
          startTime: '08:00',
          endTime: '10:00',
        },
      ];
      const api = await import('@/lib/api');
      vi.mocked(api.default.get).mockResolvedValue(mockResponse);

      const result = await timetableService.getMyTimetable();

      expect(Array.isArray(result)).toBe(true);
      expect(result.length).toBeGreaterThanOrEqual(0);
    });
  });

  describe('updateClass', () => {
    it('should update class details', async () => {
      const mockResponse = { id: '1', capacity: 60 };
      const api = await import('@/lib/api');
      vi.mocked(api.default.put).mockResolvedValue(mockResponse);

      const result = await timetableService.updateClass('1', { capacity: 60 });

      expect(api.default.put).toHaveBeenCalledWith('/timetable/class/1', { capacity: 60 });
      expect(result.capacity).toBe(60);
    });
  });
});
