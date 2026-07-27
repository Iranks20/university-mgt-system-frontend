import api from '@/lib/api';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');

export type StudentInfoSourceType = 'Existing' | 'New';
export type StudentInfoStatus = 'Pending' | 'Approved' | 'Rejected';
export type StudentInfoIntakeType = 'Day' | 'Evening' | 'Weekend';

export interface StudentInfoFormOptions {
  schools: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; schoolId: string; departmentId: string }>;
  intakeTypes: StudentInfoIntakeType[];
  genders: Array<'Male' | 'Female' | 'Other'>;
  maritalStatuses: Array<'Married' | 'Single'>;
  sponsorTypes: Array<'Private' | 'Funded'>;
}

export interface StudentInfoClassOption {
  id: string;
  name: string;
  courseCode: string | null;
  courseName: string | null;
}

export interface StudentInfoLookupStudent {
  id: string;
  studentNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string | null;
  gender: string | null;
  dateOfBirth: string | null;
  nationality: string | null;
  oLevelSchool: string | null;
  aLevelSchool: string | null;
  homeDistrict: string | null;
  maritalStatus: string | null;
  sponsorType: string | null;
  physicalAddress: string | null;
  howHeardAboutUs: string | null;
  hasDisability: boolean | null;
  disabilityDetails: string | null;
  programId: string | null;
  programName: string | null;
  schoolId: string | null;
  departmentId: string | null;
  year: number;
  semester: number;
  intakeType: StudentInfoIntakeType | string;
  classIds: string[];
}

export interface StudentInfoLookupResult {
  found: boolean;
  lookupToken?: string;
  student?: StudentInfoLookupStudent;
}

export interface StudentInfoSearchResult {
  id: string;
  studentNumber: string;
  email: string;
  fullName: string;
  label: string;
}

export interface StudentInfoFormSubmission {
  id: string;
  sourceType: StudentInfoSourceType;
  status: StudentInfoStatus;
  matchedStudentId: string | null;
  studentNumber: string;
  fullName: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  dateOfBirth: string;
  nationality: string;
  oLevelSchool: string;
  aLevelSchool: string;
  homeDistrict: string;
  maritalStatus: string;
  sponsorType: string;
  physicalAddress: string;
  howHeardAboutUs: string;
  hasDisability: boolean;
  disabilityDetails: string | null;
  programId: string | null;
  programName: string | null;
  year: number;
  semester: number;
  intakeType: string;
  classIds: string[];
  reviewedAt: string | null;
  reviewedByUserId: string | null;
  reviewNote: string | null;
  submittedAt: string;
  updatedAt: string;
}

export type StudentInfoSubmitPayload = {
  website?: string;
  lookupToken?: string;
  studentNumber: string;
  fullName: string;
  email: string;
  phone: string;
  gender: 'Male' | 'Female' | 'Other';
  dateOfBirth: string;
  nationality: string;
  oLevelSchool: string;
  aLevelSchool: string;
  homeDistrict: string;
  maritalStatus: 'Married' | 'Single';
  sponsorType: 'Private' | 'Funded';
  physicalAddress: string;
  howHeardAboutUs: string;
  hasDisability: boolean;
  disabilityDetails?: string | null;
  programId: string;
  year: number;
  semester: number;
  intakeType: StudentInfoIntakeType;
  classIds: string[];
};

async function publicJson<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${API_BASE}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers || {}),
    },
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const err = new Error(body?.message || 'Request failed') as Error & { code?: string };
    err.code = body?.code;
    throw err;
  }
  return body as T;
}

export const studentInfoFormService = {
  async getPublicOptions(): Promise<StudentInfoFormOptions> {
    const res = await publicJson<{ data: StudentInfoFormOptions }>('/public/student-info-form/options');
    return res.data;
  },

  async lookup(params: { studentNumber?: string; email?: string }): Promise<StudentInfoLookupResult> {
    const qs = new URLSearchParams();
    if (params.studentNumber?.trim()) qs.set('studentNumber', params.studentNumber.trim());
    if (params.email?.trim()) qs.set('email', params.email.trim());
    const res = await publicJson<{ data: StudentInfoLookupResult }>(
      `/public/student-info-form/lookup?${qs.toString()}`
    );
    return res.data;
  },

  async searchStudents(query: string, limit = 10): Promise<StudentInfoSearchResult[]> {
    const qs = new URLSearchParams({
      query: query.trim(),
      limit: String(limit),
    });
    const res = await publicJson<{ data: StudentInfoSearchResult[] }>(
      `/public/student-info-form/search?${qs.toString()}`
    );
    return res.data;
  },

  async listClasses(params: {
    programId: string;
    year: number;
    semester: number;
    intakeType: StudentInfoIntakeType;
  }): Promise<{ programIntakeId: string; classes: StudentInfoClassOption[] }> {
    const qs = new URLSearchParams({
      programId: params.programId,
      year: String(params.year),
      semester: String(params.semester),
      intakeType: params.intakeType,
    });
    const res = await publicJson<{
      data: { programIntakeId: string; classes: StudentInfoClassOption[] };
    }>(`/public/student-info-form/classes?${qs.toString()}`);
    return res.data;
  },

  async submitPublic(payload: StudentInfoSubmitPayload): Promise<StudentInfoFormSubmission> {
    const res = await publicJson<{ data: StudentInfoFormSubmission }>('/public/student-info-form', {
      method: 'POST',
      body: JSON.stringify(payload),
    });
    return res.data;
  },

  async list(params?: {
    search?: string;
    sourceType?: StudentInfoSourceType | '';
    status?: StudentInfoStatus | '';
    page?: number;
    limit?: number;
  }) {
    return api.get<{
      data: StudentInfoFormSubmission[];
      total: number;
      page: number;
      pageSize: number;
      totalPages: number;
    }>('/student-info-forms', params);
  },

  async getById(id: string) {
    return api.get<StudentInfoFormSubmission>(`/student-info-forms/${id}`);
  },

  async approve(id: string, reviewNote?: string) {
    return api.post<StudentInfoFormSubmission>(`/student-info-forms/${id}/approve`, {
      reviewNote: reviewNote || null,
    });
  },

  async reject(id: string, reviewNote?: string) {
    return api.post<StudentInfoFormSubmission>(`/student-info-forms/${id}/reject`, {
      reviewNote: reviewNote || null,
    });
  },
};
