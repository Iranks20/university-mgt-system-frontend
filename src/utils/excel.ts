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
import type { QALectureRecord, QALecturerSummary, QASchoolSummary, QALecturerSummaryReport, QALecturerRecord, QACourseUnitSummary } from '@/types/qa';
import { mapImportStatusToComment, normalizeLectureComment } from '@/lib/lecture-outcome';
import { deliveryModeLabel } from '@/lib/delivery-mode';
import type {
  ProgramAttendanceData,
  StudentAttendanceReport,
  AttendanceRecordRow,
  ClassAttendanceSummaryReport,
  CourseWiseAttendanceSummaryReport,
  WeeklyAttendanceMatrixReport,
} from '@/types/student';
import { UNIVERSITY_NAME } from '@/lib/institution';
import { normalizeClockTime, clockTimeToMinutes, formatClockTimeForDisplay } from '@/lib/clock-time';

/**
 * Export Lecture Records to CSV/Excel (matches 3.csv format exactly)
 * Columns: DATE, LECTURER'S NAME, CLASS, COURSE UNIT, TIME FOR STARTING, TIME OUT FOR ENDING, DURATION, TIME LOST, COMMENT
 */
export function exportLectureRecordsToCSV(
  records: QALectureRecord[],
  filename?: string
): void {
  const data = [
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
      'TIME LOST',
      'MODE OF DELIVERY',
      'STATUS',
      'COMMENT',
      'SUBSTITUTE LECTURER',
    ],
    ...records.map(record => [
      formatDateForCSV(record.date),
      record.lecturerName,
      record.class || (record as any).className || '',
      record.courseUnit,
      formatClockTimeForDisplay(record.timeForStarting),
      formatClockTimeForDisplay(record.timeOutForEnding),
      formatClockTimeForDisplay(record.checkInTime),
      formatClockTimeForDisplay(record.checkOutTime),
      formatClockTimeForDisplay(record.duration),
      formatClockTimeForDisplay(record.timeLost),
      normalizeLectureComment(record.comment) === 'TAUGHT' ? deliveryModeLabel(record.deliveryMode) : '',
      record.comment,
      record.remarks || '',
      record.substituteLecturerName || '',
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 15 },
    { wch: 25 },
    { wch: 30 },
    { wch: 35 },
    { wch: 18 },
    { wch: 18 },
    { wch: 15 },
    { wch: 15 },
    { wch: 12 },
    { wch: 12 },
    { wch: 18 },
    { wch: 20 },
    { wch: 40 },
    { wch: 25 },
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

function formatReportDateLabel(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso + (iso.length === 10 ? 'T00:00:00' : ''));
  return isNaN(d.getTime()) ? iso : d.toLocaleDateString('en-US', { day: 'numeric', month: 'short', year: 'numeric' });
}

export function exportClassAttendanceSummaryReport(
  report: ClassAttendanceSummaryReport,
  filename?: string
): void {
  const filterParts: string[] = [];
  if (report.filters.schoolName) filterParts.push(`School: ${report.filters.schoolName}`);
  if (report.filters.programName) filterParts.push(`Program: ${report.filters.programName}`);
  if (report.filters.courseName) filterParts.push(`Course: ${report.filters.courseName}`);
  if (report.filters.className) filterParts.push(`Class: ${report.filters.className}`);
  if (report.filters.level != null) filterParts.push(`Year: ${report.filters.level}`);
  if (report.filters.semester != null) filterParts.push(`Semester: ${report.filters.semester}`);
  if (report.filters.intakeLabel) filterParts.push(`Cohort: ${report.filters.intakeLabel}`);
  if (report.filters.startDate || report.filters.endDate) {
    const from = formatReportDateLabel(report.filters.startDate);
    const to = formatReportDateLabel(report.filters.endDate);
    if (from && to) filterParts.push(`Period: ${from} – ${to}`);
    else if (from) filterParts.push(`From: ${from}`);
    else if (to) filterParts.push(`Until: ${to}`);
  }
  filterParts.push(`Generated: ${formatReportDateLabel(report.generatedAt.slice(0, 10))}`);

  const data: (string | number)[][] = [
    [report.universityName || UNIVERSITY_NAME],
    [report.title],
    [filterParts.join(' | ')],
    [],
    ['No.', "Student's Name", 'Registration No.', 'Total Attended Classes', 'Total Late Classes', 'Total Missed Classes', 'Expected Attendance', 'Percentage'],
    ...report.students.map((row, index) => [
      index + 1,
      row.studentName,
      row.registrationNumber,
      row.totalAttendedClasses,
      row.totalLateClasses ?? 0,
      row.totalMissedClasses,
      row.expectedAttendance,
      `${row.percentage.toFixed(2)}%`,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const colCount = 8;

  ws['!cols'] = [
    { wch: 6 },
    { wch: 32 },
    { wch: 18 },
    { wch: 22 },
    { wch: 18 },
    { wch: 20 },
    { wch: 20 },
    { wch: 12 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Attendance Summary');
  const safeName = report.title.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 80);
  const defaultFilename = `${safeName}_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
}

function formatReportDateTime(iso: string): string {
  const d = new Date(iso);
  return isNaN(d.getTime())
    ? iso
    : d.toLocaleString('en-US', {
        day: 'numeric',
        month: 'short',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
}

export function exportWeeklyAttendanceMatrixReport(
  report: WeeklyAttendanceMatrixReport,
  options?: { generatedBy?: string; poweredBy?: string },
  filename?: string
): void {
  const generatedBy = options?.generatedBy?.trim() || '—';
  const poweredBy = options?.poweredBy?.trim() || 'KCU ERP System';
  const generatedAt = formatReportDateTime(report.generatedAt);
  const slots = report.slots;
  const colCount = 3 + slots.length + 2;

  const dayHeaderRow: (string | number)[] = ['', '', ''];
  const courseHeaderRow: (string | number)[] = ['Serial No.', 'Student Name', 'Registration No.'];
  const merges: XLSX.Range[] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
    { s: { r: 3, c: 0 }, e: { r: 3, c: colCount - 1 } },
  ];

  let col = 3;
  for (const group of report.dayGroups) {
    const span = group.slots.length;
    if (span > 0) {
      dayHeaderRow.push(group.dayLabel);
      for (let i = 1; i < span; i++) dayHeaderRow.push('');
      merges.push({ s: { r: 4, c: col }, e: { r: 4, c: col + span - 1 } });
      for (const slot of group.slots) {
        courseHeaderRow.push(slot.courseName);
      }
      col += span;
    }
  }
  dayHeaderRow.push('TOTALS', 'EXPECTED');
  courseHeaderRow.push('TOTALS', 'EXPECTED');

  const data: (string | number)[][] = [
    [report.universityName || UNIVERSITY_NAME],
    [report.title],
    [`Cohort: ${report.programIntakeLabel} | Week: ${report.weekRangeLabel}`],
    [],
    dayHeaderRow,
    courseHeaderRow,
    ...report.students.map((row) => {
      const line: (string | number)[] = [
        row.serialNo,
        row.studentName,
        row.registrationNumber,
      ];
      for (const slot of slots) {
        line.push(row.cells[slot.classId]?.value ?? 0);
      }
      line.push(row.totalAttended, row.expected);
      return line;
    }),
    [],
    [`Generated By: ${generatedBy}`],
    [`Powered By: ${poweredBy}`],
    [`Generated Date/Time: ${generatedAt}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 8 },
    { wch: 28 },
    { wch: 18 },
    ...slots.map(() => ({ wch: 14 })),
    { wch: 10 },
    { wch: 10 },
  ];
  ws['!merges'] = merges;

  const wb = XLSX.utils.book_new();
  const sheetName = report.programIntakeLabel.replace(/[\\/?*[\]]/g, '').slice(0, 31);
  XLSX.utils.book_append_sheet(wb, ws, sheetName || 'Weekly Attendance');
  const safeName = report.title.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 80);
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || `${safeName}_${formatDate(new Date())}.xlsx`);
}

export function exportCourseWiseAttendanceSummaryReport(
  report: CourseWiseAttendanceSummaryReport,
  options?: { generatedBy?: string; poweredBy?: string },
  filename?: string
): void {
  const filterParts: string[] = [];
  if (report.filters.schoolName) filterParts.push(`School: ${report.filters.schoolName}`);
  if (report.filters.programName) filterParts.push(`Programme: ${report.filters.programName}`);
  if (report.filters.level != null) filterParts.push(`Class/Year: ${report.filters.level}`);
  if (report.filters.semester != null) {
    const sem =
      report.filters.semester === 1
        ? 'Semester I'
        : report.filters.semester === 2
          ? 'Semester II'
          : `Semester ${report.filters.semester}`;
    filterParts.push(sem);
  }
  if (report.filters.academicYear != null) filterParts.push(`Academic Year: ${report.filters.academicYear}`);
  if (report.filters.intakeLabel) filterParts.push(`Cohort: ${report.filters.intakeLabel}`);
  if (report.filters.courseName) filterParts.push(`Course: ${report.filters.courseName}`);
  if (report.filters.className) filterParts.push(`Class: ${report.filters.className}`);
  if (report.filters.startDate || report.filters.endDate) {
    const from = formatReportDateLabel(report.filters.startDate);
    const to = formatReportDateLabel(report.filters.endDate);
    if (from && to) filterParts.push(`Period: ${from} – ${to}`);
    else if (from) filterParts.push(`From: ${from}`);
    else if (to) filterParts.push(`Until: ${to}`);
  }

  const generatedBy = options?.generatedBy?.trim() || '—';
  const poweredBy = options?.poweredBy?.trim() || 'KCU ERP System';
  const generatedAt = formatReportDateTime(report.generatedAt);

  const data: (string | number)[][] = [
    [report.universityName || UNIVERSITY_NAME],
    [report.title],
    [filterParts.join(' | ')],
    [],
    [
      'Serial No.',
      'Registration No.',
      'Student Name',
      'Course',
      'Total Sessions',
      'Total Presents',
      'Total Absents',
      'Present Percentage',
      'Absent Percentage',
    ],
    ...report.rows.map((row) => [
      row.serialNo,
      row.registrationNumber,
      row.studentName,
      row.course,
      row.totalSessions,
      row.totalPresents,
      row.totalAbsents,
      `${row.presentPercentage.toFixed(2)}%`,
      `${row.absentPercentage.toFixed(2)}%`,
    ]),
    [],
    [`Generated By: ${generatedBy}`],
    [`Powered By: ${poweredBy}`],
    [`Generated Date/Time: ${generatedAt}`],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  const colCount = 9;
  ws['!cols'] = [
    { wch: 8 },
    { wch: 18 },
    { wch: 28 },
    { wch: 32 },
    { wch: 14 },
    { wch: 14 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Course-wise Attendance');
  const safeName = report.title.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 80);
  const defaultFilename = `${safeName}_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
}

/**
 * Export Lecturer Summary Report to Excel
 * School name row, then headers aligned with School Summary breakdown fields
 */
export function exportLecturerSummaryReport(
  report: QALecturerSummaryReport,
  filename?: string
): void {
  const headers = [
    "LECTURER'S NAME",
    'CLASS',
    'COURSE UNIT',
    'NO. TAUGHT',
    'NO. UNTAIGHT',
    'MISSED BY LECTURER',
    'MISSED BY STUDENTS',
    'OTHER PROG. & HOLIDAYS',
    'ASSIGNMENT',
    'SDL',
    'SUBSTITUTED',
  ];
  const data: (string | number)[][] = [[report.school], headers];

  report.lecturers.forEach((lecturer, index) => {
    data.push([
      lecturer.lecturerName,
      lecturer.class,
      lecturer.courseUnit,
      lecturer.noTaught,
      lecturer.noUntaught ?? 0,
      lecturer.missedByLecturer ?? lecturer.noMissedByLecturers,
      lecturer.missedByStudents ?? 0,
      lecturer.missedOtherProgramsHolidays ?? 0,
      lecturer.assignment ?? 0,
      lecturer.noSdl ?? 0,
      lecturer.noSubstituted ?? 0,
    ]);

    if (index < report.lecturers.length - 1) {
      data.push(Array(headers.length).fill(''));
    }
  });

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 30 },
    { wch: 35 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, report.school);

  const defaultFilename = `QA_Lecturer_Summary_${report.school.replace(/\s+/g, '_')}_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;

  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

export function exportLecturerSummaryReports(
  reports: QALecturerSummaryReport[],
  filename?: string
): void {
  if (reports.length === 0) return;
  if (reports.length === 1) {
    exportLecturerSummaryReport(reports[0], filename);
    return;
  }

  const wb = XLSX.utils.book_new();
  reports.forEach((report) => {
    const headers = [
      "LECTURER'S NAME",
      'CLASS',
      'COURSE UNIT',
      'NO. TAUGHT',
      'NO. UNTAIGHT',
      'MISSED BY LECTURER',
      'MISSED BY STUDENTS',
      'OTHER PROG. & HOLIDAYS',
      'ASSIGNMENT',
      'SDL',
      'SUBSTITUTED',
    ];
    const data: (string | number)[][] = [
      [report.school],
      headers,
    ];

    report.lecturers.forEach((lecturer, index) => {
      data.push([
        lecturer.lecturerName,
        lecturer.class,
        lecturer.courseUnit,
        lecturer.noTaught,
        lecturer.noUntaught ?? 0,
        lecturer.missedByLecturer ?? lecturer.noMissedByLecturers,
        lecturer.missedByStudents ?? 0,
        lecturer.missedOtherProgramsHolidays ?? 0,
        lecturer.assignment ?? 0,
        lecturer.noSdl ?? 0,
        lecturer.noSubstituted ?? 0,
      ]);
      if (index < report.lecturers.length - 1) {
        data.push(Array(headers.length).fill(''));
      }
    });

    const ws = XLSX.utils.aoa_to_sheet(data);
    ws['!cols'] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 35 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, ws, report.school.substring(0, 31));
  });

  const defaultFilename = `QA_Lecturer_Summary_${formatDate(new Date())}.xlsx`;
  const finalFilename = filename || defaultFilename;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, finalFilename);
}

export type LecturerSummaryTableRow = QALecturerSummary & { school: string };

function buildLecturerSummaryFilterLine(options?: {
  showSchool?: boolean;
  schoolFilter?: string;
  departmentFilter?: string;
  classFilter?: string;
  courseUnitFilter?: string;
  lecturerFilter?: string;
  dateFrom?: string | null;
  dateTo?: string | null;
  dateRangeLabel?: string;
}): string {
  const parts: string[] = [];
  if (options?.dateFrom || options?.dateTo) {
    const from = formatReportDateLabel(options?.dateFrom ?? null);
    const to = formatReportDateLabel(options?.dateTo ?? null);
    if (from && to) parts.push(`Period: ${from} – ${to}`);
    else if (from) parts.push(`From: ${from}`);
    else if (to) parts.push(`Until: ${to}`);
  } else if (options?.dateRangeLabel) {
    parts.push(`Period: ${options.dateRangeLabel}`);
  }
  if (options?.schoolFilter && options.schoolFilter !== 'All') {
    parts.push(`School: ${options.schoolFilter}`);
  }
  if (options?.departmentFilter && options.departmentFilter !== 'All') {
    parts.push(`Department: ${options.departmentFilter}`);
  }
  if (options?.classFilter && options.classFilter !== 'All') {
    parts.push(`Class: ${options.classFilter}`);
  }
  if (options?.courseUnitFilter && options.courseUnitFilter !== 'All') {
    parts.push(`Course unit: ${options.courseUnitFilter}`);
  }
  if (options?.lecturerFilter && options.lecturerFilter !== 'All') {
    parts.push(`Lecturer: ${options.lecturerFilter}`);
  }
  parts.push(`Generated: ${formatDate(new Date())}`);
  return parts.join(' | ');
}

export function exportLecturerSummaryTableView(
  rows: LecturerSummaryTableRow[],
  options?: {
    showSchool?: boolean;
    schoolFilter?: string;
    departmentFilter?: string;
    classFilter?: string;
    courseUnitFilter?: string;
    lecturerFilter?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
    dateRangeLabel?: string;
  },
  filename?: string
): void {
  const showSchool = options?.showSchool ?? true;
  const headers = [
    ...(showSchool ? ['SCHOOL'] : []),
    "LECTURER'S NAME",
    'CLASS',
    'COURSE UNIT',
    'NO. TAUGHT',
    'NO. UNTAIGHT',
    'MISSED BY LECTURER',
    'MISSED BY STUDENTS',
    'OTHER PROG. & HOLIDAYS',
    'ASSIGNMENT',
    'SDL',
    'SUBSTITUTED',
  ];
  const colCount = headers.length;
  const data: (string | number)[][] = [
    [UNIVERSITY_NAME],
    ['Lecturer Summary Report'],
    [buildLecturerSummaryFilterLine(options)],
    [],
    headers,
    ...rows.map((row) => [
      ...(showSchool ? [row.school] : []),
      row.lecturerName,
      row.class,
      row.courseUnit,
      row.noTaught,
      row.noUntaught ?? 0,
      row.missedByLecturer ?? row.noMissedByLecturers,
      row.missedByStudents ?? 0,
      row.missedOtherProgramsHolidays ?? 0,
      row.assignment ?? 0,
      row.noSdl ?? 0,
      row.noSubstituted ?? 0,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    ...(showSchool ? [{ wch: 24 }] : []),
    { wch: 25 },
    { wch: 30 },
    { wch: 35 },
    { wch: 12 },
    { wch: 14 },
    { wch: 18 },
    { wch: 18 },
    { wch: 22 },
    { wch: 12 },
    { wch: 8 },
    { wch: 12 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lecturer Summary');
  const deptPart =
    options?.departmentFilter && options.departmentFilter !== 'All'
      ? `_${options.departmentFilter.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 40)}`
      : '';
  const defaultFilename = `QA_Lecturer_Summary${deptPart}_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
}

export function exportCourseUnitSummaryReport(
  rows: QACourseUnitSummary[],
  options?: {
    schoolFilter?: string;
    departmentFilter?: string;
    classFilter?: string;
    courseUnitFilter?: string;
    lecturerFilter?: string;
    dateFrom?: string | null;
    dateTo?: string | null;
    dateRangeLabel?: string;
  },
  filename?: string
): void {
  const headers = [
    "LECTURER'S NAME",
    'CLASS',
    'COURSE UNIT',
    'EXPECTED LECTURES',
    'NO. TAUGHT',
    'PHYSICAL CLASSES',
    'ONLINE LECTURES',
    'No. OF SDL',
    'LECTURER GAVE ASSIGNMENT IN LECTURE TIME',
    "NO. MISSED BY LECTURER'S",
    'NO. MISSED BY STUDENTS',
    'NO. MISSED DUE TO OTHER PROGRAMS & PUBLIC HOLIDAYS',
    'TOTAL LEARNING ACTIVITY',
    'TOTAL UNTAUGHT',
    'TOTAL MISSED',
  ];
  const colCount = headers.length;
  const data: (string | number)[][] = [
    [UNIVERSITY_NAME],
    ['Course Unit Summary Report'],
    [buildLecturerSummaryFilterLine(options)],
    [],
    headers,
    ...rows.map((row) => [
      row.lecturerName,
      row.class,
      row.courseUnit,
      row.expectedLectures,
      row.noTaught,
      row.physicalClasses,
      row.onlineLectures,
      row.noSdl,
      row.assignment,
      row.missedByLecturer,
      row.missedByStudents,
      row.missedOtherProgramsHolidays,
      row.totalLearningActivity,
      row.totalUntaught,
      row.totalMissed,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 28 },
    { wch: 28 },
    { wch: 28 },
    { wch: 16 },
    { wch: 12 },
    { wch: 16 },
    { wch: 16 },
    { wch: 12 },
    { wch: 28 },
    { wch: 18 },
    { wch: 18 },
    { wch: 28 },
    { wch: 18 },
    { wch: 14 },
    { wch: 14 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Course Unit Summary');
  const defaultFilename = `QA_Course_Unit_Summary_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
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
    [
      'SCHOOL',
      'TOTAL NO. TAUGHT',
      'NO. UNTAIGHT',
      'MISSED BY LECTURER',
      'MISSED BY STUDENTS',
      'OTHER PROGRAMS & HOLIDAYS',
      'ASSIGNMENT',
      'SDL',
      'SUBSTITUTED',
    ],
    ...summaries.map((summary) => [
      summary.school,
      summary.totalNoTaught,
      summary.noUntaught,
      summary.missedByLecturer ?? 0,
      summary.missedByStudents ?? 0,
      summary.missedOtherProgramsHolidays ?? 0,
      summary.assignment ?? 0,
      summary.noSdl ?? 0,
      summary.noSubstituted ?? 0,
    ]),
    [
      'TOTAL',
      summaries.reduce((sum, s) => sum + s.totalNoTaught, 0),
      summaries.reduce((sum, s) => sum + s.noUntaught, 0),
      summaries.reduce((sum, s) => sum + (s.missedByLecturer ?? 0), 0),
      summaries.reduce((sum, s) => sum + (s.missedByStudents ?? 0), 0),
      summaries.reduce((sum, s) => sum + (s.missedOtherProgramsHolidays ?? 0), 0),
      summaries.reduce((sum, s) => sum + (s.assignment ?? 0), 0),
      summaries.reduce((sum, s) => sum + (s.noSdl ?? 0), 0),
      summaries.reduce((sum, s) => sum + (s.noSubstituted ?? 0), 0),
    ],
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);

  ws['!cols'] = [
    { wch: 25 },
    { wch: 18 },
    { wch: 15 },
    { wch: 20 },
    { wch: 20 },
    { wch: 28 },
    { wch: 14 },
    { wch: 10 },
    { wch: 14 },
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

  // Sheet 2: Lecturer Summary - one sheet per school
  lecturerReports.forEach(report => {
    const headers = [
      "LECTURER'S NAME",
      'CLASS',
      'COURSE UNIT',
      'NO. TAUGHT',
      'NO. UNTAIGHT',
      'MISSED BY LECTURER',
      'MISSED BY STUDENTS',
      'OTHER PROG. & HOLIDAYS',
      'ASSIGNMENT',
      'SDL',
      'SUBSTITUTED',
    ];
    const lecturerData: (string | number)[][] = [
      [report.school],
      headers,
    ];
    
    report.lecturers.forEach((lecturer, index) => {
      lecturerData.push([
        lecturer.lecturerName,
        lecturer.class,
        lecturer.courseUnit,
        lecturer.noTaught,
        lecturer.noUntaught ?? 0,
        lecturer.missedByLecturer ?? lecturer.noMissedByLecturers,
        lecturer.missedByStudents ?? 0,
        lecturer.missedOtherProgramsHolidays ?? 0,
        lecturer.assignment ?? 0,
        lecturer.noSdl ?? 0,
        lecturer.noSubstituted ?? 0,
      ]);
      if (index < report.lecturers.length - 1) {
        lecturerData.push(Array(headers.length).fill(''));
      }
    });
    
    const lecturerSheet = XLSX.utils.aoa_to_sheet(lecturerData);
    lecturerSheet['!cols'] = [
      { wch: 25 },
      { wch: 30 },
      { wch: 35 },
      { wch: 12 },
      { wch: 14 },
      { wch: 18 },
      { wch: 18 },
      { wch: 22 },
      { wch: 12 },
      { wch: 8 },
      { wch: 12 },
    ];
    XLSX.utils.book_append_sheet(wb, lecturerSheet, report.school.substring(0, 31)); // Excel sheet name limit
  });

  const lectureData = [
    ['DATE', 'LECTURER\'S NAME', 'CLASS', 'COURSE UNIT', 'TIME FOR STARTING', 'TIME OUT FOR ENDING', 'CHECK-IN TIME', 'CHECK-OUT TIME', 'DURATION', 'TIME LOST', 'STATUS', 'COMMENT', 'SUBSTITUTE LECTURER'],
    ...lectureRecords.map(r => [
      formatDateForCSV(r.date),
      r.lecturerName,
      r.class,
      r.courseUnit,
      formatClockTimeForDisplay(r.timeForStarting),
      formatClockTimeForDisplay(r.timeOutForEnding),
      formatClockTimeForDisplay(r.checkInTime),
      formatClockTimeForDisplay(r.checkOutTime),
      formatClockTimeForDisplay(r.duration),
      formatClockTimeForDisplay(r.timeLost),
      r.comment,
      r.remarks || '',
      r.substituteLecturerName || '',
    ]),
  ];
  const lectureSheet = XLSX.utils.aoa_to_sheet(lectureData);
  lectureSheet['!cols'] = [{ wch: 15 }, { wch: 25 }, { wch: 30 }, { wch: 35 }, { wch: 18 }, { wch: 18 }, { wch: 15 }, { wch: 15 }, { wch: 12 }, { wch: 12 }, { wch: 20 }, { wch: 40 }, { wch: 25 }];
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
 * Accepts 24hr ("14:30", "14:30:00") or 12hr ("2:30 PM", "02:30:00 AM") input from
 * imported spreadsheets and always normalizes to 24hr "HH:MM:SS" for storage, so
 * records entered on different devices/locales never end up mixed formats.
 */
function formatTime(time: any): string {
  if (!time) return '00:00:00';
  if (typeof time === 'string') {
    const normalized = normalizeClockTime(time, { withSeconds: true });
    if (normalized) return normalized;
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
    const durationMinutes = (clockTimeToMinutes(endTime) ?? 0) - (clockTimeToMinutes(startTime) ?? 0);
    const hours = Math.floor(durationMinutes / 60);
    const minutes = durationMinutes % 60;
    const duration = `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:00`;
    
    // Map status to comment
    const statusToComment = mapImportStatusToComment;
    
    return {
      date: record.scheduledDate,
      lecturerName: record.lecturerName,
      class: record.courseCode || 'N/A',
      courseUnit: record.courseName,
      timeForStarting: startTime,
      timeOutForEnding: endTime,
      duration: duration,
      timeLost: '0',
      comment: statusToComment(record.status),
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
 * Columns: name, email, studentId, password.
 */
export function downloadStudentImportTemplateExcel(): void {
  const data = [
    ['name', 'email', 'studentId', 'password'],
    ['John Doe', 'john.doe@student.kcu.ac.ug', '2100101', 'TempPassword123!'],
    ['Jane Smith', 'jane.smith@student.kcu.ac.ug', '2100102', 'TempPassword123!'],
  ];
  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 25 },
    { wch: 35 },
    { wch: 15 },
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

export type LecturerPerformanceTableRow = {
  id: string;
  name: string;
  school: string;
  department: string;
  taught: number;
  missed: number;
  rate: number;
};

export type LecturerStatsDetailExport = {
  lecturer: {
    id: string;
    name: string;
    staffNumber: string | null;
    email: string | null;
    phone: string | null;
    role: string | null;
    school: string;
    department: string;
  };
  summary: {
    totalRecords: number;
    taught: number;
    missedByLecturer: number;
    otherOutcomes: number;
    rate: number;
    rateBasis: string;
    byComment: Record<string, number>;
  };
  byClass: Array<{
    className: string;
    courseUnit: string;
    taught: number;
    missedByLecturer: number;
    total: number;
  }>;
  records: Array<{
    id: string;
    date: string | null;
    classId: string | null;
    className: string;
    courseUnit: string;
    comment: string;
    status: string | null;
    checkInTime: string | null;
    checkOutTime: string | null;
    timeForStarting: string | null;
    timeOutForEnding: string | null;
    duration: string | null;
    timeLost: string | null;
    lessonTimeout: string | null;
    recordedBy: string | null;
    recordedAt: string | null;
    substituteLecturerId: string | null;
    substituteLecturerName: string | null;
  }>;
  dateFrom: string | null;
  dateTo: string | null;
};

function buildLecturerPerformanceFilterLine(options?: {
  dateFrom?: string | null;
  dateTo?: string | null;
  dateRangeLabel?: string;
  schoolFilter?: string;
  departmentFilter?: string;
  rateFilter?: string;
  searchQuery?: string;
}): string {
  const parts: string[] = [];
  if (options?.dateFrom || options?.dateTo) {
    const from = formatReportDateLabel(options.dateFrom ?? null);
    const to = formatReportDateLabel(options.dateTo ?? null);
    if (from && to) parts.push(`Period: ${from} – ${to}`);
    else if (from) parts.push(`From: ${from}`);
    else if (to) parts.push(`Until: ${to}`);
  } else if (options?.dateRangeLabel) {
    parts.push(`Period: ${options.dateRangeLabel}`);
  }
  if (options?.schoolFilter && options.schoolFilter !== 'all') {
    parts.push(`School: ${options.schoolFilter}`);
  }
  if (options?.departmentFilter && options.departmentFilter !== 'all') {
    parts.push(`Department: ${options.departmentFilter}`);
  }
  if (options?.rateFilter && options.rateFilter !== 'all') {
    parts.push(
      options.rateFilter === '90_plus' ? 'Teaching rate: 90% and above' : 'Teaching rate: below 90%'
    );
  }
  if (options?.searchQuery?.trim()) {
    parts.push(`Search: ${options.searchQuery.trim()}`);
  }
  parts.push(`Generated: ${formatDate(new Date())}`);
  return parts.join(' | ');
}

export function exportLecturerPerformanceTable(
  rows: LecturerPerformanceTableRow[],
  options?: {
    dateFrom?: string | null;
    dateTo?: string | null;
    dateRangeLabel?: string;
    schoolFilter?: string;
    departmentFilter?: string;
    rateFilter?: string;
    searchQuery?: string;
  },
  filename?: string
): void {
  const colCount = 7;
  const data: (string | number)[][] = [
    [UNIVERSITY_NAME],
    ['Lecturer Performance Report'],
    [buildLecturerPerformanceFilterLine(options)],
    [],
    ['No.', 'Lecturer Name', 'School', 'Department', 'Taught', 'Missed', 'Rate (%)'],
    ...rows.map((row, index) => [
      index + 1,
      row.name,
      row.school,
      row.department,
      row.taught,
      row.missed,
      `${row.rate.toFixed(1)}%`,
    ]),
  ];

  const ws = XLSX.utils.aoa_to_sheet(data);
  ws['!cols'] = [
    { wch: 6 },
    { wch: 28 },
    { wch: 24 },
    { wch: 24 },
    { wch: 10 },
    { wch: 10 },
    { wch: 12 },
  ];
  ws['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: colCount - 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: colCount - 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: colCount - 1 } },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Lecturer Performance');
  const defaultFilename = `Lecturer_Performance_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
}

export function exportLecturerStatsDetailReport(
  detail: LecturerStatsDetailExport,
  commentLabel: (comment: string) => string,
  filename?: string
): void {
  const period =
    detail.dateFrom && detail.dateTo
      ? `${formatReportDateLabel(detail.dateFrom)} – ${formatReportDateLabel(detail.dateTo)}`
      : 'All time';

  const summaryData: (string | number)[][] = [
    [UNIVERSITY_NAME],
    ['Lecturer Performance Details'],
    [`${detail.lecturer.name} | ${period} | Generated: ${formatDate(new Date())}`],
    [],
    ['Field', 'Value'],
    ['Name', detail.lecturer.name],
    ['Staff number', detail.lecturer.staffNumber || '—'],
    ['Email', detail.lecturer.email || '—'],
    ['Phone', detail.lecturer.phone || '—'],
    ['Role', detail.lecturer.role || '—'],
    ['School', detail.lecturer.school],
    ['Department', detail.lecturer.department],
    [],
    ['Metric', 'Value'],
    ['Total records', detail.summary.totalRecords],
    ['Taught', detail.summary.taught],
    ['Missed by lecturer', detail.summary.missedByLecturer],
    ['Other outcomes', detail.summary.otherOutcomes],
    ['Teaching rate (%)', `${detail.summary.rate.toFixed(1)}%`],
    ['Rate basis', detail.summary.rateBasis || '—'],
    [],
    ['Outcome', 'Count'],
    ...Object.entries(detail.summary.byComment)
      .sort((a, b) => b[1] - a[1])
      .map(([comment, count]) => [commentLabel(comment), count]),
  ];

  const summaryWs = XLSX.utils.aoa_to_sheet(summaryData);
  summaryWs['!cols'] = [{ wch: 28 }, { wch: 40 }];
  summaryWs['!merges'] = [
    { s: { r: 0, c: 0 }, e: { r: 0, c: 1 } },
    { s: { r: 1, c: 0 }, e: { r: 1, c: 1 } },
    { s: { r: 2, c: 0 }, e: { r: 2, c: 1 } },
  ];

  const byClassData: (string | number)[][] = [
    ['Class', 'Course unit', 'Taught', 'Missed by lecturer', 'Total'],
    ...detail.byClass.map((row) => [
      row.className,
      row.courseUnit,
      row.taught,
      row.missedByLecturer,
      row.total,
    ]),
  ];
  const byClassWs = XLSX.utils.aoa_to_sheet(byClassData);
  byClassWs['!cols'] = [{ wch: 24 }, { wch: 32 }, { wch: 10 }, { wch: 18 }, { wch: 10 }];

  const recordsData: (string | number)[][] = [
    [
      'Date',
      'Class',
      'Course unit',
      'Outcome',
      'Status',
      'Scheduled start',
      'Scheduled end',
      'Check-in',
      'Check-out',
      'Duration',
      'Time lost',
      'Substitute',
      'Recorded by',
      'Recorded at',
    ],
    ...detail.records.map((row) => [
      row.date || '—',
      row.className,
      row.courseUnit,
      commentLabel(row.comment),
      row.status || '—',
      row.timeForStarting || '—',
      row.timeOutForEnding || '—',
      row.checkInTime || '—',
      row.checkOutTime || '—',
      row.duration || '—',
      row.timeLost || '—',
      row.substituteLecturerName || '—',
      row.recordedBy || '—',
      row.recordedAt || '—',
    ]),
  ];
  const recordsWs = XLSX.utils.aoa_to_sheet(recordsData);
  recordsWs['!cols'] = [
    { wch: 12 },
    { wch: 20 },
    { wch: 28 },
    { wch: 18 },
    { wch: 12 },
    { wch: 12 },
    { wch: 12 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 10 },
    { wch: 20 },
    { wch: 18 },
    { wch: 18 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, summaryWs, 'Summary');
  XLSX.utils.book_append_sheet(wb, byClassWs, 'By Class');
  XLSX.utils.book_append_sheet(wb, recordsWs, 'Lecture Records');

  const safeName = detail.lecturer.name.replace(/[<>:"/\\|?*]+/g, '_').slice(0, 40);
  const defaultFilename = `Lecturer_Details_${safeName}_${formatDate(new Date())}.xlsx`;
  const excelBuffer = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
  const blob = new Blob([excelBuffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
  saveAs(blob, filename || defaultFilename);
}
