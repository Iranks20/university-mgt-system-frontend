import {
  computeCourseWiseAttendanceFromCounts,
  sortCourseWiseAttendanceRows,
  sortDailyGridStudents,
  tallyAttendanceStatuses,
} from '@/lib/attendance-metrics';

describe('attendance-metrics (frontend)', () => {
  it('sorts daily grid students by name and renumbers serial', () => {
    const rows = sortDailyGridStudents(
      [
        { studentId: 'b', studentName: 'Zulu', registrationNumber: 'R2', serialNo: 1 },
        { studentId: 'a', studentName: 'Alpha', registrationNumber: 'R1', serialNo: 2 },
      ],
      'studentName',
      'asc'
    );
    expect(rows.map((r) => r.studentName)).toEqual(['Alpha', 'Zulu']);
    expect(rows.map((r) => r.serialNo)).toEqual([1, 2]);
  });

  it('sorts daily grid students by registration number descending', () => {
    const rows = sortDailyGridStudents(
      [
        { studentId: 'a', studentName: 'A', registrationNumber: '100', serialNo: 1 },
        { studentId: 'b', studentName: 'B', registrationNumber: '200', serialNo: 2 },
      ],
      'registrationNumber',
      'desc'
    );
    expect(rows.map((r) => r.registrationNumber)).toEqual(['200', '100']);
  });

  it('computes course-wise row metrics with matching presents and absents', () => {
    const counts = tallyAttendanceStatuses([
      { status: 'Present' },
      { status: 'Late' },
      { status: 'Absent' },
    ]);
    const row = computeCourseWiseAttendanceFromCounts(counts);
    expect(row.totalSessions).toBe(3);
    expect(row.totalPresents).toBe(2);
    expect(row.totalAbsents).toBe(1);
    expect(row.totalPresents + row.totalAbsents).toBe(row.totalSessions);
  });

  it('sorts course-wise rows by student then course', () => {
    const rows = sortCourseWiseAttendanceRows(
      [
        {
          serialNo: 1,
          registrationNumber: 'R1',
          studentName: 'Beta',
          course: 'Zoology',
          courseId: 'c2',
          courseCode: 'Z',
          totalSessions: 1,
          totalPresents: 1,
          totalAbsents: 0,
          presentPercentage: 100,
          absentPercentage: 0,
        },
        {
          serialNo: 2,
          registrationNumber: 'R2',
          studentName: 'Alpha',
          course: 'Anatomy',
          courseId: 'c1',
          courseCode: 'A',
          totalSessions: 1,
          totalPresents: 1,
          totalAbsents: 0,
          presentPercentage: 100,
          absentPercentage: 0,
        },
      ],
      'asc'
    );
    expect(rows[0].studentName).toBe('Alpha');
    expect(rows[0].serialNo).toBe(1);
  });
});
