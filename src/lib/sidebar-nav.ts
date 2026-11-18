import {
  AlertTriangle,
  BarChart,
  BookOpen,
  Briefcase,
  Building,
  Calendar,
  CalendarX,
  ClipboardCheck,
  ClipboardList,
  Clock,
  FileText,
  GraduationCap,
  History,
  KeyRound,
  Layers,
  LayoutDashboard,
  MapPin,
  ScanLine,
  School,
  Settings,
  TrendingUp,
  UserCheck,
  UserPlus,
  Users,
  UsersRound,
} from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { navAllowed, normalizePermissionSets, permissionRequirementForRoute } from './nav-permissions';

/**
 * The one place that decides the sidebar. Every signed-in person gets the same layout, built from
 * the menus their permissions open, grouped by module in a fixed order with the same labels.
 * People with only a few menus (most lecturers, students, ordinary staff) get a flat list.
 */

export type SidebarChild = { label: string; path: string; icon: LucideIcon };

export type SidebarItem =
  | { type: 'single'; label: string; path: string; icon: LucideIcon }
  | { type: 'folder'; id: string; label: string; icon: LucideIcon; children: SidebarChild[] };

type MenuEntry = SidebarChild & {
  /** On top of the route's rule, the person must also hold one of these. */
  alsoOneOf?: string[];
  /** Name to use when the item is shown on its own, outside its folder (where the folder gave context). */
  standalone?: string;
};

type Section = { id: string; label: string; icon: LucideIcon; items: MenuEntry[] };

