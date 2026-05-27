import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { clinicalService } from '@/services/clinical.service';
import { AssignmentsSection } from '../AssignmentsSection';

export default function ClinicalSiteTeamPage() {
  const [assignments, setAssignments] = useState<any[]>([]);
  const [assignableUsers, setAssignableUsers] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [assignmentRows, users, sitesRes] = await Promise.all([
        clinicalService.getAssignments(),
        clinicalService.getAssignableUsers(),
        clinicalService.getSites({ page: 1, limit: 200, status: 'active' }),
      ]);
      setAssignments(assignmentRows);
      setAssignableUsers(users);
      setSites(sitesRes.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load site team');
      setAssignments([]);
      setAssignableUsers([]);
      setSites([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell
      title="Site Team"
      description="Assign QA clinicals officers to each clinical site."
    >
      <AssignmentsSection
        assignments={assignments}
        sites={sites}
        assignableUsers={assignableUsers}
        loading={loading}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
