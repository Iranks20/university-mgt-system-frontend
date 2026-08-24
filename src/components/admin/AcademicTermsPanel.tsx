import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Lock, Pencil, CircleHelp, Eraser, AlertTriangle } from 'lucide-react';
import { toast } from 'sonner';
import { academicService, type AcademicTerm } from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

function statusBadge(status: AcademicTerm['status']) {
  const map: Record<AcademicTerm['status'], string> = {
    Draft: 'bg-gray-100 text-gray-700',
    Active: 'bg-green-100 text-green-800',
    Closed: 'bg-slate-100 text-slate-700',
  };
  return <Badge className={`${map[status]} hover:${map[status]}`}>{status}</Badge>;
}

function registrationBadge(status?: AcademicTerm['registrationStatus']) {
  const value = status ?? 'Closed';
  const map: Record<NonNullable<AcademicTerm['registrationStatus']>, string> = {
    Closed: 'bg-slate-100 text-slate-700',
    Open: 'bg-blue-100 text-blue-800',
    AddDropOnly: 'bg-amber-100 text-amber-800',
  };
  return <Badge className={`${map[value]} hover:${map[value]}`}>{value}</Badge>;
}

export function AcademicTermsPanel() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editingTerm, setEditingTerm] = useState<AcademicTerm | null>(null);
  const [saving, setSaving] = useState(false);
  const yearNow = new Date().getFullYear();
  const [form, setForm] = useState({
    name: `Academic Year ${yearNow}`,
    academicYear: String(yearNow),
    semester: '0',
    startDate: `${yearNow}-01-15`,
    endDate: `${yearNow}-05-30`,
    activate: true,
    asClosed: false,
  });
  const [editForm, setEditForm] = useState({
    name: '',
    startDate: '',
    endDate: '',
    reopenAsDraft: false,
  });
  const [resetOpen, setResetOpen] = useState(false);
  const [resetTermTarget, setResetTermTarget] = useState<AcademicTerm | null>(null);
  const [resetPreview, setResetPreview] = useState<{
    classCount: number;
    activeEnrollmentCount: number;
    totalEnrollmentCount: number;
    timetableSlotCount: number;
    requiresForce: boolean;
  } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const [resetForce, setResetForce] = useState(false);
  const [resetConfirmText, setResetConfirmText] = useState('');
  const [resetBusy, setResetBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const rows = await academicService.getAcademicTerms();
      setTerms(rows);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load academic terms'));
      setTerms([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleCreate = async () => {
    setSaving(true);
    try {
      const created = await academicService.createAcademicTerm({
        name: form.name.trim(),
        academicYear: Number(form.academicYear),
        semester: Number(form.semester) as 0 | 1 | 2,
        startDate: form.startDate,
        endDate: form.endDate,
        activate: form.asClosed ? false : form.activate,
        asClosed: form.asClosed,
      });
      toast.success(
        form.asClosed
          ? 'Closed historical term created'
          : form.activate
            ? 'Term created and set as Active'
            : 'Draft term created'
      );
      setOpen(false);
      await load();
      if (form.asClosed && created?.id) {
        const attach = window.confirm(
          'Attach existing legacy classes (no term) to this Closed term now?\nThey will be archived under this term.'
        );
        if (attach) {
          await handleAttachLegacy(created.id);
        }
      }
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create term'));
    } finally {
      setSaving(false);
    }
  };

  const handleAttachLegacy = async (id: string) => {
    try {
      const preview = await academicService.previewAttachUnscopedClasses(id);
      if (preview.unscopedClassCount === 0) {
        toast.message('No legacy classes without a term to attach');
        return;
      }
      const ok = window.confirm(
        `Attach ${preview.unscopedClassCount} legacy class(es) to "${preview.term.name}"?\n` +
          `They will be linked to this term and deactivated (archived).\n` +
          `Already linked to this term: ${preview.linkedClassCount}.`
      );
      if (!ok) return;
      const result = await academicService.attachUnscopedClasses(id, { deactivate: true });
      toast.success(`Attached ${result.attachedClassCount} class(es) to historical term`);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not attach legacy classes'));
    }
  };

  const openEdit = (term: AcademicTerm) => {
    setEditingTerm(term);
    setEditForm({
      name: term.name,
      startDate: term.startDate,
      endDate: term.endDate,
      reopenAsDraft: false,
    });
    setEditOpen(true);
  };

  const handleUpdate = async () => {
    if (!editingTerm) return;
    setSaving(true);
    try {
      await academicService.updateAcademicTerm(editingTerm.id, {
        name: editForm.name.trim(),
        startDate: editForm.startDate,
        endDate: editForm.endDate,
        ...(editingTerm.status === 'Closed' && editForm.reopenAsDraft
          ? { status: 'Draft' as const }
          : {}),
      });
      toast.success(
        editingTerm.status === 'Closed' && editForm.reopenAsDraft
          ? 'Term updated and reopened as Draft — use Activate when ready'
          : 'Term updated'
      );
      setEditOpen(false);
      setEditingTerm(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update term'));
    } finally {
      setSaving(false);
    }
  };

  const handleActivate = async (id: string) => {
    try {
      await academicService.activateAcademicTerm(id);
      toast.success('Term activated (previous Active term closed)');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not activate term'));
    }
  };

  const handleClose = async (id: string) => {
    try {
      const preview = await academicService.getAcademicTermClosePreview(id);
      const ok = window.confirm(
        `Close "${preview.term.name}"?\n\n` +
          `This will deactivate ${preview.classesToDeactivate} active class(es)` +
          (preview.includeUnscopedActiveClasses
            ? ` (${preview.linkedActiveClassCount} linked to this term + ${preview.unscopedActiveClassCount} unscoped).`
            : '.') +
          `\nFuture timetable slots for those classes will be cancelled.\nRegistration will close.\nHistorical attendance is kept.`
      );
      if (!ok) return;

      const result = await academicService.closeAcademicTerm(id);
      toast.success(
        `Term closed` +
          (result.deactivatedClassCount != null
            ? ` — ${result.deactivatedClassCount} class(es) deactivated`
            : '')
      );
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not close term'));
    }
  };

  const handleOpenRegistration = async (id: string) => {
    try {
      await academicService.openTermRegistration(id, { status: 'Open' });
      toast.success('Student registration opened');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not open registration'));
    }
  };

  const handleCloseRegistration = async (id: string) => {
    try {
      await academicService.closeTermRegistration(id);
      toast.success('Student registration closed');
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not close registration'));
    }
  };

  const openReset = async (term: AcademicTerm) => {
    setResetTermTarget(term);
    setResetPreview(null);
    setResetForce(false);
    setResetConfirmText('');
    setResetOpen(true);
    setResetLoading(true);
    try {
      const preview = await academicService.getResetOfferingsPreview(term.id);
      setResetPreview(preview);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load reset preview'));
      setResetOpen(false);
    } finally {
      setResetLoading(false);
    }
  };

  const handleResetOfferings = async () => {
    if (!resetTermTarget || !resetPreview) return;
    if (resetConfirmText.trim() !== resetTermTarget.name) {
      toast.error('Type the exact term name to confirm');
      return;
    }
    setResetBusy(true);
    try {
      const result = await academicService.resetTermOfferings(resetTermTarget.id, {
        force: resetForce,
        confirmName: resetConfirmText.trim(),
      });
      toast.success(
        `Reset "${result.termName}": ${result.classesDeleted} class(es), ` +
          `${result.enrollmentsDeleted} enrollment(s), ${result.timetableSlotsDeleted} timetable slot(s) removed`
      );
      setResetOpen(false);
      setResetTermTarget(null);
      setResetPreview(null);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not reset term offerings'));
    } finally {
      setResetBusy(false);
    }
  };

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Academic terms</CardTitle>
          <CardDescription>Teaching periods and registration windows.</CardDescription>
        </div>
        <Button
          onClick={() => setOpen(true)}
          className="bg-[#015F2B] hover:bg-[#014a22]"
        >
          <Plus className="h-4 w-4 mr-2" /> New term
        </Button>
      </CardHeader>
      <CardContent className="p-0">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Year</TableHead>
              <TableHead>Coverage</TableHead>
              <TableHead>Dates</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Registration</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {loading ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  Loading…
                </TableCell>
              </TableRow>
            ) : terms.length === 0 ? (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                  No academic terms yet. Create one before rolling into the new semester.
                </TableCell>
              </TableRow>
            ) : (
              terms.map((term) => (
                <TableRow key={term.id}>
                  <TableCell className="font-medium">{term.name}</TableCell>
                  <TableCell>{term.academicYear}</TableCell>
                  <TableCell>
                    {term.semester === 0 ? 'Both' : `Sem ${term.semester}`}
                  </TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {term.startDate} → {term.endDate}
                  </TableCell>
                  <TableCell>{statusBadge(term.status)}</TableCell>
                  <TableCell>{registrationBadge(term.registrationStatus)}</TableCell>
                  <TableCell className="text-right space-x-1">
                    <Button variant="outline" size="sm" onClick={() => openEdit(term)}>
                      <Pencil className="h-4 w-4 mr-1" /> Edit
                    </Button>
                    {term.status === 'Draft' ? (
                      <Button variant="outline" size="sm" onClick={() => handleActivate(term.id)}>
                        <CheckCircle2 className="h-4 w-4 mr-1" /> Activate
                      </Button>
                    ) : null}
                    {term.status === 'Active' && term.registrationStatus !== 'Open' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleOpenRegistration(term.id)}
                      >
                        Open reg
                      </Button>
                    ) : null}
                    {term.status === 'Active' && term.registrationStatus !== 'Closed' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCloseRegistration(term.id)}
                      >
                        Close reg
                      </Button>
                    ) : null}
                    {term.status === 'Active' ? (
                      <Button variant="outline" size="sm" onClick={() => handleClose(term.id)}>
                        <Lock className="h-4 w-4 mr-1" /> Close term
                      </Button>
                    ) : null}
                    {term.status === 'Closed' || term.status === 'Draft' ? (
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleAttachLegacy(term.id)}
                      >
                        Attach legacy
                      </Button>
                    ) : null}
                    <Button variant="destructive" size="sm" onClick={() => openReset(term)}>
                      <Eraser className="h-4 w-4 mr-1" /> Reset offerings
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </CardContent>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>New academic term</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="term-name">Name</Label>
              <Input
                id="term-name"
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="term-year">Academic year</Label>
                <Input
                  id="term-year"
                  type="number"
                  className="mt-1"
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                />
              </div>
              <div>
                <LabelWithInfo info="Both lets Sem 1 and Sem 2 classes share this term. Promote still moves each group by its own year/semester.">
                  Coverage
                </LabelWithInfo>
                <Select
                  value={form.semester}
                  onValueChange={(v) => setForm({ ...form, semester: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Both (Sem 1 & Sem 2)</SelectItem>
                    <SelectItem value="1">Semester 1 only</SelectItem>
                    <SelectItem value="2">Semester 2 only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label htmlFor="term-start">Start date</Label>
                <Input
                  id="term-start"
                  type="date"
                  className="mt-1"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label htmlFor="term-end">End date</Label>
                <Input
                  id="term-end"
                  type="date"
                  className="mt-1"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.asClosed}
                onChange={(e) =>
                  setForm({
                    ...form,
                    asClosed: e.target.checked,
                    activate: e.target.checked ? false : form.activate,
                  })
                }
              />
              <span className="inline-flex items-center gap-1.5">
                Create as Closed (historical archive)
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      aria-label="About Create as Closed"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
                    Use for the semester already run before terms existed. Then attach legacy
                    classes. Keep a separate Active term for current work.
                  </TooltipContent>
                </Tooltip>
              </span>
            </label>
            {!form.asClosed ? (
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={form.activate}
                onChange={(e) => setForm({ ...form, activate: e.target.checked })}
              />
              <span className="inline-flex items-center gap-1.5">
                Set as Active term
                <Tooltip>
                  <TooltipTrigger asChild>
                    <button
                      type="button"
                      className="inline-flex text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
                      aria-label="About Set as Active term"
                    >
                      <CircleHelp className="h-3.5 w-3.5" />
                    </button>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
                    Closes any currently Active term and makes this one Active.
                  </TooltipContent>
                </Tooltip>
              </span>
            </label>
            ) : null}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014a22]"
              disabled={saving}
              onClick={handleCreate}
            >
              {saving ? 'Saving…' : 'Create'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editOpen}
        onOpenChange={(next) => {
          setEditOpen(next);
          if (!next) setEditingTerm(null);
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit academic term</DialogTitle>
          </DialogHeader>
          {editingTerm ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Year {editingTerm.academicYear} · Semester {editingTerm.semester} (fixed). Status:{' '}
                {editingTerm.status}.
              </p>
              <div>
                <Label htmlFor="edit-term-name">Name</Label>
                <Input
                  id="edit-term-name"
                  className="mt-1"
                  value={editForm.name}
                  onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label htmlFor="edit-term-start">Start date</Label>
                  <Input
                    id="edit-term-start"
                    type="date"
                    className="mt-1"
                    value={editForm.startDate}
                    onChange={(e) => setEditForm({ ...editForm, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="edit-term-end">End date</Label>
                  <Input
                    id="edit-term-end"
                    type="date"
                    className="mt-1"
                    value={editForm.endDate}
                    onChange={(e) => setEditForm({ ...editForm, endDate: e.target.value })}
                  />
                </div>
              </div>
              {editingTerm.status === 'Closed' ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={editForm.reopenAsDraft}
                    onChange={(e) =>
                      setEditForm({ ...editForm, reopenAsDraft: e.target.checked })
                    }
                  />
                  <span>
                    Reopen as Draft after save (then use Activate). Needed when this year/semester
                    was closed by mistake and you want to use it again.
                  </span>
                </label>
              ) : null}
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>
              Cancel
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014a22]"
              disabled={saving || !editingTerm}
              onClick={handleUpdate}
            >
              {saving ? 'Saving…' : 'Save changes'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={resetOpen}
        onOpenChange={(next) => {
          setResetOpen(next);
          if (!next) {
            setResetTermTarget(null);
            setResetPreview(null);
            setResetForce(false);
            setResetConfirmText('');
          }
        }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-700">
              <AlertTriangle className="h-5 w-5" /> Reset term offerings
            </DialogTitle>
          </DialogHeader>
          {resetTermTarget ? (
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">
                Permanently deletes every class offering — and its weekly schedule — linked to{' '}
                <strong>{resetTermTarget.name}</strong>, so you can rebuild it from scratch. This
                cannot be undone.
              </p>
              {resetLoading ? (
                <p className="text-sm text-muted-foreground">Loading preview…</p>
              ) : resetPreview ? (
                <div className="rounded-md border p-3 text-sm space-y-1 bg-muted/40">
                  <div>
                    Classes to delete: <strong>{resetPreview.classCount}</strong>
                  </div>
                  <div>
                    Timetable slots to delete: <strong>{resetPreview.timetableSlotCount}</strong>
                  </div>
                  <div>
                    Enrollments to delete: <strong>{resetPreview.totalEnrollmentCount}</strong>
                    {resetPreview.activeEnrollmentCount > 0 ? (
                      <span className="text-red-600">
                        {' '}
                        ({resetPreview.activeEnrollmentCount} active)
                      </span>
                    ) : null}
                  </div>
                </div>
              ) : null}
              {resetPreview && resetPreview.activeEnrollmentCount > 0 ? (
                <label className="flex items-start gap-2 text-sm">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={resetForce}
                    onChange={(e) => setResetForce(e.target.checked)}
                  />
                  <span>
                    I understand this term has {resetPreview.activeEnrollmentCount} active
                    enrollment(s) and want to delete those classes — and their enrollments —
                    anyway.
                  </span>
                </label>
              ) : null}
              <div>
                <Label htmlFor="reset-confirm-name">
                  Type <strong>{resetTermTarget.name}</strong> to confirm
                </Label>
                <Input
                  id="reset-confirm-name"
                  className="mt-1"
                  value={resetConfirmText}
                  onChange={(e) => setResetConfirmText(e.target.value)}
                />
              </div>
            </div>
          ) : null}
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetOpen(false)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={
                resetBusy ||
                resetLoading ||
                !resetPreview ||
                !resetTermTarget ||
                resetConfirmText.trim() !== resetTermTarget?.name ||
                ((resetPreview?.activeEnrollmentCount ?? 0) > 0 && !resetForce)
              }
              onClick={handleResetOfferings}
            >
              {resetBusy ? 'Resetting…' : 'Reset offerings'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