export const SIDEBAR_SECTIONS: Section[] = [
  {
    id: 'my-work',
    label: 'My work',
    icon: ClipboardCheck,
    items: [
      { label: 'Timetable', path: '/timetable', icon: Calendar },
      { label: 'Mark Presence', path: '/presence', icon: MapPin },
      { label: 'Course Attendance', path: '/lecturer-course-attendance', icon: UserCheck },
      { label: 'My Performance', path: '/lecturer-performance', icon: BarChart },
      { label: 'My Classes', path: '/student-classes', icon: BookOpen },
      { label: 'Course registration', path: '/student-registration', icon: ClipboardList },
      { label: 'Attendance History', path: '/student-history', icon: Clock },
      { label: 'My Appraisal', path: '/staff-appraisal', icon: ClipboardList },
      { label: 'Attendance Desk', path: '/attendance-desk', icon: ScanLine },
      { label: 'My Entries', path: '/attendance-entries', icon: History },
    ],
  },
  {
    id: 'oversight',
    label: 'Oversight',
    icon: BarChart,
    items: [
      { label: 'Student Performance', path: '/management-student-performance', icon: GraduationCap },
      { label: 'Lecturer Performance', path: '/management-lecturer-performance', icon: UserCheck },
      { label: 'Staff Performance', path: '/management-staff-performance', icon: Users },
      { label: 'Risk Register', path: '/management-risk', icon: AlertTriangle },
      { label: 'Department Stats', path: '/management-departments', icon: School },
      { label: 'Enrolment Health', path: '/management-enrolment', icon: Users },
      { label: 'Reports', path: '/reports', icon: FileText },
      { label: 'Appraisal Final Review', path: '/appraisals/vc', icon: ClipboardCheck },
    ],
  },
  {
    id: 'academic',
    label: 'Academic',
    icon: School,
    items: [
      { label: 'Schools', path: '/admin-schools', icon: Building },
      { label: 'Courses', path: '/admin-courses', icon: BookOpen },
      { label: 'Classes', path: '/admin-classes', icon: School },
      { label: 'Curriculum', path: '/curriculum-management', icon: ClipboardList },
      { label: 'Venues', path: '/admin-venues', icon: MapPin },
      { label: 'Calendar', path: '/admin-calendar', icon: Calendar },
      { label: 'Timetable Builder', path: '/timetable-builder', icon: Calendar },
      { label: 'Timetables', standalone: 'Timetables (admin)', path: '/admin-timetables', icon: Calendar },
    ],
  },
  {
    id: 'students',
    label: 'Students',
    icon: GraduationCap,
    items: [
      { label: 'Student Records', path: '/student-records', icon: Users },
      { label: 'Students', path: '/admin-students', icon: Users },
      { label: 'Student info forms', path: '/admin-student-info-forms', icon: ClipboardList },
    ],
  },
  {
    id: 'attendance',
    label: 'Attendance & QA',
    icon: ClipboardList,
    items: [
      { label: 'Lecture Records', path: '/lecture-records', icon: BookOpen },
      { label: 'Cancellations & Substitutions', path: '/cancellations', icon: CalendarX },
    ],
  },
  {
    id: 'clinicals',
    label: 'Clinicals',
    icon: Briefcase,
    items: [
      { label: 'Clinical Sites', path: '/clinical/sites', icon: MapPin },
      { label: 'Site Team', standalone: 'Clinical site team', path: '/clinical/site-team', icon: UsersRound },
      { label: 'Instructors', standalone: 'Clinical instructors', path: '/clinical/instructors', icon: UsersRound },
      { label: 'Cohorts', standalone: 'Clinical cohorts', path: '/clinical/cohorts', icon: Layers },
      { label: 'Rotations', standalone: 'Clinical rotations', path: '/clinical/rotations', icon: ClipboardList },
      { label: 'Eligibility Policies', standalone: 'Clinical eligibility policies', path: '/clinical/policies', icon: UserCheck },
      { label: 'Sessions', standalone: 'Clinical sessions', path: '/clinical/sessions', icon: BookOpen },
      { label: 'Clinical Attendance', path: '/clinical/attendance', icon: UserCheck },
      { label: 'Clinical Reports', path: '/clinical/reports', icon: FileText },
    ],
  },
  {
    id: 'human-resources',
    label: 'Human Resources',
    icon: UsersRound,
    items: [
      { label: 'HR Dashboard', path: '/hr/dashboard', icon: LayoutDashboard },
      { label: 'Employees', path: '/hr/employees', icon: Users },
      { label: 'Organisation Structure', path: '/hr/organisation', icon: Building },
      { label: 'Staff Attendance', path: '/hr/attendance', icon: Clock },
      { label: 'Onboarding', path: '/hr/onboarding', icon: UserPlus },
      { label: 'HR Documents', path: '/hr/documents', icon: FileText },
      { label: 'Performance Appraisal', path: '/hr/appraisals', icon: ClipboardList },
      { label: 'HR Reports', path: '/hr/reports', icon: BarChart },
    ],
  },
  {
    id: 'graduation',
    label: 'Graduation',
    icon: GraduationCap,
    items: [
      { label: 'Graduation Dashboard', path: '/graduation/dashboard', icon: LayoutDashboard },
      { label: 'Event setup', standalone: 'Graduation event setup', path: '/graduation/event', icon: Calendar, alsoOneOf: ['graduation.manage', 'admin.console'] },
      { label: 'Committees', standalone: 'Graduation committees', path: '/graduation/committees', icon: ClipboardList },
      { label: 'Registrations', standalone: 'Graduation registrations', path: '/graduation/registrations', icon: GraduationCap, alsoOneOf: ['graduation.registrations', 'admin.console'] },
    ],
  },
  {
    id: 'administration',
    label: 'Administration',
    icon: Settings,
    items: [
      { label: 'Lecturers', path: '/admin-lecturers', icon: GraduationCap },
      { label: 'Users & accounts', path: '/admin-administration', icon: Building },
      { label: 'Roles & Permissions', path: '/admin-roles', icon: KeyRound },
      { label: 'Audit log', path: '/admin-audit-log', icon: FileText },
      { label: 'Settings', path: '/admin-settings', icon: Settings },
      { label: 'Strategic Goals', path: '/admin-strategic-goals', icon: TrendingUp },
    ],
  },
];

/** People with this many menus or fewer get a plain list instead of folders. */
const FLAT_LIST_LIMIT = 8;

export type VisibleMenu = {
  sectionId: string;
  sectionLabel: string;
  label: string;
  /** Label to use outside the section folder. */
  standaloneLabel: string;
  path: string;
  icon: LucideIcon;
};

/** Home page shown as "Dashboard": the university overview for those who have it, otherwise the personal dashboard. */
export function dashboardPathFor(permissions: string[]): string {
  return navAllowed(permissions, '/management-overview') ? '/management-overview' : '/dashboard';
}

/** Every menu (other than Dashboard) these permissions open, in sidebar order. */
function entryOpen(item: MenuEntry, permissions: string[], have: Set<string>): boolean {
  if (!navAllowed(permissions, item.path)) return false;
  return !item.alsoOneOf || item.alsoOneOf.some((code) => have.has(code));
}

export function visibleMenus(permissions: string[]): VisibleMenu[] {
  const have = new Set(permissions);
  const out: VisibleMenu[] = [];
  for (const section of SIDEBAR_SECTIONS) {
    for (const item of section.items) {
      if (!entryOpen(item, permissions, have)) continue;
      out.push({
        sectionId: section.id,
        sectionLabel: section.label,
        label: item.label,
        standaloneLabel: item.standalone ?? item.label,
        path: item.path,
        icon: item.icon,
      });
    }
  }
  return out;
}

