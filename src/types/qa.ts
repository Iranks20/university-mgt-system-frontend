/**
 * Quality Assurance Domain Types
 * Based on QA Attendance Record CSV/Excel templates
 * Matching exact format from QA_Attendance_CSVs folder
 */

import type { DeliveryMode } from '@/lib/delivery-mode';

/**
 * Detailed Lecture Record (matches 3.csv format)
 * DATE, LECTURER'S NAME, CLASS, COURSE UNIT, TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT
 * Enhanced with check-in/check-out tracking
 */
export interface QALectureRecord {
  id?: string; // API record id
  date: Date | string; // Can be Date object or string like "8/25/2025" or "2025-01-09 00:00:00"
  lecturerId?: string | null;
  timetableId?: string | null;
  lecturerName: string; // "LECTURER'S NAME"
  class: string; // "CLASS" - e.g., "BAE 1.1", "BBA,BAE, BPG & DBG 1.1"
  classId?: string | null;
  courseId?: string | null;
  department?: string; // Derived department name when linked to a course
  courseUnit: string; // "COURSE UNIT" - e.g., "MATHEMATICS FOR ECONOMICS"
  timeForStarting: string; // "TIME FOR STARTING" - Scheduled start time e.g., "09:10:00"
  timeOutForEnding: string; // "TIME OUT FOR ENDING" - Scheduled end time e.g., "10:00:00"
  duration: string; // "DURATION" - Calculated from check-in to check-out e.g., "00:50:00", "02:00:00"
  timeLost: string;
  deliveryMode?: DeliveryMode;
  comment: string;
  remarks?: string | null; // QA free-text comment explaining the chosen status
  substituteLecturerId?: string | null;
  substituteLecturerName?: string | null;
  checkInTime?: string;
  checkOutTime?: string;
  checkInTimestamp?: Date;
  checkOutTimestamp?: Date;
  lessonTimeout?: string;
  status?: 'OnTime' | 'Late' | 'Absent' | 'EarlyDeparture';
}

/**
 * Lecturer Summary Record (matches 2.csv format)
 * LECTURER'S NAME, CLASS, COURSE UNIT, NO. TAUGHT, NO. MISSED BY LECTURERS, COMMENT IF ANY
 */
export interface QALecturerSummary {
  lecturerName: string; // "LECTURER'S NAME"
  class: string; // "CLASS"
  courseUnit: string; // "COURSE UNIT"
  noTaught: number; // "NO. TAUGHT"
  noMissedByLecturers: number; // "NO. MISSED BY LECTURERS"
  commentIfAny?: string; // "COMMENT IF ANY"
}

/**
 * School Summary Record (matches 1.csv format)
 * SCHOOL, TOTAL NO. TAUGHT, NO. UNTAIGHT
 */
export interface QASchoolSummary {
  school: string;
  totalNoTaught: number;
  noUntaught: number;
  missedByLecturer?: number;
  missedByStudents?: number;
  missedOtherProgramsHolidays?: number;
  assignment?: number;
  noSdl?: number;
  noSubstituted?: number;
}

/**
 * Lecturer Summary Report by School (2.csv format)
 * First row: School name
 * Second row: Headers
 * Data rows with blank rows between lecturers
 */
export interface QALecturerSummaryReport {
  school: string; // School name from first row
  lecturers: QALecturerSummary[];
}

/**
 * Legacy type for backward compatibility
 * @deprecated Use QALectureRecord instead
 */
export interface QALecturerRecord {
  lecturerName: string;
  staffNumber?: string;
  department?: string;
  school: string;
  courseCode?: string;
  courseName: string;
  scheduledDate: Date;
  scheduledTime?: string;
  venue?: string;
  status: 'Present' | 'Absent' | 'Late' | 'Cancelled' | 'TAUGHT' | 'UNTAUGHT' | 'COMPENSATION' | 'MEETING' | 'SDL' | 'STUDENTS ORIENTATION';
  actualStartTime?: Date;
  actualEndTime?: Date;
  remarks?: string;
  recordedBy?: string;
  recordedAt?: Date;
  attendanceRate?: number;
  totalScheduled?: number;
  totalPresent?: number;
  totalAbsent?: number;
  totalLate?: number;
}

export interface QAMonthlyReport {
  month: string; // e.g., "October 2024"
  school: string;
  department?: string;
  records: QALecturerRecord[];
  summary: {
    totalLecturers: number;
    totalLectures: number;
    totalPresent: number;
    totalAbsent: number;
    totalLate: number;
    overallAttendanceRate: number;
  };
}

export interface QAFilter {
  startDate?: Date;
  endDate?: Date;
  school?: string;
  department?: string;
  lecturerName?: string;
  courseCode?: string;
  class?: string;
  search?: string;
  comment?: string;
  checkInStatus?: string;
  page?: number;
  limit?: number;
  status?: QALecturerRecord['status'];
}
