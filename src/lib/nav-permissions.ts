export type PermissionRequirement = string[] | string[][];

export function hasAnyPermission(
  userPermissions: string[] | undefined,
  required: PermissionRequirement | undefined
): boolean {
  if (!required || (Array.isArray(required) && required.length === 0)) return true;
  const have = new Set(userPermissions || []);
  if (Array.isArray(required) && Array.isArray(required[0])) {
    const sets = required as string[][];
    return sets.some((set) => set.length > 0 && set.every((p) => have.has(p)));
  }
  const list = required as string[];
  return list.some((p) => have.has(p));
}

export function normalizePermissionSets(required: PermissionRequirement | undefined): string[][] {
  if (!required || (Array.isArray(required) && required.length === 0)) {
    return [];
  }
  if (Array.isArray(required) && Array.isArray(required[0])) {
    return required as string[][];
  }
  return [required as string[]];
}

export const NAV_PERMISSION: Record<string, PermissionRequirement> = {
  '/admin-users': ['admin.console'],
  '/admin-roles': ['admin.console'],
  '/admin-students': ['admin.console'],
  '/admin-lecturers': ['admin.console'],
  '/admin-audit-log': ['admin.console'],
  '/admin-courses': ['academic.write'],
  '/admin-classes': ['academic.write'],
  '/admin-timetables': [['timetable.admin'], ['admin.console']],
  '/admin-schools': ['academic.write'],
  '/admin-venues': ['academic.venues'],
  '/admin-calendar': ['academic.write'],
  '/admin-strategic-goals': ['admin.console'],
  '/admin-graduation-registrations': ['graduation.registrations'],
  '/admin-settings': ['settings.read'],
  '/timetable': [
    ['timetable.student_me'],
    ['academic.personal_schedule', 'qa.lecturer_portal'],
    ['timetable.ops'],
  ],
  '/timetable-builder': [['academic.write'], ['timetable.ops'], ['qa.seed_timetable']],
  '/clinical-rotations': [
    ['clinical.sessions.record'],
    ['clinical.reports.view'],
    ['clinical.sites.manage'],
    ['clinical.sessions.verify'],
    ['clinical.assignments.manage'],
    ['clinical.instructors.manage'],
    ['clinical.rotations.manage'],
  ],
  '/clinical/sites': [['clinical.sites.manage'], ['clinical.reports.view']],
  '/clinical/site-team': [['clinical.assignments.manage']],
  '/clinical/instructors': [
    ['clinical.instructors.manage'],
    ['clinical.sessions.record'],
    ['clinical.sessions.verify'],
  ],
  '/clinical/rotations': [
    ['clinical.rotations.manage'],
    ['clinical.sessions.record'],
    ['clinical.sessions.verify'],
  ],
  '/clinical/policies': [
    ['clinical.policies.manage'],
    ['clinical.sites.manage'],
    ['clinical.rotations.manage'],
  ],
  '/clinical/sessions': [['clinical.sessions.record'], ['clinical.sessions.verify']],
  '/clinical/attendance': [['clinical.sessions.record']],
  '/clinical/reports': [['clinical.reports.view']],
  '/lecture-records': [['qa.review']],
  '/student-records': [['students.read', 'academic.read']],
  '/reports': [
    ['reports.access'],
    ['qa.review'],
    ['analytics.core_dashboard'],
    ['analytics.ops'],
    ['academic.read'],
    ['timetable.ops'],
  ],
  '/management-overview': [['analytics.mgmt_overview']],
  '/management-departments': [['academic.read', 'academic.mgmt_read']],
  '/management-staff-performance': [['staff.read', 'reports.access']],
  '/management-lecturer-performance': [
    ['academic.mgmt_read', 'staff.read'],
    ['analytics.ops', 'reports.access'],
    ['qa.review', 'analytics.ops'],
  ],
  '/management-student-performance': [
    ['students.read', 'analytics.ops'],
    ['students.read', 'analytics.mgmt_overview'],
    ['analytics.mgmt_overview', 'reports.access'],
  ],
  '/management-student-details': [
    ['students.read', 'students.attendance_staff'],
    ['students.read', 'analytics.ops'],
  ],
  '/cancellations': [
    ['cancellations.lecturer', 'timetable.lecturer_me'],
    ['cancellations.queue'],
    ['cancellations.queue', 'cancellations.decide'],
    ['substitutions.lecturer'],
    ['substitutions.queue'],
    ['substitutions.queue', 'substitutions.decide'],
  ],
  '/curriculum-management': ['academic.read'],
  '/lecturer-course-attendance': [
    ['academic.personal_schedule', 'enrollment.class_read'],
    ['qa.review', 'students.attendance_staff'],
  ],
  '/lecturer-performance': [['analytics.lecturer_private', 'staff.lecturer_me']],
  '/student-classes': [['students.self', 'enrollment.self', 'settings.read', 'students.attendance_self']],
  '/student-history': [
    ['students.self', 'enrollment.self', 'students.attendance_self'],
    ['staff.timeclock'],
  ],
  '/presence': [
    ['academic.personal_schedule', 'qa.lecturer_portal'],
    ['academic.personal_schedule', 'students.self', 'students.attendance_self'],
    ['staff.timeclock'],
  ],
};