// ---------------------------------------------------------------------------------------------
// Quality Assurance keeps the sidebar it had before the menus were regrouped (the production
// layout QA staff are used to): Dashboard, a Graduation folder, then a flat list in a fixed order.

/** QA staff: can review and record lecture QA, without admin or university-overview access. */
export function usesQaLayout(permissions: string[]): boolean {
  const have = new Set(permissions);
  return (
    have.has('qa.write') &&
    have.has('qa.review') &&
    !have.has('admin.console') &&
    !have.has('analytics.mgmt_overview')
  );
}

/** Flat menu order and labels of the earlier sidebar. */
const QA_FLAT_ORDER: Array<{ path: string; label: string }> = [
  { path: '/attendance-desk', label: 'Attendance Desk' },
  { path: '/attendance-entries', label: 'My Entries' },
  { path: '/timetable', label: 'Timetable' },
  { path: '/timetable-builder', label: 'Timetable Builder' },
  { path: '/lecture-records', label: 'Lecture Records' },
  { path: '/cancellations', label: 'Cancellations' },
  { path: '/student-records', label: 'Student Records' },
  { path: '/curriculum-management', label: 'Curriculum' },
  { path: '/presence', label: 'Mark Presence' },
  { path: '/lecturer-course-attendance', label: 'Course Attendance' },
  { path: '/lecturer-performance', label: 'Performance' },
  { path: '/staff-appraisal', label: 'My Appraisal' },
  { path: '/appraisals/vc', label: 'Appraisal Final Review' },
  { path: '/student-classes', label: 'My Classes' },
  { path: '/student-registration', label: 'Course registration' },
  { path: '/student-history', label: 'Attendance History' },
  { path: '/management-departments', label: 'Department Stats' },
  { path: '/management-staff-performance', label: 'Staff Performance' },
  { path: '/management-lecturer-performance', label: 'Lecturer Performance' },
  { path: '/management-student-performance', label: 'Student Performance' },
  { path: '/management-risk', label: 'Risk Register' },
  { path: '/management-enrolment', label: 'Enrolment Health' },
  { path: '/reports', label: 'Reports' },
  { path: '/admin-courses', label: 'Courses' },
  { path: '/admin-classes', label: 'Classes' },
  { path: '/admin-timetables', label: 'Timetables' },
  { path: '/admin-schools', label: 'Schools' },
  { path: '/admin-venues', label: 'Venues' },
  { path: '/admin-calendar', label: 'Calendar' },
  { path: '/admin-strategic-goals', label: 'Strategic Goals' },
];

/** Graduation folder labels of the earlier sidebar. */
const QA_GRADUATION_LABELS: Record<string, string> = {
  '/graduation/dashboard': 'Dashboard',
  '/graduation/event': 'Event setup',
  '/graduation/committees': 'Committees',
  '/graduation/registrations': 'Registrations',
};

function sectionMenus(menus: VisibleMenu[], sectionId: string): VisibleMenu[] {
  return menus.filter((m) => m.sectionId === sectionId);
}

function pushSection(items: SidebarItem[], section: Section, menus: VisibleMenu[], labelFor?: (m: VisibleMenu) => string) {
  if (menus.length === 1) {
    const m = menus[0];
    items.push({ type: 'single', label: m.standaloneLabel, path: m.path, icon: m.icon });
  } else if (menus.length > 1) {
    items.push({
      type: 'folder',
      id: section.id,
      label: section.label,
      icon: section.icon,
      children: menus.map((m) => ({ label: labelFor ? labelFor(m) : m.label, path: m.path, icon: m.icon })),
    });
  }
}

function buildQaSidebar(dashboard: SidebarItem, menus: VisibleMenu[]): SidebarItem[] {
  const sectionById = new Map(SIDEBAR_SECTIONS.map((s) => [s.id, s]));
  const placed = new Set<string>();
  const items: SidebarItem[] = [dashboard];

  // Earlier order: Clinicals and Human Resources (if any), then Graduation, then the flat list.
  for (const id of ['clinicals', 'human-resources', 'graduation']) {
    const inSection = sectionMenus(menus, id);
    inSection.forEach((m) => placed.add(m.path));
    pushSection(items, sectionById.get(id)!, inSection, id === 'graduation' ? (m) => QA_GRADUATION_LABELS[m.path] ?? m.label : undefined);
  }

  const byPath = new Map(menus.map((m) => [m.path, m]));
  for (const { path, label } of QA_FLAT_ORDER) {
    const m = byPath.get(path);
    if (!m || placed.has(path)) continue;
    placed.add(path);
    items.push({ type: 'single', label, path: m.path, icon: m.icon });
  }

  // Anything else this person can open (e.g. a menu added later) still appears, grouped by module.
  for (const section of SIDEBAR_SECTIONS) {
    pushSection(items, section, sectionMenus(menus, section.id).filter((m) => !placed.has(m.path)));
  }
  return items;
}

