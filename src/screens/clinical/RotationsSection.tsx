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
type RotationRow = {
  id: string;
  name: string;
  clinicalSiteId?: string;
  programId?: string | null;
  programIntakeId?: string | null;
  cohort?: string;
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

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6];
const SEMESTER_OPTIONS = [1, 2];

const emptyForm = () => ({
  name: '',
  clinicalSiteId: '',
  programId: '',
  cohort: '',
  year: '3',
  semester: '1',
  intakeType: 'Day',
  startDate: '',
  endDate: '',
  isActive: true,
});

function buildCohortLabel(program: ProgramOption | undefined, year: string, semester: string) {
  if (!program || !year || !semester) return '';
  const code = program.code?.trim() || program.name.trim();
  return `${code} ${year}.${semester}`;
}

function buildSuggestedName(siteName: string | undefined, cohort: string) {
  if (!siteName || !cohort) return '';
  return `${cohort} — ${siteName}`;
}

export function RotationsSection({ rotations, sites, programs, canManage, loading, onRefresh }: RotationsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<RotationRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [cohortTouched, setCohortTouched] = useState(false);
  const [nameTouched, setNameTouched] = useState(false);
  const [saving, setSaving] = useState(false);
  const [rosterRotation, setRosterRotation] = useState<RotationRow | null>(null);
  const [rosterOpen, setRosterOpen] = useState(false);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === form.programId),
    [programs, form.programId]
  );
  const selectedSite = useMemo(() => sites.find((s) => s.id === form.clinicalSiteId), [sites, form.clinicalSiteId]);

  const programSelectOptions = useMemo(() => {
    const opts = [...programs];
    if (form.programId && !opts.some((p) => p.id === form.programId)) {
      opts.push({ id: form.programId, name: 'Inactive program', code: '' });
    }
    return opts;
  }, [programs, form.programId]);

  useEffect(() => {
    if (!modalOpen || cohortTouched) return;
    const cohort = buildCohortLabel(selectedProgram, form.year, form.semester);
    if (cohort && cohort !== form.cohort) {
      setForm((f) => ({ ...f, cohort }));
    }
  }, [modalOpen, cohortTouched, selectedProgram, form.year, form.semester, form.cohort]);

  useEffect(() => {
    if (!modalOpen || nameTouched) return;
    const suggested = buildSuggestedName(selectedSite?.name, form.cohort);
    if (suggested && suggested !== form.name) {
      setForm((f) => ({ ...f, name: suggested }));
    }
  }, [modalOpen, nameTouched, selectedSite?.name, form.cohort, form.name]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setCohortTouched(false);
    setNameTouched(false);
    setModalOpen(true);
  };

  const openEdit = (row: RotationRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      clinicalSiteId: row.clinicalSiteId || '',
      programId: row.programId || '',
      cohort: row.cohort || '',
      year: row.year != null ? String(row.year) : '3',
      semester: row.semester != null ? String(row.semester) : '1',
      intakeType: row.intakeType || 'Day',
      startDate: row.startDate ? String(row.startDate).slice(0, 10) : '',
      endDate: row.endDate ? String(row.endDate).slice(0, 10) : '',
      isActive: row.isActive !== false,
    });
    setCohortTouched(true);
    setNameTouched(true);
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.clinicalSiteId) {
      toast.error('Rotation name and site are required');
      return;
    }
    if (!form.programId) {
      toast.error('Program is required');
      return;
    }
    if (!form.year || !form.semester) {
      toast.error('Academic year and semester are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        clinicalSiteId: form.clinicalSiteId,
        programId: form.programId,
        cohort: form.cohort.trim() || undefined,
        year: Number(form.year),
        semester: Number(form.semester),
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
        toast.success('Rotation created');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save rotation');
    } finally {
      setSaving(false);
    }
  };

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
                  No rotations defined.
                </TableCell>
              </TableRow>
            ) : (
              rotations.map((r) => (
                <TableRow key={r.id}>
                  <TableCell className="font-medium">{r.name}</TableCell>
                  <TableCell>{r.clinicalSite?.name || '—'}</TableCell>
                  <TableCell>{r.cohort || '—'}</TableCell>
                  <TableCell>{r.activeRosterCount ?? 0} active</TableCell>
                  <TableCell>
                    {r.startDate ? String(r.startDate).slice(0, 10) : '—'} – {r.endDate ? String(r.endDate).slice(0, 10) : '—'}
                  </TableCell>
                  <TableCell>{clinicalActiveBadge(r.isActive !== false)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        title="Manage roster"
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
                Link the placement to a program, academic year, and semester. Cohort and name are suggested from your selections.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
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
                  <Label>Program</Label>
                  <Select
                    value={form.programId || undefined}
                    onValueChange={(v) => setForm((f) => ({ ...f, programId: v }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select program" />
                    </SelectTrigger>
                    <SelectContent>
                      {programSelectOptions.map((p) => (
                        <SelectItem
                          key={p.id}
                          value={p.id}
                          disabled={!programs.some((active) => active.id === p.id)}
                        >
                          {p.code ? `${p.name} (${p.code})` : p.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Academic year</Label>
                  <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Year" />
                    </SelectTrigger>
                    <SelectContent>
                      {YEAR_OPTIONS.map((y) => (
                        <SelectItem key={y} value={String(y)}>
                          Year {y}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Semester</Label>
                  <Select value={form.semester} onValueChange={(v) => setForm((f) => ({ ...f, semester: v }))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Semester" />
                    </SelectTrigger>
                    <SelectContent>
                      {SEMESTER_OPTIONS.map((s) => (
                        <SelectItem key={s} value={String(s)}>
                          Semester {s}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
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
              </div>
              <div className="space-y-2">
                <Label>Cohort label</Label>
                <Input
                  value={form.cohort}
                  onChange={(e) => {
                    setCohortTouched(true);
                    setForm((f) => ({ ...f, cohort: e.target.value }));
                  }}
                  placeholder="e.g. MBChB 3.1"
                />
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
                  <Input type="date" value={form.startDate} onChange={(e) => setForm((f) => ({ ...f, startDate: e.target.value }))} />
                </div>
                <div className="space-y-2">
                  <Label>End date</Label>
                  <Input type="date" value={form.endDate} onChange={(e) => setForm((f) => ({ ...f, endDate: e.target.value }))} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.isActive ? 'active' : 'inactive'} onValueChange={(v) => setForm((f) => ({ ...f, isActive: v === 'active' }))}>
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
