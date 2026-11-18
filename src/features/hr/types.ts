export type EmploymentStatus = 'Active' | 'On Leave' | 'Suspended' | 'Terminated' | 'Probation';
export type EmploymentType = 'Full-time' | 'Part-time' | 'Contract' | 'Adjunct';
export type EmployeeCategory = 'Academic' | 'Administrative' | 'Support' | 'Clinical';

// ------------------------------------------------------------------ appraisal: cycles and forms

export type AppraisalCycleStatus = 'Draft' | 'Open' | 'Review' | 'Closed';

/** Appraisal type, as on the KCU Performance Agreement form. */
export type AppraisalCycleKind = 'Annual' | 'MidYear' | 'Probation' | 'EndOfContract' | 'Special';

export const APPRAISAL_TYPE_OPTIONS: Array<{ value: AppraisalCycleKind; label: string; individual: boolean }> = [
  { value: 'Annual', label: 'Annual Appraisal', individual: false },
  { value: 'MidYear', label: 'Mid-term review', individual: false },
  { value: 'Probation', label: 'Probation period review', individual: true },
  { value: 'EndOfContract', label: 'End of contract period review', individual: true },
  { value: 'Special', label: 'Special period review', individual: true },
];

export type AppraisalReviewStatus =
  | 'Not Started'
  | 'Self Assessment Pending'
  | 'Supervisor Review'
  | 'HR Review'
  | 'VC Review'
  | 'Completed'
  | 'Overdue';

export type AppraisalReviewStatusCode =
  | 'NotStarted'
  | 'SelfPending'
  | 'SupervisorReview'
  | 'HrReview'
  | 'VcReview'
  | 'Completed'
  | 'Overdue';

export type AppraisalSectionKind = 'scorecard' | 'kpi' | 'narrative';
export type AppraisalCriterionRating = 0 | 1 | 2 | 3 | 'N/A';

/** Rating choices worded as on the previous appraisal system's dropdowns. */
export const APPRAISAL_RATING_OPTIONS: Array<{ value: AppraisalCriterionRating; label: string }> = [
  { value: 3, label: '3 - Outstanding' },
  { value: 2, label: '2 - Competent' },
  { value: 1, label: '1 - Developing' },
  { value: 0, label: '0 - Below Exp.' },
  { value: 'N/A', label: 'N/A' },
];

export const EMPLOYMENT_TYPE_OPTIONS = [
  'Permanent Full-time',
  'Full-time',
  'Part-time',
  'Contract Full-time',
  'Contract Part-time',
  'Adjunct',
];

export const SCHOOL_UNIT_OPTIONS = [
  'School of Law and Management Sciences',
  'School of Medicine, Health and Life Sciences',
  'School of Science, Computing and Engineering',
];

/** OSEI (Objectively Scorable Evaluation Instrument) bands, worded as on the KCU form. */
export const OSEI_LEVELS: Array<{ score: 0 | 1 | 2 | 3; label: string; range: string; definition: string }> = [
  {
    score: 0,
    label: 'Below Expectations',
    range: '64% or less',
    definition:
      "The staff have not achieved most of the agreed targets and without supporting reasons for not achieving them. This is the performance which is below the level acceptable for continued employment in the staff member's rank, or in some instances, in any academic post.",
  },
  {
    score: 1,
    label: 'Developing',
    range: '65–74%',
    definition:
      'Not consistent or fully developed in some essential aspects, could be a weakness if critical for the job success. The staff achieved minimal outputs in line with the agreed targets, and without a supporting justification for inability to meet the commitments.',
  },
  {
    score: 2,
    label: 'Competent',
    range: '75–89%',
    definition:
      'Solid and steady in essential aspects but could be improved. The staff achieved most, but not all the agreed outputs in line with the agreed targets, and there are no supporting reasons for not meeting the other commitments.',
  },
  {
    score: 3,
    label: 'Outstanding',
    range: '90–100%',
    definition:
      'Truly excellent, highly effective — a clear strength; could be a role model for others. The staff achieved all the agreed outputs in line with the agreed targets, and consistently meets expectations for outputs achieved and the means by which they are achieved. Recognition and/or promotion to a higher rank are justified.',
  },
];

export const OSEI_NOT_APPLICABLE_DEFINITION =
  'The performance factors do not apply to the staff member. It is not part of his/her duties and responsibilities. They are not requirements for the position.';

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
  includesDevelopmentPlan: boolean;
  includesTrainingNeeds: boolean;
  formCapture?: Record<string, unknown>;
};

export type AppraisalJobCategory =
  | 'lecturer'
  | 'senior_lecturer'
  | 'assistant_lecturer'
  | 'teaching_assistant'
  | 'associate_professor'
  | 'professor'
  | 'head_of_department'
  | 'laboratory_technologist'
  | 'ict_manager'
  | 'librarian'
  | 'ar'
  | 'director_finance'
  | 'other';

