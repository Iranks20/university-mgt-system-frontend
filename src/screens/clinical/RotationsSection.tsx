import { useEffect, useMemo, useState } from 'react';
import { Plus, Edit, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { clinicalActiveBadge } from './clinical-ui';
import { ClinicalTableCard } from './ClinicalTableCard';
import { RotationRosterSection } from './RotationRosterSection';

type SiteOption = { id: string; name: string };
type ProgramOption = { id: string; name: string; code?: string };
type CohortOption = {
  id: string;
  name: string;
  programId?: string | null;
  year?: number | null;
  semester?: number | null;
  studentCount?: number;
  isActive?: boolean;
};
type RotationRow = {
  id: string;
  name: string;
  clinicalSiteId?: string;
  clinicalCohortId?: string | null;
  programId?: string | null;
  programIntakeId?: string | null;
  cohort?: string;
  clinicalCohort?: CohortOption | null;
  year?: number | null;
  semester?: number | null;
  activeRosterCount?: number;
  intakeType?: string | null;
  startDate?: string;
  endDate?: string;
  isActive?: boolean;
  clinicalSite?: { name?: string };
};

type RotationsSectionProps = {
  rotations: RotationRow[];
  sites: SiteOption[];
  programs: ProgramOption[];
  canManage: boolean;
  loading?: boolean;
  onRefresh: () => Promise<void>;
};

const emptyForm = () => ({
  name: '',
  clinicalSiteId: '',
  clinicalCohortId: '',
  intakeType: 'Day',
  startDate: '',
  endDate: '',
  isActive: true,
});

function buildSuggestedName(siteName: string | undefined, cohortName: string) {
  if (!siteName || !cohortName) return '';
  return `${cohortName} — ${siteName}`;
}

export function RotationsSection({ rotations, sites, programs, canManage, loading, onRefresh }: RotationsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RotationRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rosterRotation, setRosterRotation] = useState<RotationRow | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);
  const [cohorts, setCohorts] = useState<CohortOption[]>([]);

  const selectedSite = useMemo(() => sites.find((s) => s.id === form.clinicalSiteId), [sites, form.clinicalSiteId]);
  const selectedCohort = useMemo(
    () => cohorts.find((c) => c.id === form.clinicalCohortId),
    [cohorts, form.clinicalCohortId]
  );

  useEffect(() => {
    if (!modalOpen) return;
    clinicalService
      .getCohorts({ page: 1, limit: 200, status: 'active' })
      .then((res) => setCohorts(res.data || []))
      .catch(() => setCohorts([]));
  }, [modalOpen]);

  useEffect(() => {
    if (!modalOpen || nameTouched) return;
    const suggested = buildSuggestedName(selectedSite?.name, selectedCohort?.name || '');
    if (suggested && suggested !== form.name) {
      setForm((f) => ({ ...f, name: suggested }));
    }
  }, [modalOpen, nameTouched, selectedSite?.name, selectedCohort?.name, form.name]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setNameTouched(false);
    setModalOpen(true);
  };

  const openEdit = (row: RotationRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      clinicalSiteId: row.clinicalSiteId || '',
      clinicalCohortId: row.clinicalCohortId || row.clinicalCohort?.id || '',
      intakeType: row.intakeType || 'Day',
      startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
      endDate: row.endDate ? String(row.endDate).slice(0, 10) : '',
      isActive: row.isActive !== false,
    });
    setNameTouched(true);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.clinicalSiteId) {
      toast.error('Rotation name and site are required');
      return;
    }
    if (!form.clinicalCohortId) {
      toast.error('Select a cohort');
      return;
    }
    setSaving(true);
    try {
      const cohort = cohorts.find((c) => c.id === form.clinicalCohortId);
      const payload = {
        name: form.name.trim(),
        clinicalSiteId: form.clinicalSiteId,
        clinicalCohortId: form.clinicalCohortId,
        programId: cohort?.programId || null,
        year: cohort?.year ?? null,
        semester: cohort?.semester ?? null,
        intakeType: (form.intakeType as 'Day' | 'Evening' | 'Weekend') || null,
        startDate: form.startDate || undefined,
        endDate: form.endDate || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await clinicalService.updateRotation(editing.id, payload);
        toast.success('Rotation updated');
      } else {
        await clinicalService.createRotation(payload);
        toast.success('Rotation created — cohort students enrolled on roster');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save rotation');
    } finally {
      setSaving(false);
    }
  };

  const cohortLabel = (r: RotationRow) => r.clinicalCohort?.name || r.cohort || '—';

  return (
    <>
      <ClinicalTableCard
        title="All rotations"
        total={rotations.length}
        loading={loading}
        action={
          canManage ? (
            <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={openAdd}>
              <Plus className="mr-2 h-4 w-4" />
              Add rotation
            </Button>
          ) : undefined
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Site</TableHead>
              <TableHead>Cohort</TableHead>
              <TableHead>Roster</TableHead>
              <TableHead>Period</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rotations.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  No rotations defined. Create a cohort first, then add a rotation linked to it.
                </TableCell>
              </TableRow>
            ) : (
              rotations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.clinicalSite?.name || '—'}</TableCell>
                  <TableCell>{cohortLabel(r)}</TableCell>
                  <TableCell>{r.activeRosterCount ?? 0} active</TableCell>
                  <TableCell>
                    {r.startDate ? String(r.startDate).slice(0, 10) : '—'} –{' '}
                    {r.endDate ? String(r.endDate).slice(0, 10) : '—'}
                  </TableCell>
                  <TableCell>{clinicalActiveBadge(r.isActive !== false)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="View roster"
                        onClick={() => {
                          setRosterRotation(r);
                          setRosterOpen(true);
                        }}
                      >
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(r)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  )}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ClinicalTableCard>

      {canManage && (
        <Dialog open={modalOpen} onOpenChange={setModalOpen}>
          <DialogContent className="w-[96vw] max-w-xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit rotation' : 'Add rotation'}</DialogTitle>
              <DialogDescription>
                Link a clinical site to a cohort. Students in that cohort are live-synced onto this rotation roster.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label>Clinical site</Label>
                <Select value={form.clinicalSiteId} onValueChange={(v) => setForm((f) => ({ ...f, clinicalSiteId: v }))}>
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
                <Label>Cohort</Label>
                <Select
                  value={form.clinicalCohortId || undefined}
                  onValueChange={(v) => setForm((f) => ({ ...f, clinicalCohortId: v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select cohort" />
                  </SelectTrigger>
                  <SelectContent>
                    {cohorts.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {c.studentCount != null ? ` (${c.studentCount} students)` : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cohorts.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active cohorts. Create one under Clinicals → Cohorts first.
                  </p>
                ) : null}
                {selectedCohort ? (
                  <p className="text-xs text-muted-foreground">
                    {programs.find((p) => p.id === selectedCohort.programId)?.code ||
                      programs.find((p) => p.id === selectedCohort.programId)?.name ||
                      'Program'}
                    {selectedCohort.year != null && selectedCohort.semester != null
                      ? ` · Y${selectedCohort.year} S${selectedCohort.semester}`
                      : ''}
                  </p>
                ) : null}
              </div>
              <div className="space-y-2">
                <Label>Intake</Label>
                <Select value={form.intakeType} onValueChange={(v) => setForm((f) => ({ ...f, intakeType: v }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Day">Day</SelectItem>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Weekend">Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Rotation name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => {
                    setNameTouched(true);
                    setForm((f) => ({ ...f, name: e.target.value }));
                  }}
                  required
                />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start date</Label>
                  <Input
                    type="date"
                    value={form.startDate}
                    onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input
                    type="date"
                    value={form.endDate}
                    onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select
                  value={form.isActive ? 'active' : 'inactive'}
                  onValueChange={(v) => setForm((f) => ({ ...f, isActive: v === 'active' }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="active">Active</SelectItem>
                    <SelectItem value="inactive">Inactive</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <DialogFooter>
                <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving}>
                  {saving ? 'Saving…' : editing ? 'Update rotation' : 'Add rotation'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <RotationRosterSection
        rotation={rosterRotation}
        allRotations={rotations}
        open={rosterOpen}
        onOpenChange={setRosterOpen}
        canManage={canManage}
      />
    </>
  );
}
