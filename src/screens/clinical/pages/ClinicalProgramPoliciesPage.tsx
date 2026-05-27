import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services/clinical.service';
import { ProgramPoliciesSection } from '../ProgramPoliciesSection';

export default function ClinicalProgramPoliciesPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [policies, setPolicies] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<'active' | 'inactive' | 'all'>('active');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const data = await clinicalService.getProgramPolicies(statusFilter);
      setPolicies(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load clinical policies');
      setPolicies([]);
    } finally {
      setLoading(false);
    }
  }, [statusFilter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell
      title="Clinical Eligibility Policies"
      description={
        access.canManageClinicalPolicies
          ? 'Define when students in each program become eligible for clinical placements (e.g. MBChB from year 3 semester 1).'
          : 'View-only: contact the clinical coordinator to change eligibility rules.'
      }
    >
      <ProgramPoliciesSection
        policies={policies}
        canManage={access.canManageClinicalPolicies}
        loading={loading}
        statusFilter={statusFilter}
        onStatusFilterChange={setStatusFilter}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
