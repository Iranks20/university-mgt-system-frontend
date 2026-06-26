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

export const hrAppraisalService = {
  getTemplates: async (): Promise<AppraisalFormTemplate[]> => {
    const res = await api.get<{ data: AppraisalFormTemplate[] }>('/hr/appraisals/templates');
    return res?.data ?? [];
  },

  getTemplate: async (id: string): Promise<AppraisalFormTemplate | null> => {
    const res = await api.get<{ data: AppraisalFormTemplate }>(`/hr/appraisals/templates/${id}`);
    return res?.data ?? null;
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
      const res = await api.put<{ data: AppraisalFormTemplate }>(`/hr/appraisals/templates/${id}`, payload);
      return res.data;
    }
    const res = await api.post<{ data: AppraisalFormTemplate }>('/hr/appraisals/templates', payload);
    return res.data;
  },

  getCycles: async (): Promise<HrAppraisalCycle[]> => {
    const res = await api.get<{ data: HrAppraisalCycle[] }>('/hr/appraisals/cycles');
    return res?.data ?? [];
  },

  createCycle: async (input: CreateAppraisalCycleInput & { kind?: AppraisalCycleKind; launch?: boolean; formAssignments: AppraisalAssignmentRule[] }) => {
    const res = await api.post<{ data: HrAppraisalCycle }>('/hr/appraisals/cycles', {
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
    return res.data;
  },

  updateCycleStatus: async (id: string, status: HrAppraisalCycle['status']) => {
    const res = await api.patch<{ data: HrAppraisalCycle }>(`/hr/appraisals/cycles/${id}`, { status });
    return res.data;
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
    const res = await api.get<{ data: HrAppraisalReview }>(`/hr/appraisals/reviews/${id}`);
    return res?.data ?? null;
  },

  getMyReview: async (): Promise<HrAppraisalReview | null> => {
    const res = await api.get<{ data: HrAppraisalReview | null }>('/hr/appraisals/reviews/mine');
    return res?.data ?? null;
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
    const res = await api.patch<{ data: HrAppraisalReview }>(`/hr/appraisals/reviews/${id}`, payload);
    return res.data;
  },

  getCalibration: async (cycleId: string): Promise<CalibrationRow[]> => {
    const res = await api.get<{ data: { departments: CalibrationRow[] } }>('/hr/appraisals/calibration', {
      cycleId,
    });
    return res?.data?.departments ?? [];
  },

  getDashboardSummary: async () => {
    const res = await api.get<{
      data: {
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
    }>('/hr/appraisals/dashboard-summary');
    return res.data;
  },

  getArchives: async (): Promise<HrAppraisalReview[]> => {
    const res = await api.get<{ data: HrAppraisalReview[] }>('/hr/appraisals/archives');
    return res?.data ?? [];
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
