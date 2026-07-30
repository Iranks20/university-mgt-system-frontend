export type EmploymentStatus = 'Active' | 'On Leave' | 'Suspended' | 'Terminated' | 'Probation';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Adjunct';
export type EmployeeCategory = 'Academic' | 'Administrative' | 'Support' | 'Clinical';

export type AppraisalCycleStatus = 'Draft' | 'Open' | 'Review' | 'Closed';
export type AppraisalCycleKind = 'Annual' | 'Probation' | 'MidYear';
export type AppraisalReviewStatus =
  | 'Not Started'
  | 'Self Assessment Pending'
  | 'Supervisor Review'
  | 'HR Review'
  | 'Completed'
  | 'Overdue';

export type AppraisalCycleScope = 'all' | 'academic' | 'administrative' | 'support' | 'clinical';

export type AppraisalSectionKind = 'scorecard' | 'kpi' | 'narrative';
export type AppraisalCriterionRating = 0 | 1 | 2 | 3 | 'N/A';
export type AppraisalRatingScale = 1 | 2 | 3 | 4 | 5;

export type AppraisalFormCriterion = {
  id: string;
  title: string;
  targetPrompt: string;
  meansOfVerification?: string;
  weight: number;
};

export type AppraisalFormSection = {
  id: string;
  title: string;
  kind: AppraisalSectionKind;
  maxSectionScore?: number;
  criteria: AppraisalFormCriterion[];
};

export type AppraisalFormGoalTemplate = {
  id: string;
  title: string;
  targetPrompt: string;
  defaultWeight: number;
};

export type AppraisalFormTemplate = {
  id: string;
  code: string;
  name: string;
  description: string;
  intendedFor: string;
  categories: EmployeeCategory[];
  jobTitlePatterns?: string[];
  departmentPatterns?: string[];
  sections?: AppraisalFormSection[];
  ratingScaleMax?: number;
  ratingIncludesNa?: boolean;
  cycleKind?: AppraisalCycleKind;
  goals: AppraisalFormGoalTemplate[];
  competencies: string[];
  includesDevelopmentPlan: boolean;
  includesTrainingNeeds: boolean;
  formCapture?: {
    headerFields?: Array<{ id: string; label: string; fieldType: string; defaultValue?: string }>;
    oseiRatingLevels?: Array<{ score: number | string; label: string; percentageRange?: string; definition: string }>;
    supervisorNarrativeFields?: Array<{ id: string; label: string; fieldType: string }>;
    staffAcknowledgementFields?: Array<{ id: string; label: string; fieldType: string }>;
    hrFields?: Array<{ id: string; label: string; fieldType: string }>;
    viceChancellorFields?: Array<{ id: string; label: string; fieldType: string }>;
  };
};

export type AppraisalAssignmentRule =
  | { ruleType: 'category'; category: EmployeeCategory; templateId: string }
  | { ruleType: 'jobTitle'; pattern: string; templateId: string }
  | { ruleType: 'department'; pattern: string; templateId: string }
  | { ruleType: 'default'; templateId: string };

export type CycleFormAssignment = {
  category: EmployeeCategory;
  templateId: string;
};

export type CreateAppraisalCycleInput = {
  name: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  selfAssessmentDeadline: string;
  supervisorDeadline: string;
  scope: AppraisalCycleScope;
  kind?: AppraisalCycleKind;
  formAssignments?: AppraisalAssignmentRule[];
  categorySelections?: CycleFormAssignment[];
  closePreviousOpen: boolean;
};

export type AppraisalCriterionResponse = {
  criterionId: string;
  achievement: string;
  selfRating: AppraisalCriterionRating | null;
  supervisorRating: AppraisalCriterionRating | null;
  selfComment?: string;
  supervisorComment?: string;
};

export type AppraisalSectionSummaryScore = {
  sectionId: string;
  selfScore: number | null;
  supervisorScore: number | null;
  hrComment?: string;
};

export type AppraisalReviewResponses = {
  criteria: AppraisalCriterionResponse[];
  summaryScores: AppraisalSectionSummaryScore[];
};

export type HrAppraisalCycle = {
  id: string;
  name: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  kind?: AppraisalCycleKind;
  status: AppraisalCycleStatus;
  employeeCount: number;
  completedCount: number;
  formAssignments: AppraisalAssignmentRule[];
  scopeCategories?: EmployeeCategory[];
};

export type AppraisalGoal = {
  id: string;
  title: string;
  target: string;
  achievement: string;
  weight: number;
  selfRating: AppraisalRatingScale | null;
  supervisorRating: AppraisalRatingScale | null;
};

export type HrAppraisalReview = {
  id: string;
  cycleId: string;
  cycleName: string;
  employeeId: string;
  employeeName: string;
  department: string;
  jobTitle: string;
  supervisorName: string;
  formTemplateId: string;
  formTemplateName: string;
  formTemplateCode?: string;
  status: AppraisalReviewStatus;
  dueDate: string;
  overallSelfRating?: AppraisalRatingScale | null;
  overallSupervisorRating?: AppraisalRatingScale | null;
  overallHrRating?: AppraisalRatingScale | null;
  overallSelfScore?: number | null;
  overallSupervisorScore?: number | null;
  overallHrScore?: number | null;
  ratingScaleMax?: number;
  ratingIncludesNa?: boolean;
  sections?: AppraisalFormSection[];
  responses?: AppraisalReviewResponses;
  summaryScores?: AppraisalSectionSummaryScore[];
  archivedDocumentTitle?: string | null;
  completedAt?: string | null;
  goals: AppraisalGoal[];
  selfStrengths: string;
  selfImprovements: string;
  selfDevelopmentPlan: string;
  supervisorComments: string;
  hrComments: string;
  competencies: {
    id: string;
    name: string;
    selfRating: AppraisalRatingScale | null;
    supervisorRating: AppraisalRatingScale | null;
  }[];
};

export const APPRAISAL_RATING_LABELS: Record<AppraisalRatingScale, string> = {
  1: 'Unsatisfactory',
  2: 'Needs Improvement',
  3: 'Meets Expectations',
  4: 'Exceeds Expectations',
  5: 'Outstanding',
};

export const KCU_APPRAISAL_RATING_LABELS: Record<AppraisalCriterionRating, string> = {
  3: 'Exceeds expectations',
  2: 'Meets expectations',
  1: 'Partially meets',
  0: 'Does not meet',
  'N/A': 'Not applicable',
};

export const HR_PERMISSIONS = {
  read: 'hr.read',
  write: 'hr.write',
  leaveManage: 'hr.leave_manage',
  leaveApprove: 'hr.leave_approve',
  leaveRequest: 'hr.leave_request',
  reports: 'hr.reports',
  appraisalManage: 'hr.appraisal_manage',
  appraisalSubmit: 'hr.appraisal_submit',
} as const;
