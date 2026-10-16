import { describe, expect, it } from 'vitest';
import { homePathForUser } from '@/lib/clinical-access';

describe('homePathForUser', () => {
  it('sends a user with the management overview there, not to clinical sessions', () => {
    const adminPerms = [
      'analytics.mgmt_overview',
      'admin.console',
      'clinical.sessions.record',
      'clinical.sites.manage',
    ];
    expect(homePathForUser(adminPerms)).toBe('/management-overview');
  });

  it('sends HR readers to the HR dashboard', () => {
    expect(homePathForUser(['hr.read', 'hr.write'])).toBe('/hr/dashboard');
  });

  it('sends attendance desk operators to the desk', () => {
    expect(homePathForUser(['staff_attendance.record'])).toBe('/attendance-desk');
  });

  it('sends graduation-only users to the graduation dashboard', () => {
    expect(homePathForUser(['graduation.access', 'graduation.manage'])).toBe('/graduation/dashboard');
  });

  it('keeps general dashboard users on the dashboard even with graduation access', () => {
    expect(homePathForUser(['analytics.core_dashboard', 'qa.review', 'graduation.access'])).toBe(
      '/dashboard'
    );
  });

  it('falls back to the dashboard when nothing matches', () => {
    expect(homePathForUser([])).toBe('/dashboard');
  });
});
