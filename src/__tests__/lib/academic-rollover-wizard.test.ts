import { describe, it, expect } from 'vitest';
import {
  DEFAULT_CLASS_LIST_MODE,
  DEFAULT_REGISTRATION_POLICY,
  DEFAULT_SKIP_CLASS_LISTS,
} from '@/lib/academic-rollover-defaults';
import { buildPromotePayload, PROMOTE_ALL } from '@/lib/academic-rollover-promote';
import {
  buildRolloverPreviewCsvRows,
  buildRolloverWizardPayload,
  isRegisterBlockedByOfferings,
  suggestNextTerm,
  wizardHasActiveTerm,
} from '@/lib/academic-rollover-wizard';
import type { AcademicTerm } from '@/services/academic.service';

function term(partial: Partial<AcademicTerm> & Pick<AcademicTerm, 'id' | 'name'>): AcademicTerm {
  return {
    academicYear: 2026,
    semester: 1,
    startDate: '2026-01-15',
    endDate: '2026-06-15',
    status: 'Active',
    registrationStatus: 'Closed',
    ...partial,
  };
}

describe('academic-rollover-wizard', () => {
  it('defaults offerings ON (skipClassLists false, clone-from-term mode)', () => {
    expect(DEFAULT_SKIP_CLASS_LISTS).toBe(false);
    expect(DEFAULT_CLASS_LIST_MODE).toBe('clone-from-term');
  });

  it('suggests Sem 2 when active term is Sem 1', () => {
    const next = suggestNextTerm(term({ id: 't1', name: '2026 S1', semester: 1 }), 2026);
    expect(next.semester).toBe('2');
    expect(next.academicYear).toBe('2026');
    expect(next.name).toContain('Semester 2');
  });

  it('suggests next academic year when active term is Sem 2', () => {
    const next = suggestNextTerm(
      term({ id: 't2', name: '2026 S2', semester: 2, academicYear: 2026 }),
      2026
    );
    expect(next.semester).toBe('0');
    expect(next.academicYear).toBe('2027');
  });

  it('buildRolloverWizardPayload keeps offerings enabled and maps registration policy', () => {
    const payload = buildRolloverWizardPayload({
      closeTermId: 'close-1',
      form: {
        name: 'Academic Year 2027',
        academicYear: '2027',
        semester: '0',
        startDate: '2027-01-15',
        endDate: '2027-05-30',
      },
      promotePayload: buildPromotePayload({
        promoteProgramId: PROMOTE_ALL,
        promoteYear: PROMOTE_ALL,
        promoteSemester: PROMOTE_ALL,
        holdbackRaw: '',
        holdbackGroups: [],
      }),
      classListMode: DEFAULT_CLASS_LIST_MODE,
      skipPromote: false,
      skipClassLists: DEFAULT_SKIP_CLASS_LISTS,
      skipRegister: false,
      registrationPolicy: DEFAULT_REGISTRATION_POLICY,
    });

    expect(payload.skipClassLists).toBe(false);
    expect(payload.classListMode).toBe('clone-from-term');
    expect(payload.sourceTermId).toBe('close-1');
    expect(payload.openRegistration).toBe(false);
    expect(payload.skipRegister).toBe(false);
  });

  it('blocks register when preview shows zero offerings and offerings step is enabled', () => {
    expect(
      isRegisterBlockedByOfferings({
        skipRegister: false,
        registrationPolicy: 'auto',
        skipClassLists: false,
        preview: { classLists: { created: 0, skippedExisting: 0 } as never },
      })
    ).toBe(true);
  });

  it('does not block register when offerings were skipped or register step is off', () => {
    expect(
      isRegisterBlockedByOfferings({
        skipRegister: true,
        registrationPolicy: 'auto',
        skipClassLists: false,
        preview: { classLists: { created: 0, skippedExisting: 0 } as never },
      })
    ).toBe(false);
    expect(
      isRegisterBlockedByOfferings({
        skipRegister: false,
        registrationPolicy: 'none',
        skipClassLists: false,
        preview: { classLists: { created: 0, skippedExisting: 0 } as never },
      })
    ).toBe(false);
    expect(
      isRegisterBlockedByOfferings({
        skipRegister: false,
        registrationPolicy: 'auto',
        skipClassLists: true,
        preview: { classLists: { created: 0, skippedExisting: 0 } as never },
      })
    ).toBe(false);
  });

  it('buildRolloverPreviewCsvRows includes promote and register metrics', () => {
    const rows = buildRolloverPreviewCsvRows({
      close: { term: { name: '2026 S2' }, classesToDeactivate: 3 },
      nextTerm: { name: '2027' },
      classLists: { created: 5, skippedExisting: 1 } as never,
      promote: {
        toPromote: 2,
        skippedAlreadyPromoted: 1,
        skippedWrongCohort: 0,
        heldBack: 0,
        samples: { promote: [{ studentNumber: 'S001', from: 'Y1.S1', to: 'Y1.S2' }] },
      } as never,
      register: { studentsConsidered: 10 } as never,
      registrationPolicy: 'auto',
    });

    expect(rows.some((r) => r[1] === 'Would create' && r[2] === '5')).toBe(true);
    expect(rows.some((r) => r[0] === 'Promote sample' && r[1] === 'S001')).toBe(true);
    expect(rows.some((r) => r[1] === 'Students considered' && r[2] === '10')).toBe(true);
  });

  it('wizardHasActiveTerm uses readiness or loaded active term', () => {
    expect(wizardHasActiveTerm({ hasActiveTerm: true }, null)).toBe(true);
    expect(wizardHasActiveTerm({ hasActiveTerm: false }, term({ id: 'a', name: 'Active' }))).toBe(
      true
    );
    expect(wizardHasActiveTerm({ hasActiveTerm: false }, null)).toBe(false);
    expect(wizardHasActiveTerm(null, null)).toBe(false);
  });
});
