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
  getStudents: async (params?: { search?: string; program?: string; year?: number; status?: string; page?: number; limit?: number }): Promise<{ data: Student[]; total: number; page: number; pageSize: number }> => {
    try {
      const response = await api.get<{ data: Student[]; total: number; page: number; pageSize: number }>('/students', params);
      return Array.isArray(response) ? { data: response, total: response.length, page: 1, pageSize: response.length } : response;
    } catch (error) {
      console.error('Error fetching students:', error);
      return { data: [], total: 0, page: 1, pageSize: 20 };
    }
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
      return await api.get<StudentAttendance[]>(`/students/${studentId}/attendance`, params);
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
      return await api.get<StudentAttendanceReport>(`/students/${registrationNumber}/attendance-report`, params);
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

  createAttendanceRecord: async (record: StudentAttendanceRecord): Promise<StudentAttendanceRecord> => {
    try {
      return await api.post<StudentAttendanceRecord>('/students/attendance', record);
    } catch (error) {
      console.error('Error creating attendance record:', error);
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

  importStudents: async (file: File, createAccounts: boolean = false): Promise<{ imported: number; failed: number; errors?: string[] }> => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('createAccounts', String(createAccounts));
      return await api.post<{ imported: number; failed: number; errors?: string[] }>('/students/import', formData);
    } catch (error) {
      console.error('Error importing students:', error);
      throw error;
    }
  },

  markAttendance: async (data: { classId: string; latitude: number; longitude: number; timestamp: string }): Promise<StudentAttendance> => {
    try {
      return await api.post<StudentAttendance>('/students/attendance/mark', data);
    } catch (error) {
      console.error('Error marking attendance:', error);
      throw error;
    }
  },
};
