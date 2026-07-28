import api from '@/lib/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export type GraduationRsvpStatus = 'Attending' | 'InAbsentia';
export type GraduationClearanceStatus = 'FullyCleared' | 'Pending';
export type GraduationEmploymentStatus =
  | 'Employed'
  | 'SelfEmployed'
  | 'SeekingEmployment'
  | 'FurtherStudy'
  | 'NotApplicable'
  | 'Other';
export type GraduationPostGraduationPlan =
  | 'Employment'
  | 'SelfEmployment'
  | 'FurtherStudy'
  | 'InternshipOrTraining'
  | 'Undecided'
  | 'Other';

export interface GraduationFormOption {
  value: string;
  label: string;
}

export type GraduationAddressFormat = 'Uganda' | 'International';

export interface GraduationFormOptions {
  schools: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; schoolId: string }>;
  awardClassifications: string[];
  gownSizes: string[];
  rsvpStatuses: GraduationRsvpStatus[];
  clearanceStatuses: GraduationFormOption[];
  employmentStatuses: GraduationFormOption[];
  postGraduationPlans: GraduationFormOption[];
  sponsorTypes: GraduationFormOption[];
}

export interface GraduationRegistrationRow {
  id: string;
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  permanentAddressFormat: GraduationAddressFormat;
  village: string | null;
  parish: string | null;
  subcounty: string | null;
  county: string | null;
  district: string | null;
  region: string | null;
  country: string | null;
  homePlotStreet: string | null;
  poBoxNumber: string | null;
  intlStreetAddress: string | null;
  intlCity: string | null;
  intlStateProvince: string | null;
  intlAreaLga: string | null;
  intlPostalCode: string | null;
  intlCountry: string | null;
  personalMobilePhone: string;
  whatsAppNumber: string;
  nationalIdOrPassport: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  namePronunciation: string;
  universityEmail: string;
  permanentContactEmail: string | null;
  briefBioNotes: string | null;
  parentGuardianName: string;
  parentGuardianEmail: string | null;
  sponsorOrganization: string | null;
  parentSponsorPhone: string;
  p7SchoolAttended: string;
  s4SchoolAttended: string;
  s6SchoolAttended: string | null;
  previousQualifications: string | null;
  facultySchool: string;
  schoolId: string | null;
  programName: string;
  programId: string | null;
  awardClassification: string;
  graduationCohort: string;
  institutionalClearance: GraduationClearanceStatus;
  employmentStatusAtGraduation: GraduationEmploymentStatus;
  postGraduationPlan: GraduationPostGraduationPlan;
  postGraduationPlanDetail: string | null;
  accessibilityNeeds: string | null;
  alumniCommunicationConsent: boolean;
  rsvpStatus: GraduationRsvpStatus;
  gownSize: string;
  guestCount: number;
  staffEscortAssigned: string | null;
  signaturePath: string | null;
  signatureSignedName: string | null;
  signedAt: string | null;
  submittedAt: string;
  updatedAt: string;
}

export type GraduationRegistrationSubmitPayload =
  | ({
      permanentAddressFormat: 'Uganda';
      village: string;
      parish: string;
      subcounty: string;
      county: string;
      district: string;
      region: string;
      country: string;
      homePlotStreet: string;
      poBoxNumber?: string;
    } & GraduationRegistrationSubmitCore)
  | ({
      permanentAddressFormat: 'International';
      intlStreetAddress: string;
      intlCity: string;
      intlStateProvince: string;
      intlAreaLga?: string;
      intlPostalCode?: string;
      intlCountry: string;
    } & GraduationRegistrationSubmitCore);

interface GraduationRegistrationSubmitCore {
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  personalMobilePhone: string;
  whatsAppNumber: string;
  nationalIdOrPassport: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  namePronunciation: string;
  universityEmail: string;
  permanentContactEmail?: string;
  briefBioNotes?: string;
  parentGuardianName: string;
  parentGuardianEmail?: string;
  sponsorOrganization: string;
  parentSponsorPhone: string;
  p7SchoolAttended: string;
  s4SchoolAttended: string;
  s6SchoolAttended?: string;
  previousQualifications?: string;
  facultySchool: string;
  schoolId?: string;
  programName: string;
  programId?: string;
  awardClassification: string;
  graduationCohort: string;
  institutionalClearance: GraduationClearanceStatus;
  employmentStatusAtGraduation: GraduationEmploymentStatus;
  postGraduationPlan: GraduationPostGraduationPlan;
  postGraduationPlanDetail?: string;
  accessibilityNeeds?: string;
  alumniCommunicationConsent: true;
  rsvpStatus: GraduationRsvpStatus;
  gownSize: string;
  guestCount: number;
  declarationAccepted: true;
  signatureSignedName: string;
  signatureImage: string;
}

export interface GraduationRegistrationUpdatePayload {
  studentId: string;
  fullName: string;
  dateOfBirth: string;
  nationality: string;
  permanentAddressFormat: GraduationAddressFormat;
  village: string | null;
  parish: string | null;
  subcounty: string | null;
  county: string | null;
  district: string | null;
  region: string | null;
  country: string | null;
  homePlotStreet: string | null;
  poBoxNumber: string | null;
  intlStreetAddress: string | null;
  intlCity: string | null;
  intlStateProvince: string | null;
  intlAreaLga: string | null;
  intlPostalCode: string | null;
  intlCountry: string | null;
  personalMobilePhone: string;
  whatsAppNumber: string;
  nationalIdOrPassport: string;
  emergencyContactName: string;
  emergencyContactPhone: string;
  namePronunciation: string;
  universityEmail: string;
  permanentContactEmail: string | null;
  briefBioNotes: string | null;
  parentGuardianName: string;
  parentGuardianEmail: string | null;
  sponsorOrganization: string;
  parentSponsorPhone: string;
  p7SchoolAttended: string;
  s4SchoolAttended: string;
  s6SchoolAttended: string | null;
  previousQualifications: string | null;
  facultySchool: string;
  programName: string;
  awardClassification: string;
  graduationCohort: string;
  institutionalClearance: GraduationClearanceStatus;
  employmentStatusAtGraduation: GraduationEmploymentStatus;
  postGraduationPlan: GraduationPostGraduationPlan;
  postGraduationPlanDetail: string | null;
  accessibilityNeeds: string | null;
  alumniCommunicationConsent: boolean;
  rsvpStatus: GraduationRsvpStatus;
  gownSize: string;
  guestCount: number;
  staffEscortAssigned: string | null;
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

  async update(id: string, payload: GraduationRegistrationUpdatePayload) {
    return api.patch<GraduationRegistrationRow>(`/graduation-registrations/${id}`, payload);
  },

  async remove(id: string) {
    return api.delete<{ id: string; deleted: boolean }>(`/graduation-registrations/${id}`);
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

  async fetchSignatureBlob(id: string): Promise<Blob | null> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('kcu-token') : null;
    const res = await fetch(`${API_BASE}/graduation-registrations/${id}/signature`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) return null;
    return res.blob();
  },
};
