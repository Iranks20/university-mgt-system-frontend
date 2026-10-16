import type { GraduationCommitteeType } from '@/features/graduation/types';
import type { GraduationModuleAccess } from '@/services/graduation-module.service';
import { hasAnyPermission } from '@/lib/nav-permissions';

export type GraduationAccess = {
  canAccessModule: boolean;
  canManageEvent: boolean;
  canViewRegistrations: boolean;
  canViewAllCommittees: boolean;
  assignedCommitteeTypes: GraduationCommitteeType[];
  canEditCommittee: (type: GraduationCommitteeType) => boolean;
  canViewCommittee: (type: GraduationCommitteeType) => boolean;
};

const GRADUATION_MODULE_PERMISSIONS = [
  'graduation.access',
  'graduation.registrations',
  'graduation.committee',
  'graduation.manage',
  'admin.console',
];

export function graduationModuleAllowed(permissions: string[] | undefined): boolean {
  return hasAnyPermission(permissions ?? [], GRADUATION_MODULE_PERMISSIONS);
}

export function graduationCanManage(permissions: string[] | undefined): boolean {
  return hasAnyPermission(permissions ?? [], ['graduation.manage', 'admin.console']);
}

export function graduationCanViewRegistrations(permissions: string[] | undefined): boolean {
  return (
    graduationCanManage(permissions) ||
    hasAnyPermission(permissions ?? [], ['graduation.registrations'])
  );
}

export function graduationHomePath(permissions?: string[]): string | null {
  return graduationModuleAllowed(permissions) ? '/graduation/dashboard' : null;
}

export function buildGraduationAccess(params: {
  permissions?: string[];
  serverAccess?: GraduationModuleAccess | null;
}): GraduationAccess {
  const canAccessModule = graduationModuleAllowed(params.permissions);
  const server = params.serverAccess;
  const canManageEvent = server?.canManageEvent ?? graduationCanManage(params.permissions);
  const canViewAllCommittees = server?.canViewAllCommittees ?? canManageEvent;
  const canViewRegistrations =
    server?.canViewRegistrations ?? graduationCanViewRegistrations(params.permissions);

  const canEditCommittee = (_type: GraduationCommitteeType): boolean =>
    canAccessModule && (canManageEvent || canViewAllCommittees);

  const canViewCommittee = (_type: GraduationCommitteeType): boolean =>
    canAccessModule && (canViewAllCommittees || canManageEvent);

  return {
    canAccessModule,
    canManageEvent,
    canViewRegistrations,
    canViewAllCommittees,
    assignedCommitteeTypes: [],
    canEditCommittee,
    canViewCommittee,
  };
}
