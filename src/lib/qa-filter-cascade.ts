export type CascadeClassOption = {
  name: string;
  courseId: string | null;
  courseName: string;
  courseCode: string;
};

export type AcademicScopeIds = {
  schoolId?: string;
  departmentId?: string;
};

export function buildCourseUnitsForClass(
  className: string | null | undefined,
  classOptions: CascadeClassOption[],
  fallbackCourseNames: string[]
): string[] {
  if (!className) return [...fallbackCourseNames].sort((a, b) => a.localeCompare(b));
  const matched = classOptions
    .filter((cls) => cls.name === className)
    .map((cls) => cls.courseName)
    .filter(Boolean);
  if (matched.length === 0) return [...fallbackCourseNames].sort((a, b) => a.localeCompare(b));
  return Array.from(new Set(matched)).sort((a, b) => a.localeCompare(b));
}

export function buildCourseUnitsByClass(
  rows: Array<{ class: string; courseUnit: string }>
): Record<string, string[]> {
  const map = new Map<string, Set<string>>();
  for (const row of rows) {
    const courseUnit = (row.courseUnit || '').trim();
    if (!courseUnit || courseUnit === '—') continue;
    const classNames = row.class
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean);
    for (const className of classNames) {
      const set = map.get(className) ?? new Set<string>();
      set.add(courseUnit);
      map.set(className, set);
    }
  }
  return Object.fromEntries(
    [...map.entries()].map(([className, units]) => [className, [...units].sort((a, b) => a.localeCompare(b))])
  );
}

export function resolveCascadedCourseUnits(options: {
  selectedClass: string;
  allCourseUnits: string[];
  courseUnitsByClass: Record<string, string[]>;
  allValue?: string;
}): string[] {
  const allValue = options.allValue ?? 'All';
  if (options.selectedClass === allValue) {
    return [...options.allCourseUnits].sort((a, b) => a.localeCompare(b));
  }
  return options.courseUnitsByClass[options.selectedClass] ?? [];
}

export function resolveCascadedClasses(options: {
  selectedCourseUnit: string;
  allClasses: string[];
  rows: Array<{ class: string; courseUnit: string }>;
  allValue?: string;
}): string[] {
  const allValue = options.allValue ?? 'All';
  if (options.selectedCourseUnit === allValue) {
    return [...options.allClasses].sort((a, b) => a.localeCompare(b));
  }
  const matched = new Set<string>();
  for (const row of options.rows) {
    if ((row.courseUnit || '').trim() !== options.selectedCourseUnit) continue;
    row.class
      .split(',')
      .map((part) => part.trim())
      .filter(Boolean)
      .forEach((name) => matched.add(name));
  }
  return [...matched].sort((a, b) => a.localeCompare(b));
}
