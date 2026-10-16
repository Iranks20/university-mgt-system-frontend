import React from 'react';
import { Navigate, useLocation } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import AppShell from './AppShell';
import RoleProvider from './RoleProvider';
import AccessDenied from './AccessDenied';
import ForcedPasswordChange from './ForcedPasswordChange';
import { hasAnyPermission } from '@/lib/nav-permissions';
import { homePathForUser } from '@/lib/clinical-access';

type ProtectedRouteProps = {
  children: React.ReactNode;
  requiredPermissions?: string[];
  requiredPermissionSets?: string[][];
};

function ProtectedRouteContent({ children, requiredPermissions, requiredPermissionSets }: ProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  const permissions = user?.permissions || [];

  let permissionOk = true;
  if (requiredPermissionSets && requiredPermissionSets.length > 0) {
    permissionOk = hasAnyPermission(permissions, requiredPermissionSets);
  } else if (requiredPermissions && requiredPermissions.length > 0) {
    permissionOk = hasAnyPermission(permissions, requiredPermissions);
  }

  if (!permissionOk) {
    const home = homePathForUser(permissions);
    if (home && location.pathname !== home) {
      return <Navigate to={home} replace />;
    }
    return <AccessDenied homePath={home} />;
  }

  return <>{children}</>;
}

export default function ProtectedRoute({ children, requiredPermissions, requiredPermissionSets }: ProtectedRouteProps) {
  const { isAuthenticated, user } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (user?.mustChangePassword) {
    return <ForcedPasswordChange />;
  }

  return (
    <RoleProvider>
      <AppShell>
        <ProtectedRouteContent
          requiredPermissions={requiredPermissions}
          requiredPermissionSets={requiredPermissionSets}
        >
          {children}
        </ProtectedRouteContent>
      </AppShell>
    </RoleProvider>
  );
}
