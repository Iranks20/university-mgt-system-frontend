import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { ClinicalPageShell } from '@/components/clinical/ClinicalPageShell';
import { clinicalService } from '@/services';
import { AttendanceSection } from '../AttendanceSection';

export default function ClinicalAttendancePage() {
  const [sessions, setSessions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const sessionsRes = await clinicalService.getSessions({ page: 1, limit: 200 });
      setSessions(sessionsRes.data || []);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load attendance data');
      setSessions([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <ClinicalPageShell
      title="Session Attendance"
      description="Mark attendance for students on each session's rotation roster."
    >
      <AttendanceSection sessions={sessions} loading={loading} onRefresh={load} />
    </ClinicalPageShell>
  );
}
