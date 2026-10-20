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

  describe('timetable expectation endpoints', () => {
    const expectationResponse = {
      scope: { academicTermId: 'term-1', academicTermName: 'Term 1', dateFrom: '2026-01-01', dateTo: '2026-04-30' },
      summary: { timetableExpectedSessions: 2, timetableExpectedMinutes: 240 },
      data: [{ classId: 'class-1' }],
      total: 1,
      page: 1,
      pageSize: 50,
    };

    it('keeps scope and rows when the api client already unwrapped the envelope', async () => {
      const api = await import('@/lib/api');
      vi.mocked(api.default.get).mockResolvedValue(expectationResponse);

      const coverage = await timetableService.getTimetableCoverage({ academicTermId: 'term-1' });
      expect(coverage.scope.dateFrom).toBe('2026-01-01');
      expect(coverage.scope.dateTo).toBe('2026-04-30');
      expect(coverage.data).toEqual([{ classId: 'class-1' }]);
      expect(coverage.total).toBe(1);

      const workload = await timetableService.getLecturerWorkload({ academicTermId: 'term-1' });
      expect(workload.scope.dateFrom).toBe('2026-01-01');
      expect(Array.isArray(workload.data)).toBe(true);

      const sessions = await timetableService.getExpectedSessions({ classId: 'class-1' });
      expect(sessions.scope.dateTo).toBe('2026-04-30');
      expect(sessions.data).toEqual([{ classId: 'class-1' }]);
    });

    it('unwraps a still-enveloped response without losing scope', async () => {
      const api = await import('@/lib/api');
      vi.mocked(api.default.get).mockResolvedValue({ data: expectationResponse });

      const coverage = await timetableService.getTimetableCoverage();
      expect(coverage.scope.academicTermId).toBe('term-1');
      expect(coverage.data).toEqual([{ classId: 'class-1' }]);
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
