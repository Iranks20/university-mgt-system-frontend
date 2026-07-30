import { describe, expect, it } from 'vitest';
import { navAllowed, resolveHomePath, routeAllowed, shouldNestClinicalNavItems, shouldNestHrNavItems } from '@/lib/nav-permissions';

const campusQaPerms = [
  'qa.review',
  'qa.write',
  'qa.import',
  'qa.seed_timetable',
  'academic.read',
  'students.read',
  'timetable.ops',
  'analytics.core_dashboard',
  'cancellations.queue',
  'cancellations.decide',
  'substitutions.queue',
  'substitutions.decide',
  'settings.read',
];

const managementOversightPerms = [
  'academic.read',
  'academic.mgmt_read',
  'academic.venues',
  'academic.program_intakes',
  'students.read',
  'staff.read',
  'enrollment.read',
  'enrollment.preview',
  'enrollment.class_read',
  'timetable.ops',
  'timetable.student_view',
  'qa.review',
  'cancellations.queue',
  'substitutions.queue',
  'analytics.mgmt_overview',
  'analytics.ops',
  'analytics.core_dashboard',
  'analytics.lecturer_shared',
  'reports.access',
  'graduation.registrations',
  'clinical.reports.view',
  'settings.read',
  'notifications.self',
];

describe('nav-permissions route alignment', () => {
  it('allows campus QA dashboard and reports with qa.review only', () => {
    expect(routeAllowed(campusQaPerms, '/dashboard')).toBe(true);
    expect(routeAllowed(campusQaPerms, '/reports')).toBe(true);
    expect(navAllowed(campusQaPerms, '/reports')).toBe(true);
  });

  it('hides management student performance for campus QA', () => {
    expect(navAllowed(campusQaPerms, '/management-student-performance')).toBe(false);
    expect(routeAllowed(campusQaPerms, '/management-student-performance')).toBe(false);
  });

  it('hides admin timetables for campus QA with timetable.ops only', () => {
    expect(navAllowed(campusQaPerms, '/admin-timetables')).toBe(false);
    expect(navAllowed(campusQaPerms, '/timetable')).toBe(true);
  });

  it('hides timetable builder when only timetable.ops is present', () => {
    expect(navAllowed(['timetable.ops'], '/timetable-builder')).toBe(false);
    expect(navAllowed(['timetable.admin'], '/timetable-builder')).toBe(true);
    expect(navAllowed(['qa.seed_timetable'], '/timetable-builder')).toBe(true);
  });

  it('hides admin users folder entries without admin.console', () => {
    expect(navAllowed(campusQaPerms, '/admin-users')).toBe(false);
    expect(navAllowed(campusQaPerms, '/admin-students')).toBe(false);
  });

  it('resolves a home path for campus QA', () => {
    expect(resolveHomePath(campusQaPerms)).toBe('/dashboard');
  });

  it('allows Management oversight routes and hides clinical ops', () => {
    expect(navAllowed(managementOversightPerms, '/management-overview')).toBe(true);
    expect(navAllowed(managementOversightPerms, '/management-risk')).toBe(true);
    expect(navAllowed(managementOversightPerms, '/management-enrolment')).toBe(true);
    expect(navAllowed(managementOversightPerms, '/clinical/reports')).toBe(true);
    expect(navAllowed(managementOversightPerms, '/clinical/sites')).toBe(false);
    expect(navAllowed(managementOversightPerms, '/timetable-builder')).toBe(false);
    expect(navAllowed(managementOversightPerms, '/admin-courses')).toBe(false);
    expect(resolveHomePath(managementOversightPerms)).toBe('/management-overview');
  });

  it('limits registration-only graduation access to registrations page', () => {
    expect(navAllowed(managementOversightPerms, '/graduation/registrations')).toBe(true);
    expect(navAllowed(managementOversightPerms, '/graduation/dashboard')).toBe(false);
    expect(navAllowed(managementOversightPerms, '/graduation/committees')).toBe(false);
    expect(navAllowed(managementOversightPerms, '/graduation/event')).toBe(false);
  });
});

