import type {
  AcademicTerm,
  GenerateClassListsResult,
  PromoteStudentsResult,
  RegisterStudentsResult,
} from '@/services/academic.service';
import type { buildPromotePayload } from '@/lib/academic-rollover-promote';
import {
  DEFAULT_INCLUDE_UNSCOPED_ACTIVE_CLASSES,
  type ClassListMode,
  type RegistrationPolicy,
} from '@/lib/academic-rollover-defaults';

export const ROLLOVER_WIZARD_STEPS = [
  'Close',
  'Next term',
  'Publish offerings',
  'Promote',
  'Register',
  'Review',
] as const;

export type NextTermForm = {
  name: string;
  academicYear: string;
  semester: string;
  startDate: string;
  endDate: string;
};

export type RolloverWizardPreviewSlice = {
  close: {
    term: { name: string };
    classesToDeactivate: number;
  } | null;
  nextTerm: { name: string };
  classLists: GenerateClassListsResult | null;
  promote: PromoteStudentsResult | null;
  register: RegisterStudentsResult | null;
  registrationPolicy: RegistrationPolicy;
};

export function suggestNextTerm(
  active: AcademicTerm | null,
  yearNow = new Date().getFullYear()
): NextTermForm {
  if (!active || active.semester === 0) {
    const year = active ? active.academicYear + 1 : yearNow;
    return {
      name: `Academic Year ${year}`,
      academicYear: String(year),
      semester: '0',
      startDate: `${year}-01-15`,
      endDate: `${year}-05-30`,
    };
  }
  if (active.semester === 1) {
    return {
      name: `Academic Year ${active.academicYear} — Semester 2`,
      academicYear: String(active.academicYear),
      semester: '2',
      startDate: `${active.academicYear}-07-01`,
      endDate: `${active.academicYear}-12-15`,
    };
  }
  const nextYear = active.academicYear + 1;
  return {
    name: `Academic Year ${nextYear}`,
    academicYear: String(nextYear),
    semester: '0',
    startDate: `${nextYear}-01-15`,
    endDate: `${nextYear}-05-30`,
  };
}

export type RolloverWizardPayloadInput = {
  closeTermId: string;
  form: NextTermForm;
  promotePayload: ReturnType<typeof buildPromotePayload>;
  classListMode: ClassListMode;
  skipPromote: boolean;
  skipClassLists: boolean;
  skipRegister: boolean;
  registrationPolicy: RegistrationPolicy;
};

export function buildRolloverWizardPayload(input: RolloverWizardPayloadInput) {
  return {
    closeTermId: input.closeTermId || undefined,
    includeUnscopedActiveClasses: DEFAULT_INCLUDE_UNSCOPED_ACTIVE_CLASSES,
    nextTerm: {
      name: input.form.name.trim(),
      academicYear: Number(input.form.academicYear),
      semester: Number(input.form.semester) as 0 | 1 | 2,
      startDate: input.form.startDate,
      endDate: input.form.endDate,
    },
    ...input.promotePayload,
    classListMode: input.classListMode,
    sourceTermId: input.closeTermId || undefined,
    skipPromote: input.skipPromote,
    skipClassLists: input.skipClassLists,
    skipRegister: input.skipRegister || input.registrationPolicy === 'none',
    registrationPolicy: input.registrationPolicy,
    openRegistration:
      input.registrationPolicy === 'self' || input.registrationPolicy === 'hybrid',
  };
}

export function isRegisterBlockedByOfferings(params: {
  skipRegister: boolean;
  registrationPolicy: RegistrationPolicy;
  skipClassLists: boolean;
  preview: { classLists: GenerateClassListsResult | null } | null;
}): boolean {
  return (
    !params.skipRegister &&
    params.registrationPolicy !== 'none' &&
    !params.skipClassLists &&
    params.preview != null &&
    (params.preview.classLists?.created ?? 0) === 0 &&
    (params.preview.classLists?.skippedExisting ?? 0) === 0
  );
}

export function buildRolloverPreviewCsvRows(preview: RolloverWizardPreviewSlice): string[][] {
  const rows: string[][] = [
    ['Section', 'Metric', 'Value'],
    ['Close', 'Term', preview.close?.term.name ?? 'skipped'],
    ['Close', 'Classes to deactivate', String(preview.close?.classesToDeactivate ?? 0)],
    ['Next term', 'Name', preview.nextTerm.name],
    ['Offerings', 'Would create', String(preview.classLists?.created ?? 0)],
    ['Offerings', 'Skip existing', String(preview.classLists?.skippedExisting ?? 0)],
    ['Promote', 'To promote', String(preview.promote?.toPromote ?? 0)],
    ['Promote', 'Already promoted', String(preview.promote?.skippedAlreadyPromoted ?? 0)],
    ['Promote', 'Wrong cohort skip', String(preview.promote?.skippedWrongCohort ?? 0)],
    ['Promote', 'Holdbacks', String(preview.promote?.heldBack ?? 0)],
    ['Register', 'Policy', preview.registrationPolicy],
    ['Register', 'Students considered', String(preview.register?.studentsConsidered ?? 0)],
  ];
  for (const sample of preview.promote?.samples?.promote ?? []) {
    rows.push(['Promote sample', sample.studentNumber, `${sample.from} -> ${sample.to}`]);
  }
  return rows;
}

export function wizardHasActiveTerm(
  readiness: { hasActiveTerm: boolean } | null,
  active: AcademicTerm | null
): boolean {
  return readiness?.hasActiveTerm === true || active != null;
}
