import type {
  AppraisalAssignmentRule,
  AppraisalCriterionRating,
  AppraisalFormSection,
  AppraisalFormTemplate,
  AppraisalReviewResponses,
  EmployeeCategory,
} from './types';

export const EMPLOYEE_CATEGORY_LABELS: Record<EmployeeCategory, string> = {
  Academic: 'Academic staff',
  Administrative: 'Administrative staff',
  Support: 'Support staff',
  Clinical: 'Clinical staff',
};

export function categoriesInScope(scope: string): EmployeeCategory[] {
  if (scope === 'all') return ['Academic', 'Administrative', 'Support', 'Clinical'];
  if (scope === 'academic') return ['Academic'];
  if (scope === 'administrative') return ['Administrative'];
  if (scope === 'support') return ['Support'];
  return ['Clinical'];
}

export function inferEmployeeCategory(
  category?: EmployeeCategory,
  jobTitle?: string,
  department?: string
): EmployeeCategory {
  if (category) return category;
  const title = (jobTitle || '').toLowerCase();
  const dept = (department || '').toLowerCase();
  if (/clinical|preceptor|nurse pract/i.test(title)) return 'Clinical';
  if (/lecturer|professor|faculty|academic/i.test(title)) return 'Academic';
  if (/driver|cleaner|security|assistant.*lab/i.test(title)) return 'Support';
  if (/registry|finance|hr|admin|officer|manager|registrar|librarian|director/i.test(title)) {
    return 'Administrative';
  }
  if (/ict|systems|support/i.test(dept)) return 'Support';
  return 'Administrative';
}

export function resolveTemplateForStaff(params: {
  templates: AppraisalFormTemplate[];
  category: EmployeeCategory;
  jobTitle: string;
  department?: string;
  preferredTemplateId?: string;
}): AppraisalFormTemplate | undefined {
  const { templates, category, jobTitle, department, preferredTemplateId } = params;
  if (preferredTemplateId) {
    const preferred = templates.find((t) => t.id === preferredTemplateId);
    if (preferred) return preferred;
  }

  const title = jobTitle.toLowerCase();
  const dept = (department || '').toLowerCase();

  for (const template of templates) {
    if (template.jobTitlePatterns?.some((pattern) => title.includes(pattern.toLowerCase()))) {
      return template;
    }
  }
  for (const template of templates) {
    if (template.departmentPatterns?.some((pattern) => dept.includes(pattern.toLowerCase()))) {
      return template;
    }
  }
  const categoryMatch = templates.find((t) => t.categories.includes(category));
  if (categoryMatch) return categoryMatch;
  return templates.find((t) => t.code === 'ADMIN-KPI') ?? templates[0];
}

export function getTemplatesForCategory(
  templates: AppraisalFormTemplate[],
  category: EmployeeCategory
): AppraisalFormTemplate[] {
  return templates.filter((t) => t.categories.includes(category) || t.categories.length >= 3);
}

export function employeeInScope(scope: string, category: EmployeeCategory): boolean {
  return categoriesInScope(scope).includes(category);
}

export function emptyResponsesForSections(sections: AppraisalFormSection[]): AppraisalReviewResponses {
  const criteria = sections.flatMap((section) =>
    section.criteria.map((criterion) => ({
      criterionId: criterion.id,
      achievement: '',
      selfRating: null as AppraisalCriterionRating | null,
      supervisorRating: null as AppraisalCriterionRating | null,
      selfComment: '',
      supervisorComment: '',
    }))
  );
  const summaryScores = sections
    .filter((section) => section.kind === 'scorecard')
    .map((section) => ({
      sectionId: section.id,
      selfScore: null,
      supervisorScore: null,
      hrComment: '',
    }));
  return { criteria, summaryScores };
}

export function defaultCategorySelections(
  templates: AppraisalFormTemplate[],
  scope: string
): Array<{ category: EmployeeCategory; templateId: string }> {
  return categoriesInScope(scope).map((category) => {
    const template = resolveTemplateForStaff({
      templates,
      category,
      jobTitle: category === 'Academic' ? 'lecturer' : 'officer',
    });
    return { category, templateId: template?.id ?? templates[0]?.id ?? '' };
  });
}

export function defaultFormAssignmentsForScope(
  templates: AppraisalFormTemplate[],
  scope: string
): Array<{ category: EmployeeCategory; templateId: string }> {
  return defaultCategorySelections(templates, scope);
}

export function buildLaunchAssignments(
  templates: AppraisalFormTemplate[],
  categorySelections: Array<{ category: EmployeeCategory; templateId: string }>
): AppraisalAssignmentRule[] {
  const byCode = Object.fromEntries(templates.map((t) => [t.code, t.id]));
  const adminId = byCode['ADMIN-KPI'] ?? templates[0]?.id;
  if (!adminId) return [];

  const rules: AppraisalAssignmentRule[] = [
    { ruleType: 'jobTitle', pattern: 'associate professor', templateId: byCode['PROF-2026'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'professor', templateId: byCode['PROF-2026'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'director finance', templateId: byCode['DIR-FIN'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'finance director', templateId: byCode['DIR-FIN'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'librarian', templateId: byCode['LIB-UNIV'] ?? adminId },
    { ruleType: 'jobTitle', pattern: 'registrar', templateId: byCode['REG-AR'] ?? adminId },
    { ruleType: 'department', pattern: 'finance', templateId: byCode['DIR-FIN'] ?? adminId },
    { ruleType: 'department', pattern: 'library', templateId: byCode['LIB-UNIV'] ?? adminId },
    { ruleType: 'department', pattern: 'registry', templateId: byCode['REG-AR'] ?? adminId },
  ];

  for (const selection of categorySelections) {
    rules.push({
      ruleType: 'category',
      category: selection.category,
      templateId: selection.templateId,
    });
  }

  rules.push({ ruleType: 'default', templateId: adminId });
  return rules;
}

export function getCriterionResponse(
  responses: AppraisalReviewResponses | undefined,
  criterionId: string
) {
  return responses?.criteria.find((row) => row.criterionId === criterionId);
}

export function upsertCriterionResponse(
  responses: AppraisalReviewResponses,
  criterionId: string,
  patch: Partial<AppraisalReviewResponses['criteria'][number]>
): AppraisalReviewResponses {
  const criteria = responses.criteria.map((row) =>
    row.criterionId === criterionId ? { ...row, ...patch } : row
  );
  if (!criteria.some((row) => row.criterionId === criterionId)) {
    criteria.push({
      criterionId,
      achievement: '',
      selfRating: null,
      supervisorRating: null,
      ...patch,
    });
  }
  return { ...responses, criteria };
}
