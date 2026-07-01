export const UNTAUGHT_COMMENT_VALUES = [
  'MISSED_BY_LECTURER',
  'MISSED_BY_STUDENTS',
  'MISSED_OTHER_PROGRAMS_HOLIDAYS',
  'ASSIGNMENT',
  'SDL',
] as const;

export const TAUGHT_COMMENT_VALUES = ['TAUGHT', 'SUBSTITUTED', 'COMPENSATION'] as const;

export const PENDING_COMMENT = 'PENDING';

export const RECORDABLE_LECTURE_COMMENT_OPTIONS = [
  PENDING_COMMENT,
  ...TAUGHT_COMMENT_VALUES,
  ...UNTAUGHT_COMMENT_VALUES,
] as const;

export const LECTURE_COMMENT_LABELS: Record<string, string> = {
  PENDING: 'Pending (awaiting QA)',
  TAUGHT: 'TAUGHT',
  SUBSTITUTED: 'SUBSTITUTED',
  COMPENSATION: 'COMPENSATION',
  MISSED_BY_LECTURER: 'MISSED BY LECTURER',
  MISSED_BY_STUDENTS: 'MISSED BY STUDENTS',
  MISSED_OTHER_PROGRAMS_HOLIDAYS: 'MISSED DUE TO OTHER PROGRAMS & PUBLIC HOLIDAYS',
  ASSIGNMENT: 'ASSIGNMENT',
  SDL: 'SDL',
  UNTAUGHT: 'UNTAUGHT',
  CANCELLED: 'CANCELLED',
  MEETING: 'MEETING',
  STUDENTS_ORIENTATION: 'STUDENTS ORIENTATION',
};

export const LEGACY_LECTURE_COMMENT_MAP: Record<string, string> = {
  UNTAUGHT: 'MISSED_BY_LECTURER',
  CANCELLED: 'MISSED_OTHER_PROGRAMS_HOLIDAYS',
  MEETING: 'MISSED_OTHER_PROGRAMS_HOLIDAYS',
  STUDENTS_ORIENTATION: 'MISSED_BY_STUDENTS',
};

export function normalizeLectureComment(comment: string | null | undefined): string {
  const normalized = (comment || 'TAUGHT').trim().toUpperCase().replace(/\s+/g, '_');
  return LEGACY_LECTURE_COMMENT_MAP[normalized] || normalized;
}

export function lectureCommentLabel(comment: string | null | undefined): string {
  const normalized = normalizeLectureComment(comment);
  return LECTURE_COMMENT_LABELS[normalized] ?? normalized;
}

export function isLectureTaught(comment: string | null | undefined): boolean {
  const normalized = normalizeLectureComment(comment);
  return (TAUGHT_COMMENT_VALUES as readonly string[]).includes(normalized);
}

export function isLectureUntaught(comment: string | null | undefined): boolean {
  const normalized = normalizeLectureComment(comment);
  return (UNTAUGHT_COMMENT_VALUES as readonly string[]).includes(normalized);
}

export function isLecturePending(comment: string | null | undefined): boolean {
  return normalizeLectureComment(comment) === PENDING_COMMENT;
}

export function isLectureMissedByLecturer(comment: string | null | undefined): boolean {
  return normalizeLectureComment(comment) === 'MISSED_BY_LECTURER';
}

export function mapImportStatusToComment(status: string): string {
  const upper = status.trim().toUpperCase().replace(/\s+/g, '_');
  const direct: Record<string, string> = {
    PRESENT: 'TAUGHT',
    ABSENT: 'MISSED_BY_LECTURER',
    LATE: 'TAUGHT',
    CANCELLED: 'MISSED_BY_LECTURER',
  };
  if (direct[upper]) return direct[upper];
  return normalizeLectureComment(upper);
}
