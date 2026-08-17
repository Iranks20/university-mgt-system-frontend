import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, Download, Edit, Plus, Trash2, UserPlus, Users } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { clinicalActiveBadge } from './clinical-ui';
import { ClinicalTableCard } from './ClinicalTableCard';

export type ClinicalCohortStatusFilter = 'active' | 'inactive' | 'all';

type ProgramOption = { id: string; name: string; code?: string };
type CohortRow = {
  id: string;
  name: string;
  programId?: string | null;
  year?: number | null;
  semester?: number | null;
  description?: string | null;
  isActive?: boolean;
  studentCount?: number;
  rotationCount?: number;
  program?: ProgramOption | null;
};

type CohortsSectionProps = {
  cohorts: CohortRow[];
  programs: ProgramOption[];
  canManage: boolean;
  loading?: boolean;
  statusFilter: ClinicalCohortStatusFilter;
  onStatusFilterChange: (value: ClinicalCohortStatusFilter) => void;
  onRefresh: () => Promise<void>;
};

const YEAR_OPTIONS = [1, 2, 3, 4, 5, 6];
const SEMESTER_OPTIONS = [1, 2];

const emptyForm = () => ({
  name: '',
  programId: '',
  year: '3',
  semester: '1',
  description: '',
  isActive: true,
});

