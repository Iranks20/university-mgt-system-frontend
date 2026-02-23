import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { qaService } from '@/services/qa.service';
import api from '@/lib/api';
import type { QALectureRecord } from '@/types/qa';

// Mock the API client
vi.mock('@/lib/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('qaService.getMyLectureRecords', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  it('should return lecture records with data and total', async () => {
    const mockRecords: QALectureRecord[] = [
      {
        date: '2025-01-15',
        lecturerName: 'Dr. Alan Grant',
        class: 'BAE 1.1',
        courseUnit: 'MATHEMATICS FOR ECONOMICS',
        timeForStarting: '09:10:00',
        timeOutForEnding: '10:00:00',
        duration: '00:50:00',
        timeLost: '0',
        comment: 'TAUGHT',
      },
      {
        date: '2025-01-16',
        lecturerName: 'Dr. Alan Grant',
        class: 'BAE 1.1',
        courseUnit: 'MATHEMATICS FOR ECONOMICS',
        timeForStarting: '09:10:00',
        timeOutForEnding: '10:00:00',
        duration: '00:50:00',
        timeLost: '0',
        comment: 'UNTAUGHT',
      },
    ];

    (api.get as any).mockResolvedValue({
      data: mockRecords,
      total: 2,
    });

    const result = await qaService.getMyLectureRecords();

    expect(api.get).toHaveBeenCalledWith('/qa/me/lecture-records');
    expect(result).toEqual({
      data: mockRecords,
      total: 2,
    });
    expect(result.data).toHaveLength(2);
  });

  it('should handle array response format', async () => {
    const mockRecords: QALectureRecord[] = [
      {
        date: '2025-01-15',
        lecturerName: 'Dr. Alan Grant',
        class: 'BAE 1.1',
        courseUnit: 'MATHEMATICS FOR ECONOMICS',
        timeForStarting: '09:10:00',
        timeOutForEnding: '10:00:00',
        duration: '00:50:00',
        timeLost: '0',
        comment: 'TAUGHT',
      },
    ];

    (api.get as any).mockResolvedValue(mockRecords);

    const result = await qaService.getMyLectureRecords();

    expect(result.data).toEqual(mockRecords);
    expect(result.total).toBe(mockRecords.length);
  });

  it('should handle empty response', async () => {
    (api.get as any).mockResolvedValue({ data: [], total: 0 });

    const result = await qaService.getMyLectureRecords();

    expect(result).toEqual({ data: [], total: 0 });
  });

  it('should handle API errors gracefully', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));

    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

    const result = await qaService.getMyLectureRecords();

    expect(result).toEqual({ data: [], total: 0 });
    expect(consoleSpy).toHaveBeenCalledWith(
      'Error fetching my lecture records:',
      expect.any(Error)
    );

    consoleSpy.mockRestore();
  });

  it('should extract total from response object', async () => {
    (api.get as any).mockResolvedValue({
      data: [],
      total: 5,
    });

    const result = await qaService.getMyLectureRecords();

    expect(result.total).toBe(5);
  });
});

describe('qaService.getReconciliationReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch reconciliation report for date range', async () => {
    const mockData = [
      { date: '2025-01-15', className: 'BBA 1.1', lecturerName: 'Dr. Smith', outcome: 'taught', scheduled: true },
      { date: '2025-01-15', className: 'BBA 1.2', lecturerName: 'Dr. Jones', outcome: 'no_record', scheduled: true },
    ];
    (api.get as any).mockResolvedValue(mockData);

    const result = await qaService.getReconciliationReport('2025-01-01', '2025-01-31');

    expect(api.get).toHaveBeenCalledWith('/qa/reconciliation-report', { dateFrom: '2025-01-01', dateTo: '2025-01-31' });
    expect(result).toEqual(mockData);
  });

  it('should pass schoolId and courseId when provided', async () => {
    (api.get as any).mockResolvedValue([]);
    await qaService.getReconciliationReport('2025-01-01', '2025-01-31', 'school-id', 'course-id');
    expect(api.get).toHaveBeenCalledWith('/qa/reconciliation-report', {
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
      schoolId: 'school-id',
      courseId: 'course-id',
    });
  });

  it('should return empty array on error', async () => {
    (api.get as any).mockRejectedValue(new Error('Network error'));
    const consoleSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const result = await qaService.getReconciliationReport('2025-01-01', '2025-01-31');
    expect(result).toEqual([]);
    consoleSpy.mockRestore();
  });
});

describe('qaService.getSchoolSummaryReport', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch school summary with optional date range', async () => {
    const mockData = [{ school: 'Health Sciences', totalNoTaught: 50, noUntaught: 5 }];
    (api.get as any).mockResolvedValue(mockData);
    const result = await qaService.getSchoolSummaryReport({
      dateFrom: '2025-01-01',
      dateTo: '2025-01-31',
    });
    expect(api.get).toHaveBeenCalledWith('/qa/school-summary-report', { dateFrom: '2025-01-01', dateTo: '2025-01-31' });
    expect(result).toEqual(mockData);
  });
});