export const APPRAISAL_JOB_CATEGORY_LABELS: Record<AppraisalJobCategory, string> = {
  lecturer: 'Lecturer',
  senior_lecturer: 'Senior Lecturer',
  assistant_lecturer: 'Assistant Lecturer',
  teaching_assistant: 'Teaching Assistant',
  associate_professor: 'Associate Professor',
  professor: 'Professor',
  head_of_department: 'Head of Department',
  laboratory_technologist: 'Laboratory Technologist',
  ict_manager: 'ICT Manager',
  librarian: 'Librarian',
  ar: 'Academic Registrar',
  director_finance: 'Director Finance',
  other: 'Other staff',
};

export type AppraisalAssignmentRule =
  | { ruleType: 'jobCategory'; jobCategory: AppraisalJobCategory; templateId: string }
  | { ruleType: 'category'; category: EmployeeCategory; templateId: string }
  | { ruleType: 'jobTitle'; pattern: string; templateId: string }
  | { ruleType: 'department'; pattern: string; templateId: string }
  | { ruleType: 'default'; templateId: string };

export type CreateAppraisalCycleInput = {
  name: string;
  periodLabel: string;
  kind: AppraisalCycleKind;
  startDate: string;
  endDate: string;
  selfDeadline: string;
  supervisorDeadline: string;
  scopeCategories: EmployeeCategory[];
  formAssignments: AppraisalAssignmentRule[];
  /** Individual appraisal (probation, end of contract, special): only these staff. */
  staffIds?: string[];
  closePreviousOpen: boolean;
};

export type HrAppraisalCycle = {
  id: string;
  name: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  selfDeadline: string;
  supervisorDeadline: string;
  kind: AppraisalCycleKind;
  kindLabel: string;
  status: AppraisalCycleStatus;
  employeeCount: number;
  completedCount: number;
  formAssignments: AppraisalAssignmentRule[];
  scopeCategories?: EmployeeCategory[];
  isIndividual: boolean;
};

// ------------------------------------------------------------------ appraisal: one review

export type AppraisalCriterionResponse = {
  criterionId: string;
  achievement?: string;
  selfRating: AppraisalCriterionRating | null;
  supervisorRating: AppraisalCriterionRating | null;
};

export type AppraisalReviewResponses = {
  criteria: AppraisalCriterionResponse[];
  summaryScores: unknown[];
};

export type AppraisalSignoffStage = 'SelfAttestation' | 'Supervisor' | 'Hr' | 'Vc';

export type AppraisalSignoff = {
  stage: AppraisalSignoffStage;
  signerName: string;
  signerPosition: string | null;
  signerPhone: string | null;
  signedOn: string | null;
  /** API path (relative to the API base) of the signature image. */
  signatureUrl: string;
};

/** Performance Agreement (bio-data) from the start of the appraisal. */
export type AppraisalAgreement = {
  periodFrom: string | null;
  periodTo: string | null;
  designation: string;
  employmentType: string;
  appointmentDate: string | null;
  schoolUnit: string;
  departmentName: string;
  supervisorRank: string;
  savedAt: string | null;
};

export type HrAppraisalReview = {
  id: string;
  cycleId: string;
  cycleName: string;
  cycleStatus: AppraisalCycleStatus;
  employeeId: string;
  employeeName: string;
  employeeEmail: string;
  staffNumber: string;
  employeePhone: string | null;
  department: string;
  jobTitle: string;
  supervisorStaffId: string | null;
  supervisorName: string | null;
  formTemplateId: string;
  formTemplateName: string;
  formTemplateCode: string;
  status: AppraisalReviewStatus;
  statusCode: AppraisalReviewStatusCode;
  dueDate: string;
  isOverdue: boolean;
  appraisalType: AppraisalCycleKind;
  appraisalTypeLabel: string;
  agreement: AppraisalAgreement;
  responses: AppraisalReviewResponses;
  sectionScores: Array<{ sectionId: string; selfScore: number | null; supervisorScore: number | null }>;
  ratingScaleMax: number;
  ratingIncludesNa: boolean;
  sections: AppraisalFormSection[];
  trainingNeeds: string;
  supervisorStrengths: string;
  supervisorImprovements: string;
  supervisorRecommendations: string;
  hrComments: string;
  vcComments: string;
  overallSelfScore: number | null;
  overallSupervisorScore: number | null;
  oseiScore: 0 | 1 | 2 | 3 | null;
  signoffs: AppraisalSignoff[];
  progress: {
    selfAssessment: boolean;
    supervisorRating: boolean;
    hrSigned: boolean;
    vcSigned: boolean;
  };
  completedAt: string | null;
  archivedDocumentTitle: string | null;
};

export type AppraisalSignatureInput = {
  signature: string;
  signedOn: string;
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
  appraisalVc: 'hr.appraisal_vc',
} as const;
