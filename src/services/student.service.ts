import api from '@/lib/api';
import type { Student, StudentAttendance } from '@/types';
import type { 
  StudentAttendanceReport, 
  ProgramAttendanceData, 
  StudentAttendanceRecord,
  WeeklyAttendanceSummary,
  AttendanceRecordRow 
} from '@/types/student';

export const studentService = {
  getStudents: async (params?: {
    search?: string;
    program?: string;
    programId?: string;
    departmentId?: string;
    year?: number;
    semester?: number;
    intakeType?: 'Day' | 'Evening' | 'Weekend';
    programIntakeId?: string;
    status?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: Student[]; total: number; page: number; pageSize: number }> => {
    try {
      const cleaned =
        params && typeof params === 'object'
          ? Object.fromEntries(
              Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '' && v !== 'undefined')
            )
          : undefined;
      const response = await api.get<{ data: Student[]; total: number; page: number; pageSize: number }>('/students', cleaned as any);
      return Array.isArray(response) ? { data: response, total: response.length, page: 1, pageSize: response.length } : response;
    } catch (error) {
      console.error('Error fetching students:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
  },

  exportStudentsExcel: async (params?: {
    search?: string;
    programId?: string;
    departmentId?: string;
    year?: number;
    semester?: number;
    intakeType?: 'Day' | 'Evening' | 'Weekend';
    programIntakeId?: string;
    status?: string;
  }, filename?: string): Promise<void> => {
    const token = localStorage.getItem('kcu-token');
    const base = (import.meta.env.VITE_API_BASE_URL || '/api/v1').replace(/\/$/, '');
    const qs = new URLSearchParams();
    if (params?.search) qs.set('search', params.search);
    if (params?.programId) qs.set('programId', params.programId);
    if (params?.departmentId) qs.set('departmentId', params.departmentId);
    if (params?.year != null) qs.set('year', String(params.year));
    if (params?.semester != null) qs.set('semester', String(params.semester));
    if (params?.intakeType) qs.set('intakeType', params.intakeType);
    if (params?.programIntakeId) qs.set('programIntakeId', params.programIntakeId);
    if (params?.status) qs.set('status', params.status);

    const response = await fetch(`${base}/students/export?${qs.toString()}`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      throw new Error(err?.message || 'Export failed');
    }
    const blob = await response.blob();
    const downloadUrl = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = downloadUrl;
    link.download = filename && filename.trim() ? filename.trim() : 'students_export.xlsx';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(downloadUrl);
  },

  getStudentById: async (id: string): Promise<Student | null> => {
    try {
      return await api.get<Student>(`/students/${id}`);
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  },

  getStudentByRegistrationNumber: async (registrationNumber: string): Promise<Student | null> => {
    try {
      return await api.get<Student>(`/students/registration/${registrationNumber}`);
    } catch (error) {
      console.error('Error fetching student:', error);
      return null;
    }
  },

  getStudentByUserId: async (): Promise<Student | null> => {
    try {
      const response = await api.get<{ data: Student }>('/students/me');
      return (response as any)?.data || response;
    } catch (error) {
      console.error('Error fetching student by user ID:', error);
      return null;
    }
  },

  createStudent: async (student: Omit<Student, 'id' | 'enrollmentDate'>): Promise<Student> => {
    try {
      return await api.post<Student>('/students', student);
    } catch (error) {
      console.error('Error creating student:', error);
      throw error;
    }
  },

  getStudentAttendance: async (studentId: string, params?: { startDate?: string; endDate?: string; courseCode?: string; status?: string; classId?: string }): Promise<StudentAttendance[]> => {
    try {
      const res = await api.get<StudentAttendance[] | { data: StudentAttendance[] }>(`/students/${studentId}/attendance`, params);
      const data = Array.isArray(res) ? res : (res as any)?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching student attendance:', error);
      return [];
    }
  },

  getStudentAttendanceReport: async (
    registrationNumber: string,
    programCode?: string
  ): Promise<StudentAttendanceReport | null> => {
    try {
      const params = programCode ? { programCode } : {};
      const res = await api.get<StudentAttendanceReport | { data: StudentAttendanceReport }>(`/students/attendance-report/${registrationNumber}`, params);
      return (res as any)?.data ?? (res as any) ?? null;
    } catch (error) {
      console.error('Error fetching student attendance report:', error);
      return null;
    }
  },

  getProgramAttendanceData: async (programCode: string): Promise<ProgramAttendanceData | null> => {
    try {
      const res = await api.get<{ data: ProgramAttendanceData }>(`/students/programs/${programCode}/attendance`);
      return (res as any)?.data ?? res ?? null;
    } catch (error) {
      console.error('Error fetching program attendance data:', error);
      return null;
    }
  },

  getProgramCodes: async (): Promise<string[]> => {
    try {
      const res = await api.get<{ data: string[] } | string[]>('/students/programs');
      const arr = Array.isArray(res) ? res : (res as any)?.data;
      return Array.isArray(arr) ? arr : [];
    } catch (error) {
      console.error('Error fetching program codes:', error);
      return [];
    }
  },

  getAttendanceRecords: async (params: {
    program?: string;
    schoolId?: string;
    courseId?: string;
    startDate?: string;
    endDate?: string;
    status?: string;
    courseName?: string;
    studentId?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{ data: AttendanceRecordRow[]; total: number; page: number; pageSize: number }> => {
    try {
      const res = await api.get<{ data: AttendanceRecordRow[]; total: number; page: number; pageSize: number }>('/students/attendance/records', params);
      const data = (res as any)?.data ?? [];
      const total = (res as any)?.total ?? 0;
      const page = (res as any)?.page ?? 1;
      const pageSize = (res as any)?.pageSize ?? 0;
      return { data: Array.isArray(data) ? data : [], total, page, pageSize };
    } catch (error) {
      console.error('Error fetching attendance records:', error);
      return { data: [], total: 0, page: 1, pageSize: 0 };
    }
  },

  getDashboardStats: async (): Promise<{
    attendanceRate: number;
    classesToday: number;
    assignmentsPending: number;
    gpa: number | null;
    studentName: string;
    program: string;
    year: number;
    semester: number;
  } | null> => {
    try {
      return await api.get<any>('/students/me/dashboard-stats');
    } catch (error) {
      console.error('Error fetching student dashboard stats:', error);
      return null;
    }
  },

  createAttendanceRecord: async (record: { studentId: string; classId: string; date: string; status?: string; remarks?: string | null }): Promise<StudentAttendanceRecord> => {
    try {
      return await api.post<StudentAttendanceRecord>('/students/attendance', record);
    } catch (error) {
      console.error('Error creating attendance record:', error);
      throw error;
    }
  },

  createSessionAttendance: async (payload: { classId: string; date: string; records: Array<{ studentId: string; status: string; remarks?: string | null }> }): Promise<{ date: string; classId: string; count: number; results: Array<{ studentId: string; status: string; created: boolean }> }> => {
    try {
      const res = await api.post<any>('/students/attendance/session', payload);
      const data = (res as any)?.data ?? res;
      return data;
    } catch (error) {
      console.error('Error creating session attendance:', error);
      throw error;
    }
  },

  /**
   * Calculate attendance statistics for a student
   */
  calculateAttendanceStats: (report: StudentAttendanceReport): {
    totalAttended: number;
    totalExpected: number;
    percentage: number;
    byCourse: Record<string, { attended: number; expected: number; percentage: number }>;
  } => {
    const stats = {
      totalAttended: report.overallTotal.attendedLectures,
      totalExpected: report.overallTotal.expectedLectures,
      percentage: report.overallTotal.presentPercentage,
      byCourse: {} as Record<string, { attended: number; expected: number; percentage: number }>,
    };

    // Calculate per-course statistics
    report.weeklySummaries.forEach(week => {
      week.courses.forEach(course => {
        if (!stats.byCourse[course.courseName]) {
          stats.byCourse[course.courseName] = { attended: 0, expected: 0, percentage: 0 };
        }
        course.days.forEach(day => {
          stats.byCourse[course.courseName].expected++;
          if (day.attended) {
            stats.byCourse[course.courseName].attended++;
          }
        });
      });
    });

    // Calculate percentages
    Object.keys(stats.byCourse).forEach(courseName => {
      const course = stats.byCourse[courseName];
      course.percentage = course.expected > 0 
        ? (course.attended / course.expected) * 100 
        : 0;
    });

    return stats;
  },

  updateStudent: async (id: string, student: Partial<Student>): Promise<Student> => {
    try {
      return await api.put<Student>(`/students/${id}`, student);
    } catch (error) {
      console.error('Error updating student:', error);
      throw error;
    }
  },

  deleteStudent: async (id: string): Promise<void> => {
    try {
      await api.delete(`/students/${id}`);
    } catch (error) {
      console.error('Error deleting student:', error);
      throw error;
    }
  },

  updateAttendanceRecord: async (id: string, record: Partial<StudentAttendance>): Promise<StudentAttendance> => {
    try {
      return await api.put<StudentAttendance>(`/students/attendance/${id}`, record);
    } catch (error) {
      console.error('Error updating attendance record:', error);
      throw error;
    }
  },

  deleteAttendanceRecord: async (id: string): Promise<void> => {
    try {
      await api.delete(`/students/attendance/${id}`);
    } catch (error) {
      console.error('Error deleting attendance record:', error);
      throw error;
    }
  },

  importStudents: async (
    file: File,
    createAccounts: boolean = false,
    scope?: { programId: string; year: number; semester: number }
  ): Promise<{ imported: number; failed: number; errors?: string[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createAccounts', String(createAccounts));
      if (scope) {
        formData.append('programId', scope.programId);
        formData.append('year', String(scope.year));
        formData.append('semester', String(scope.semester));
      }
      return await api.post<{ imported: number; failed: number; errors?: string[] }>('/students/import', formData);
    } catch (error) {
      console.error('Error importing students:', error);
      throw error;
    }
  },

  markAttendance: async (data: { classId: string; latitude: number; longitude: number; timestamp: string }): Promise<StudentAttendance> => {
    try {
      const res = await api.post<any>('/students/attendance/mark', data);
      return (res as any)?.data ?? res;
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  },
};
