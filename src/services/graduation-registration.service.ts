import api from '@/lib/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export type GraduationRsvpStatus = 'Attending' | 'InAbsentia';
export type GraduationClearanceStatus = 'FullyCleared' | 'Pending';

export interface GraduationFormOptions {
  schools: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; schoolId: string }>;
  awardClassifications: string[];
  gownSizes: string[];
  rsvpStatuses: GraduationRsvpStatus[];
}

export interface GraduationRegistrationRow {
  id: string;
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  briefBioNotes: string | null;
  parentGuardianName: string;
  sponsorOrganization: string | null;
  parentSponsorContact: string;
  highSchoolAttended: string;
  previousQualifications: string | null;
  facultySchool: string;
  schoolId: string | null;
  programName: string;
  programId: string | null;
  awardClassification: string;
  graduationCohort: string;
  institutionalClearance: GraduationClearanceStatus;
  rsvpStatus: GraduationRsvpStatus;
  gownSize: string;
  guestCount: number;
  staffEscortAssigned: string | null;
  permanentContactEmail: string;
  submittedAt: string;
  updatedAt: string;
}

export interface GraduationRegistrationSubmitPayload {
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  briefBioNotes?: string;
  parentGuardianName: string;
  sponsorOrganization?: string;
  parentSponsorContact: string;
  highSchoolAttended: string;
  previousQualifications?: string;
  facultySchool: string;
  schoolId?: string;
  programName: string;
  programId?: string;
  awardClassification: string;
  graduationCohort: string;
  rsvpStatus: GraduationRsvpStatus;
  gownSize: string;
  guestCount: number;
  permanentContactEmail: string;
}

export interface GraduationListParams {
  page?: number;
  limit?: number;
  search?: string;
  graduationCohort?: string;
  facultySchool?: string;
  programName?: string;
  rsvpStatus?: GraduationRsvpStatus;
  institutionalClearance?: GraduationClearanceStatus;
}

async function publicRequest<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers as Record<string, string>),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body.message || 'Request failed');
    (err as Error & { code?: string }).code = body.code;
    throw err;
  }
  return body as T;
}

export const graduationRegistrationService = {
  async getPublicOptions(): Promise<GraduationFormOptions> {
    const res = await publicRequest<{ data: GraduationFormOptions }>(
      '/public/graduation-registration/options'
    );
    return res.data;
  },

  async submitPublic(payload: GraduationRegistrationSubmitPayload): Promise<GraduationRegistrationRow> {
    const res = await publicRequest<{ data: GraduationRegistrationRow }>(
      '/public/graduation-registration',
      { method: 'POST', body: JSON.stringify(payload) }
    );
    return res.data;
  },

  async list(params: GraduationListParams = {}) {
    const q = new URLSearchParams();
    if (params.page) q.set('page', String(params.page));
    if (params.limit) q.set('limit', String(params.limit));
    if (params.search) q.set('search', params.search);
    if (params.graduationCohort) q.set('graduationCohort', params.graduationCohort);
    if (params.facultySchool) q.set('facultySchool', params.facultySchool);
    if (params.programName) q.set('programName', params.programName);
    if (params.rsvpStatus) q.set('rsvpStatus', params.rsvpStatus);
    if (params.institutionalClearance) q.set('institutionalClearance', params.institutionalClearance);
    const qs = q.toString();
    return api.get<{ data: GraduationRegistrationRow[]; total: number; page: number; pageSize: number }>(
      `/graduation-registrations${qs ? `?${qs}` : ''}`
    );
  },

  async getFilterOptions() {
    return api.get<{
      graduationCohorts: string[];
      facultySchools: string[];
      programNames: string[];
    }>('/graduation-registrations/filter-options');
  },

  async update(
    id: string,
    payload: Partial<{
      institutionalClearance: GraduationClearanceStatus;
      staffEscortAssigned: string | null;
      fullName: string;
      graduationCohort: string;
      guestCount: number;
      rsvpStatus: GraduationRsvpStatus;
      gownSize: string;
    }>
  ) {
    return api.patch<GraduationRegistrationRow>(`/graduation-registrations/${id}`, payload);
  },

  async exportExcel(params: GraduationListParams = {}) {
    const q = new URLSearchParams();
    if (params.search) q.set('search', params.search);
    if (params.graduationCohort) q.set('graduationCohort', params.graduationCohort);
    if (params.facultySchool) q.set('facultySchool', params.facultySchool);
    if (params.programName) q.set('programName', params.programName);
    if (params.rsvpStatus) q.set('rsvpStatus', params.rsvpStatus);
    if (params.institutionalClearance) q.set('institutionalClearance', params.institutionalClearance);
    const qs = q.toString();
    const token = typeof window !== 'undefined' ? localStorage.getItem('kcu-token') : null;
    const res = await fetch(`${API_BASE}/graduation-registrations/export${qs ? `?${qs}` : ''}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new Error('Export failed');
    const blob = await res.blob();
    const disposition = res.headers.get('Content-Disposition') || '';
    const match = disposition.match(/filename="([^"]+)"/);
    const filename = match?.[1] || 'graduation_registrations.xlsx';
    return { blob, filename };
  },
};
