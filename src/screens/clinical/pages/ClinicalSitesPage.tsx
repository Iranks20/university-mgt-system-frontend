import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services/clinical.service';
import { SitesSection, type ClinicalSiteStatusFilter } from '../SitesSection';

export default function ClinicalSitesPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClinicalSiteStatusFilter>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await clinicalService.getSites({ page: 1, limit: 200, status: statusFilter });
      setSites(res.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load clinical sites');
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell
      title="Clinical Sites"
      description="Hospital and ward locations where clinical teaching takes place."
    >
      <SitesSection
        sites={sites}
        canManage={access.canManageSites}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
