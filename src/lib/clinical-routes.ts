export const CLINICAL_ROUTES = {
  sites: '/clinical/sites',
  siteTeam: '/clinical/site-team',
  instructors: '/clinical/instructors',
  rotations: '/clinical/rotations',
  sessions: '/clinical/sessions',
  attendance: '/clinical/attendance',
  reports: '/clinical/reports',
  policies: '/clinical/policies',
} as const;

export const LEGACY_CLINICAL_TAB_PATH: Record<string, string> = {
  sites: CLINICAL_ROUTES.sites,
  assignments: CLINICAL_ROUTES.siteTeam,
  instructors: CLINICAL_ROUTES.instructors,
  rotations: CLINICAL_ROUTES.rotations,
  sessions: CLINICAL_ROUTES.sessions,
  attendance: CLINICAL_ROUTES.attendance,
  reports: CLINICAL_ROUTES.reports,
};

export function clinicalReportsPath(reportType?: string): string {
  if (!reportType) return CLINICAL_ROUTES.reports;
  return `${CLINICAL_ROUTES.reports}?report=${encodeURIComponent(reportType)}`;
}
