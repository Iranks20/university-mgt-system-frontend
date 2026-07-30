import { useEffect, useState } from 'react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2 } from 'lucide-react';

export type StaffFormValues = {
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  departmentId: string;
  schoolId: string;
  role: string;
  employmentType: string;
  status: string;
  supervisorId: string;
  userRole: string;
  tempPassword: string;
};

type DeptOption = { id: string; name: string; schoolId: string | null };
type SchoolOption = { id: string; name: string };
type SupervisorOption = { id: string; firstName: string; lastName: string; staffNumber: string; role: string };

const EMPTY_FORM: StaffFormValues = {
  staffNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  departmentId: '',
  schoolId: '',
  role: '',
  employmentType: 'Full-time',
  status: 'Active',
  supervisorId: '',
  userRole: '',
  tempPassword: '',
};

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Visiting'];
const STATUSES = ['Active', 'On Leave', 'Probation', 'Suspended', 'Inactive'];
const USER_ROLES = [
  { value: 'Staff', label: 'Staff' },
  { value: 'HR', label: 'HR' },
  { value: 'Lecturer', label: 'Lecturer' },
  { value: 'Management', label: 'Management' },
  { value: 'QA', label: 'QA' },
  { value: 'QAClinicals', label: 'QA Clinicals' },
  { value: 'ClinicalCoordinator', label: 'Clinical Coordinator' },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: Partial<StaffFormValues>;
  departments: DeptOption[];
  schools: SchoolOption[];
  supervisors?: SupervisorOption[];
  excludeStaffId?: string;
  onSubmit: (values: StaffFormValues) => Promise<void>;
};

export function StaffFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  departments,
  schools,
  supervisors = [],
  excludeStaffId,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<StaffFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initial });
      setError('');
    }
  }, [open, initial]);

  const set = (key: keyof StaffFormValues, value: string) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const visibleDepts = form.schoolId
    ? departments.filter((d) => d.schoolId === form.schoolId)
    : departments;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.firstName || !form.lastName || !form.email || !form.departmentId || !form.role) {
      setError('Please fill in all required fields.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit(form);
      onOpenChange(false);
    } catch (err: any) {
      const msg =
        err?.response?.data?.message || err?.message || 'Failed to save staff record.';
      setError(msg);
    } finally {
      setSaving(false);
    }
  };

  const title = mode === 'create' ? 'Add Employee' : 'Edit Employee';

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create a new staff record. A user account will be linked automatically.'
              : 'Update employee details.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div className="space-y-1.5">
              <Label>Staff Number *</Label>
              <Input
                value={form.staffNumber}
                onChange={(e) => set('staffNumber', e.target.value)}
                placeholder="e.g. KCU-0042"
                required
                disabled={mode === 'edit'}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Email *</Label>
              <Input
                type="email"
                value={form.email}
                onChange={(e) => set('email', e.target.value)}
                placeholder="name@kcu.ac.ug"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>First Name *</Label>
              <Input
                value={form.firstName}
                onChange={(e) => set('firstName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Last Name *</Label>
              <Input
                value={form.lastName}
                onChange={(e) => set('lastName', e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>Phone</Label>
              <Input
                value={form.phone}
                onChange={(e) => set('phone', e.target.value)}
                placeholder="+256…"
              />
            </div>

            <div className="space-y-1.5">
              <Label>Job Title / Role *</Label>
              <Input
                value={form.role}
                onChange={(e) => set('role', e.target.value)}
                placeholder="e.g. Lecturer, HR Officer, Lab Tech"
                required
              />
            </div>

            <div className="space-y-1.5">
              <Label>School</Label>
              <Select value={form.schoolId || '_none'} onValueChange={(v) => set('schoolId', v === '_none' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Select school" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">— None —</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Department *</Label>
              <Select value={form.departmentId} onValueChange={(v) => set('departmentId', v)}>
                <SelectTrigger><SelectValue placeholder="Select department" /></SelectTrigger>
                <SelectContent>
                  {visibleDepts.map((d) => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Employment Type</Label>
              <Select value={form.employmentType} onValueChange={(v) => set('employmentType', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {EMPLOYMENT_TYPES.map((t) => (
                    <SelectItem key={t} value={t}>{t}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v) => set('status', v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STATUSES.map((s) => (
                    <SelectItem key={s} value={s}>{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5 sm:col-span-2">
              <Label>Supervisor / Line Manager</Label>
              <Select
                value={form.supervisorId || '_none'}
                onValueChange={(v) => set('supervisorId', v === '_none' ? '' : v)}
              >
                <SelectTrigger><SelectValue placeholder="Use department HOD if not set" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_none">Use department HOD (default)</SelectItem>
                  {supervisors
                    .filter((s) => s.id !== excludeStaffId)
                    .map((s) => (
                      <SelectItem key={s.id} value={s.id}>
                        {s.firstName} {s.lastName} · {s.role} ({s.staffNumber})
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-1.5">
              <Label>System Role (User Account)</Label>
              <Select value={form.userRole || '_auto'} onValueChange={(v) => set('userRole', v === '_auto' ? '' : v)}>
                <SelectTrigger><SelectValue placeholder="Auto-detect from job title" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="_auto">Auto-detect from job title</SelectItem>
                  {USER_ROLES.map((r) => (
                    <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {mode === 'create' && (
              <div className="space-y-1.5">
                <Label>Temp Password</Label>
                <Input
                  type="text"
                  value={form.tempPassword}
                  onChange={(e) => set('tempPassword', e.target.value)}
                  placeholder="Leave blank for default"
                />
              </div>
            )}
          </div>

          {error && (
            <p className="text-sm font-medium text-destructive">{error}</p>
          )}

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
              Cancel
            </Button>
            <Button type="submit" disabled={saving}>
              {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {mode === 'create' ? 'Create Employee' : 'Save Changes'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
