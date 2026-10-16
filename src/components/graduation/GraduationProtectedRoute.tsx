import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import AppShell from '@/components/AppShell';
import RoleProvider from '@/components/RoleProvider';
import AccessDenied from '@/components/AccessDenied';
import ForcedPasswordChange from '@/components/ForcedPasswordChange';
import {
  graduationCanManage,
  graduationCanViewRegistrations,
  graduationModuleAllowed,
} from '@/lib/graduation-access';
import { hasAnyPermission, permissionSetsForRoute } from '@/lib/nav-permissions';
import { homePathForUser } from '@/lib/clinical-access';

type GraduationProtectedRouteProps = {
  children: React.ReactNode;
  path: string;
  requireManage?: boolean;
  requireRegistrations?: boolean;
};

function GraduationProtectedRouteContent({
  children,
  path,
  requireManage,
  requireRegistrations,
}: GraduationProtectedRouteProps) {
  const { user } = useAuth();
  const location = useLocation();
  const permissions = user?.permissions ?? [];

  let allowed =
    graduationModuleAllowed(permissions) &&
    hasAnyPermission(permissions, permissionSetsForRoute(path));
  if (requireManage) allowed = allowed && graduationCanManage(permissions);
  if (requireRegistrations) allowed = allowed && graduationCanViewRegistrations(permissions);

  if (!allowed) {
    const home = homePathForUser(permissions);
    if (home && location.pathname !== home) {
      return <Navigate to={home} replace />;
    }
    return <AccessDenied homePath={home} />;
  }

  return <>{children}</>;
}

export default function GraduationProtectedRoute({
  children,
  path,
  requireManage,
  requireRegistrations,
}: GraduationProtectedRouteProps) {
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
        <GraduationProtectedRouteContent
          path={path}
          requireManage={requireManage}
          requireRegistrations={requireRegistrations}
        >
          {children}
        </GraduationProtectedRouteContent>
      </AppShell>
    </RoleProvider>
  );
}
