import { describe, expect, it } from 'vitest';
import { navAllowed, resolveHomePath, routeAllowed } from '@/lib/nav-permissions';

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
