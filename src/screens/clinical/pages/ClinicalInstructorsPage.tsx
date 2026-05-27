import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services/clinical.service';
import { InstructorsSection } from '../InstructorsSection';

export default function ClinicalInstructorsPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [sites, setSites] = useState<any[]>([]);

  const loadSites = useCallback(async () => {
    try {
      const sitesRes = await clinicalService.getSites({ page: 1, limit: 200, status: 'active' });
      setSites(sitesRes.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load sites');
      setSites([]);
    }
  }, []);

  useEffect(() => {
    loadSites();
  }, [loadSites]);

  return (
    <ClinicalPageShell
      title="Clinical Instructors"
      description="Registered instructors for clinical teaching (university staff linked from HR, or external preceptors). Add people here before assigning them on sessions."
    >
      <InstructorsSection sites={sites} canManage={access.canManageInstructors} />
    </ClinicalPageShell>
  );
}
