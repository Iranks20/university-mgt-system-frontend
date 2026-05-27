import { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { clinicalService } from '@/services/clinical.service';
import { clinicalRoleLabel } from './clinical-ui';
import { ClinicalTableCard } from './ClinicalTableCard';

type SiteOption = { id: string; name: string };
type UserOption = { id: string; name: string; role: string };
type AssignmentRow = {
  id: string;
  isPrimary: boolean;
  clinicalSite?: { name?: string };
  user?: { name?: string; role?: string };
};

type AssignmentsSectionProps = {
  assignments: AssignmentRow[];
  sites: SiteOption[];
  assignableUsers: UserOption[];
  loading?: boolean;
  onRefresh: () => Promise<void>;
};

export function AssignmentsSection({ assignments, sites, assignableUsers, loading, onRefresh }: AssignmentsSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [form, setForm] = useState({ userId: '', clinicalSiteId: '', isPrimary: false });
  const [saving, setSaving] = useState(false);

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.userId || !form.clinicalSiteId) {
      toast.error('Select a user and clinical site');
      return;
    }
    setSaving(true);
    try {
      await clinicalService.createAssignment({
        userId: form.userId,
        clinicalSiteId: form.clinicalSiteId,
        isPrimary: form.isPrimary,
      });
      toast.success('Team member assigned');
      setForm({ userId: '', clinicalSiteId: '', isPrimary: false });
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to assign user');
    } finally {
      setSaving(false);
    }
  };

  const remove = async (id: string) => {
    try {
      await clinicalService.deleteAssignment(id);
      toast.success('Assignment removed');
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove assignment');
    }
  };

  return (
    <>
      <ClinicalTableCard
        title="Site assignments"
        total={assignments.length}
        loading={loading}
        action={
          <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => setModalOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Assign member
          </Button>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Site</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>Primary</TableHead>
              <TableHead className="text-right">Action</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {assignments.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                  No team assignments yet.
                </TableCell>
              </TableRow>
            ) : (
              assignments.map((a) => (
                <TableRow key={a.id}>
                  <TableCell>{a.clinicalSite?.name || '—'}</TableCell>
                  <TableCell className="font-medium">{a.user?.name || '—'}</TableCell>
                  <TableCell>{clinicalRoleLabel(a.user?.role || '')}</TableCell>
                  <TableCell>{a.isPrimary ? 'Yes' : 'No'}</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => remove(a.id)}>
                      <Trash2 className="h-4 w-4 text-red-600" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </ClinicalTableCard>

      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign team member</DialogTitle>
            <DialogDescription>Link a QA clinicals officer or coordinator to a clinical site.</DialogDescription>
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
              <Label>Team member</Label>
              <Select value={form.userId} onValueChange={(v) => setForm((f) => ({ ...f, userId: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Select user" />
                </SelectTrigger>
                <SelectContent>
                  {assignableUsers.map((u) => (
                    <SelectItem key={u.id} value={u.id}>
                      {`${u.name} (${clinicalRoleLabel(u.role)})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="assign-primary"
                checked={form.isPrimary}
                onCheckedChange={(v) => setForm((f) => ({ ...f, isPrimary: v === true }))}
              />
              <Label htmlFor="assign-primary" className="cursor-pointer font-normal">
                Primary contact for this site
              </Label>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving}>
                {saving ? 'Saving…' : 'Assign'}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
