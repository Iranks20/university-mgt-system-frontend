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

export interface ClassAttendanceSummaryRow {
  studentId: string;
  studentName: string;
  registrationNumber: string;
  totalAttendedClasses: number;
  totalLateClasses: number;
  totalMissedClasses: number;
  expectedAttendance: number;
  percentage: number;
}

export interface ClassAttendanceSummaryReport {
  title: string;
  reportName: string;
  generatedAt: string;
  filters: {
    schoolId: string | null;
    schoolName: string | null;
    programId: string | null;
    programName: string | null;
    programIntakeId: string | null;
    intakeLabel: string | null;
    courseId: string | null;
    courseName: string | null;
    classId: string | null;
    className: string | null;
    level: number | null;
    semester: number | null;
    startDate: string | null;
    endDate: string | null;
  };
  students: ClassAttendanceSummaryRow[];
  totals: {
    studentCount: number;
    totalAttendedClasses: number;
    totalLateClasses: number;
    totalMissedClasses: number;
    expectedAttendance: number;
  };
}

export interface CourseWiseAttendanceSummaryRow {
  serialNo: number;
  registrationNumber: string;
  studentName: string;
  course: string;
  courseId: string;
  courseCode: string;
  totalSessions: number;
  totalPresents: number;
  totalAbsents: number;
  presentPercentage: number;
  absentPercentage: number;
}

export interface DailyMarkingSlot {
  classId: string;
  className: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  dayOfWeek: number;
  dayLabel: string;
  dayShort: string;
  startTime: string | null;
  endTime: string | null;
}

export interface DailyMarkingGridStudent {
  serialNo: number;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  attendance: Record<string, string | null>;
}

export interface DailyMarkingGrid {
  programIntakeId: string;
  programIntakeLabel: string;
  programName: string;
  programCode: string;
  date: string;
  dayOfWeek: number;
  dayName: string;
  slots: DailyMarkingSlot[];
  students: DailyMarkingGridStudent[];
}

export type DailyMarkingCoverageStatus =
  | 'not_started'
  | 'partial'
  | 'complete'
  | 'no_students';

export type DailyMarkingCoverageFilter = 'all' | 'pending' | 'not_started' | 'partial' | 'complete';

export interface DailyMarkingCoverageItem {
  programIntakeId: string;
  cohortLabel: string;
  programId: string;
  programName: string;
  programCode: string;
  schoolId: string | null;
  schoolName: string | null;
  year: number;
  semester: number;
  intakeType: string;
  classId: string;
  className: string;
  courseId: string;
  courseName: string;
  courseCode: string;
  startTime: string | null;
  endTime: string | null;
  expectedStudents: number;
  markedStudents: number;
  status: DailyMarkingCoverageStatus;
}

export interface DailyMarkingCoverageSummary {
  totalSlots: number;
  complete: number;
  partial: number;
  notStarted: number;
  noStudents: number;
  pending: number;
}

export interface DailyMarkingCoverage {
  date: string;
  dayOfWeek: number;
  dayName: string;
  summary: DailyMarkingCoverageSummary;
  items: DailyMarkingCoverageItem[];
}

export type DailyBulkPrefill = {
  programIntakeId: string;
  programId: string;
  schoolId: string | null;
  year: number;
  semester: number;
  intakeType: string;
  date: string;
  requestId: number;
};

export interface WeeklyMatrixDayGroup {
  dayOfWeek: number;
  dayLabel: string;
  dayShort: string;
  slots: DailyMarkingSlot[];
}

export interface WeeklyAttendanceMatrixStudent {
  serialNo: number;
  studentId: string;
  studentName: string;
  registrationNumber: string;
  cells: Record<string, { value: number; status: string | null }>;
  totalAttended: number;
  expected: number;
  presentPercentage: number;
}

export interface WeeklyAttendanceMatrixReport {
  title: string;
  reportName: string;
  universityName: string;
  generatedAt: string;
  programIntakeId: string;
  programIntakeLabel: string;
  programName: string;
  programCode: string;
  weekRangeLabel: string;
  filters: {
    programIntakeId: string;
    startDate: string;
    endDate: string;
  };
  dayGroups: WeeklyMatrixDayGroup[];
  slots: DailyMarkingSlot[];
  students: WeeklyAttendanceMatrixStudent[];
  totals: {
    studentCount: number;
    slotCount: number;
  };
}

export interface CourseWiseAttendanceSummaryReport {
  title: string;
  reportName: string;
  universityName: string;
  generatedAt: string;
  filters: {
    schoolId: string | null;
    schoolName: string | null;
    programId: string | null;
    programName: string | null;
    programIntakeId: string | null;
    intakeLabel: string | null;
    academicYear: number | null;
    courseId: string | null;
    courseName: string | null;
    classId: string | null;
    className: string | null;
    level: number | null;
    semester: number | null;
    studentId: string | null;
    startDate: string | null;
    endDate: string | null;
  };
  rows: CourseWiseAttendanceSummaryRow[];
  totals: {
    rowCount: number;
    studentCount: number;
    totalSessions: number;
    totalPresents: number;
    totalAbsents: number;
  };
}