describe('clinical sidebar nesting', () => {
  it('nests clinical items only for Admin and Management', () => {
    expect(shouldNestClinicalNavItems('Admin')).toBe(true);
    expect(shouldNestClinicalNavItems('Management')).toBe(true);
    expect(shouldNestClinicalNavItems('QAClinicals')).toBe(false);
    expect(shouldNestClinicalNavItems('ClinicalCoordinator')).toBe(false);
    expect(shouldNestClinicalNavItems('QA')).toBe(false);
  });
});

describe('HR sidebar nesting', () => {
  it('nests HR items only for Admin', () => {
    expect(shouldNestHrNavItems('Admin')).toBe(true);
    expect(shouldNestHrNavItems('Management')).toBe(false);
    expect(shouldNestHrNavItems('HR')).toBe(false);
    expect(shouldNestHrNavItems('QA')).toBe(false);
  });
});

describe('HR module access', () => {
  const qaPerms = [
    'qa.review',
    'hr.read',
    'hr.write',
    'hr.appraisal_manage',
    'analytics.core_dashboard',
    'settings.read',
  ];

  const hrPerms = [
    'hr.read',
    'hr.write',
    'hr.leave_manage',
    'hr.leave_approve',
    'hr.reports',
    'hr.appraisal_manage',
    'hr.appraisal_submit',
    'staff.read',
    'staff.write',
    'academic.read',
    'settings.read',
    'notifications.self',
  ];

  const staffPerms = ['staff.timeclock', 'staff.record_read', 'hr.appraisal_submit', 'settings.read', 'notifications.self'];

  const lecturerPerms = [
    'academic.read',
    'academic.venues',
    'academic.personal_schedule',
    'students.attendance_staff',
    'staff.lecturer_me',
    'enrollment.class_read',
    'timetable.lecturer_me',
    'qa.lecturer_portal',
    'cancellations.lecturer',
    'substitutions.lecturer',
    'analytics.lecturer_shared',
    'analytics.lecturer_private',
    'analytics.core_dashboard',
    'hr.appraisal_submit',
    'settings.read',
    'notifications.self',
  ];

  it('hides HR module routes from QA even if permissions include hr.read', () => {
    expect(navAllowed(qaPerms, '/hr/dashboard', 'QA')).toBe(false);
    expect(navAllowed(qaPerms, '/hr/employees', 'QA')).toBe(false);
    expect(routeAllowed(qaPerms, '/hr/appraisals', 'QA')).toBe(false);
    expect(navAllowed(qaPerms, '/hr/dashboard', 'Admin')).toBe(true);
    expect(resolveHomePath(qaPerms, 'QA')).toBe('/dashboard');
  });

  it('still allows lecturers My Appraisal without HR module access', () => {
    expect(navAllowed(['hr.appraisal_submit'], '/staff-appraisal', 'Lecturer')).toBe(true);
    expect(navAllowed(['hr.appraisal_submit'], '/hr/dashboard', 'Lecturer')).toBe(false);
  });

  it('HR can open workforce and appraisal management routes', () => {
    expect(navAllowed(hrPerms, '/hr/employees', 'HR')).toBe(true);
    expect(navAllowed(hrPerms, '/hr/appraisals', 'HR')).toBe(true);
    expect(navAllowed(hrPerms, '/hr/reports', 'HR')).toBe(true);
    expect(navAllowed(hrPerms, '/staff-appraisal', 'HR')).toBe(true);
    expect(resolveHomePath(hrPerms, 'HR')).toBe('/hr/dashboard');
  });

  it('Staff sees My Appraisal and not HR module', () => {
    expect(navAllowed(staffPerms, '/staff-appraisal', 'Staff')).toBe(true);
    expect(navAllowed(staffPerms, '/hr/employees', 'Staff')).toBe(false);
    expect(navAllowed(staffPerms, '/hr/appraisals', 'Staff')).toBe(false);
  });

  it('Lecturer sees My Appraisal and not HR module', () => {
    expect(navAllowed(lecturerPerms, '/staff-appraisal', 'Lecturer')).toBe(true);
    expect(navAllowed(lecturerPerms, '/hr/employees', 'Lecturer')).toBe(false);
    expect(navAllowed(lecturerPerms, '/hr/reports', 'Lecturer')).toBe(false);
  });
});
