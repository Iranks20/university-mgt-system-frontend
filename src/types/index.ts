/**
 * Core Type Definitions for KCU Management System
 * Organized by domain for scalability
 */

// ==================== AUTHENTICATION & AUTHORIZATION ====================
export type UserRole = 'QA' | 'Lecturer' | 'Student' | 'Staff' | 'Management' | 'Admin';

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  department?: string;
  school?: string;
  createdAt: Date;
  updatedAt: Date;
}

// ==================== QUALITY ASSURANCE DOMAIN ====================
export interface LecturerAttendanceRecord {
  id: string;
  lecturerId: string;
  lecturerName: string;
  department: string;
  school: string;
  courseCode: string;
  courseName: string;
  scheduledDate: Date;
  scheduledTime: string;
  venue: string;
  status: 'Present' | 'Absent' | 'Late' | 'Cancelled';
  actualStartTime?: Date;
  actualEndTime?: Date;
  remarks?: string;
  recordedBy: string;
  recordedAt: Date;
}

export interface QAAttendanceReport {
  period: string; // e.g., "October 2024"
  school: string;
  department: string;
  totalLectures: number;
  presentCount: number;
  absentCount: number;
  lateCount: number;
  attendanceRate: number;
  records: LecturerAttendanceRecord[];
}

// ==================== ACADEMIC DOMAIN ====================
export interface School {
  id: string;
  name: string;
  code: string;
  dean?: string;
  description?: string;
}

export interface Department {
  id: string;
  name: string;
  code: string;
  schoolId: string;
  head?: string;
  duration?: number; // Program duration in years (e.g., 3 for 3-year programs, 4 for 4-year programs)
}

export interface Course {
  id: string;
  code: string;
  name: string;
  departmentId: string;
  credits: number;
  level: number; // Year level
  semester: number;
}

export interface Class {
  id: string;
  courseId: string;
  lecturerId: string;
  venueId: string;
  dayOfWeek: number; // 0-6 (Sunday-Saturday)
  startTime: string; // HH:mm format
  endTime: string;
  capacity: number;
  enrolledCount: number;
}

export interface Timetable {
  id: string;
  classId: string;
  date: Date;
  startTime: Date;
  endTime: Date;
  venue: string;
  status: 'Scheduled' | 'Completed' | 'Cancelled';
}

// ==================== STAFF DOMAIN ====================
export interface Staff {
  id: string;
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  departmentId: string;
  role: 'Lecturer' | 'Senior Lecturer' | 'Associate Professor' | 'Professor' | 'Administrator';
  employmentType: 'Full-time' | 'Part-time' | 'Contract';
  hireDate: Date;
}

export interface Lecturer extends Staff {
  courses: string[]; // Course IDs
  performanceScore?: number;
}

// ==================== STUDENT DOMAIN ====================
export interface Student {
  id: string;
  studentNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  program: string;
  year: number;
  semester: number;
  enrollmentDate: Date;
}

export interface StudentAttendance {
  id: string;
  studentId: string;
  classId: string;
  date: Date;
  status: 'Present' | 'Absent' | 'Late' | 'Excused';
  markedAt?: Date;
}

// Re-export student-specific types
export type {
  StudentAttendanceReport,
  ProgramAttendanceData,
  StudentAttendanceRecord,
  WeeklyAttendanceSummary,
  CourseAttendanceEntry,
  StudentAttendanceCSVRow,
} from './student';

// ==================== VENUE DOMAIN ====================
export interface Venue {
  id: string;
  name: string;
  code: string;
  type: 'Lecture Hall' | 'Laboratory' | 'Seminar Room' | 'Office';
  capacity: number;
  building: string;
  floor?: number;
  facilities?: string[];
}

// ==================== REPORTS DOMAIN ====================
export interface ReportFilter {
  startDate?: Date;
  endDate?: Date;
  schoolId?: string;
  departmentId?: string;
  lecturerId?: string;
  courseId?: string;
  registrationNumber?: string;
}

export interface Report {
  id: string;
  type: 'QA' | 'Attendance' | 'Performance' | 'Academic' | 'dashboard-overview' | 'lecture-records' | 'student-performance';
  title: string;
  filters: ReportFilter;
  generatedAt: Date;
  generatedBy: string;
  data: unknown; // Flexible data structure
}

// ==================== COMMON TYPES ====================
export interface PaginationParams {
  page: number;
  pageSize: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}
