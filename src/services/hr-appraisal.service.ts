import api from '@/lib/api';
import type {
  AppraisalAssignmentRule,
  AppraisalCycleKind,
  AppraisalFormTemplate,
  AppraisalReviewResponses,
  CreateAppraisalCycleInput,
  HrAppraisalCycle,
  HrAppraisalReview,
} from '@/features/hr/types';

type Paged<T> = { data: T[]; total: number; page: number; pageSize: number; totalPages?: number };

export type CalibrationRow = {
  department: string;
  count: number;
  completed: number;
  avgSelf: number | null;
  avgSupervisor: number | null;
};

export type HrAppraisalDashboardSummary = {
  activeCycle: {
    id: string;
    name: string;
    periodLabel: string;
    endDate: string;
    status: string;
  } | null;
  inProgressCount: number;
  recentReviews: HrAppraisalReview[];
};

const emptyDashboardSummary: HrAppraisalDashboardSummary = {
  activeCycle: null,
  inProgressCount: 0,
  recentReviews: [],
};

function asArray<T>(res: T[] | { data?: T[] } | null | undefined): T[] {
  if (Array.isArray(res)) return res;
  if (res && Array.isArray(res.data)) return res.data;
  return [];
}

function asRecord<T extends object>(res: T | { data?: T } | null | undefined): T | null {
  if (!res || typeof res !== 'object') return null;
  if ('data' in res && (res as { data?: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export const hrAppraisalService = {
  getTemplates: async (): Promise<AppraisalFormTemplate[]> => {
    const res = await api.get<AppraisalFormTemplate[] | { data: AppraisalFormTemplate[] }>(
      '/hr/appraisals/templates'
    );
    return asArray(res);
  },

  getTemplate: async (id: string): Promise<AppraisalFormTemplate | null> => {
    const res = await api.get<AppraisalFormTemplate | { data: AppraisalFormTemplate }>(
      `/hr/appraisals/templates/${id}`
    );
    return asRecord(res);
  },

  saveTemplate: async (
    payload: {
      code: string;
      name: string;
      description?: string;
      cycleKind?: AppraisalCycleKind;
      status?: 'Draft' | 'Published' | 'Archived';
      definition: Record<string, unknown>;
    },
    id?: string
  ): Promise<AppraisalFormTemplate> => {
    if (id) {
      const res = await api.put<AppraisalFormTemplate | { data: AppraisalFormTemplate }>(
        `/hr/appraisals/templates/${id}`,
        payload
      );
      return asRecord(res)!;
    }
    const res = await api.post<AppraisalFormTemplate | { data: AppraisalFormTemplate }>(
      '/hr/appraisals/templates',
      payload
    );
    return asRecord(res)!;
  },

  getCycles: async (): Promise<HrAppraisalCycle[]> => {
    const res = await api.get<HrAppraisalCycle[] | { data: HrAppraisalCycle[] }>('/hr/appraisals/cycles');
    return asArray(res);
  },

  createCycle: async (input: CreateAppraisalCycleInput & { kind?: AppraisalCycleKind; launch?: boolean; formAssignments: AppraisalAssignmentRule[] }) => {
    const res = await api.post<HrAppraisalCycle | { data: HrAppraisalCycle }>('/hr/appraisals/cycles', {
      name: input.name,
      periodLabel: input.periodLabel,
      kind: input.kind ?? 'Annual',
      startDate: input.startDate,
      endDate: input.endDate,
      selfDeadline: input.selfAssessmentDeadline,
      supervisorDeadline: input.supervisorDeadline,
      scopeCategories: scopeToCategories(input.scope),
      formAssignments: input.formAssignments,
      closePreviousOpen: input.closePreviousOpen,
      launch: true,
    });
    return asRecord(res)!;
  },

  updateCycleStatus: async (id: string, status: HrAppraisalCycle['status']) => {
    const res = await api.patch<HrAppraisalCycle | { data: HrAppraisalCycle }>(
      `/hr/appraisals/cycles/${id}`,
      { status }
    );
    return asRecord(res)!;
  },

  getReviews: async (params?: {
    page?: number;
    limit?: number;
    cycleId?: string;
    status?: string;
    search?: string;
  }): Promise<Paged<HrAppraisalReview>> => {
    const res = await api.get<Paged<HrAppraisalReview>>('/hr/appraisals/reviews', params as Record<string, unknown>);
    return {
      data: res?.data ?? [],
      total: res?.total ?? 0,
      page: res?.page ?? 1,
      pageSize: res?.pageSize ?? 50,
      totalPages: res?.totalPages,
    };
  },

  getReview: async (id: string): Promise<HrAppraisalReview | null> => {
    const res = await api.get<HrAppraisalReview | { data: HrAppraisalReview }>(
      `/hr/appraisals/reviews/${id}`
    );
    return asRecord(res);
  },

  getMyReview: async (): Promise<HrAppraisalReview | null> => {
    const res = await api.get<HrAppraisalReview | null | { data: HrAppraisalReview | null }>(
      '/hr/appraisals/reviews/mine'
    );
    return asRecord(res);
  },

  updateReview: async (
    id: string,
    payload: {
      responses?: AppraisalReviewResponses;
      selfStrengths?: string;
      selfImprovements?: string;
      selfDevelopmentPlan?: string;
      supervisorComments?: string;
      hrComments?: string;
      overallHrScore?: number | null;
      action?: 'save' | 'submit_self' | 'submit_supervisor' | 'submit_hr' | 'complete' | 'advance_hr';
    }
  ): Promise<HrAppraisalReview> => {
    const res = await api.patch<HrAppraisalReview | { data: HrAppraisalReview }>(
      `/hr/appraisals/reviews/${id}`,
      payload
    );
    return asRecord(res)!;
  },

  getCalibration: async (cycleId: string): Promise<CalibrationRow[]> => {
    const res = await api.get<
      { departments: CalibrationRow[] } | { data: { departments: CalibrationRow[] } }
    >('/hr/appraisals/calibration', {
      cycleId,
    });
    const payload = asRecord(res);
    return payload?.departments ?? [];
  },

  getDashboardSummary: async (): Promise<HrAppraisalDashboardSummary> => {
    const res = await api.get<HrAppraisalDashboardSummary | { data: HrAppraisalDashboardSummary }>(
      '/hr/appraisals/dashboard-summary'
    );
    const summary = asRecord(res);
    return summary ?? emptyDashboardSummary;
  },

  getArchives: async (): Promise<HrAppraisalReview[]> => {
    const res = await api.get<HrAppraisalReview[] | { data: HrAppraisalReview[] }>(
      '/hr/appraisals/archives'
    );
    return asArray(res);
  },
};

function scopeToCategories(scope: CreateAppraisalCycleInput['scope']) {
  if (scope === 'all') return ['Academic', 'Administrative', 'Support', 'Clinical'];
  if (scope === 'academic') return ['Academic'];
  if (scope === 'administrative') return ['Administrative'];
  if (scope === 'support') return ['Support'];
  return ['Clinical'];
}

export function toApiAssignments(rules: AppraisalAssignmentRule[]): AppraisalAssignmentRule[] {
  return rules.map((rule) => ({ ...rule }));
}
