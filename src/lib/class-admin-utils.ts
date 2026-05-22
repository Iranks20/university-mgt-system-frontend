import { staffService, studentService } from '@/services';

export type LecturerOption = { id: string; name: string };

export type EnrollCandidateRow = {
  id: string;
  name: string;
  studentId: string;
  email: string;
};

export function extractEnrolledStudentIdsFromClassEnrollments(enrollments: unknown[]): string[] {
  const rows = Array.isArray(enrollments) ? enrollments : [];
  const ids: string[] = [];
  for (const row of rows) {
    const e = row as { isImplicit?: boolean; studentId?: string; student?: { id?: string } };
    if (e.isImplicit) continue;
    const id = e.studentId ?? e.student?.id;
    if (typeof id === 'string' && id.length > 0) ids.push(id);
  }
  return ids;
}

export function buildLecturerComboboxOptions(
  allLecturers: LecturerOption[],
  current?: { id: string | null; name: string }
): Array<{ value: string; label: string }> {
  const map = new Map(allLecturers.map((l) => [l.id, l.name]));
  if (current?.id && current.name && current.name !== '—' && !map.has(current.id)) {
    map.set(current.id, current.name);
  }
  return [
    { value: '__none__', label: '— Unassigned —' },
    ...Array.from(map.entries())
      .map(([value, label]) => ({ value, label }))
      .sort((a, b) => a.label.localeCompare(b.label)),
  ];
}

export async function fetchAllLecturers(): Promise<LecturerOption[]> {
  const list: LecturerOption[] = [];
  let page = 1;
  const limit = 100;
  while (page <= 50) {
    const res = await staffService.getStaff({ role: 'Lecturer', page, limit });
    const batch = res.data ?? [];
    for (const s of batch as Array<{ id: string; firstName?: string; lastName?: string; email?: string }>) {
      const name = `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email || s.id;
      list.push({ id: s.id, name });
    }
    if (batch.length === 0 || list.length >= (res.total ?? list.length)) break;
    page += 1;
  }
  return list.sort((a, b) => a.name.localeCompare(b.name));
}

export async function fetchStudentsForEnrollmentScope(params: {
  programIntakeId?: string | null;
  programId?: string | null;
  year?: number;
  semester?: number;
}): Promise<EnrollCandidateRow[]> {
  const rows: EnrollCandidateRow[] = [];
  let page = 1;
  const limit = 500;
  const query: Parameters<typeof studentService.getStudents>[0] = {
    status: 'Active',
    page,
    limit,
  };
  if (params.programIntakeId) {
    query.programIntakeId = params.programIntakeId;
  } else if (params.programId) {
    query.programId = params.programId;
    if (params.year != null) query.year = params.year;
    if (params.semester != null) query.semester = params.semester;
  } else {
    return [];
  }
  while (page <= 20) {
    const res = await studentService.getStudents({ ...query, page });
    const batch = res.data ?? [];
    for (const s of batch as Array<{
      id: string;
      firstName?: string;
      lastName?: string;
      studentNumber?: string;
      email?: string;
    }>) {
      rows.push({
        id: s.id,
        name: `${s.firstName || ''} ${s.lastName || ''}`.trim() || s.email || s.id,
        studentId: s.studentNumber ?? '',
        email: s.email ?? '',
      });
    }
    if (batch.length === 0 || rows.length >= (res.total ?? rows.length)) break;
    page += 1;
  }
  return rows.sort((a, b) => a.name.localeCompare(b.name));
}
