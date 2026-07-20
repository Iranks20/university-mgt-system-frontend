import { describe, expect, it } from 'vitest';
import { homePathForRole } from '@/lib/clinical-access';

describe('homePathForRole', () => {
  it('sends Admin to management overview, not clinical sessions', () => {
    const adminPerms = [
      'analytics.mgmt_overview',
      'admin.console',
      'clinical.sessions.record',
      'clinical.sites.manage',
    ];
    expect(homePathForRole('Admin', adminPerms)).toBe('/management-overview');
  });

  it('sends Management to management overview', () => {
    expect(homePathForRole('Management', ['analytics.mgmt_overview'])).toBe('/management-overview');
  });
});
