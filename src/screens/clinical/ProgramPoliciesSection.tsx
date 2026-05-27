import { useState } from 'react';
import { Edit } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clinicalService } from '@/services/clinical.service';
import { clinicalActiveBadge } from './clinical-ui';
import { ClinicalTableCard } from './ClinicalTableCard';

type PolicyRow = {
  id: string;
  programId: string;
  minYear: number;
  minSemester: number;
  isActive: boolean;
  program?: { id: string; name: string; code: string };
};

type PolicyStatusFilter = 'active' | 'inactive' | 'all';

type ProgramPoliciesSectionProps = {
  policies: PolicyRow[];
  canManage: boolean;
  loading?: boolean;
  statusFilter: PolicyStatusFilter;
  onStatusFilterChange: (value: PolicyStatusFilter) => void;
  onRefresh: () => Promise<void>;
};

export function ProgramPoliciesSection({
  policies,
  canManage,
  loading,
  statusFilter,
  onStatusFilterChange,
  onRefresh,
}: ProgramPoliciesSectionProps) {
  const [editing, setEditing] = useState<PolicyRow | null>(null);
  const [minYear, setMinYear] = useState('3');
  const [minSemester, setMinSemester] = useState('1');
  const [isActive, setIsActive] = useState(true);
  const [saving, setSaving] = useState(false);

  const openEdit = (row: PolicyRow) => {
    setEditing(row);
    setMinYear(String(row.minYear));
    setMinSemester(String(row.minSemester));
    setIsActive(row.isActive);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editing) return;
    setSaving(true);
    try {
      await clinicalService.upsertProgramPolicy(editing.programId, {
        minYear: Number(minYear),
        minSemester: Number(minSemester),
        isActive,
      });
      toast.success('Clinical policy updated');
      setEditing(null);
      await onRefresh();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save policy');
    } finally {
      setSaving(false);
    }
  };

  const label = (row: PolicyRow) => {
    const y = row.minYear;
    const s = row.minSemester;
    return `Year ${y}, Semester ${s}+`;
  };

  const emptyMessage =
    statusFilter === 'inactive'
      ? 'No inactive clinical programs.'
      : statusFilter === 'all'
        ? 'No programs found. Run database seed to create default policies.'
        : 'No active clinical programs. Inactive programs are hidden — use the status filter to view them.';

  return (
    <>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-muted-foreground">
          Inactive programs are excluded from rotations, roster enrollments, and clinical reports.
        </p>
        <div className="flex items-center gap-2">
          <Label htmlFor="policy-status-filter" className="text-sm whitespace-nowrap">
            Show
          </Label>
          <Select
            value={statusFilter}
            onValueChange={(v) => onStatusFilterChange(v as PolicyStatusFilter)}
          >
            <SelectTrigger id="policy-status-filter" className="w-[160px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="active">Active only</SelectItem>
              <SelectItem value="inactive">Inactive only</SelectItem>
              <SelectItem value="all">All programs</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <ClinicalTableCard title="Program clinical eligibility" total={policies.length} loading={loading}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Program</TableHead>
              <TableHead>Code</TableHead>
              <TableHead>Clinical starts at</TableHead>
              <TableHead>Status</TableHead>
              {canManage && <TableHead className="text-right">Action</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {policies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={canManage ? 5 : 4} className="py-10 text-center text-muted-foreground">
                  {emptyMessage}
                </TableCell>
              </TableRow>
            ) : (
              policies.map((row) => (
                <TableRow key={row.id}>
                  <TableCell className="font-medium">{row.program?.name || '—'}</TableCell>
                  <TableCell>{row.program?.code || '—'}</TableCell>
                  <TableCell>{label(row)}</TableCell>
                  <TableCell>{clinicalActiveBadge(row.isActive)}</TableCell>
                  {canManage && (
                    <TableCell className="text-right">
                      <Button variant="ghost" size="sm" onClick={() => openEdit(row)}>
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
        <Dialog open={!!editing} onOpenChange={(open) => !open && setEditing(null)}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Edit clinical eligibility</DialogTitle>
              <DialogDescription>
                {editing?.program?.name} — students become clinically eligible from this year and semester onward (e.g. MBChB 3.1 = year 3, semester 1).
              </DialogDescription>
            </DialogHeader>
            <form onSubmit={save} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Minimum year</Label>
                  <Input type="number" min={1} max={10} value={minYear} onChange={(e) => setMinYear(e.target.value)} required />
                </div>
                <div className="space-y-2">
                  <Label>Minimum semester</Label>
                  <Input type="number" min={1} max={2} value={minSemester} onChange={(e) => setMinSemester(e.target.value)} required />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Policy status</Label>
                <Select value={isActive ? 'active' : 'inactive'} onValueChange={(v) => setIsActive(v === 'active')}>
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
                <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                  Cancel
                </Button>
                <Button type="submit" className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving}>
                  {saving ? 'Saving…' : 'Save policy'}
                </Button>
              </DialogFooter>
            </form>
          </DialogContent>
        </Dialog>
      )}
    </>
  );
}
