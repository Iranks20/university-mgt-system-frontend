import { CLINICAL_ROUTES, clinicalReportsPath, LEGACY_CLINICAL_TAB_PATH } from './clinical-routes';
import { resolveHomePath } from './nav-permissions';

export type ClinicalAccess = {
  canManageSites: boolean;
  canManageAssignments: boolean;
  canManageInstructors: boolean;
  canManageRotations: boolean;
  canManageClinicalPolicies: boolean;
  canViewClinicalPolicies: boolean;
  canRecordSessions: boolean;
  canVerifySessions: boolean;
  canViewReports: boolean;
  canViewSites: boolean;
  canViewInstructors: boolean;
  canViewRotations: boolean;
  canViewSessions: boolean;
};

export function buildClinicalAccess(permissions: string[] | undefined): ClinicalAccess {
  const have = new Set(permissions || []);
  const canManageSites = have.has('clinical.sites.manage');
  const canManageAssignments = have.has('clinical.assignments.manage');
  const canManageInstructors = have.has('clinical.instructors.manage');
  const canManageRotations = have.has('clinical.rotations.manage');
  const canManageClinicalPolicies = have.has('clinical.policies.manage');
  const canViewClinicalPolicies =
    canManageClinicalPolicies || have.has('clinical.sites.manage') || canManageRotations;
  const canRecordSessions = have.has('clinical.sessions.record');
  const canVerifySessions = have.has('clinical.sessions.verify');
  const canViewReports = have.has('clinical.reports.view');
  return {
    canManageSites,
    canManageAssignments,
    canManageInstructors,
    canManageRotations,
    canManageClinicalPolicies,
    canViewClinicalPolicies,
    canRecordSessions,
    canVerifySessions,
    canViewReports,
    canViewSites: canManageSites || canViewReports,
    canViewInstructors: canManageInstructors || canRecordSessions || canVerifySessions,
    canViewRotations: canManageRotations || canRecordSessions || canVerifySessions,
    canViewSessions: canRecordSessions || canVerifySessions,
  };
}

export function defaultClinicalTab(access: ClinicalAccess): string {
  if (access.canManageAssignments || access.canManageSites) return 'sites';
  if (access.canRecordSessions) return 'sessions';
  if (access.canVerifySessions) return 'sessions';
  if (access.canViewReports) return 'reports';
  return 'sites';
}

export function homePathForPermissions(permissions: string[] | undefined): string {
  const access = buildClinicalAccess(permissions);
  if (access.canRecordSessions) return CLINICAL_ROUTES.sessions;
  if (access.canManageSites || access.canVerifySessions) return CLINICAL_ROUTES.sites;
  if (access.canViewRotations) return CLINICAL_ROUTES.rotations;
  if (access.canViewReports) return CLINICAL_ROUTES.reports;
  return '/dashboard';
}

export function homePathForRole(_role: string | null, permissions?: string[]): string {
  if (permissions?.length) {
    const clinicalHome = homePathForPermissions(permissions);
    if (clinicalHome !== '/dashboard') return clinicalHome;
    return resolveHomePath(permissions) ?? '/dashboard';
  }
  return '/dashboard';
}

export function clinicalSectionPath(section: string, report?: string): string {
  if (section === 'reports') return clinicalReportsPath(report);
  return LEGACY_CLINICAL_TAB_PATH[section] ?? CLINICAL_ROUTES.sessions;
}
