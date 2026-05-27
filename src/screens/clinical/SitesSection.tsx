import { useState } from 'react';
import { Edit, Plus, Trash2 } from 'lucide-react';
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
export type ClinicalSiteStatusFilter = 'active' | 'inactive' | 'all';

type SiteRow = { id: string; code: string; name: string; location?: string; isActive: boolean };

type SitesSectionProps = {
  sites: SiteRow[];
  canManage: boolean;
  loading?: boolean;
  statusFilter: ClinicalSiteStatusFilter;
  onStatusFilterChange: (value: ClinicalSiteStatusFilter) => void;
  onRefresh: () => Promise<void>;
};

const emptyForm = () => ({ code: '', name: '', location: '', isActive: true });

export function SitesSection({
  sites,
  canManage,
  loading,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: SitesSectionProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState<SiteRow | null>(null);
  const [form, setForm] = useState(emptyForm());
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<SiteRow | null>(null);
  const [deleting, setDeleting] = useState(false);

  const openAdd = () => {
    setEditing(null);
    setForm(emptyForm());
    setModalOpen(true);
  };

  const openEdit = (site: SiteRow) => {
    setEditing(site);
    setForm({
      code: site.code,
      name: site.name,
      location: site.location || '',
      isActive: site.isActive,
    });
    setModalOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.code.trim() || !form.name.trim()) {
      toast.error('Site code and name are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        code: form.code.trim(),
        name: form.name.trim(),
        location: form.location.trim() || undefined,
        isActive: form.isActive,
      };
      if (editing) {
        await clinicalService.updateSite(editing.id, payload);
        toast.success('Clinical site updated');
      } else {
        await clinicalService.createSite(payload);
        toast.success('Clinical site created');
      }
      setModalOpen(false);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save site');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const result = await clinicalService.deleteSite(deleteTarget.id);
      if (result.outcome === 'deactivated') {
        toast.success(
          `Site deactivated (${result.enrolledStudentCount} student${result.enrolledStudentCount === 1 ? '' : 's'} still on placement).`
        );
        if (statusFilter === 'active') {
          onStatusFilterChange('inactive');
        } else {
          await onRefresh();
        }
      } else {
        toast.success('Clinical site removed');
        await onRefresh();
      }
      setDeleteTarget(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to remove site');
    } finally {
      setDeleting(false);
    }
  };

  const emptyMessage =
    statusFilter === 'inactive'
      ? 'No inactive clinical sites.'
      : statusFilter === 'all'
        ? 'No clinical sites yet.'
        : 'No active clinical sites.';

  return (
    <>
      <ClinicalTableCard
        title="Clinical sites"
        total={sites.length}
        loading={loading}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Select value={statusFilter} onValueChange={(v) => onStatusFilterChange(v as ClinicalSiteStatusFilter)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Active only</SelectItem>
                <SelectItem value="inactive">Inactive only</SelectItem>
                <SelectItem value="all">All sites</SelectItem>
              </SelectContent>
            </Select>
            {canManage ? (
              <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={openAdd}>
                <Plus className="mr-2 h-4 w-4" />
                Add site
              </Button>
            ) : null}
          </div>
        }
      >
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Code</TableHead>
              <TableHead>Name</TableHead>
              <TableHead>Location</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {sites.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                  {canManage && statusFilter === 'active' ? ' Click "Add site" to create one.' : ''}
                </TableCell>
              </TableRow>
            ) : (
              sites.map((s) => (
                <TableRow key={s.id}>
                  <TableCell className="font-medium">{s.code}</TableCell>
                  <TableCell>{s.name}</TableCell>
                  <TableCell>{s.location || '—'}</TableCell>
                  <TableCell>{clinicalActiveBadge(s.isActive)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(s)} aria-label="Edit site">
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => setDeleteTarget(s)}
                        aria-label="Remove site"
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
          <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? 'Edit clinical site' : 'Add clinical site'}</DialogTitle>
              <DialogDescription>Register a hospital or ward used for clinical rotations.</DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="space-y-2">
                <Label>Site code</Label>
                <Input value={form.code} onChange={(e) => setForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. MNRH" required />
              </div>
              <div className="space-y-2">
                <Label>Site name</Label>
                <Input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
              </div>
              <div className="space-y-2">
                <Label>Location</Label>
                <Input value={form.location} onChange={(e) => setForm((f) => ({ ...f, location: e.target.value }))} placeholder="City or address" />
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
                  {saving ? 'Saving…' : editing ? 'Update site' : 'Add site'}
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
              <DialogTitle>Remove clinical site?</DialogTitle>
              <DialogDescription>
                {deleteTarget ? (
                  <>
                    Remove <span className="font-medium text-foreground">{deleteTarget.name}</span>? If students are
                    still on placement here, the site will be marked inactive instead of deleted.
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
                Cancel
              </Button>
              <Button variant="destructive" onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Removing…' : 'Remove site'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
