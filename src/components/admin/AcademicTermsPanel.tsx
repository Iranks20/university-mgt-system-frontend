import { useEffect, useState } from 'react';
import { Plus, CheckCircle2, Lock } from 'lucide-react';
import { toast } from 'sonner';
import { academicService, type AcademicTerm } from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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
  const [saving, setSaving] = useState(false);
  const yearNow = new Date().getFullYear();
  const [form, setForm] = useState({
    name: `Academic Year ${yearNow} — Semester 1`,
    academicYear: String(yearNow),
    semester: '1',
    startDate: `${yearNow}-01-15`,
    endDate: `${yearNow}-05-30`,
    activate: true,
  });

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
      await academicService.createAcademicTerm({
        name: form.name.trim(),
        academicYear: Number(form.academicYear),
        semester: Number(form.semester) as 1 | 2,
        startDate: form.startDate,
        endDate: form.endDate,
        activate: form.activate,
      });
      toast.success(form.activate ? 'Term created and set as Active' : 'Draft term created');
      setOpen(false);
      await load();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not create term'));
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

  return (
    <Card>
      <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <CardTitle>Academic Terms</CardTitle>
          <CardDescription>
            Define the current teaching period and registration window. Reports default to the Active
            term date range.
          </CardDescription>
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
              <TableHead>Semester</TableHead>
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
                  <TableCell>{term.semester}</TableCell>
                  <TableCell className="text-sm text-muted-foreground">
                    {term.startDate} → {term.endDate}
                  </TableCell>
                  <TableCell>{statusBadge(term.status)}</TableCell>
                  <TableCell>{registrationBadge(term.registrationStatus)}</TableCell>
                  <TableCell className="text-right space-x-1">
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
                <Label>Semester</Label>
                <Select
                  value={form.semester}
                  onValueChange={(v) => setForm({ ...form, semester: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
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
                checked={form.activate}
                onChange={(e) => setForm({ ...form, activate: e.target.checked })}
              />
              Set as Active term (closes any currently Active term)
            </label>
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
    </Card>
  );
}
