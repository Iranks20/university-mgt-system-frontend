import { useEffect, useState } from 'react';
import { Loader2 } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import type { OrgAcademicDepartment } from '@/services/organization.service';
import type { StaffPickerOption } from './OrgAppointmentDialog';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  department: OrgAcademicDepartment | null;
  staffOptions: StaffPickerOption[];
  onSubmit: (headStaffId: string | null, isActing: boolean) => Promise<void>;
};

export function DepartmentHeadDialog({ open, onOpenChange, department, staffOptions, onSubmit }: Props) {
  const [headStaffId, setHeadStaffId] = useState('');
  const [isActing, setIsActing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setHeadStaffId(department?.headStaffId ?? '');
    setIsActing(department?.headIsActing ?? false);
    setError('');
  }, [open, department]);

  const save = async (staffId: string | null) => {
    setSaving(true);
    setError('');
    try {
      await onSubmit(staffId, staffId ? isActing : false);
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not update the head of department.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Head of {department?.name}</DialogTitle>
          <DialogDescription>
            Staff in this department report to the head; the head reports to the dean of the school.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label>Head of department</Label>
            <Combobox
              options={staffOptions}
              value={headStaffId}
              onValueChange={setHeadStaffId}
              placeholder="Search staff"
              searchPlaceholder="Type a name or staff number..."
              emptyText="No staff found."
              initialDisplayCount={50}
            />
          </div>
          <div className="flex items-center gap-2">
            <Checkbox id="hod-acting" checked={isActing} onCheckedChange={(v) => setIsActing(v === true)} />
            <Label htmlFor="hod-acting">Acting head</Label>
          </div>
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
        </div>
        <DialogFooter className="gap-2 sm:justify-between">
          <Button
            type="button"
            variant="ghost"
            className="text-red-600"
            onClick={() => save(null)}
            disabled={saving || !department?.headStaffId}
          >
            Mark as vacant
          </Button>
          <div className="flex gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="button" onClick={() => save(headStaffId || null)} disabled={saving || !headStaffId}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
