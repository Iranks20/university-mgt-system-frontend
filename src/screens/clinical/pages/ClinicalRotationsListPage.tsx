import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services';
import { RotationsSection, type ClinicalRotationStatusFilter } from '../RotationsSection';

export default function ClinicalRotationsListPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [rotations, setRotations] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClinicalRotationStatusFilter>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rotationsRes, sitesRes, programsRes] = await Promise.all([
        clinicalService.getRotations({ page: 1, limit: 200, status: statusFilter }),
        clinicalService.getSites({ page: 1, limit: 200, status: 'active' }),
        clinicalService.getClinicalPrograms(),
      ]);
      setRotations(rotationsRes.data || []);
      setSites(sitesRes.data || []);
      setPrograms(Array.isArray(programsRes) ? programsRes : []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load rotations');
      setRotations([]);
      setSites([]);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell
      title="Clinical Rotations"
      description="Link a clinical site to a cohort. Rosters stay live-synced with cohort membership."
    >
      <RotationsSection
        rotations={rotations}
        sites={sites}
        programs={programs}
        canManage={access.canManageRotations}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
