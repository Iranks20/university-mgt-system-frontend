import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { buildClinicalAccess } from '@/lib/clinical-access';
import { clinicalService } from '@/services/clinical.service';
import { SessionsSection } from '../SessionsSection';

export default function ClinicalSessionsPage() {
  const { user } = useAuth();
  const access = buildClinicalAccess(user?.permissions);
  const [sessions, setSessions] = useState<any[]>([]);
  const [sites, setSites] = useState<any[]>([]);
  const [rotations, setRotations] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const verifyOnly = access.canVerifySessions && !access.canRecordSessions;
  const title = verifyOnly ? 'Verify Sessions' : 'Clinical Sessions';
  const description = verifyOnly
    ? 'Review and verify sessions submitted by QA clinicals.'
    : 'Record ad-hoc teaching sessions at clinical sites.';

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [sessionsRes, sitesRes, rotationsRes] = await Promise.all([
        clinicalService.getSessions({ page: 1, limit: 200 }),
        clinicalService.getSites({ page: 1, limit: 200, status: 'active' }),
        clinicalService.getRotations({ page: 1, limit: 200 }),
      ]);
      setSessions(sessionsRes.data || []);
      setSites(sitesRes.data || []);
      setRotations(rotationsRes.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load sessions');
      setSessions([]);
      setSites([]);
      setRotations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell title={title} description={description}>
      <SessionsSection
        sessions={sessions}
        sites={sites}
        rotations={rotations}
        canRecord={access.canRecordSessions}
        canVerify={access.canVerifySessions}
        loading={loading}
        onRefresh={load}
      />
    </ClinicalPageShell>
  );
}
