import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import AppShell from './AppShell';
import RoleProvider, { useRole } from './RoleProvider';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
  requiredPermissions?: string[];
  requiredPermissionSets?: string[][];
};

function ProtectedRouteContent({ children, allowedRoles, requiredPermissions, requiredPermissionSets }: ProtectedRouteProps) {
  const { role } = useRole();
  const { userRole, user } = useAuth();
  
  const currentRole = role || userRole;
  const permissions = user?.permissions || [];
  const enforcePermissions = String(import.meta.env.VITE_RBAC_UI_ENFORCE_PERMISSIONS || '') === 'true';

  if (enforcePermissions) {
    const have = new Set(permissions);
    if (requiredPermissionSets && requiredPermissionSets.length > 0) {
      const ok = requiredPermissionSets.some((set) => set.length > 0 && set.every((p) => have.has(p)));
      if (!ok) return <Navigate to="/dashboard" replace />;
    } else if (requiredPermissions && requiredPermissions.length > 0) {
      const ok = requiredPermissions.some((p) => have.has(p));
      if (!ok) return <Navigate to="/dashboard" replace />;
    }
  } else {
    if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
      return <Navigate to="/dashboard" replace />;
    }
  }

  return <>{children}</>;
}

export default function ProtectedRoute({ children, allowedRoles, requiredPermissions, requiredPermissionSets }: ProtectedRouteProps) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RoleProvider>
      <AppShell>
        <ProtectedRouteContent allowedRoles={allowedRoles} requiredPermissions={requiredPermissions} requiredPermissionSets={requiredPermissionSets}>
          {children}
        </ProtectedRouteContent>
      </AppShell>
    </RoleProvider>
  );
}
