/**
 * Excel Export Utilities
 * Handles export to Excel/CSV format matching QA templates exactly
 * Matches formats from QA_Attendance_CSVs folder:
 * - 3.csv: Detailed lecture records
 * - 2.csv: Lecturer summary by school
 * - 1.csv: School summary
 */

import * as XLSX from 'xlsx';
import { saveAs } from 'file-saver';
import type { QALectureRecord, QALecturerSummary, QASchoolSummary, QALecturerSummaryReport, QALecturerRecord } from '@/types/qa';
import type { ProgramAttendanceData, StudentAttendanceReport, AttendanceRecordRow } from '@/types/student';

/**
 * Export Lecture Records to CSV/Excel (matches 3.csv format exactly)
 * Columns: DATE, LECTURER'S NAME, CLASS, COURSE UNIT, TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT
 */
export function exportLectureRecordsToCSV(
  records: QALectureRecord[],
  filename?: string
): void {
  const data = [
    // Header row - exact match to 3.csv with check-in/check-out columns
    [
      'DATE',
      'LECTURER\'S NAME',
      'CLASS',
      'COURSE UNIT',
      'TIME FOR STARTING',
      'TIME OUT FOR ENDING',
      'CHECK-IN TIME',
      'CHECK-OUT TIME',
      'DURATION',
      'LESSON TIMEOUT',
      'TIME LOST',
      'COMMENT',
    ],
    // Data rows
    ...records.map(record => [
      formatDateForCSV(record.date),
      record.lecturerName,
      record.class || (record as any).className || '',
      record.courseUnit,
      record.timeForStarting,
      record.timeOutForEnding,
      record.checkInTime || '',
      record.checkOutTime || '',
      record.duration,
      record.lessonTimeout || record.duration,
      record.timeLost,
      record.comment,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 15 }, // DATE
    { wch: 25 }, // LECTURER'S NAME
    { wch: 30 }, // CLASS
    { wch: 35 }, // COURSE UNIT
    { wch: 18 }, // TIME FOR STARTING
    { wch: 18 }, // TIME OUT FOR ENDING
    { wch: 15 }, // CHECK-IN TIME
    { wch: 15 }, // CHECK-OUT TIME
    { wch: 12 }, // DURATION
    { wch: 15 }, // LESSON TIMEOUT
    { wch: 12 }, // TIME LOST
    { wch: 20 }, // COMMENT
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lecture Records');

  const defaultFilename = `QA_Lecture_Records_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

function formatRecordDate(d: string | Date | null): string {
  if (!d) return '';
  const date = typeof d === 'string' ? new Date(d) : d;
  return isNaN(date.getTime()) ? '' : date.toISOString().slice(0, 10);
}

function formatRecordTime(d: string | null): string {
  if (!d) return '';
  const date = new Date(d);
  return isNaN(date.getTime()) ? '' : date.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

export function exportAttendanceRecordsToExcel(
  records: AttendanceRecordRow[],
  filename?: string
): void {
  const data: (string | number)[][] = [
    ['Date', 'Student', 'Student ID', 'Course', 'Class', 'Check-in Time', 'Verified By', 'Status'],
    ...records.map(r => [
      formatRecordDate(r.date),
      r.studentName,
      r.studentNumber,
      r.courseName || r.courseCode || '',
      r.className || '',
      formatRecordTime(r.markedAt),
      r.markedBy || '',
      r.status,
    ]),
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 12 }, { wch: 28 }, { wch: 16 }, { wch: 32 }, { wch: 20 }, { wch: 14 }, { wch: 18 }, { wch: 12 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Records');
  const defaultFilename = `Student_Attendance_Records_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
}

/**
 * Export Lecturer Summary Report to CSV/Excel (matches 2.csv format exactly)
 * First row: School name
 * Second row: Headers - LECTURER'S NAME, CLASS, COURSE UNIT, NO. TAUGHT, NO. MISSED BY LECTURERS, COMMENT IF ANY
 * Data rows with blank rows between lecturers
 */
export function exportLecturerSummaryReport(
  report: QALecturerSummaryReport,
  filename?: string
): void {
  const data: (string | number)[][] = [
    // First row: School name
    [report.school],
    // Second row: Headers
    [
      'LECTURER\'S NAME',
      'CLASS',
      'COURSE UNIT',
      'NO. TAUGHT',
      'NO. MISSED BY LECTURERS',
      'COMMENT IF ANY',
    ],
  ];

  // Add data rows with blank rows between lecturers
  report.lecturers.forEach((lecturer, index) => {
    data.push([
      lecturer.lecturerName,
      lecturer.class,
      lecturer.courseUnit,
      lecturer.noTaught,
      lecturer.noMissedByLecturers,
      lecturer.commentIfAny || '',
    ]);
    
    // Add blank row after each lecturer (except the last one)
    if (index < report.lecturers.length - 1) {
      data.push(['', '', '', '', '', '']);
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // LECTURER'S NAME
    { wch: 30 }, // CLASS
    { wch: 35 }, // COURSE UNIT
    { wch: 12 }, // NO. TAUGHT
    { wch: 25 }, // NO. MISSED BY LECTURERS
    { wch: 20 }, // COMMENT IF ANY
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.school);

  const defaultFilename = `QA_Lecturer_Summary_${report.school.replace(/\s+/g, '_')}_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

/**
 * Export School Summary Report to CSV/Excel (matches 1.csv format exactly)
 * Columns: SCHOOL, TOTAL NO. TAUGHT, NO. UNTAIGHT (preserving typo)
 */
export function exportSchoolSummaryReport(
  summaries: QASchoolSummary[],
  filename?: string
): void {
  const data = [
    // Header row - exact match to 1.csv (preserving typo)
    [
      'SCHOOL',
      'TOTAL NO. TAUGHT',
      'NO. UNTAIGHT',
    ],
    // Data rows
    ...summaries.map(summary => [
      summary.school,
      summary.totalNoTaught,
      summary.noUntaught,
    ]),
    // Total row
    [
      'TOTAL',
      summaries.reduce((sum, s) => sum + s.totalNoTaught, 0),
      summaries.reduce((sum, s) => sum + s.noUntaught, 0),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 25 }, // SCHOOL
    { wch: 18 }, // TOTAL NO. TAUGHT
    { wch: 15 }, // NO. UNTAIGHT
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'School Summary');

  const defaultFilename = `QA_School_Summary_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

/**
 * Export All Reports to Excel Workbook (multiple sheets)
 * Creates a workbook with all three report types
 */
export function exportAllQAReports(
  lectureRecords: QALectureRecord[],
  lecturerReports: QALecturerSummaryReport[],
  schoolSummaries: QASchoolSummary[],
  filename?: string
): void {
  const wb = XLSX.utils.book_new();

  // Sheet 1: School Summary (1.csv format)
  const schoolData = [
    ['SCHOOL', 'TOTAL NO. TAUGHT', 'NO. UNTAIGHT'],
    ...schoolSummaries.map(s => [s.school, s.totalNoTaught, s.noUntaught]),
    ['TOTAL', schoolSummaries.reduce((sum, s) => sum + s.totalNoTaught, 0), schoolSummaries.reduce((sum, s) => sum + s.noUntaught, 0)],
  ];
  const schoolSheet = XLSX.utils.aoa_to_sheet(schoolData);
  schoolSheet['!cols'] = [{ wch: 25 }, { wch: 18 }, { wch: 15 }];
  XLSX.utils.book_append_sheet(wb, schoolSheet, 'School Summary');

  // Sheet 2: Lecturer Summary (2.csv format) - one sheet per school
  lecturerReports.forEach(report => {
    const lecturerData: (string | number)[][] = [
      [report.school],
      ['LECTURER\'S NAME', 'CLASS', 'COURSE UNIT', 'NO. TAUGHT', 'NO. MISSED BY LECTURERS', 'COMMENT IF ANY'],
    ];
    
    report.lecturers.forEach((lecturer, index) => {
      lecturerData.push([
        lecturer.lecturerName,
        lecturer.class,
        lecturer.courseUnit,
        lecturer.noTaught,
        lecturer.noMissedByLecturers,
        lecturer.commentIfAny || '',
      ]);
      if (index < report.lecturers.length - 1) {
        lecturerData.push(['', '', '', '', '', '']);
      }
    });
    
    const lecturerSheet = XLSX.utils.aoa_to_sheet(lecturerData);
    lecturerSheet['!cols'] = [{ wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 12 }, { wch: 25 }, { wch: 20 }];
    XLSX.utils.book_append_sheet(wb, lecturerSheet, report.school.substring(0, 31)); // Excel sheet name limit
  });

  // Sheet 3: Detailed Lecture Records (3.csv format with check-in/check-out)
  const lectureData = [
    ['DATE', 'LECTURER\'S NAME', 'CLASS', 'COURSE UNIT', 'TIME FOR STARTING', 'TIME OUT FOR ENDING', 'CHECK-IN TIME', 'CHECK-OUT TIME', 'DURATION', 'LESSON TIMEOUT', 'TIME LOST', 'COMMENT'],
    ...lectureRecords.map(r => [
      formatDateForCSV(r.date),
      r.lecturerName,
      r.class,
      r.courseUnit,
      r.timeForStarting,
      r.timeOutForEnding,
      r.checkInTime || '',
      r.checkOutTime || '',
      r.duration,
      r.lessonTimeout || r.duration,
      r.timeLost,
      r.comment,
    ]),
  ];
  const lectureSheet = XLSX.utils.aoa_to_sheet(lectureData);
  lectureSheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 15 }, { wch: 12 }, { wch: 20 }];
  XLSX.utils.book_append_sheet(wb, lectureSheet, 'Lecture Records');

  const defaultFilename = `QA_Complete_Report_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

/** CSV header row for lecture records import template */
export const LECTURE_RECORDS_IMPORT_CSV_HEADER = 'DATE,LECTURER\'S NAME,CLASS,COURSE UNIT,TIME FOR STARTING,TIME OUT FOR ENDING,DURATION,TIME LOST,COMMENT';

/** Download lecture records import template as Excel (.xlsx). Columns: DATE, LECTURER'S NAME, CLASS, COURSE UNIT, TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT */
export function downloadLectureRecordsImportTemplateExcel(): void {
  const wsData: (string | number)[][] = [
    ['DATE', 'LECTURER\'S NAME', 'CLASS', 'COURSE UNIT', 'TIME FOR STARTING', 'TIME OUT FOR ENDING', 'DURATION', 'TIME LOST', 'COMMENT'],
    [new Date().toISOString().split('T')[0], 'Example Lecturer', 'Example Class', 'Example Course', '08:00:00', '10:00:00', '02:00:00', '0', 'TAUGHT'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(wsData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lecture Records');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'lecture_records_import_template.xlsx');
}

/**
 * Import Lecture Records from CSV or Excel file
 */
export function importLectureRecordsFromCSV(file: File): Promise<QALectureRecord[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();

    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to JSON
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[];
        
        // Skip header row (first row)
        const dataRows = jsonData.slice(1);
        
        // Transform to QALectureRecord format
        const records: QALectureRecord[] = dataRows
          .filter(row => row && row.length > 0 && row[0]) // Filter out empty rows
          .map((row: any) => {
            return {
              date: row[0] || new Date(),
              lecturerName: row[1] || '',
              class: row[2] || '',
              courseUnit: row[3] || '',
              timeForStarting: formatTime(row[4]) || '08:00:00',
              timeOutForEnding: formatTime(row[5]) || '10:00:00',
              duration: row[6] || '00:00:00',
              timeLost: row[7] || '0',
              comment: row[8] || 'TAUGHT',
            };
          });

        resolve(records);
      } catch (error) {
        reject(error);
      }
    };

    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Helper function to format date for CSV export
 * Matches formats seen in 3.csv: "8/25/2025" or "2025-01-09 00:00:00"
 */
function formatDateForCSV(date: Date | string): string {
  if (typeof date === 'string') {
    // If it's already a string, try to parse and reformat
    const parsed = new Date(date);
    if (!isNaN(parsed.getTime())) {
      // Format as M/D/YYYY to match CSV format
      return `${parsed.getMonth() + 1}/${parsed.getDate()}/${parsed.getFullYear()}`;
    }
    return date;
  }
  
  // Format as M/D/YYYY
  return `${date.getMonth() + 1}/${date.getDate()}/${date.getFullYear()}`;
}

/**
 * Helper function to format date
 */
function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  });
}

/**
 * Helper function to format time
 */
function formatTime(time: any): string {
  if (!time) return '00:00:00';
  if (typeof time === 'string') {
    // If already in HH:MM:SS format, return as is
    if (time.match(/^\d{2}:\d{2}:\d{2}$/)) return time;
    // If in HH:MM format, add seconds
    if (time.match(/^\d{2}:\d{2}$/)) return `${time}:00`;
    return time;
  }
  return '00:00:00';
}

/**
 * Legacy export function for backward compatibility
 * Converts QALecturerRecord to QALectureRecord format and exports
 * @deprecated Use exportLectureRecordsToCSV instead
 */
export function exportQARecords(
  records: QALecturerRecord[],
  filename?: string
): void {
  // Convert old format to new format
  const convertedRecords: QALectureRecord[] = records.map((record: QALecturerRecord): QALectureRecord => {
    // Parse scheduled time to extract start and end times
    const timeMatch = record.scheduledTime?.match(/(\d{2}:\d{2})\s*-\s*(\d{2}:\d{2})/);
    const startTime = timeMatch ? timeMatch[1] + ':00' : '08:00:00';
    const endTime = timeMatch ? timeMatch[2] + ':00' : '10:00:00';
    
    // Calculate duration
    const parseTime = (timeStr: string): number => {
      const parts = timeStr.split(':');
      if (parts.length >= 2) {
        return parseInt(parts[0]) * 60 + parseInt(parts[1]);
      }
      return 0;
    };
    const durationMinutes = parseTime(endTime) - parseTime(startTime);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    // Map status to comment
    const statusToComment: Record<string, string> = {
      'Present': 'TAUGHT',
      'Absent': 'UNTAUGHT',
      'Late': 'TAUGHT',
      'Cancelled': 'UNTAUGHT',
      'TAUGHT': 'TAUGHT',
      'UNTAUGHT': 'UNTAUGHT',
      'COMPENSATION': 'COMPENSATION',
      'MEETING': 'MEETING',
      'SDL': 'SDL',
      'STUDENTS ORIENTATION': 'STUDENTS ORIENTATION',
    };
    
    return {
      date: record.scheduledDate,
      lecturerName: record.lecturerName,
      class: record.courseCode || 'N/A',
      courseUnit: record.courseName,
      timeForStarting: startTime,
      timeOutForEnding: endTime,
      duration: duration,
      timeLost: '0',
      comment: statusToComment[record.status] || 'TAUGHT',
    };
  });
  
  exportLectureRecordsToCSV(convertedRecords, filename);
}

// ==================== STUDENT ATTENDANCE EXPORT/IMPORT ====================

/**
 * Export Student Attendance to CSV/Excel (matches student CSV format exactly)
 * Format matches files like BNS_COMPLETION_2.1.csv, MBCHB_1.1.csv, etc.
 * Structure:
 * - Row 1: Days of week (MONDAY, TUESDAY, etc.)
 * - Row 2: Course names
 * - Row 3: Date ranges (e.g., "18TH TO 22ND AUG")
 * - Row 4: Headers (NO, NAMES, REGISTRATION NUMBER, then attendance columns, TOTALS, EXPECTED, etc.)
 * - Row 5+: Student data
 */
export function exportStudentAttendanceToCSV(
  programData: ProgramAttendanceData,
  filename?: string
): void {
  const data: (string | number)[][] = [];
  
  // Build dynamic structure based on courses and week ranges
  const courses = programData.courses;
  const weekRanges = programData.weekRanges;
  
  // Row 1: Days of week header (simplified - would need to be dynamic based on actual schedule)
  const dayRow: (string | number)[] = ['', '', ''];
  // Add day headers for each week range
  weekRanges.forEach(() => {
    dayRow.push('MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY');
  });
  data.push(dayRow);
  
  // Row 2: Course names
  const courseRow: (string | number)[] = ['', '', ''];
  weekRanges.forEach(() => {
    courses.forEach(course => {
      courseRow.push(course);
    });
  });
  data.push(courseRow);
  
  // Row 3: Date ranges
  const dateRow: (string | number)[] = ['', '', ''];
  weekRanges.forEach(range => {
    dateRow.push(range, '', '', '', '');
  });
  data.push(dateRow);
  
  // Row 4: Headers
  const headerRow: (string | number)[] = [
    'NO',
    'NAMES',
    'REGISTRATION NUMBER',
  ];
  
  // Add headers for each week range
  weekRanges.forEach((range, rangeIndex) => {
    courses.forEach(() => {
      headerRow.push(''); // Individual course attendance columns
    });
    if (rangeIndex < weekRanges.length - 1) {
      headerRow.push('TOTALS', 'EXPECTED');
    }
  });
  
  // Add final summary headers
  headerRow.push(
    'TOTALS',
    'EXPECTED',
    'ATTENDED LECTURES',
    'EXPECTED ATTENDANCE',
    'PRESENT PERCENTAGE'
  );
  
  data.push(headerRow);
  
  // Row 5+: Student data
  programData.students.forEach((student, index) => {
    const studentRow: (string | number)[] = [
      index + 1,
      student.studentName,
      student.registrationNumber,
    ];
    
    // Add attendance data for each week
    student.weeklySummaries.forEach((week, weekIndex) => {
      // Add attendance marks for each course/day
      week.courses.forEach(course => {
        course.days.forEach(day => {
          studentRow.push(day.attended ? 1 : 0);
        });
      });
      
      // Add weekly totals
      if (weekIndex < student.weeklySummaries.length - 1) {
        studentRow.push(week.totalAttended, week.totalExpected);
      }
    });
    
    // Add overall totals
    studentRow.push(
      student.overallTotal.attendedLectures,
      student.overallTotal.expectedLectures,
      student.overallTotal.attendedLectures,
      student.overallTotal.expectedLectures,
      student.overallTotal.presentPercentage.toFixed(2)
    );
    
    data.push(studentRow);
  });
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  
  // Set column widths
  ws['!cols'] = [
    { wch: 5 },  // NO
    { wch: 30 }, // NAMES
    { wch: 25 }, // REGISTRATION NUMBER
    // Dynamic widths for attendance columns
    ...Array(courses.length * weekRanges.length * 5).fill({ wch: 8 }),
    { wch: 12 }, // TOTALS
    { wch: 12 }, // EXPECTED
    { wch: 18 }, // ATTENDED LECTURES
    { wch: 18 }, // EXPECTED ATTENDANCE
    { wch: 18 }, // PRESENT PERCENTAGE
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, programData.programCode);
  
  const defaultFilename = `${programData.programCode}_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

/**
 * Download student import template as Excel (.xlsx).
 * Columns: name, email, studentId, school (optional), program, year, semester, password.
 * Program = program name as shown under Schools & Programs (must match an existing program).
 */
export function downloadStudentImportTemplateExcel(): void {
  const data = [
    ['name', 'email', 'studentId', 'school', 'program', 'year', 'semester', 'password'],
    ['John Doe', 'john.doe@student.kcu.ac.ug', '2100101', 'School of Business', 'Business Administration', 'Year 1', '1', 'TempPassword123!'],
    ['Jane Smith', 'jane.smith@student.kcu.ac.ug', '2100102', 'School of Medicine', 'Medicine and Surgery', 'Year 1', '2', 'TempPassword123!'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 15 },
    { wch: 22 },
    { wch: 28 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
  ];
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Students');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'students_template.xlsx');
}

/** Staff import template: name, email, role, dept (optional: staffNumber) */
export function downloadStaffImportTemplateExcel(): void {
  const data = [
    ['name', 'email', 'role', 'dept'],
    ['Example Staff', 'example@kcu.ac.ug', 'Staff', 'Example Department'],
    ['HR Manager', 'hr@kcu.ac.ug', 'Administrator', 'Example Department'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Staff');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'staff_template.xlsx');
}

/** Lecturers import template: name, email, role (Lecturer), dept */
export function downloadLecturerImportTemplateExcel(): void {
  const data = [
    ['name', 'email', 'role', 'dept'],
    ['Dr. Jane Smith', 'jsmith@kcu.ac.ug', 'Lecturer', 'Computer Science'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lecturers');
  const buffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, 'lecturers_template.xlsx');
}

/**
 * Import Student Attendance from CSV file
 * Parses the complex CSV structure and converts to ProgramAttendanceData
 */
export function importStudentAttendanceFromCSV(file: File): Promise<ProgramAttendanceData> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    
    reader.onload = (e) => {
      try {
        const data = new Uint8Array(e.target?.result as ArrayBuffer);
        const workbook = XLSX.read(data, { type: 'array' });
        
        // Get first sheet
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        
        // Convert to array of arrays
        const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1, defval: '' }) as any[][];
        
        if (jsonData.length < 5) {
          throw new Error('Invalid CSV format: insufficient rows');
        }
        
        // Extract program code from filename
        const programCode = file.name.replace(/\.(csv|xlsx)$/i, '').toUpperCase();
        
        // Parse structure
        // Row 0: Days (we'll extract courses from row 1)
        // Row 1: Course names
        const courseRow = jsonData[1] || [];
        const courses = courseRow
          .slice(3) // Skip NO, NAMES, REGISTRATION NUMBER
          .filter((cell: any) => cell && typeof cell === 'string' && cell.trim() !== '')
          .filter((cell: string, index: number, arr: string[]) => {
            // Remove duplicates
            return arr.indexOf(cell) === index;
          });
        
        // Row 2: Date ranges
        const dateRow = jsonData[2] || [];
        const weekRanges = dateRow
          .slice(3)
          .filter((cell: any) => cell && typeof cell === 'string' && cell.trim() !== '')
          .filter((cell: string) => cell.includes('TO') || cell.includes('TH') || cell.includes('ST') || cell.includes('ND') || cell.includes('RD'));
        
        // Row 3: Headers (skip)
        // Row 4+: Student data
        const studentRows = jsonData.slice(4);
        
        const students: StudentAttendanceReport[] = studentRows
          .filter(row => row && row.length > 0 && row[0] && row[1]) // Filter out empty rows
          .map((row: any[], index: number) => {
            const studentName = row[1] || '';
            const registrationNumber = row[2] || '';
            
            // Parse attendance data (simplified - would need more complex parsing)
            // This is a simplified version - actual implementation would need to parse
            // the complex structure based on courses and week ranges
            
            return {
              studentNumber: registrationNumber,
              studentName: studentName,
              registrationNumber: registrationNumber,
              program: programCode,
              year: 1, // Would need to extract from program code
              semester: 1, // Would need to extract from program code
              weeklySummaries: [], // Would need complex parsing
              overallTotal: {
                attendedLectures: 0,
                expectedLectures: 0,
                presentPercentage: 0,
              },
            };
          });
        
        const programData: ProgramAttendanceData = {
          programCode: programCode,
          programName: programCode,
          year: 1,
          semester: 1,
          startDate: new Date(),
          endDate: new Date(),
          students: students,
          courses: courses,
          weekRanges: weekRanges,
        };
        
        resolve(programData);
      } catch (error) {
        reject(error);
      }
    };
    
    reader.onerror = reject;
    reader.readAsArrayBuffer(file);
  });
}

/**
 * Export Student Attendance Report (single student)
 * Creates a simplified report for a single student
 */
export function exportStudentAttendanceReport(
  report: StudentAttendanceReport,
  filename?: string
): void {
  const data: (string | number)[][] = [
    // Header
    ['STUDENT ATTENDANCE REPORT'],
    ['Student Name:', report.studentName],
    ['Registration Number:', report.registrationNumber],
    ['Program:', report.program],
    [''],
    // Weekly summaries
    ['Week Range', 'Total Attended', 'Total Expected', 'Percentage'],
    ...report.weeklySummaries.map(week => [
      week.weekRange,
      week.totalAttended,
      week.totalExpected,
      week.percentage.toFixed(2) + '%',
    ]),
    [''],
    // Overall summary
    ['Overall Total'],
    ['Attended Lectures:', report.overallTotal.attendedLectures],
    ['Expected Lectures:', report.overallTotal.expectedLectures],
    ['Present Percentage:', report.overallTotal.presentPercentage.toFixed(2) + '%'],
  ];
  
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 30 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
  ];
  
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Report');
  
  const defaultFilename = `Student_Attendance_${report.registrationNumber}_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;
  
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

/**
 * Export Attendance History to CSV/Excel
 * Supports both Student and Staff attendance history
 */
export function exportAttendanceHistoryToCSV(
  data: any[],
  role: 'Student' | 'Staff',
  filename?: string
): void {
  let headers: string[];
  let rows: (string | number)[][];

  if (role === 'Staff') {
    headers = ['Date', 'Check-In', 'Check-Out', 'Duration', 'Location', 'Status'];
    rows = data.map(record => [
      record.date || '—',
      record.checkIn || '—',
      record.checkOut || '—',
      record.duration || '—',
      record.location || '—',
      record.status || 'Present',
    ]);
  } else {
    headers = ['Date', 'Time', 'Course', 'Location', 'Status'];
    rows = data.map(record => [
      record.date || '—',
      record.time || '—',
      record.course || '—',
      record.location || '—',
      record.status || 'Present',
    ]);
  }

  const csvData = [headers, ...rows];

  const ws = XLSX.utils.aoa_to_sheet(csvData);
  ws['!cols'] = headers.map(() => ({ wch: 20 }));

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance History');

  const defaultFilename = `Attendance_History_${role}_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}
