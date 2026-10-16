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
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import type { OrgAppointment, OrgUnitNode } from '@/services/organization.service';

export type StaffPickerOption = { value: string; label: string };

export type AppointmentFormValues = {
  staffId: string;
  title: string;
  isHead: boolean;
  isActing: boolean;
  startDate: string;
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  unit: OrgUnitNode | null;
  editing: OrgAppointment | null;
  asHead: boolean;
  staffOptions: StaffPickerOption[];
  onSubmit: (values: AppointmentFormValues) => Promise<void>;
};

export function OrgAppointmentDialog({ open, onOpenChange, unit, editing, asHead, staffOptions, onSubmit }: Props) {
  const [form, setForm] = useState<AppointmentFormValues>({
    staffId: '',
    title: '',
    isHead: false,
    isActing: false,
    startDate: '',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!open) return;
    setForm(
      editing
        ? {
            staffId: editing.staffId,
            title: editing.title,
            isHead: editing.isHead,
            isActing: editing.isActing,
            startDate: editing.startDate ?? '',
          }
        : {
            staffId: '',
            title: asHead ? (unit?.headTitle ?? `Head, ${unit?.name ?? ''}`) : '',
            isHead: asHead,
            isActing: false,
            startDate: '',
          }
    );
    setError('');
  }, [open, editing, asHead, unit]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.staffId || form.title.trim().length < 2) {
      setError('Choose a staff member and give the appointment a title.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({ ...form, title: form.title.trim() });
      onOpenChange(false);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Could not save the appointment.');
    } finally {
      setSaving(false);
    }
  };

  const currentHead = unit?.heads.find((h) => h.id !== editing?.id);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {editing ? 'Edit appointment' : form.isHead ? `Assign head of ${unit?.name}` : `Add appointment in ${unit?.name}`}
          </DialogTitle>
          <DialogDescription>
            Appointments record leadership and posts on top of the person's home department or office.
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-1.5">
            <Label>Staff member *</Label>
            <Combobox
              options={staffOptions}
              value={form.staffId}
              onValueChange={(v) => setForm((p) => ({ ...p, staffId: v }))}
              placeholder="Search staff"
              searchPlaceholder="Type a name or staff number..."
              emptyText="No staff found."
              initialDisplayCount={50}
              disabled={Boolean(editing)}
            />
          </div>
          <div className="space-y-1.5">
            <Label>Appointment title *</Label>
            <Input
              value={form.title}
              onChange={(e) => setForm((p) => ({ ...p, title: e.target.value }))}
              placeholder="e.g. Dean, Deputy Dean, Accountant"
            />
          </div>
          <div className="space-y-1.5">
            <Label>Start date</Label>
            <Input
              type="date"
              value={form.startDate}
              onChange={(e) => setForm((p) => ({ ...p, startDate: e.target.value }))}
            />
          </div>
          <div className="flex flex-wrap gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="appointment-head"
                checked={form.isHead}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isHead: v === true }))}
              />
              <LabelWithInfo
                htmlFor="appointment-head"
                info="The head is the person everyone in this unit reports to. A unit has one head; assigning a new one ends the previous head's appointment."
              >
                Heads this unit
              </LabelWithInfo>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="appointment-acting"
                checked={form.isActing}
                onCheckedChange={(v) => setForm((p) => ({ ...p, isActing: v === true }))}
              />
              <Label htmlFor="appointment-acting">Acting</Label>
            </div>
          </div>
          {form.isHead && currentHead && (
            <p className="text-sm text-amber-700">
              {currentHead.staffName} currently heads this unit. Saving ends that appointment today.
            </p>
          )}
          {error && <p className="text-sm font-medium text-destructive">{error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
