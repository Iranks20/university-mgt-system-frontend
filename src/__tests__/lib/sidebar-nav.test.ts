import { describe, expect, it } from 'vitest';
import {
  buildSidebar,
  dashboardPathFor,
  folderIdForPath,
  menuOpen,
  visibleMenus,
  withMenuOff,
  withMenuOn,
} from '@/lib/sidebar-nav';

const LECTURER = [
  'academic.personal_schedule', 'academic.read', 'academic.venues', 'analytics.core_dashboard',
  'analytics.lecturer_private', 'analytics.lecturer_shared', 'cancellations.lecturer', 'enrollment.class_read',
  'hr.appraisal_submit', 'notifications.self', 'qa.lecturer_portal', 'settings.read', 'staff.lecturer_me',
  'students.attendance_staff', 'substitutions.lecturer', 'timetable.lecturer_me',
];
const STUDENT = [
  'academic.personal_schedule', 'academic.read', 'analytics.core_dashboard', 'enrollment.self', 'notifications.self',
  'settings.read', 'students.attendance_self', 'students.self', 'timetable.student_me', 'timetable.student_view',
];
const HEAD_OF_DEPARTMENT = [
  'academic.mgmt_read', 'academic.read', 'analytics.core_dashboard', 'analytics.lecturer_shared', 'analytics.ops',
  'cancellations.queue', 'enrollment.class_read', 'enrollment.read', 'notifications.self', 'qa.review', 'reports.access',
  'settings.read', 'staff_attendance.read', 'staff.read', 'students.read', 'substitutions.queue',
];
const HR_MANAGER = [
  'hr.appraisal_manage', 'hr.appraisal_submit', 'hr.leave_approve', 'hr.leave_manage', 'hr.read', 'hr.reports',
  'hr.write', 'notifications.self', 'settings.read', 'staff.read', 'staff.record_read', 'staff.timeclock',
  'staff.write', 'staff_attendance.read',
];

const labels = (perms: string[]) => visibleMenus(perms).map((m) => m.label);

describe('sidebar', () => {
  it('gives a lecturer a short flat list with no admin pages', () => {
    const items = buildSidebar(LECTURER);
    expect(items.every((i) => i.type === 'single')).toBe(true);
    expect(labels(LECTURER)).toEqual(
      expect.arrayContaining(['Timetable', 'Mark Presence', 'Course Attendance', 'My Performance', 'My Appraisal'])
    );
    // Reports needs reports.access or qa.review; Venues needs venue management.
    expect(labels(LECTURER)).not.toContain('Reports');
    expect(labels(LECTURER)).not.toContain('Venues');
  });

  it('does not show students the institutional Reports page', () => {
    expect(labels(STUDENT)).not.toContain('Reports');
    expect(labels(STUDENT)).toEqual(expect.arrayContaining(['My Classes', 'Course registration']));
  });

  it('groups a busy menu into module folders in a fixed order, without a catch-all folder', () => {
    const items = buildSidebar(HR_MANAGER);
    expect(items[0]).toMatchObject({ type: 'single', label: 'Dashboard' });
    const folders = items.filter((i) => i.type === 'folder').map((i) => i.label);
    expect(folders).toEqual(['My work', 'Human Resources']);
    expect(items.some((i) => i.label === 'Additional access')).toBe(false);
  });

  it('opens the folder that holds the current page', () => {
    const items = buildSidebar(HR_MANAGER);
    expect(folderIdForPath(items, '/hr/employees')).toBe('human-resources');
    expect(folderIdForPath(items, '/nowhere')).toBeNull();
  });

  it('uses the university overview as Dashboard only for people who have it', () => {
    expect(dashboardPathFor(LECTURER)).toBe('/dashboard');
    expect(dashboardPathFor([...HEAD_OF_DEPARTMENT, 'analytics.mgmt_overview'])).toBe('/management-overview');
  });
});

describe('switching a menu on and off for a role', () => {
  it('closes every route into the menu, not just one permission', () => {
    // Reports opens with reports.access OR qa.review: unticking one alone would leave it visible.
    const perms = new Set(HEAD_OF_DEPARTMENT);
    expect(menuOpen(perms, '/reports')).toBe(true);
    const { permissions, alsoClosed } = withMenuOff(perms, '/reports');
    expect(menuOpen(permissions, '/reports')).toBe(false);
    expect(permissions.has('reports.access')).toBe(false);
    expect(permissions.has('qa.review')).toBe(false);
    // The side effects are reported so the admin can see them.
    expect(alsoClosed).toEqual(expect.arrayContaining(['/lecture-records']));
  });

  it('closes a single-route menu without touching unrelated menus', () => {
    const { permissions, alsoClosed } = withMenuOff(new Set(HR_MANAGER), '/hr/documents');
    expect(menuOpen(permissions, '/hr/documents')).toBe(false);
    expect(menuOpen(permissions, '/hr/appraisals')).toBe(false); // same permission, reported below
    expect(alsoClosed).toEqual(['/hr/appraisals']);
    expect(menuOpen(permissions, '/hr/employees')).toBe(true);
  });

  it('adds the smallest set of permissions that opens a menu', () => {
    const next = withMenuOn(new Set(['settings.read']), '/admin-venues');
    expect(menuOpen(next, '/admin-venues')).toBe(true);
    expect([...next].sort()).toEqual(['academic.venues_manage', 'settings.read']);
  });

  it('respects extra conditions such as graduation event setup', () => {
    const next = withMenuOn(new Set<string>(), '/graduation/event');
    expect(menuOpen(next, '/graduation/event')).toBe(true);
    const off = withMenuOff(next, '/graduation/event');
    expect(menuOpen(off.permissions, '/graduation/event')).toBe(false);
  });
});
