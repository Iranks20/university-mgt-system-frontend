import api from '@/lib/api';
import type {
  AppraisalAgreement,
  AppraisalAssignmentRule,
  AppraisalCriterionRating,
  AppraisalCycleKind,
  AppraisalFormTemplate,
  AppraisalSignatureInput,
  AppraisalSignoffStage,
  CreateAppraisalCycleInput,
  HrAppraisalCycle,
  HrAppraisalReview,
} from '@/features/hr/types';
import type { Paged } from '@/lib/pagination';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

function toPaged<T>(res: Partial<Paged<T>> | null | undefined, pageSize: number): Paged<T> {
  const total = res?.total ?? 0;
  const size = res?.pageSize ?? pageSize;
  return {
    data: res?.data ?? [],
    total,
    page: res?.page ?? 1,
    pageSize: size,
    totalPages: res?.totalPages ?? Math.max(1, Math.ceil(total / size)),
  };
}

function unwrap<T>(res: T | { data?: T } | null | undefined): T {
  if (res && typeof res === 'object' && 'data' in res && (res as { data?: T }).data !== undefined) {
    return (res as { data: T }).data;
  }
  return res as T;
}

export type CalibrationRow = {
  department: string;
  count: number;
  completed: number;
  avgSelf: number | null;
  avgSupervisor: number | null;
};

export type HrAppraisalDashboardSummary = {
  activeCycle: { id: string; name: string; periodLabel: string; endDate: string; status: string } | null;
  inProgressCount: number;
  recentReviews: HrAppraisalReview[];
};

export type CycleLaunchReadiness = {
  eligibleCount: number;
  readyCount: number;
  missingSupervisorCount: number;
  missingSupervisors: string[];
  missingSupervisorDepartments: Array<{ department: string; count: number }>;
  readyToLaunch: boolean;
};

export type RatingEntry = { criterionId: string; rating: AppraisalCriterionRating | null };

export type AppraisalAgreementInput = Partial<
  Pick<AppraisalAgreement, 'designation' | 'employmentType' | 'schoolUnit' | 'departmentName'>
> & { periodFrom?: string; periodTo?: string; appointmentDate?: string };

export type SaveDraftInput = {
  agreement?: AppraisalAgreementInput;
  ratings?: RatingEntry[];
  trainingNeeds?: string;
  supervisorStrengths?: string;
  supervisorImprovements?: string;
  supervisorRecommendations?: string;
};

const BASE = '/hr/appraisals';

