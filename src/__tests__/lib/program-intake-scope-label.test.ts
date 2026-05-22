import { describe, expect, it } from 'vitest';
import {
  buildIntakeTypeScopeLabel,
  formatCohortLabel,
  formatProgramLabel,
} from '@/hooks/useProgramIntakeScope';

describe('program-intake-scope label helpers', () => {
  it('formats program with code', () => {
    expect(
      formatProgramLabel({ id: 'p1', name: 'BSc CS', code: 'BCS', departmentId: 'd1' })
    ).toBe('BSc CS (BCS)');
  });

  it('formats cohort label', () => {
    expect(
      formatCohortLabel({ id: 'i1', year: 2, semester: 1, intakeType: 'Day' })
    ).toBe('2.1 · Day');
  });

  it('builds intake-type scope label with school', () => {
    const label = buildIntakeTypeScopeLabel({
      showSchool: true,
      schoolId: 'school-1',
      schoolName: 'Computing',
      program: { id: 'p1', name: 'BSc CS', code: 'BCS', departmentId: 'd1' },
      year: 2,
      semester: 1,
      intakeType: 'Day',
    });
    expect(label).toBe('Computing · BSc CS (BCS) · Year 2 · Semester 1 · Day');
  });

  it('omits school when showSchool is false', () => {
    const label = buildIntakeTypeScopeLabel({
      showSchool: false,
      schoolId: '',
      schoolName: null,
      program: { id: 'p1', name: 'BSc CS', departmentId: 'd1' },
      year: 1,
      semester: 2,
      intakeType: 'Evening',
    });
    expect(label).toBe('BSc CS · Year 1 · Semester 2 · Evening');
  });
});