export const ROUTE_PERMISSION: Record<string, PermissionRequirement> = {
  ...NAV_PERMISSION,
  '/dashboard': [
    ['qa.review'],
    ['analytics.core_dashboard', 'analytics.ops', 'qa.review'],
    [
      'analytics.core_dashboard',
      'analytics.ops',
      'analytics.mgmt_overview',
      'reports.access',
    ],
    ['academic.personal_schedule', 'qa.lecturer_portal'],
    ['academic.personal_schedule', 'qa.lecturer_portal', 'staff.lecturer_me'],
    ['academic.personal_schedule', 'students.self', 'students.attendance_self'],
    ['staff.timeclock'],
    ['clinical.sessions.record'],
    ['clinical.sessions.verify'],
    ['clinical.reports.view'],
    ['clinical.sites.manage'],
  ],
};

const HOME_PATH_CANDIDATES = [
  '/dashboard',
  '/clinical/sites',
  '/clinical/sessions',
  '/clinical/reports',
  '/lecture-records',
  '/reports',
  '/timetable',
  '/student-records',
  '/cancellations',
  '/curriculum-management',
  '/admin-settings',
  '/presence',
  '/student-classes',
] as const;

export function permissionRequirementForRoute(path: string): PermissionRequirement | undefined {
  const basePath = path.split('?')[0];
  return ROUTE_PERMISSION[path] ?? ROUTE_PERMISSION[basePath];
}

export function permissionSetsForRoute(path: string): string[][] {
  const required = permissionRequirementForRoute(path);
  if (!required) {
    return [['__route_unknown__']];
  }
  return normalizePermissionSets(required);
}

export function routeAllowed(userPermissions: string[], path: string): boolean {
  const required = permissionRequirementForRoute(path);
  if (!required) return false;
  return hasAnyPermission(userPermissions, required);
}

export function resolveHomePath(userPermissions: string[]): string | null {
  for (const path of HOME_PATH_CANDIDATES) {
    if (routeAllowed(userPermissions, path)) return path;
  }
  return null;
}

export function routeGuardProps(path: string): { requiredPermissionSets: string[][] } {
  return { requiredPermissionSets: permissionSetsForRoute(path) };
}

export type NavMenuDocEntry = {
  path: string;
  label: string;
  permissions: PermissionRequirement;
};