export const hrAppraisalService = {
  // Forms
  getTemplates: async (): Promise<AppraisalFormTemplate[]> =>
    unwrap(await api.get<AppraisalFormTemplate[]>(`${BASE}/templates`)) ?? [],

  getTemplate: async (id: string): Promise<AppraisalFormTemplate | null> =>
    unwrap(await api.get<AppraisalFormTemplate>(`${BASE}/templates/${id}`)) ?? null,

  getDefaultAssignments: async (): Promise<AppraisalAssignmentRule[]> =>
    unwrap(await api.get<AppraisalAssignmentRule[]>(`${BASE}/templates/default-assignments`)) ?? [],

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
  ): Promise<AppraisalFormTemplate> =>
    unwrap(
      id
        ? await api.put<AppraisalFormTemplate>(`${BASE}/templates/${id}`, payload)
        : await api.post<AppraisalFormTemplate>(`${BASE}/templates`, payload)
    ),

  // Cycles
  getCycles: async (): Promise<HrAppraisalCycle[]> => unwrap(await api.get<HrAppraisalCycle[]>(`${BASE}/cycles`)) ?? [],

  createCycle: async (input: CreateAppraisalCycleInput): Promise<HrAppraisalCycle> =>
    unwrap(await api.post<HrAppraisalCycle>(`${BASE}/cycles`, { ...input, launch: true })),

  getCycleLaunchReadiness: async (input: {
    scopeCategories: string[];
    formAssignments: AppraisalAssignmentRule[];
    staffIds?: string[];
  }): Promise<CycleLaunchReadiness> => unwrap(await api.post<CycleLaunchReadiness>(`${BASE}/cycles/readiness`, input)),

  updateCycleStatus: async (id: string, status: HrAppraisalCycle['status']): Promise<HrAppraisalCycle> =>
    unwrap(await api.patch<HrAppraisalCycle>(`${BASE}/cycles/${id}`, { status })),

  // Lists
  getReviews: async (params?: {
    page?: number;
    limit?: number;
    cycleId?: string;
    status?: string;
    inbox?: 'hr';
    search?: string;
    openOnly?: boolean;
  }): Promise<Paged<HrAppraisalReview>> =>
    toPaged(await api.get<Paged<HrAppraisalReview>>(`${BASE}/reviews`, params as Record<string, unknown>), params?.limit ?? 50),

  getVcReviews: async (params: { page: number; limit: number; search?: string }): Promise<Paged<HrAppraisalReview>> =>
    toPaged(await api.get<Paged<HrAppraisalReview>>(`${BASE}/vc/reviews`, params), params.limit),

  getArchives: async (params: { page: number; limit: number; search?: string }): Promise<Paged<HrAppraisalReview>> =>
    toPaged(await api.get<Paged<HrAppraisalReview>>(`${BASE}/archives`, params), params.limit),

  getReview: async (id: string): Promise<HrAppraisalReview | null> =>
    unwrap(await api.get<HrAppraisalReview>(`${BASE}/reviews/${id}`)) ?? null,

  getMyReview: async (): Promise<HrAppraisalReview | null> =>
    unwrap(await api.get<HrAppraisalReview | null>(`${BASE}/reviews/mine`)) ?? null,

  getTeamReviews: async (): Promise<HrAppraisalReview[]> =>
    unwrap(await api.get<HrAppraisalReview[]>(`${BASE}/reviews/team`)) ?? [],

  // Staff and supervisor stages
  saveDraft: async (id: string, input: SaveDraftInput): Promise<HrAppraisalReview> =>
    unwrap(await api.patch<HrAppraisalReview>(`${BASE}/reviews/${id}`, input)),

  submitSelf: async (id: string, input: SaveDraftInput & AppraisalSignatureInput & { phone: string }) =>
    unwrap(await api.post<HrAppraisalReview>(`${BASE}/reviews/${id}/submit-self`, input)),

  submitSupervisor: async (
    id: string,
    input: SaveDraftInput & AppraisalSignatureInput & { signerName: string; signerPosition: string }
  ) => unwrap(await api.post<HrAppraisalReview>(`${BASE}/reviews/${id}/submit-supervisor`, input)),

  // HR stage
  hrEditRating: async (
    id: string,
    criterionId: string,
    input: { selfRating: AppraisalCriterionRating | null; supervisorRating: AppraisalCriterionRating | null }
  ) => unwrap(await api.patch<HrAppraisalReview>(`${BASE}/reviews/${id}/ratings/${encodeURIComponent(criterionId)}`, input)),

  hrSign: async (id: string, input: AppraisalSignatureInput & { hrComments?: string; signerName: string }) =>
    unwrap(await api.post<HrAppraisalReview>(`${BASE}/reviews/${id}/hr-sign`, input)),

  returnReview: async (id: string, to: 'self' | 'supervisor') =>
    unwrap(await api.post<HrAppraisalReview>(`${BASE}/reviews/${id}/return`, { to })),

  assignSupervisor: async (id: string, supervisorStaffId: string) =>
    unwrap(await api.patch<HrAppraisalReview>(`${BASE}/reviews/${id}/supervisor`, { supervisorStaffId })),

  changeTemplate: async (id: string, templateId: string) =>
    unwrap(await api.patch<HrAppraisalReview>(`${BASE}/reviews/${id}/template`, { templateId })),

  // VC stage
  vcSign: async (id: string, input: AppraisalSignatureInput & { vcComments: string; signerName?: string }) =>
    unwrap(await api.post<HrAppraisalReview>(`${BASE}/reviews/${id}/vc-sign`, input)),

  /** Signature images are behind auth, so they are fetched as blobs rather than linked directly. */
  fetchSignatureBlob: async (reviewId: string, stage: AppraisalSignoffStage): Promise<Blob | null> => {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kcu-token') : null;
    const res = await fetch(`${API_BASE}${BASE}/reviews/${reviewId}/signatures/${stage}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    return res.ok ? res.blob() : null;
  },

  // Reporting
  getCalibration: async (cycleId: string): Promise<CalibrationRow[]> =>
    unwrap(await api.get<{ departments: CalibrationRow[] }>(`${BASE}/calibration`, { cycleId }))?.departments ?? [],

  getDashboardSummary: async (): Promise<HrAppraisalDashboardSummary> =>
    unwrap(await api.get<HrAppraisalDashboardSummary>(`${BASE}/dashboard-summary`)) ?? {
      activeCycle: null,
      inProgressCount: 0,
      recentReviews: [],
    },
};
