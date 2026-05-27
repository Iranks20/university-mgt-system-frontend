import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services';
import { RotationsSection } from '../RotationsSection';

export default function ClinicalRotationsListPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [rotations, setRotations] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [rotationsRes, sitesRes, programsRes] = await Promise.all([
        clinicalService.getRotations({ page: 1, limit: 200 }),
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
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell
      title="Clinical Rotations"
      description="Student cohort placements by site, program, and intake."
    >
      <RotationsSection
        rotations={rotations}
        sites={sites}
        programs={programs}
        canManage={access.canManageRotations}
        loading={loading}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
