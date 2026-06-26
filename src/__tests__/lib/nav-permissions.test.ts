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

  it('hides admin users folder entries without admin.console', () => {
    expect(navAllowed(campusQaPerms, '/admin-users')).toBe(false);
    expect(navAllowed(campusQaPerms, '/admin-students')).toBe(false);
  });

  it('resolves a home path for campus QA', () => {
    expect(resolveHomePath(campusQaPerms)).toBe('/dashboard');
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
});