export const NAV_MENU_DOC: NavMenuDocEntry[] = [
  { path: '/dashboard', label: 'Dashboard', permissions: ROUTE_PERMISSION['/dashboard'] },
  { path: '/timetable', label: 'Timetable', permissions: NAV_PERMISSION['/timetable'] },
  { path: '/timetable-builder', label: 'Timetable Builder', permissions: NAV_PERMISSION['/timetable-builder'] },
  { path: '/lecture-records', label: 'Lecture Records', permissions: NAV_PERMISSION['/lecture-records'] },
  { path: '/cancellations', label: 'Cancellations & Substitutions', permissions: NAV_PERMISSION['/cancellations'] },
  { path: '/student-records', label: 'Student Records', permissions: NAV_PERMISSION['/student-records'] },
  { path: '/curriculum-management', label: 'Curriculum', permissions: NAV_PERMISSION['/curriculum-management'] },
  { path: '/presence', label: 'Mark Presence', permissions: NAV_PERMISSION['/presence'] },
  { path: '/lecturer-course-attendance', label: 'Course Attendance', permissions: NAV_PERMISSION['/lecturer-course-attendance'] },
  { path: '/lecturer-performance', label: 'Performance (Lecturer)', permissions: NAV_PERMISSION['/lecturer-performance'] },
  { path: '/student-classes', label: 'My Classes', permissions: NAV_PERMISSION['/student-classes'] },
  { path: '/student-history', label: 'Attendance History', permissions: NAV_PERMISSION['/student-history'] },
  { path: '/management-overview', label: 'University Overview', permissions: NAV_PERMISSION['/management-overview'] },
  { path: '/management-departments', label: 'Department Stats', permissions: NAV_PERMISSION['/management-departments'] },
  { path: '/management-staff-performance', label: 'Staff Performance', permissions: NAV_PERMISSION['/management-staff-performance'] },
  { path: '/management-lecturer-performance', label: 'Lecturer Performance', permissions: NAV_PERMISSION['/management-lecturer-performance'] },
  { path: '/management-student-performance', label: 'Student Performance', permissions: NAV_PERMISSION['/management-student-performance'] },
  { path: '/reports', label: 'Reports', permissions: NAV_PERMISSION['/reports'] },
  { path: '/admin-courses', label: 'Courses', permissions: NAV_PERMISSION['/admin-courses'] },
  { path: '/admin-classes', label: 'Classes', permissions: NAV_PERMISSION['/admin-classes'] },
  { path: '/admin-timetables', label: 'Timetables', permissions: NAV_PERMISSION['/admin-timetables'] },
  { path: '/admin-schools', label: 'Schools', permissions: NAV_PERMISSION['/admin-schools'] },
  { path: '/admin-venues', label: 'Venues', permissions: NAV_PERMISSION['/admin-venues'] },
  { path: '/admin-calendar', label: 'Calendar', permissions: NAV_PERMISSION['/admin-calendar'] },
  { path: '/admin-strategic-goals', label: 'Strategic Goals', permissions: NAV_PERMISSION['/admin-strategic-goals'] },
  { path: '/admin-graduation-registrations', label: 'Graduation registrations', permissions: NAV_PERMISSION['/admin-graduation-registrations'] },
  { path: '/admin-settings', label: 'Settings', permissions: NAV_PERMISSION['/admin-settings'] },
  { path: '/admin-students', label: 'Students (Users)', permissions: NAV_PERMISSION['/admin-students'] },
  { path: '/admin-lecturers', label: 'Lecturers (Users)', permissions: NAV_PERMISSION['/admin-lecturers'] },
  { path: '/admin-users', label: 'System accounts', permissions: NAV_PERMISSION['/admin-users'] },
  { path: '/admin-roles', label: 'Roles & Permissions', permissions: NAV_PERMISSION['/admin-roles'] },
  { path: '/admin-audit-log', label: 'Audit log (from Settings)', permissions: NAV_PERMISSION['/admin-audit-log'] },
  { path: '/clinical/sites', label: 'Clinical Sites', permissions: NAV_PERMISSION['/clinical/sites'] },
  { path: '/clinical/site-team', label: 'Site Team', permissions: NAV_PERMISSION['/clinical/site-team'] },
  { path: '/clinical/instructors', label: 'Clinical Instructors', permissions: NAV_PERMISSION['/clinical/instructors'] },
  { path: '/clinical/rotations', label: 'Clinical Rotations', permissions: NAV_PERMISSION['/clinical/rotations'] },
  { path: '/clinical/policies', label: 'Eligibility Policies', permissions: NAV_PERMISSION['/clinical/policies'] },
  { path: '/clinical/sessions', label: 'Clinical Sessions', permissions: NAV_PERMISSION['/clinical/sessions'] },
  { path: '/clinical/attendance', label: 'Clinical Attendance', permissions: NAV_PERMISSION['/clinical/attendance'] },
  { path: '/clinical/reports', label: 'Clinical Reports', permissions: NAV_PERMISSION['/clinical/reports'] },
];

export function navAllowed(userPermissions: string[], path: string): boolean {
  return routeAllowed(userPermissions, path);
}

export function shouldNestClinicalNavItems(role: string): boolean {
  return role === 'Admin' || role === 'Management';
}

export function formatPermissionRequirement(required: PermissionRequirement | undefined): string {
  if (!required || (Array.isArray(required) && required.length === 0)) {
    return 'Visible to all signed-in users';
  }
  if (Array.isArray(required) && Array.isArray(required[0])) {
    const sets = required as string[][];
    return sets.map((set) => set.join(' + ')).join('  OR  ');
  }
  const list = required as string[];
  return list.join(' OR ');
}
