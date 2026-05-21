export const ATTENDANCE_STATUSES = ['Present', 'Absent', 'Late', 'Excused'] as const;

export type AttendanceStatus = (typeof ATTENDANCE_STATUSES)[number];

export interface AttendanceStatusCounts {
  present: number;
  late: number;
  absent: number;
  excused: number;
}

export interface AttendanceMetrics {
  attended: number;
  missed: number;
  expected: number;
  percentage: number;
}

export function emptyAttendanceCounts(): AttendanceStatusCounts {
  return { present: 0, late: 0, absent: 0, excused: 0 };
}

export function applyAttendanceStatus(
  counts: AttendanceStatusCounts,
  status: string
): AttendanceStatusCounts {
  if (status === 'Present') counts.present += 1;
  else if (status === 'Late') counts.late += 1;
  else if (status === 'Absent') counts.absent += 1;
  else if (status === 'Excused') counts.excused += 1;
  return counts;
}

export function tallyAttendanceStatuses(
  records: ReadonlyArray<{ status: string }>
): AttendanceStatusCounts {
  const counts = emptyAttendanceCounts();
  for (const record of records) {
    applyAttendanceStatus(counts, record.status);
  }
  return counts;
}

export function attendancePercentage(
  attended: number,
  expected: number,
  decimalPlaces: 0 | 1 | 2 = 2
): number {
  if (expected <= 0) return 0;
  const raw = (attended / expected) * 100;
  if (decimalPlaces === 0) return Math.round(raw);
  if (decimalPlaces === 1) return Math.round(raw * 10) / 10;
  return Math.round(raw * 100) / 100;
}

export function computeAttendanceMetrics(
  counts: AttendanceStatusCounts,
  options?: { percentageDecimalPlaces?: 0 | 1 | 2 }
): AttendanceMetrics {
  const attended = counts.present + 0.5 * counts.late;
  const missed = counts.absent;
  const expected = counts.present + counts.late + counts.absent;
  const percentage = attendancePercentage(
    attended,
    expected,
    options?.percentageDecimalPlaces ?? 2
  );
  return { attended, missed, expected, percentage };
}

export function computeAttendanceFromRecords(
  records: ReadonlyArray<{ status: string }>,
  options?: { percentageDecimalPlaces?: 0 | 1 | 2 }
): AttendanceMetrics & { counts: AttendanceStatusCounts } {
  const counts = tallyAttendanceStatuses(records);
  const metrics = computeAttendanceMetrics(counts, options);
  return { ...metrics, counts };
}

export function formatWeightedAttendedCount(value: number): string {
  return Number.isInteger(value) ? String(value) : value.toFixed(1);
}

export interface CourseWiseAttendanceCounts {
  totalSessions: number;
  totalPresents: number;
  totalAbsents: number;
  presentPercentage: number;
  absentPercentage: number;
}

export type CourseWiseRowSortDirection = 'asc' | 'desc';

export type StudentSortField = 'studentName' | 'registrationNumber';
export type StudentSortDirection = 'asc' | 'desc';

export function sortDailyGridStudents<
  T extends { studentId: string; studentName: string; registrationNumber: string; serialNo: number },
>(students: T[], field: StudentSortField, direction: StudentSortDirection): T[] {
  const sorted = [...students].sort((a, b) => {
    const aVal = field === 'studentName' ? a.studentName : a.registrationNumber;
    const bVal = field === 'studentName' ? b.studentName : b.registrationNumber;
    const cmp = aVal.localeCompare(bVal, undefined, { sensitivity: 'base' });
    if (cmp !== 0) return direction === 'asc' ? cmp : -cmp;
    const tieField = field === 'studentName' ? 'registrationNumber' : 'studentName';
    const aTie = tieField === 'studentName' ? a.studentName : a.registrationNumber;
    const bTie = tieField === 'studentName' ? b.studentName : b.registrationNumber;
    return aTie.localeCompare(bTie, undefined, { sensitivity: 'base' });
  });
  return sorted.map((row, index) => ({ ...row, serialNo: index + 1 }));
}

export function sortCourseWiseAttendanceRows<
  T extends {
    serialNo: number;
    registrationNumber: string;
    studentName: string;
    course: string;
  },
>(rows: ReadonlyArray<T>, direction: CourseWiseRowSortDirection): T[] {
  const sorted = [...rows].sort((a, b) => {
    const nameCmp = a.studentName.localeCompare(b.studentName, undefined, {
      sensitivity: 'base',
    });
    if (nameCmp !== 0) return direction === 'asc' ? nameCmp : -nameCmp;
    const regCmp = a.registrationNumber.localeCompare(b.registrationNumber, undefined, {
      sensitivity: 'base',
    });
    if (regCmp !== 0) return regCmp;
    return a.course.localeCompare(b.course, undefined, { sensitivity: 'base' });
  });
  return sorted.map((row, index) => ({ ...row, serialNo: index + 1 }));
}

export function computeCourseWiseAttendanceFromCounts(
  counts: AttendanceStatusCounts,
  options?: { percentageDecimalPlaces?: 0 | 1 | 2 }
): CourseWiseAttendanceCounts {
  const totalSessions = counts.present + counts.late + counts.absent;
  const totalPresents = counts.present + counts.late;
  const totalAbsents = counts.absent;
  const decimalPlaces = options?.percentageDecimalPlaces ?? 2;
  return {
    totalSessions,
    totalPresents,
    totalAbsents,
    presentPercentage: attendancePercentage(totalPresents, totalSessions, decimalPlaces),
    absentPercentage: attendancePercentage(totalAbsents, totalSessions, decimalPlaces),
  };
}
