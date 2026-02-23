/**
 * Student Domain Types
 * Matching the CSV format used by Quality Assurance team
 */

/**
 * Student Attendance Record - matches CSV format
 * Each record represents attendance for a specific course/date
 */
export interface StudentAttendanceRecord {
  id: string;
  studentNumber: string;
  studentName: string;
  registrationNumber: string;
  courseCode: string;
  courseName: string;
  date: Date;
  dayOfWeek: string; // MONDAY, TUESDAY, etc.
  attended: boolean; // 1 for present, 0 for absent
  weekRange?: string; // e.g., "18TH TO 22ND AUG"
}

/**
 * Weekly Attendance Summary
 * Groups attendance by week ranges
 */
export interface WeeklyAttendanceSummary {
  weekRange: string; // e.g., "18TH TO 22ND AUG"
  courses: {
    courseName: string;
    days: {
      dayOfWeek: string;
      date: Date;
      attended: boolean;
    }[];
  }[];
  totalAttended: number;
  totalExpected: number;
  percentage: number;
}

/**
 * Student Attendance Report - matches CSV structure
 * Contains all attendance data for a student organized by weeks
 */
export interface StudentAttendanceReport {
  studentNumber: string;
  studentName: string;
  registrationNumber: string;
  program: string; // e.g., "BNS_COMPLETION_2.1", "MBCHB_1.1"
  year: number;
  semester: number;
  weeklySummaries: WeeklyAttendanceSummary[];
  overallTotal: {
    attendedLectures: number;
    expectedLectures: number;
    presentPercentage: number;
  };
  /** Optional alias for UI compatibility */
  overallStats?: {
    attendancePercentage: number;
    attendedLectures: number;
    expectedLectures: number;
  };
}

/**
 * Course Attendance Entry
 * Represents attendance for a specific course on a specific day
 */
export interface CourseAttendanceEntry {
  courseName: string;
  dayOfWeek: string;
  date: Date;
  attended: boolean;
}

/**
 * Program Attendance Data
 * Contains all students' attendance for a specific program/class
 */
export interface ProgramAttendanceData {
  programCode: string; // e.g., "BNS_COMPLETION_2.1"
  programName: string;
  year: number;
  semester: number;
  startDate: Date;
  endDate: Date;
  students: StudentAttendanceReport[];
  courses: string[]; // List of course names
  weekRanges: string[]; // List of week ranges
}

/**
 * CSV Row Structure (as parsed from CSV)
 */
export interface StudentAttendanceCSVRow {
  no: number;
  names: string;
  registrationNumber: string;
  [key: string]: string | number; // Dynamic columns for courses/dates
}

/**
 * Enriched attendance record row from GET /students/attendance/records
 */
export interface AttendanceRecordRow {
  id: string;
  date: string;
  studentId: string;
  studentName: string;
  studentNumber: string;
  classId: string;
  className: string;
  courseId: string | null;
  courseName: string;
  courseCode: string;
  status: string;
  markedAt: string | null;
  markedBy: string;
}