export function buildSidebar(permissions: string[]): SidebarItem[] {
  const dashboard: SidebarItem = {
    type: 'single',
    label: 'Dashboard',
    icon: LayoutDashboard,
    path: dashboardPathFor(permissions),
  };
  const menus = visibleMenus(permissions);

  if (usesQaLayout(permissions)) {
    return buildQaSidebar(dashboard, menus);
  }

  if (menus.length <= FLAT_LIST_LIMIT) {
    return [
      dashboard,
      ...menus.map((m): SidebarItem => ({ type: 'single', label: m.standaloneLabel, path: m.path, icon: m.icon })),
    ];
  }

  const items: SidebarItem[] = [dashboard];
  for (const section of SIDEBAR_SECTIONS) {
    const inSection = menus.filter((m) => m.sectionId === section.id);
    const children = inSection.map(({ label, path, icon }) => ({ label, path, icon }));
    if (children.length === 1) {
      items.push({ type: 'single', ...children[0], label: inSection[0].standaloneLabel });
    } else if (children.length > 1) {
      items.push({ type: 'folder', id: section.id, label: section.label, icon: section.icon, children });
    }
  }
  return items;
}

/** The folder that contains the page at this path, if any (so it can start open). */
export function folderIdForPath(items: SidebarItem[], pathname: string): string | null {
  for (const item of items) {
    if (item.type !== 'folder') continue;
    if (item.children.some((c) => pathname === c.path || pathname.startsWith(`${c.path}/`))) return item.id;
  }
  return null;
}

// ---------------------------------------------------------------------------------------------
// Turning a menu on or off for a role (used by Roles & Permissions).

const ALL_ENTRIES: MenuEntry[] = SIDEBAR_SECTIONS.flatMap((s) => s.items);

function entryForPath(path: string): MenuEntry | undefined {
  return ALL_ENTRIES.find((e) => e.path === path);
}

/** Whether these permissions open the menu at `path`. */
export function menuOpen(permissions: Set<string> | string[], path: string): boolean {
  const list = Array.isArray(permissions) ? permissions : [...permissions];
  const entry = entryForPath(path);
  return entry ? entryOpen(entry, list, new Set(list)) : false;
}

/** Every way to open a menu: each inner list is one complete set of permissions that opens it. */
export function menuPermissionSets(path: string): string[][] {
  const entry = entryForPath(path);
  if (!entry) return [];
  const base = normalizePermissionSets(permissionRequirementForRoute(path));
  const routeSets = base.length ? base : [[]];
  if (!entry.alsoOneOf) return routeSets;
  return routeSets.flatMap((set) => entry.alsoOneOf!.map((extra) => [...new Set([...set, extra])]));
}

/** Adds the smallest set of permissions that opens the menu. Returns a new set. */
export function withMenuOn(permissions: Set<string>, path: string): Set<string> {
  if (menuOpen(permissions, path)) return new Set(permissions);
  const sets = menuPermissionSets(path);
  if (!sets.length) return new Set(permissions);
  const cheapest = [...sets].sort(
    (a, b) => a.filter((c) => !permissions.has(c)).length - b.filter((c) => !permissions.has(c)).length
  )[0];
  return new Set([...permissions, ...cheapest]);
}

/**
 * Removes permissions until no route opens the menu any more, each time dropping the permission
 * that closes the fewest other menus. Returns the new set and any other menus that also closed.
 */
export function withMenuOff(permissions: Set<string>, path: string): { permissions: Set<string>; alsoClosed: string[] } {
  const next = new Set(permissions);
  const openBefore = visibleMenus([...permissions]).map((m) => m.path);
  for (let guard = 0; guard < 25 && menuOpen(next, path); guard += 1) {
    const candidates = [
      ...new Set(menuPermissionSets(path).filter((set) => set.every((c) => next.has(c))).flat()),
    ];
    if (!candidates.length) break;
    const cost = (code: string) => {
      const trial = new Set(next);
      trial.delete(code);
      return openBefore.filter((p) => p !== path && menuOpen(next, p) && !menuOpen(trial, p)).length;
    };
    candidates.sort((a, b) => cost(a) - cost(b));
    next.delete(candidates[0]);
  }
  const alsoClosed = openBefore.filter((p) => p !== path && !menuOpen(next, p));
  return { permissions: next, alsoClosed };
}

export function menuLabel(path: string): string {
  return entryForPath(path)?.label ?? path;
}
