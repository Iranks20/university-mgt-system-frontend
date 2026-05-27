import { describe, it, expect, vi, beforeEach } from 'vitest';
import { clinicalService } from '@/services/clinical.service';
import api from '@/lib/api';

vi.mock('@/lib/api');

describe('clinical.service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('getProgramPolicies', () => {
    it('returns policy array from wrapped response', async () => {
      vi.mocked(api.get).mockResolvedValue({ data: [{ id: 'p1', minYear: 3, minSemester: 1 }] });
      const result = await clinicalService.getProgramPolicies();
      expect(api.get).toHaveBeenCalledWith('/clinical/program-policies', { status: 'active' });
      expect(result).toHaveLength(1);
    });
  });

  describe('getDashboardOverview', () => {
    it('returns overview totals and sites', async () => {
      const mock = {
        totals: { sites: 2, activeRotations: 3, studentsOnPlacement: 40, pendingVerification: 1, totalSessions: 10 },
        sites: [{ clinicalSiteId: 's1', clinicalSiteName: 'Mulago', studentsOnPlacement: 20, activeRotations: 1 }],
      };
      vi.mocked(api.get).mockResolvedValue({ data: mock });
      const result = await clinicalService.getDashboardOverview();
      expect(result.totals.studentsOnPlacement).toBe(40);
      expect(result.sites).toHaveLength(1);
    });
  });

  describe('copyRotationRoster', () => {
    it('posts copy payload and returns result', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: { copied: 5, skipped: 0, ineligible: 1, roster: [] },
      });
      const result = await clinicalService.copyRotationRoster('rot-a', { targetRotationId: 'rot-b' });
      expect(api.post).toHaveBeenCalledWith('/clinical/rotations/rot-a/copy-roster', {
        targetRotationId: 'rot-b',
      });
      expect(result.copied).toBe(5);
      expect(result.ineligible).toBe(1);
    });
  });

  describe('getEligibleStudents', () => {
    it('returns paged eligible students', async () => {
      vi.mocked(api.get).mockResolvedValue({
        data: [{ id: 'st1', onRotation: false }],
        total: 1,
        page: 1,
        pageSize: 50,
      });
      const result = await clinicalService.getEligibleStudents({ programId: 'prog-1', year: 3, semester: 1 });
      expect(result.data).toHaveLength(1);
      expect(result.total).toBe(1);
    });
  });

  describe('bulkEnrollRotation', () => {
    it('posts classId in body and returns enrolled count', async () => {
      vi.mocked(api.post).mockResolvedValue({
        data: [{ studentId: 'st1' }],
        meta: { enrolled: 1 },
      });
      const result = await clinicalService.bulkEnrollRotation('rot-1', { classId: 'class-1' });
      expect(api.post).toHaveBeenCalledWith('/clinical/rotations/rot-1/students/bulk-enroll', {
        classId: 'class-1',
      });
      expect(result.enrolled).toBe(1);
    });
  });

  describe('getClinicalClasses', () => {
    it('returns roster rows', async () => {
      vi.mocked(api.get).mockResolvedValue([{ studentId: 'st1', status: 'Active' }]);
      const result = await clinicalService.getRotationRoster('rot-1');
      expect(api.get).toHaveBeenCalledWith('/clinical/rotations/rot-1/students', undefined);
      expect(result[0].studentId).toBe('st1');
    });
  });
});
