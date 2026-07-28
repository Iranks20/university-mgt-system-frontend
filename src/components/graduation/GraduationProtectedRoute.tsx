import { Navigate, useLocation } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { useRole } from '@/components/RoleProvider';
import AppShell from '@/components/AppShell';
import RoleProvider from '@/components/RoleProvider';
import AccessDenied from '@/components/AccessDenied';
import { graduationModuleAllowed } from '@/lib/graduation-access';
import { hasAnyPermission, resolveHomePath } from '@/lib/nav-permissions';
import { permissionSetsForRoute } from '@/lib/nav-permissions';

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
  const { userRole, user } = useAuth();
  const { role } = useRole();
  const location = useLocation();
  const currentRole = role || userRole;
  const permissions = user?.permissions ?? [];

  const moduleOk = graduationModuleAllowed(permissions, currentRole);
  const permissionSets = permissionSetsForRoute(path);
  const routeOk = hasAnyPermission(permissions, permissionSets);

  const enforcePermissions =
    String(import.meta.env.VITE_RBAC_UI_ENFORCE_PERMISSIONS || '') === 'true';

  let allowed = moduleOk || routeOk;
  if (enforcePermissions && currentRole !== 'Graduation') {
    allowed = routeOk || (currentRole === 'Admin' && moduleOk);
  }

  if (requireManage) {
    const canManage =
      currentRole === 'Graduation' ||
      currentRole === 'Admin' ||
      permissions.includes('graduation.manage') ||
      permissions.includes('admin.console');
    allowed = allowed && canManage;
  }

  if (requireRegistrations) {
    const canRegs =
      permissions.includes('graduation.registrations') ||
      permissions.includes('admin.console') ||
      currentRole === 'Admin' ||
      currentRole === 'Graduation';
    allowed = allowed && canRegs;
  }

  if (!allowed) {
    const home =
      currentRole === 'Graduation'
        ? '/graduation/dashboard'
        : resolveHomePath(permissions);
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
  const { isAuthenticated } = useAuth();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
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
