import { Navigate, useSearchParams } from 'react-router';
import { useAuth } from '@/contexts/AuthContext';
import { buildClinicalAccess, defaultClinicalTab } from '@/lib/clinical-access';
import { CLINICAL_ROUTES, LEGACY_CLINICAL_TAB_PATH } from '@/lib/clinical-routes';

export default function ClinicalLegacyRedirect() {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();
  const access = buildClinicalAccess(user?.permissions);
  const tab = searchParams.get('tab');
  const report = searchParams.get('report');

  if (tab && LEGACY_CLINICAL_TAB_PATH[tab]) {
    const base = LEGACY_CLINICAL_TAB_PATH[tab];
    if (tab === 'reports' && report) {
      return <Navigate to={`${base}?report=${encodeURIComponent(report)}`} replace />;
    }
    return <Navigate to={base} replace />;
  }

  const fallbackTab = defaultClinicalTab(access);
  const path = LEGACY_CLINICAL_TAB_PATH[fallbackTab] ?? CLINICAL_ROUTES.sessions;
  return <Navigate to={path} replace />;
}
