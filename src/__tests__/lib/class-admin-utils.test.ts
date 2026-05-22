import { beforeEach, describe, expect, it, vi } from 'vitest';
import {
  buildLecturerComboboxOptions,
  extractEnrolledStudentIdsFromClassEnrollments,
  fetchAllLecturers,
  fetchStudentsForEnrollmentScope,
} from '@/lib/class-admin-utils';
import { staffService } from '@/services/staff.service';
import { studentService } from '@/services/student.service';

vi.mock('@/services/staff.service', () => ({
  staffService: {
    getStaff: vi.fn(),
  },
}));

vi.mock('@/services/student.service', () => ({
  studentService: {
    getStudents: vi.fn(),
  },
}));

describe('class-admin-utils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('extractEnrolledStudentIdsFromClassEnrollments', () => {
    it('returns only explicit enrollment student ids', () => {
      const ids = extractEnrolledStudentIdsFromClassEnrollments([
        { id: 'e1', studentId: 's1', isImplicit: false },
        { id: null, studentId: 's2', isImplicit: true, student: { id: 's2' } },
        { id: 'e3', student: { id: 's3' } },
        { studentId: '' },
      ]);
      expect(ids).toEqual(['s1', 's3']);
    });

    it('handles non-array input', () => {
      expect(extractEnrolledStudentIdsFromClassEnrollments(null as unknown as unknown[])).toEqual([]);
    });
  });

  describe('buildLecturerComboboxOptions', () => {
    it('includes unassigned and sorts lecturers by name', () => {
      const options = buildLecturerComboboxOptions([
        { id: 'b', name: 'Zara Okello' },
        { id: 'a', name: 'Adam Kato' },
      ]);
      expect(options[0]).toEqual({ value: '__none__', label: '— Unassigned —' });
      expect(options.slice(1).map((o) => o.label)).toEqual(['Adam Kato', 'Zara Okello']);
    });

    it('adds current lecturer when missing from list', () => {
      const options = buildLecturerComboboxOptions(
        [{ id: 'a', name: 'Adam Kato' }],
        { id: 'orphan', name: 'Legacy Lecturer' }
      );
      expect(options.some((o) => o.value === 'orphan' && o.label === 'Legacy Lecturer')).toBe(true);
    });

    it('does not duplicate placeholder lecturer name', () => {
      const options = buildLecturerComboboxOptions([], { id: 'x', name: '—' });
      expect(options.filter((o) => o.value === 'x')).toHaveLength(0);
    });
  });

  describe('fetchAllLecturers', () => {
    it('paginates staff until all lecturers are loaded', async () => {
      vi.mocked(staffService.getStaff)
        .mockResolvedValueOnce({
          data: [{ id: 'l1', firstName: 'Ann', lastName: 'A' }],
          total: 2,
          page: 1,
          pageSize: 100,
        } as never)
        .mockResolvedValueOnce({
          data: [{ id: 'l2', firstName: 'Bob', lastName: 'B' }],
          total: 2,
          page: 2,
          pageSize: 100,
        } as never);

      const list = await fetchAllLecturers();
      expect(list).toEqual([
        { id: 'l1', name: 'Ann A' },
        { id: 'l2', name: 'Bob B' },
      ]);
      expect(staffService.getStaff).toHaveBeenCalledTimes(2);
      expect(staffService.getStaff).toHaveBeenCalledWith(
        expect.objectContaining({ role: 'Lecturer', limit: 100 })
      );
    });
  });

  describe('fetchStudentsForEnrollmentScope', () => {
    it('loads students by programIntakeId', async () => {
      vi.mocked(studentService.getStudents).mockResolvedValue({
        data: [
          {
            id: 'st1',
            firstName: 'Jane',
            lastName: 'Doe',
            studentNumber: '21001',
            email: 'jane@student.kcu.ac.ug',
          },
        ],
        total: 1,
        page: 1,
        pageSize: 500,
      } as never);

      const rows = await fetchStudentsForEnrollmentScope({
        programIntakeId: 'intake-1',
      });

      expect(rows).toEqual([
        {
          id: 'st1',
          name: 'Jane Doe',
          studentId: '21001',
          email: 'jane@student.kcu.ac.ug',
        },
      ]);
      expect(studentService.getStudents).toHaveBeenCalledWith(
        expect.objectContaining({
          programIntakeId: 'intake-1',
          status: 'Active',
          limit: 500,
        })
      );
    });

    it('returns empty when no scope is provided', async () => {
      const rows = await fetchStudentsForEnrollmentScope({});
      expect(rows).toEqual([]);
      expect(studentService.getStudents).not.toHaveBeenCalled();
    });
  });
});
