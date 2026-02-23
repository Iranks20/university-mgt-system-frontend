import React from 'react';
import { Navigate } from 'react-router';
import { useAuth } from '../contexts/AuthContext';
import AppShell from './AppShell';
import RoleProvider, { useRole } from './RoleProvider';

type ProtectedRouteProps = {
  children: React.ReactNode;
  allowedRoles?: string[];
};

// Inner component that can use RoleProvider context
function ProtectedRouteContent({ children, allowedRoles }: ProtectedRouteProps) {
  const { role } = useRole();
  const { userRole } = useAuth();
  
  // Use role from RoleProvider if available, otherwise fall back to AuthContext
  const currentRole = role || userRole;

  if (allowedRoles && currentRole && !allowedRoles.includes(currentRole)) {
    // Redirect to dashboard if user doesn't have access to this route
    return <Navigate to="/dashboard" replace />;
  }

  return <>{children}</>;
}

export default function ProtectedRoute({ children, allowedRoles }: ProtectedRouteProps) {
  const { isAuthenticated, userRole } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return (
    <RoleProvider>
      <AppShell>
        <ProtectedRouteContent allowedRoles={allowedRoles}>
          {children}
        </ProtectedRouteContent>
      </AppShell>
    </RoleProvider>
  );
}
