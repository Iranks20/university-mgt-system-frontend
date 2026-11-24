import api from '@/lib/api';

export type EnrollmentType = 'Regular' | 'Retake' | 'Extra';

export interface RetakeRules {
  maxActiveRetakes: number;
  maxAttempts: number;
  /** Retakes from users without approval rights wait as Pending. */
  requireApproval: boolean;
  /** UGX per retake course unit; 0 = no fee. */
  feePerCourseUnit: number;
}

export interface RetakeRegisterRow {
  enrollmentId: string;
  enrollmentType: EnrollmentType;
  attemptNumber: number;
  status: string;
  enrolledAt: string;
  addedBy: string | null;
  reason: string | null;
  approvalStatus: 'NotRequired' | 'Pending' | 'Approved' | 'Rejected';
  approvedBy: string | null;
  approvedAt: string | null;
  approvalNote: string | null;
  feeAmount: number | null;
  feeStatus: 'NotRequired' | 'Unpaid' | 'Paid' | 'Waived';
  feeReference: string | null;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  studentCohort: string | null;
  classId: string;
  className: string;
  classCohort: string | null;
  courseCode: string | null;
  courseName: string | null;
  lecturer: string | null;
  attendance: {
    expected: number;
    attended: number;
    present: number;
    late: number;
    absent: number;
    excused: number;
    notMarked: number;
    percentage: number;
  };
  belowThreshold: boolean;
}

export interface RetakeRegister {
  term: { id: string; name: string; startDate?: string; endDate?: string } | null;
  rules: RetakeRules;
  thresholdPercent?: number;
  totals: { students: number; enrollments: number; belowThreshold: number; pendingApproval: number; feesUnpaid: number };
  rows: RetakeRegisterRow[];
}

export const enrollmentService = {
  getEnrollments: async (params?: { studentId?: string; classId?: string; status?: string; page?: number; limit?: number }) => {
    try {
      const response = await api.get('/enrollments', params);
      return Array.isArray(response) ? { data: response, total: response.length, page: 1, pageSize: response.length } : response;
    } catch (error) {
      console.error('Error fetching enrollments:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  getStudentEnrollments: async (studentId: string) => {
    try {
      const response = await api.get<unknown>(`/enrollments/student/${studentId}`);
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching student enrollments:', error);
      return [];
    }
  },

  getMyEnrollments: async () => {
    try {
      const response = await api.get<unknown>('/enrollments/me/enrollments');
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching my enrollments:', error);
      return [];
    }
  },

  getClassEnrollments: async (classId: string, options?: { roster?: boolean }) => {
    try {
      const params = options?.roster ? { roster: 'true' } : undefined;
      const response = await api.get<unknown>(`/enrollments/class/${classId}`, params as any);
      const r = response as unknown as { data?: unknown[] } | unknown[];
      return Array.isArray(r) ? r : (r as { data?: unknown[] })?.data || [];
    } catch (error) {
      console.error('Error fetching class enrollments:', error);
      return [];
    }
  },

  /**
   * enrollmentType: omit to let the server work it out (Regular / Retake / Extra).
   * overrideRetakeRules + reason: registrar override of the retake limits.
   */
  createEnrollment: async (data: {
    studentId: string;
    classId: string;
    status?: string;
    enrollmentType?: EnrollmentType;
    reason?: string | null;
    overrideRetakeRules?: boolean;
  }) => {
    try {
      return await api.post('/enrollments', data);
    } catch (error) {
      console.error('Error creating enrollment:', error);
      throw error;
    }
  },

  bulkEnroll: async (data: {
    studentIds: string[];
    classId: string;
    status?: string;
    enrollmentType?: EnrollmentType;
    reason?: string | null;
    overrideRetakeRules?: boolean;
  }) => {
    try {
      return await api.post('/enrollments/bulk', data);
    } catch (error) {
      console.error('Error bulk enrolling:', error);
      throw error;
    }
  },

  /** Retake register: retake (and extra) enrollments of a term with attendance. */
  getRetakeRegister: async (params: {
    academicTermId?: string;
    schoolId?: string;
    programId?: string;
    courseId?: string;
    type?: 'Retake' | 'Extra' | 'all';
    status?: 'Active' | 'Pending' | 'all';
    search?: string;
  }): Promise<RetakeRegister> => {
    const res = await api.get<RetakeRegister | { data: RetakeRegister }>('/enrollments/retakes', params);
    return ((res as { data?: RetakeRegister })?.data ?? res) as RetakeRegister;
  },

  getRetakeRules: async (): Promise<RetakeRules> => {
    const res = await api.get<RetakeRules | { data: RetakeRules }>('/enrollments/retake-rules');
    return ((res as { data?: RetakeRules })?.data ?? res) as RetakeRules;
  },

  updateRetakeRules: async (rules: Partial<RetakeRules>): Promise<RetakeRules> => {
    const res = await api.put<RetakeRules | { data: RetakeRules }>('/enrollments/retake-rules', rules);
    return ((res as { data?: RetakeRules })?.data ?? res) as RetakeRules;
  },

  approveRetake: async (id: string, note?: string | null) => api.post(`/enrollments/${id}/approve`, { note }),

  rejectRetake: async (id: string, note: string) => api.post(`/enrollments/${id}/reject`, { note }),

  updateRetakeFee: async (
    id: string,
    data: { feeStatus: 'Unpaid' | 'Paid' | 'Waived' | 'NotRequired'; feeReference?: string | null; feeAmount?: number | null }
  ) => api.patch(`/enrollments/${id}/fee`, data),

  /** Closes Active enrollments of ended terms as Completed. dryRun (default) only counts them. */
  closePastTermEnrollments: async (dryRun = true): Promise<{ dryRun: boolean; closed: number; byTerm: Array<{ term: string; count: number }> }> => {
    const res = await api.post<any>('/enrollments/close-past-terms', { dryRun });
    return (res as any)?.data ?? res;
  },

  /** Registrar correction of an enrollment's type. */
  updateEnrollmentType: async (
    id: string,
    data: { enrollmentType: EnrollmentType; reason?: string | null; overrideRetakeRules?: boolean }
  ) => api.patch(`/enrollments/${id}/type`, data),

  updateEnrollment: async (id: string, data: { status?: string }) => {
    try {
      return await api.put(`/enrollments/${id}`, data);
    } catch (error) {
      console.error('Error updating enrollment:', error);
      throw error;
    }
  },

  deleteEnrollment: async (id: string) => {
    try {
      await api.delete(`/enrollments/${id}`);
    } catch (error) {
      console.error('Error deleting enrollment:', error);
      throw error;
    }
  },

  /** `programStreamId`: the student's specialization ('none' = no stream) to hide other streams' classes. */
  previewCourses: async (params: { departmentId?: string; programId?: string; program?: string; year?: number; semester?: number; programStreamId?: string }) => {
    try {
      const response = await api.get('/enrollments/preview-courses', params);
      return Array.isArray(response) ? response : (response as any)?.data || [];
    } catch (error) {
      console.error('Error previewing courses:', error);
      return [];
    }
  },

  getRegistrationCatalog: async () => {
    const response = await api.get<unknown>('/enrollments/me/registration-catalog');
    return (response as any)?.data ?? response;
  },

  selfEnroll: async (classId: string) => {
    const response = await api.post('/enrollments/me/self-enroll', { classId });
    return (response as any)?.data ?? response;
  },

  selfDrop: async (enrollmentId: string) => {
    const response = await api.delete(`/enrollments/me/self-enroll/${enrollmentId}`);
    return (response as any)?.data ?? response;
  },
};
