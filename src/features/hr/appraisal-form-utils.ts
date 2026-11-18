import type {
  AppraisalCriterionRating,
  AppraisalFormSection,
  AppraisalReviewResponses,
  EmployeeCategory,
} from './types';

export const EMPLOYEE_CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  Academic: 'Academic staff',
  Administrative: 'Administrative staff',
  Support: 'Support staff',
  Clinical: 'Clinical staff',
};

export const ALL_EMPLOYEE_CATEGORIES: EmployeeCategory[] = ['Academic', 'Administrative', 'Support', 'Clinical'];

export type RatingField = 'selfRating' | 'supervisorRating';

export function ratingFor(
  responses: AppraisalReviewResponses | undefined,
  criterionId: string,
  field: RatingField
): AppraisalCriterionRating | null {
  return responses?.criteria.find((row) => row.criterionId === criterionId)?.[field] ?? null;
}

export function setRating(
  responses: AppraisalReviewResponses,
  criterionId: string,
  field: RatingField,
  value: AppraisalCriterionRating | null
): AppraisalReviewResponses {
  const exists = responses.criteria.some((row) => row.criterionId === criterionId);
  const criteria = exists
    ? responses.criteria.map((row) => (row.criterionId === criterionId ? { ...row, [field]: value } : row))
    : [...responses.criteria, { criterionId, selfRating: null, supervisorRating: null, [field]: value }];
  return { ...responses, criteria };
}

/** Same rule as the server: sum / (3 x rated items), N/A and unrated items left out. */
export function sectionPercent(
  section: AppraisalFormSection,
  responses: AppraisalReviewResponses | undefined,
  field: RatingField,
  scaleMax = 3
): number | null {
  let total = 0;
  let counted = 0;
  for (const criterion of section.criteria) {
    const value = ratingFor(responses, criterion.id, field);
    if (value === null || value === 'N/A') continue;
    total += value;
    counted += 1;
  }
  return counted ? (total / (scaleMax * counted)) * 100 : null;
}

/** Overall % = average of section percentages, rounded to a whole percent (as the server does). */
export function overallPercent(
  sections: AppraisalFormSection[],
  responses: AppraisalReviewResponses | undefined,
  field: RatingField,
  scaleMax = 3
): number | null {
  const pcts = sections
    .filter((s) => s.kind === 'kpi')
    .map((s) => sectionPercent(s, responses, field, scaleMax))
    .filter((v): v is number => v !== null);
  return pcts.length ? Math.round(pcts.reduce((a, b) => a + b, 0) / pcts.length) : null;
}

export function oseiScoreForPercent(percent: number | null | undefined): 0 | 1 | 2 | 3 | null {
  if (percent === null || percent === undefined) return null;
  if (percent >= 90) return 3;
  if (percent >= 75) return 2;
  if (percent >= 65) return 1;
  return 0;
}

export function unratedCount(
  sections: AppraisalFormSection[],
  responses: AppraisalReviewResponses | undefined,
  field: RatingField
): number {
  return sections
    .flatMap((s) => s.criteria)
    .filter((c) => ratingFor(responses, c.id, field) === null).length;
}

/** Today's date in the user's own time zone (toISOString would give the UTC date). */
export function todayIso(): string {
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

export function formatPercent(value: number | null | undefined): string {
  return value === null || value === undefined ? '—' : `${value}%`;
}
