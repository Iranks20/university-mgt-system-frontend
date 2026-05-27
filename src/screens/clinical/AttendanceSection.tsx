import { useEffect, useMemo, useState } from 'react';
import { ClipboardList } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { ClinicalTableCard } from './ClinicalTableCard';

type SessionOption = {
  id: string;
  date: string;
  topic: string;
  clinicalRotationId?: string | null;
  attendances?: Array<{ studentId: string; status: string; remarks?: string }>;
};

type AttendanceSectionProps = {
  sessions: SessionOption[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
};

type AttendanceRow = { studentId: string; status: 'Present' | 'Absent' | 'Late' | 'Excused'; remarks: string };

type RosterStudent = {
  studentId: string;
  student: {
    id: string;
    firstName?: string;
    lastName?: string;
    studentNumber?: string;
  };
};

export function AttendanceSection({ sessions, loading, onRefresh }: AttendanceSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [attendanceSessionId, setAttendanceSessionId] = useState('');
  const [attendanceRows, setAttendanceRows] = useState<AttendanceRow[]>([]);
  const [studentLabels, setStudentLabels] = useState<Record<string, string>>({});
  const [rosterLoading, setRosterLoading] = useState(false);
  const [rosterHint, setRosterHint] = useState('');
  const [saving, setSaving] = useState(false);

  const selectedSession = useMemo(
    () => sessions.find((s) => s.id === attendanceSessionId) || null,
    [sessions, attendanceSessionId]
  );

  useEffect(() => {
    if (!selectedSession) {
      setAttendanceRows([]);
      setStudentLabels({});
      setRosterHint('');
      return;
    }

    let cancelled = false;
    const loadRoster = async () => {
      setRosterLoading(true);
      setRosterHint('');
      try {
        if (!selectedSession.clinicalRotationId) {
          setAttendanceRows([]);
          setRosterHint('This session has no rotation. Link a rotation when recording the session, then add students to its roster.');
          return;
        }
        const roster: RosterStudent[] = await clinicalService.getSessionRoster(selectedSession.id);
        if (cancelled) return;
        if (!roster.length) {
          setAttendanceRows([]);
          setStudentLabels({});
          setRosterHint('No students on this rotation roster. Add students under Clinical Rotations → Manage roster.');
          return;
        }
        const existing = new Map((selectedSession.attendances || []).map((a) => [a.studentId, a]));
        const labels: Record<string, string> = {};
        const rows = roster.map((entry) => {
          const s = entry.student;
          const studentId = entry.studentId || s.id;
          const name = `${s.firstName || ''} ${s.lastName || ''}`.trim();
          labels[studentId] = name ? `${s.studentNumber || ''} — ${name}`.trim() : s.studentNumber || studentId;
          return {
            studentId,
            status: (existing.get(studentId)?.status as AttendanceRow['status']) || 'Present',
            remarks: existing.get(studentId)?.remarks || '',
          };
        });
        setStudentLabels(labels);
        setAttendanceRows(rows);
      } catch (e: any) {
        if (!cancelled) {
          toast.error(e?.message || 'Failed to load rotation roster');
          setAttendanceRows([]);
        }
      } finally {
        if (!cancelled) setRosterLoading(false);
      }
    };

    loadRoster();
    return () => {
      cancelled = true;
    };
  }, [selectedSession]);

  const openMark = () => {
    const withRotation = sessions.find((s) => s.clinicalRotationId);
    setAttendanceSessionId(withRotation?.id || sessions[0]?.id || '');
    setModalOpen(true);
  };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!attendanceSessionId || attendanceRows.length === 0) {
      toast.error('Select a session with roster students to mark');
      return;
    }
    setSaving(true);
    try {
      await clinicalService.markAttendance(attendanceSessionId, { attendances: attendanceRows });
      toast.success('Attendance saved');
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save attendance');
    } finally {
      setSaving(false);
    }
  };

  const sessionsWithCounts = sessions.map((s) => ({
    ...s,
    marked: s.attendances?.length ?? 0,
  }));

  return (
    <>
      <ClinicalTableCard
        title="Sessions with attendance"
        total={sessions.length}
        loading={loading}
        action={
          <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={openMark} disabled={sessions.length === 0}>
            <ClipboardList className="mr-2 h-4 w-4" />
            Mark attendance
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Rotation</TableHead>
              <TableHead>Students marked</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessionsWithCounts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                  Record a clinical session (with a rotation) before marking attendance.
                </TableCell>
              </TableRow>
            ) : (
              sessionsWithCounts.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{String(s.date).slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{s.topic}</TableCell>
                  <TableCell>{s.clinicalRotationId ? 'Linked' : '—'}</TableCell>
                  <TableCell>{s.marked}</TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ClinicalTableCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[98vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Mark student attendance</DialogTitle>
            <DialogDescription>Attendance is limited to the active rotation roster for this session.</DialogDescription>
          </DialogHeader>
          <form onSubmit={submit} className="space-y-4">
            <div className="space-y-2">
              <Label>Session</Label>
              <Select value={attendanceSessionId} onValueChange={setAttendanceSessionId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select session" />
                </SelectTrigger>
                <SelectContent>
                  {sessions.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {`${String(s.date).slice(0, 10)} — ${s.topic}${s.clinicalRotationId ? '' : ' (no rotation)'}`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {rosterHint && (
              <p className="text-sm text-amber-700 bg-amber-50 border border-amber-200 rounded-md px-3 py-2">{rosterHint}</p>
            )}
            {rosterLoading && <p className="text-sm text-muted-foreground">Loading rotation roster…</p>}
            {attendanceRows.length > 0 && (
              <div className="max-h-[50vh] overflow-auto rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Student</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Remarks</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {attendanceRows.map((row, idx) => (
                      <TableRow key={row.studentId}>
                        <TableCell>{studentLabels[row.studentId] || row.studentId}</TableCell>
                        <TableCell>
                          <Select
                            value={row.status}
                            onValueChange={(v) =>
                              setAttendanceRows((prev) => prev.map((p, i) => (i === idx ? { ...p, status: v as AttendanceRow['status'] } : p)))
                            }
                          >
                            <SelectTrigger className="w-[140px]">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="Present">Present</SelectItem>
                              <SelectItem value="Absent">Absent</SelectItem>
                              <SelectItem value="Late">Late</SelectItem>
                              <SelectItem value="Excused">Excused</SelectItem>
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input
                            value={row.remarks}
                            onChange={(e) =>
                              setAttendanceRows((prev) => prev.map((p, i) => (i === idx ? { ...p, remarks: e.target.value } : p)))
                            }
                          />
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving || rosterLoading}>
                {saving ? 'Saving…' : 'Save attendance'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
