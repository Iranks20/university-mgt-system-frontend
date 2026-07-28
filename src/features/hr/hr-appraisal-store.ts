import { hrAppraisalService } from '@/services/hr-appraisal.service';
import type {
  AppraisalAssignmentRule,
  AppraisalFormTemplate,
  CreateAppraisalCycleInput,
  HrAppraisalCycle,
  HrAppraisalReview,
} from './types';
import { buildLaunchAssignments } from './appraisal-form-utils';

function buildTemplateApiPayload(
  template: Partial<AppraisalFormTemplate> & { code: string; name: string }
) {
  return {
    code: template.code,
    name: template.name,
    description: template.description ?? '',
    cycleKind: template.cycleKind ?? 'Annual',
    status: 'Published' as const,
    definition: {
      ratingScaleMax: template.ratingScaleMax ?? 3,
      ratingIncludesNa: template.ratingIncludesNa ?? true,
      intendedFor: template.intendedFor ?? '',
      categories: template.categories ?? ['Administrative'],
      jobTitlePatterns: template.jobTitlePatterns ?? [],
      departmentPatterns: template.departmentPatterns ?? [],
      sections: template.sections ?? [],
      includesDevelopmentPlan: template.includesDevelopmentPlan ?? true,
      includesTrainingNeeds: template.includesTrainingNeeds ?? true,
    },
  };
}

export async function getAppraisalFormTemplates(): Promise<AppraisalFormTemplate[]> {
  return hrAppraisalService.getTemplates();
}

export async function getAppraisalFormTemplateById(id: string): Promise<AppraisalFormTemplate | undefined> {
  const template = await hrAppraisalService.getTemplate(id);
  return template ?? undefined;
}

export async function getHrAppraisalCycles(): Promise<HrAppraisalCycle[]> {
  return hrAppraisalService.getCycles();
}

export async function getHrAppraisalReviews(): Promise<HrAppraisalReview[]> {
  const result = await hrAppraisalService.getReviews({ limit: 200 });
  return result.data;
}

export async function getHrAppraisalReviewById(id: string): Promise<HrAppraisalReview | undefined> {
  const review = await hrAppraisalService.getReview(id);
  return review ?? undefined;
}

export async function getHrAppraisalDashboardSummary(): Promise<{
  activeCycle: {
    id: string;
    name: string;
    periodLabel: string;
    endDate: string;
    status: string;
  } | null;
  inProgressCount: number;
  recentReviews: HrAppraisalReview[];
}> {
  return hrAppraisalService.getDashboardSummary();
}

export async function saveAppraisalReview(
  review: HrAppraisalReview,
  action: 'save' | 'submit_self' | 'submit_supervisor' | 'submit_hr' | 'complete' | 'advance_hr' = 'save'
): Promise<HrAppraisalReview> {
  return hrAppraisalService.updateReview(review.id, {
    responses: review.responses,
    selfStrengths: review.selfStrengths,
    selfImprovements: review.selfImprovements,
    selfDevelopmentPlan: review.selfDevelopmentPlan,
    supervisorComments: review.supervisorComments,
    hrComments: review.hrComments,
    overallHrScore: review.overallHrScore ?? null,
    action,
  });
}

export async function createAndLaunchAppraisalCycle(input: CreateAppraisalCycleInput): Promise<HrAppraisalCycle> {
  const templates = await getAppraisalFormTemplates();
  const formAssignments =
    input.formAssignments ??
    (input.categorySelections
      ? buildLaunchAssignments(templates, input.categorySelections)
      : buildLaunchAssignments(templates, []));
  return hrAppraisalService.createCycle({ ...input, formAssignments });
}

export async function resolveAppraisalReviewForAccount(): Promise<HrAppraisalReview | null> {
  return hrAppraisalService.getMyReview();
}

export async function saveAppraisalTemplate(
  template: Partial<AppraisalFormTemplate> & { code: string; name: string },
  id?: string
): Promise<AppraisalFormTemplate> {
  return hrAppraisalService.saveTemplate(buildTemplateApiPayload(template), id);
}

export async function getCompletedAppraisalArchives(): Promise<HrAppraisalReview[]> {
  return hrAppraisalService.getArchives();
}

export async function getCalibrationForCycle(cycleId: string) {
  return hrAppraisalService.getCalibration(cycleId);
}

export function categoryRulesFromTemplates(
  templates: AppraisalFormTemplate[]
): AppraisalAssignmentRule[] {
  const byCode = Object.fromEntries(templates.map((t) => [t.code, t.id]));
  const adminId = byCode['ADMIN-KPI'] ?? templates[0]?.id;
  if (!adminId) return [];
  return [
    { ruleType: 'jobTitle', pattern: 'professor', templateId: byCode['PROF-2026'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'lecturer', templateId: byCode['LEC-2026'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'director finance', templateId: byCode['DIR-FIN'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'librarian', templateId: byCode['LIB-UNIV'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'registrar', templateId: byCode['REG-AR'] ?? adminId },
    { ruleType: 'default', templateId: adminId },
  ];
}
