import type { GraduationCommitteeType } from '@/features/graduation/types';

import type { GraduationModuleAccess } from '@/services/graduation-module.service';

import { hasAnyPermission, routeAllowed } from '@/lib/nav-permissions';



const GRADUATION_MODULE_ROLES = new Set(['Graduation', 'Admin']);



export type GraduationAccess = {

  canAccessModule: boolean;

  canManageEvent: boolean;

  canViewRegistrations: boolean;

  canViewAllCommittees: boolean;

  assignedCommitteeTypes: GraduationCommitteeType[];

  canEditCommittee: (type: GraduationCommitteeType) => boolean;

  canViewCommittee: (type: GraduationCommitteeType) => boolean;

};



function hasGraduationPermission(permissions: string[] | undefined, code: string): boolean {

  return (permissions ?? []).includes(code);

}



export function isGraduationPortalRole(role?: string | null): boolean {

  return role === 'Graduation';

}



function accessFromPermissions(params: {

  permissions?: string[];

  role?: string | null;

}): Omit<GraduationAccess, 'canEditCommittee' | 'canViewCommittee'> {

  const permissions = params.permissions ?? [];

  const role = params.role ?? null;

  const portal = isGraduationPortalRole(role);

  const isAdminRole = role === 'Admin';



  const canAccessByPermission =

    routeAllowed(permissions, '/graduation/dashboard') ||

    hasGraduationPermission(permissions, 'graduation.access') ||

    hasGraduationPermission(permissions, 'graduation.registrations') ||

    hasGraduationPermission(permissions, 'admin.console');



  const canAccessModule = portal || (role !== null && isAdminRole) || canAccessByPermission;



  const canManageEvent =

    portal ||

    isAdminRole ||

    hasGraduationPermission(permissions, 'graduation.manage') ||

    hasGraduationPermission(permissions, 'admin.console');



  const canViewRegistrations =

    portal ||

    canManageEvent ||

    hasGraduationPermission(permissions, 'graduation.registrations') ||

    hasGraduationPermission(permissions, 'admin.console');



  return {

    canAccessModule,

    canManageEvent,

    canViewRegistrations,

    canViewAllCommittees: portal || canManageEvent,

    assignedCommitteeTypes: [],

  };

}



export function buildGraduationAccess(params: {

  permissions?: string[];

  role?: string | null;

  serverAccess?: GraduationModuleAccess | null;

}): GraduationAccess {

  const base = accessFromPermissions(params);

  const portal = isGraduationPortalRole(params.role);

  const server = params.serverAccess;



  const canManageEvent = portal ? true : (server?.canManageEvent ?? base.canManageEvent);

  const canViewAllCommittees = portal ? true : (server?.canViewAllCommittees ?? base.canViewAllCommittees);

  const canViewRegistrations = portal

    ? true

    : (server?.canViewRegistrations ?? base.canViewRegistrations);



  const canEditCommittee = (_type: GraduationCommitteeType): boolean => {

    if (!base.canAccessModule && !portal) return false;

    if (portal || canManageEvent || canViewAllCommittees) return true;

    return false;

  };



  const canViewCommittee = (_type: GraduationCommitteeType): boolean => {

    if (!base.canAccessModule && !portal) return false;

    if (portal || canViewAllCommittees || canManageEvent) return true;

    return false;

  };



  return {

    canAccessModule: base.canAccessModule || portal,

    canManageEvent,

    canViewRegistrations,

    canViewAllCommittees,

    assignedCommitteeTypes: [],

    canEditCommittee,

    canViewCommittee,

  };

}



export function graduationModuleAllowed(permissions: string[], role?: string | null): boolean {

  if (isGraduationPortalRole(role)) return true;

  if (role === 'Admin') return true;

  return hasAnyPermission(permissions, [

    ['graduation.access'],

    ['graduation.registrations'],

    ['graduation.committee'],

    ['graduation.manage'],

    ['admin.console'],

  ]);

}



export function graduationHomePath(permissions?: string[], role?: string | null): string | null {

  if (isGraduationPortalRole(role)) return '/graduation/dashboard';

  if (!graduationModuleAllowed(permissions ?? [], role)) return null;

  return '/graduation/dashboard';

}


