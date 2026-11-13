import { hrAppraisalService } from '@/services/hr-appraisal.service';
import type { AppraisalFormTemplate, HrAppraisalCycle, HrAppraisalReview } from './types';

function buildTemplateApiPayload(template: Partial<AppraisalFormTemplate> & { code: string; name: string }) {
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
      includesDevelopmentPlan: template.includesDevelopmentPlan ?? false,
      includesTrainingNeeds: template.includesTrainingNeeds ?? true,
      ...(template.formCapture ? { formCapture: template.formCapture } : {}),
    },
  };
}

export async function getAppraisalFormTemplates(): Promise<AppraisalFormTemplate[]> {
  return hrAppraisalService.getTemplates();
}

export async function getHrAppraisalCycles(): Promise<HrAppraisalCycle[]> {
  return hrAppraisalService.getCycles();
}

export async function getHrAppraisalReviewById(id: string): Promise<HrAppraisalReview | undefined> {
  return (await hrAppraisalService.getReview(id)) ?? undefined;
}

export async function getHrAppraisalDashboardSummary() {
  return hrAppraisalService.getDashboardSummary();
}

export async function updateAppraisalCycleStatus(id: string, status: HrAppraisalCycle['status']) {
  return hrAppraisalService.updateCycleStatus(id, status);
}

export async function saveAppraisalTemplate(
  template: Partial<AppraisalFormTemplate> & { code: string; name: string },
  id?: string
): Promise<AppraisalFormTemplate> {
  return hrAppraisalService.saveTemplate(buildTemplateApiPayload(template), id);
}

export async function getCalibrationForCycle(cycleId: string) {
  return hrAppraisalService.getCalibration(cycleId);
}
