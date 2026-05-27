import { useRef, useState } from 'react';
import { Plus, CheckCircle } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { clinicalSessionStatusBadge } from './clinical-ui';
import { ClinicalTableCard } from './ClinicalTableCard';
import { ClinicalInstructorPicker, instructorPickToSessionPayload } from './ClinicalInstructorPicker';

type SiteOption = { id: string; name: string };
type RotationOption = { id: string; name: string };
type SessionRow = {
  id: string;
  date: string;
  topic: string;
  status: string;
  instructorNameSnapshot?: string;
  clinicalSite?: { name?: string };
  clinicalInstructor?: { fullName?: string };
};

type SessionsSectionProps = {
  sessions: SessionRow[];
  sites: SiteOption[];
  rotations: RotationOption[];
  canRecord: boolean;
  canVerify: boolean;
  loading?: boolean;
  onRefresh: () => Promise<void>;
};

const emptyForm = () => ({
  clinicalSiteId: '',
  clinicalRotationId: '',
  instructorPick: '',
  instructorName: '',
  topic: '',
  date: '',
  startTime: '',
  endTime: '',
  notes: '',
});

export function SessionsSection({
  sessions,
  sites,
  rotations,
  canRecord,
  canVerify,
  loading,
  onRefresh,
}: SessionsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const instructorLabelsRef = useRef(new Map<string, string>());

  const openAdd = () => {
    setForm(emptyForm());
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.clinicalSiteId || !form.topic.trim() || !form.date) {
      toast.error('Site, topic, and date are required');
      return;
    }
    const instructorPayload = instructorPickToSessionPayload(
      form.instructorPick,
      instructorLabelsRef.current,
      form.instructorName
    );
    if (!instructorPayload.clinicalInstructorId && !instructorPayload.instructorName) {
      toast.error('Select an instructor or enter a new name');
      return;
    }
    setSaving(true);
    try {
      await clinicalService.createSession({
        clinicalSiteId: form.clinicalSiteId,
        clinicalRotationId: form.clinicalRotationId || null,
        clinicalInstructorId: instructorPayload.clinicalInstructorId ?? null,
        staffId: instructorPayload.staffId ?? null,
        instructorName: instructorPayload.instructorName ?? null,
        topic: form.topic.trim(),
        date: form.date,
        startTime: form.startTime || null,
        endTime: form.endTime || null,
        notes: form.notes || null,
      });
      toast.success('Clinical session recorded');
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to record session');
    } finally {
      setSaving(false);
    }
  };

  const verifySession = async (sessionId: string) => {
    try {
      await clinicalService.verifySession(sessionId);
      toast.success('Session verified');
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to verify session');
    }
  };

  const title = canVerify && !canRecord ? 'Sessions pending verification' : 'All sessions';

  return (
    <>
      <ClinicalTableCard
        title={title}
        total={sessions.length}
        loading={loading}
        action={
          canRecord ? (
            <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Record session
            </Button>
          ) : undefined
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Date</TableHead>
              <TableHead>Topic</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Instructor</TableHead>
              <TableHead>Status</TableHead>
              {canVerify && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sessions.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canVerify ? 6 : 5} className="py-10 text-center text-muted-foreground">
                  No sessions recorded.
                </TableCell>
              </TableRow>
            ) : (
              sessions.map((s) => (
                <TableRow key={s.id}>
                  <TableCell>{String(s.date).slice(0, 10)}</TableCell>
                  <TableCell className="font-medium">{s.topic}</TableCell>
                  <TableCell>{s.clinicalSite?.name || '—'}</TableCell>
                  <TableCell>{s.instructorNameSnapshot || s.clinicalInstructor?.fullName || '—'}</TableCell>
                  <TableCell>{clinicalSessionStatusBadge(s.status)}</TableCell>
                  {canVerify && (
                    <TableCell className="text-right">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => verifySession(s.id)}
                        disabled={s.status === 'Verified'}
                      >
                        <CheckCircle className="mr-1 h-4 w-4" />
                        Verify
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ClinicalTableCard>

      {canRecord && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Record clinical session</DialogTitle>
              <DialogDescription>Log a teaching session at a clinical site.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Clinical site</Label>
                  <Select
                    value={form.clinicalSiteId}
                    onValueChange={(v) =>
                      setForm((f) => ({ ...f, clinicalSiteId: v, instructorPick: '' }))
                    }
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select site" />
                    </SelectTrigger>
                    <SelectContent>
                      {sites.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <Label>Rotation (optional)</Label>
                    {form.clinicalRotationId ? (
                      <button
                        type="button"
                        className="text-xs text-muted-foreground hover:text-foreground underline"
                        onClick={() => setForm((f) => ({ ...f, clinicalRotationId: '' }))}
                      >
                        Clear
                      </button>
                    ) : null}
                  </div>
                  <Select
                    value={form.clinicalRotationId || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, clinicalRotationId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="No rotation linked" />
                    </SelectTrigger>
                    <SelectContent>
                      {rotations.map((r) => (
                        <SelectItem key={r.id} value={r.id}>
                          {r.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2 sm:col-span-2">
                  <Label>Existing instructor (optional)</Label>
                  <ClinicalInstructorPicker
                    value={form.instructorPick}
                    clinicalSiteId={form.clinicalSiteId || undefined}
                    onValueChange={(pick, label) => {
                      if (label) instructorLabelsRef.current.set(pick, label);
                      setForm((f) => ({ ...f, instructorPick: pick, instructorName: '' }));
                    }}
                  />
                  <p className="text-xs text-muted-foreground">
                    Only instructors registered under Clinical → Instructors. To add someone new, register them there first.
                  </p>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Label>Or new instructor name</Label>
                  <Input
                    value={form.instructorName}
                    onChange={(e) =>
                      setForm((f) => ({
                        ...f,
                        instructorName: e.target.value,
                        instructorPick: '',
                      }))
                    }
                    placeholder="If not in list above"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Session topic</Label>
                <Input value={form.topic} onChange={(e) => setForm((f) => ({ ...f, topic: e.target.value }))} required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Date</Label>
                  <Input type="date" value={form.date} onChange={(e) => setForm((f) => ({ ...f, date: e.target.value }))} required />
                </div>
                <div className="space-y-2">
                  <Label>Start time</Label>
                  <Input type="time" value={form.startTime} onChange={(e) => setForm((f) => ({ ...f, startTime: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End time</Label>
                  <Input type="time" value={form.endTime} onChange={(e) => setForm((f) => ({ ...f, endTime: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Notes (optional)</Label>
                <Input value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} />
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving}>
                  {saving ? 'Saving…' : 'Save session'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
