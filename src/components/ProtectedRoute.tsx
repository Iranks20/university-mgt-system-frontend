import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import AppShell from './AppShell';
import RoleProvider, { useRole } from './RoleProvider';
import AccessDenied from './AccessDenied';
import { hasAnyPermission, resolveHomePath } from '@/lib/nav-permissions';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  requiredPermissionSets?: string[][];
};

function ProtectedRouteContent({
  children,
  allowedRoles,
  requiredPermissions,
  requiredPermissionSets,
}: ProtectedRouteProps) {
  const { role } = useRole();
  const { userRole, user } = useAuth();
  const location = useLocation();

  const currentRole = role || userRole;
  const permissions = user?.permissions || [];
  const enforcePermissions =
    String(import.meta.env.VITE_RBAC_UI_ENFORCE_PERMISSIONS || '') === 'true' ||
    !!(requiredPermissionSets?.length || requiredPermissions?.length);

  if (enforcePermissions) {
    let permissionOk = true;
    if (requiredPermissionSets && requiredPermissionSets.length > 0) {
      permissionOk = hasAnyPermission(permissions, requiredPermissionSets);
    } else if (requiredPermissions && requiredPermissions.length > 0) {
      permissionOk = hasAnyPermission(permissions, requiredPermissions);
    }

    let roleOk = true;
    if (allowedRoles && allowedRoles.length > 0) {
      roleOk = !!currentRole && allowedRoles.includes(currentRole);
    }

    if (!permissionOk || !roleOk) {
      const home = resolveHomePath(permissions);
      if (home && location.pathname !== home) {
        return <Navigate to={home} replace />;
      }
      return <AccessDenied homePath={home} />;
    }
  } else if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    const home = resolveHomePath(permissions);
    if (home && location.pathname !== home) {
      return <Navigate to={home} replace />;
    }
    return <AccessDenied homePath={home} />;
  }

  return <>{children}</>;
}

export default function ProtectedRoute({
  children,
  allowedRoles,
  requiredPermissions,
  requiredPermissionSets,
}: ProtectedRouteProps) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RoleProvider>
      <AppShell>
        <ProtectedRouteContent
          allowedRoles={allowedRoles}
          requiredPermissions={requiredPermissions}
          requiredPermissionSets={requiredPermissionSets}
        >
          {children}
        </ProtectedRouteContent>
      </AppShell>
    </RoleProvider>
  );
}
