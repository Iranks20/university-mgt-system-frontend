import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services/clinical.service';
import { CohortsSection, type ClinicalCohortStatusFilter } from '../CohortsSection';

export default function ClinicalCohortsPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [cohorts, setCohorts] = useState<any[]>([]);
  const [programs, setPrograms] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<ClinicalCohortStatusFilter>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [cohortsRes, policies] = await Promise.all([
        clinicalService.getCohorts({ page: 1, limit: 200, status: statusFilter }),
        clinicalService.getProgramPolicies('active'),
      ]);
      setCohorts(cohortsRes.data || []);
      setPrograms(
        (Array.isArray(policies) ? policies : [])
          .filter((p) => p?.isActive !== false && p?.program?.id)
          .map((p) => ({
            id: p.program.id,
            name: p.program.name,
            code: p.program.code,
          }))
      );
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load cohorts');
      setCohorts([]);
      setPrograms([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  const canManage = access.canManageRotations;

  return (
    <ClinicalPageShell
      title="Clinical Cohorts"
      description="Build reusable student groups for clinical rotations. Roster changes sync live to every linked rotation."
    >
      <CohortsSection
        cohorts={cohorts}
        programs={programs}
        canManage={canManage}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