function exportStudentsCsv(cohortName: string, students: any[]) {
  const header = ['Student Number', 'First Name', 'Last Name', 'Email', 'Program', 'Year', 'Semester', 'Status'];
  const lines = students.map((row) => {
    const s = row.student || {};
    return [
      s.studentNumber || '',
      s.firstName || '',
      s.lastName || '',
      s.email || '',
      s.programRef?.code || s.programRef?.name || '',
      s.year ?? '',
      s.semester ?? '',
      s.status || '',
    ]
      .map((v) => `"${String(v).replace(/"/g, '""')}"`)
      .join(',');
  });
  const csv = [header.join(','), ...lines].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${cohortName.replace(/[^\w.-]+/g, '_')}_students.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function CohortsSection({
  cohorts,
  programs,
  canManage,
  loading,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: CohortsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<CohortRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<CohortRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const [membersOpen, setMembersOpen] = useState(false);
  const [activeCohort, setActiveCohort] = useState<CohortRow | null>(null);
  const [members, setMembers] = useState<any[]>([]);
  const [membersLoading, setMembersLoading] = useState(false);

  const [enrollOpen, setEnrollOpen] = useState(false);
  const [enrollYear, setEnrollYear] = useState('3');
  const [enrollSemester, setEnrollSemester] = useState('1');
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const [copyOpen, setCopyOpen] = useState(false);
  const [copySourceId, setCopySourceId] = useState('');

  const programSelectOptions = useMemo(() => {
    const opts = [...programs];
    if (form.programId && !opts.some((p) => p.id === form.programId)) {
      opts.push({ id: form.programId, name: 'Inactive program', code: '' });
    }
    return opts;
  }, [programs, form.programId]);

  const copySources = useMemo(
    () => cohorts.filter((c) => c.id !== activeCohort?.id && c.isActive !== false),
    [cohorts, activeCohort?.id]
  );

  const enrollProgramLabel = useMemo(() => {
    if (!activeCohort?.programId) return '';
    const p =
      activeCohort.program ||
      programs.find((prog) => prog.id === activeCohort.programId);
    return p?.code ? `${p.name} (${p.code})` : p?.name || 'Selected program';
  }, [activeCohort, programs]);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (row: CohortRow) => {
    setEditing(row);
    setForm({
      name: row.name,
      programId: row.programId || '',
      year: row.year != null ? String(row.year) : '3',
      semester: row.semester != null ? String(row.semester) : '1',
      description: row.description || '',
      isActive: row.isActive !== false,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim()) {
      toast.error('Cohort name is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        name: form.name.trim(),
        programId: form.programId || null,
        year: form.year ? Number(form.year) : null,
        semester: form.semester ? Number(form.semester) : null,
        description: form.description.trim() || null,
        isActive: form.isActive,
      };
      if (editing) {
        await clinicalService.updateCohort(editing.id, payload);
        toast.success('Cohort updated');
      } else {
        await clinicalService.createCohort(payload);
        toast.success('Cohort created');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save cohort');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await clinicalService.deleteCohort(deleteTarget.id);
      if (result.outcome === 'deactivated') {
        const parts: string[] = [];
        if (result.studentCount) parts.push(`${result.studentCount} student${result.studentCount === 1 ? '' : 's'}`);
        if (result.rotationCount) parts.push(`${result.rotationCount} rotation${result.rotationCount === 1 ? '' : 's'}`);
        toast.success(`Cohort deactivated (${parts.join(', ') || 'still in use'}).`);
        setDeleteTarget(null);
        if (statusFilter === 'active') {
          onStatusFilterChange('inactive');
        } else {
          await onRefresh();
        }
      } else {
        toast.success('Cohort removed');
        setDeleteTarget(null);
        await onRefresh();
      }
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove cohort');
    } finally {
      setDeleting(false);
    }
  };

  const loadMembers = useCallback(async (cohortId: string) => {
    setMembersLoading(true);
    try {
      const data = await clinicalService.getCohortStudents(cohortId);
      setMembers(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load cohort students');
      setMembers([]);
    } finally {
      setMembersLoading(false);
    }
  }, []);

  const openMembers = (row: CohortRow) => {
    setActiveCohort(row);
    setMembersOpen(true);
    loadMembers(row.id);
  };

  const loadCandidates = useCallback(async () => {
    if (!activeCohort?.programId || !enrollYear || !enrollSemester) {
      setCandidates([]);
      return;
    }
    setLoadingCandidates(true);
    try {
      const res = await clinicalService.getEligibleStudents({
        page: 1,
        limit: 500,
        programId: activeCohort.programId,
        year: Number(enrollYear),
        semester: Number(enrollSemester),
        search: search.trim() || undefined,
        includeIneligible: true,
      });
      const enrolledIds = new Set(members.map((m) => m.studentId));
      setCandidates(
        (res.data || []).map((s: any) => ({
          ...s,
          inCohort: enrolledIds.has(s.id),
        }))
      );
    } catch {
      setCandidates([]);
    } finally {
      setLoadingCandidates(false);
    }
  }, [activeCohort?.programId, enrollYear, enrollSemester, search, members]);

  useEffect(() => {
    if (enrollOpen && activeCohort) {
      setEnrollYear(activeCohort.year != null ? String(activeCohort.year) : '3');
      setEnrollSemester(activeCohort.semester != null ? String(activeCohort.semester) : '1');
      setSearch('');
      setSelected(new Set());
      setCandidates([]);
    }
  }, [enrollOpen, activeCohort]);

  useEffect(() => {
    if (enrollOpen && activeCohort?.programId && enrollYear && enrollSemester) {
      loadCandidates();
    }
  }, [enrollOpen, activeCohort?.programId, enrollYear, enrollSemester, loadCandidates]);

  const enrollable = useMemo(
    () => candidates.filter((s) => s.canEnroll && !s.inCohort),
    [candidates]
  );

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAllEnrollable = () => {
    setSelected(new Set(enrollable.map((s) => s.id)));
  };

  const handleEnroll = async () => {
    if (!activeCohort || selected.size === 0) return;
    setSaving(true);
    try {
      await clinicalService.addCohortStudents(activeCohort.id, { studentIds: [...selected] });
      toast.success(`Enrolled ${selected.size} student(s)`);
      setEnrollOpen(false);
      await loadMembers(activeCohort.id);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to enroll students');
    } finally {
      setSaving(false);
    }
  };

  const handleRemove = async (studentId: string) => {
    if (!activeCohort) return;
    try {
      await clinicalService.removeCohortStudent(activeCohort.id, studentId);
      toast.success('Student removed from cohort');
      await loadMembers(activeCohort.id);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove student');
    }
  };

  const handleCopy = async () => {
    if (!activeCohort || !copySourceId) return;
    setSaving(true);
    try {
      const result = await clinicalService.copyCohortStudents(activeCohort.id, {
        sourceCohortId: copySourceId,
      });
      toast.success(`Copied ${result.copied} student(s)`);
      setCopyOpen(false);
      await loadMembers(activeCohort.id);
      await onRefresh();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to copy students');
    } finally {
      setSaving(false);
    }
  };

  const emptyMessage =
    statusFilter === 'inactive'
      ? 'No inactive cohorts.'
      : statusFilter === 'all'
        ? 'No cohorts yet. Create one, enroll students by year/semester, then link it on a rotation.'
        : 'No active cohorts. Create one, enroll students by year/semester, then link it on a rotation.';

  return (
    <>
      <ClinicalTableCard
        title="All cohorts"
        total={cohorts.length}
        loading={loading}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select
              value={statusFilter}
              onValueChange={(v) => onStatusFilterChange(v as ClinicalCohortStatusFilter)}
            >
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
                <SelectItem value="all">All cohorts</SelectItem>
              </SelectContent>
            </Select>
            {canManage ? (
              <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add cohort
              </Button>
            ) : null}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Program</TableHead>
              <TableHead>Year / Sem</TableHead>
              <TableHead>Students</TableHead>
              <TableHead>Rotations</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {cohorts.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 7 : 6} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              cohorts.map((c) => (
                <TableRow key={c.id}>
                  <TableCell className="font-medium">{c.name}</TableCell>
                  <TableCell>
                    {c.program?.code || c.program?.name || '—'}
                  </TableCell>
                  <TableCell>
                    {c.year != null && c.semester != null ? `Y${c.year} · S${c.semester}` : '—'}
                  </TableCell>
                  <TableCell>{c.studentCount ?? 0}</TableCell>
                  <TableCell>{c.rotationCount ?? 0}</TableCell>
                  <TableCell>{clinicalActiveBadge(c.isActive !== false)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right space-x-1">
                      <Button variant="ghost" size="sm" title="Manage students" onClick={() => openMembers(c)}>
                        <Users className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => openEdit(c)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(c)}
                        aria-label="Remove cohort"
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
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
              <DialogTitle>{editing ? 'Edit cohort' : 'Add cohort'}</DialogTitle>
              <DialogDescription>
                Name the clinical group (for example MBChB 3.1 Site A). Then enroll students by program year and semester.
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  placeholder="e.g. MBChB 3.1 — Kiruddu group"
                  required
                />
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
                      <SelectItem key={p.id} value={p.id}>
                        {p.code ? `${p.name} (${p.code})` : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {programs.length === 0 ? (
                  <p className="text-xs text-muted-foreground">
                    No active clinical programs. Mark a program active under Clinicals → Eligibility Policies.
                  </p>
                ) : null}
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Academic year</Label>
                  <Select value={form.year} onValueChange={(v) => setForm((f) => ({ ...f, year: v }))}>
                    <SelectTrigger>
                      <SelectValue />
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
                      <SelectValue />
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
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={form.description}
                  onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                  placeholder="Optional notes"
                />
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
                  {saving ? 'Saving…' : editing ? 'Update cohort' : 'Add cohort'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}

      {canManage && (
        <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
          <DialogContent className="w-[96vw] max-w-md">
            <DialogHeader>
              <DialogTitle>Remove cohort?</DialogTitle>
              <DialogDescription>
                {deleteTarget ? (
                  <>
                    Remove <span className="font-medium text-foreground">{deleteTarget.name}</span>? If it still has
                    enrolled students or linked rotations, it will be marked inactive instead of removed.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Removing…' : 'Remove cohort'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      <Dialog
        open={membersOpen}
        onOpenChange={(open) => {
          setMembersOpen(open);
          if (!open) setActiveCohort(null);
        }}
      >
        <DialogContent className="w-[96vw] max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{activeCohort?.name || 'Cohort students'}</DialogTitle>
            <DialogDescription>
              Students in this cohort are live-synced to every rotation that uses it.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-wrap gap-2 mb-4">
            {canManage && (
              <>
                <Button
                  className="bg-[#015F2B] hover:bg-[#014022]"
                  onClick={() => setEnrollOpen(true)}
                  disabled={!activeCohort?.programId}
                >
                  <UserPlus className="mr-2 h-4 w-4" />
                  Enroll students
                </Button>
                <Button variant="outline" onClick={() => setCopyOpen(true)} disabled={copySources.length === 0}>
                  <Copy className="mr-2 h-4 w-4" />
                  Copy from cohort
                </Button>
              </>
            )}
            <Button
              variant="outline"
              onClick={() => activeCohort && exportStudentsCsv(activeCohort.name, members)}
              disabled={members.length === 0}
            >
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
          {!activeCohort?.programId && canManage ? (
            <p className="text-sm text-muted-foreground mb-3">
              Set a program on this cohort to enroll students by year and semester.
            </p>
          ) : null}
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Year / Sem</TableHead>
                {canManage && <TableHead className="text-right">Actions</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {membersLoading ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : members.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 5 : 4} className="py-8 text-center text-muted-foreground">
                    No students enrolled yet.
                  </TableCell>
                </TableRow>
              ) : (
                members.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      {row.student?.lastName}, {row.student?.firstName}
                    </TableCell>
                    <TableCell>{row.student?.studentNumber}</TableCell>
                    <TableCell>{row.student?.programRef?.code || row.student?.programRef?.name || '—'}</TableCell>
                    <TableCell>
                      Y{row.student?.year ?? '—'} · S{row.student?.semester ?? '—'}
                    </TableCell>
                    {canManage && (
                      <TableCell className="text-right">
                        <Button variant="ghost" size="sm" onClick={() => handleRemove(row.studentId)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    )}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
        <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Enroll students into cohort</DialogTitle>
            <DialogDescription>
              Choose year and semester for {enrollProgramLabel || 'this program'}, then select students to include.
              You can load another year/semester to add retake students or mixed groups.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-4">
            <div className="space-y-2">
              <Label>Academic year</Label>
              <Select
                value={enrollYear}
                onValueChange={(v) => {
                  setSelected(new Set());
                  setEnrollYear(v);
                }}
              >
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
              <Select
                value={enrollSemester}
                onValueChange={(v) => {
                  setSelected(new Set());
                  setEnrollSemester(v);
                }}
              >
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
              <Label>Search</Label>
              <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Name or number" />
            </div>
          </div>
          <div className="flex gap-2 mb-2">
            <Button type="button" variant="outline" size="sm" onClick={selectAllEnrollable} disabled={enrollable.length === 0}>
              Select all eligible ({enrollable.length})
            </Button>
          </div>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10" />
                <TableHead>Student</TableHead>
                <TableHead>Number</TableHead>
                <TableHead>Year / Sem</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loadingCandidates ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Loading students…
                  </TableCell>
                </TableRow>
              ) : !activeCohort?.programId ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    Set a program on this cohort first.
                  </TableCell>
                </TableRow>
              ) : candidates.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5} className="py-8 text-center text-muted-foreground">
                    No students found for Year {enrollYear}, Semester {enrollSemester}.
                  </TableCell>
                </TableRow>
              ) : (
                candidates.map((s) => {
                  const disabled = !s.canEnroll || s.inCohort;
                  return (
                    <TableRow key={s.id} className={disabled ? 'opacity-60' : undefined}>
                      <TableCell>
                        <Checkbox
                          checked={selected.has(s.id)}
                          disabled={disabled}
                          onCheckedChange={() => toggleSelect(s.id)}
                        />
                      </TableCell>
                      <TableCell>
                        {s.lastName}, {s.firstName}
                      </TableCell>
                      <TableCell>{s.studentNumber}</TableCell>
                      <TableCell>
                        Y{s.year ?? '—'} · S{s.semester ?? '—'}
                      </TableCell>
                      <TableCell>
                        {s.inCohort ? 'Already in cohort' : s.canEnroll ? 'Eligible' : s.blockReason || 'Not eligible'}
                      </TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEnrollOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014022]"
              disabled={saving || selected.size === 0}
              onClick={handleEnroll}
            >
              {saving ? 'Enrolling…' : `Enroll ${selected.size || ''}`}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Copy students from another cohort</DialogTitle>
            <DialogDescription>
              Adds students from the source cohort into {activeCohort?.name}. Existing members are skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Source cohort</Label>
            <Select value={copySourceId || undefined} onValueChange={setCopySourceId}>
              <SelectTrigger>
                <SelectValue placeholder="Select cohort" />
              </SelectTrigger>
              <SelectContent>
                {copySources.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name} ({c.studentCount ?? 0})
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014022]"
              disabled={saving || !copySourceId}
              onClick={handleCopy}
            >
              {saving ? 'Copying…' : 'Copy students'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
