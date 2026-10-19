import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { Building2, GraduationCap, Loader2 } from 'lucide-react';
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
import { PASSWORD_POLICY_SUMMARY, passwordPolicyProblem } from '@/lib/password-policy';
import { Checkbox } from '@/components/ui/checkbox';
import { Combobox } from '@/components/ui/combobox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { cn } from '@/lib/utils';
import {
  ACADEMIC_RANK_OPTIONS,
  STAFF_CATEGORY_OPTIONS,
  type AcademicRank,
  type StaffCategory,
} from '@/types';

export type StaffPlacementKind = 'academic' | 'office';

export type StaffFormValues = {
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  gender: string;
  hireDate: string;
  placement: StaffPlacementKind;
  departmentId: string;
  schoolId: string;
  orgUnitId: string;
  role: string;
  staffCategory: StaffCategory;
  academicRank: AcademicRank | '';
  hasPhd: boolean;
  employmentType: string;
  status: string;
  supervisorId: string;
  userRole: string;
  tempPassword: string;
};

type DeptOption = { id: string; name: string; schoolId: string | null };
type SchoolOption = { id: string; name: string };
export type OfficeOption = { id: string; label: string };
export type SupervisorOption = { id: string; firstName: string; lastName: string; staffNumber: string; role: string };

const EMPTY_FORM: StaffFormValues = {
  staffNumber: '',
  firstName: '',
  lastName: '',
  email: '',
  phone: '',
  gender: '',
  hireDate: '',
  placement: 'academic',
  departmentId: '',
  schoolId: '',
  orgUnitId: '',
  role: '',
  staffCategory: 'Academic',
  academicRank: '',
  hasPhd: false,
  employmentType: 'Full-time',
  status: 'Active',
  supervisorId: '',
  userRole: '',
  tempPassword: '',
};

const EMPLOYMENT_TYPES = ['Full-time', 'Part-time', 'Contract', 'Visiting'];
const STATUSES = ['Active', 'On Leave', 'Probation', 'Suspended', 'Inactive'];
const NEW_HIRE_STATUSES = ['Active', 'Probation'];
const RANK_LABEL = new Map<string, string>(ACADEMIC_RANK_OPTIONS.map((r) => [r.value, r.label]));
const USER_ROLES = [
  { value: 'Staff', label: 'Staff (default for offices and QA)' },
  { value: 'Lecturer', label: 'Lecturer' },
  { value: 'Timekeeper', label: 'Timekeeper (attendance desk)' },
];
const HR_ASSIGNABLE_ROLES = new Set(['Staff', 'Lecturer', 'Timekeeper']);
const AUTO_SUPERVISOR = '__auto';
const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const PLACEMENT_CHOICES: Array<{ value: StaffPlacementKind; title: string; hint: string; icon: typeof Building2 }> = [
  { value: 'academic', title: 'Academic department', hint: 'A department inside a school', icon: GraduationCap },
  { value: 'office', title: 'Office or unit', hint: 'An administrative office, directorate or unit', icon: Building2 },
];

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  mode: 'create' | 'edit';
  initial?: Partial<StaffFormValues>;
  departments: DeptOption[];
  schools: SchoolOption[];
  offices: OfficeOption[];
  supervisors?: SupervisorOption[];
  excludeStaffId?: string;
  onSubmit: (values: StaffFormValues) => Promise<void>;
};

function FormSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <h3 className="border-b pb-1.5 text-sm font-semibold text-foreground">{title}</h3>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">{children}</div>
    </section>
  );
}

function missingFields(form: StaffFormValues, mode: 'create' | 'edit'): string[] {
  const missing: string[] = [];
  if (!form.firstName.trim()) missing.push('first name');
  if (!form.lastName.trim()) missing.push('last name');
  if (mode === 'create' && !form.gender) missing.push('gender');
  if (!form.email.trim()) missing.push('email');
  if (mode === 'edit' && !form.staffNumber.trim()) missing.push('staff number');
  if (!form.role.trim()) missing.push('job title');
  if (form.placement === 'academic' && !form.departmentId) missing.push('department');
  if (form.placement === 'office' && !form.orgUnitId) missing.push('office or unit');
  return missing;
}

export function StaffFormDialog({
  open,
  onOpenChange,
  mode,
  initial,
  departments,
  schools,
  offices,
  supervisors = [],
  excludeStaffId,
  onSubmit,
}: Props) {
  const [form, setForm] = useState<StaffFormValues>(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const roleOptions = USER_ROLES.filter((r) => HR_ASSIGNABLE_ROLES.has(r.value));

  useEffect(() => {
    if (open) {
      setForm({ ...EMPTY_FORM, ...initial });
      setError('');
    }
  }, [open, initial]);

  const set = <K extends keyof StaffFormValues>(key: K, value: StaffFormValues[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const setCategory = (category: StaffCategory) =>
    setForm((prev) => {
      const placementChosen = Boolean(prev.departmentId || prev.orgUnitId);
      return {
        ...prev,
        staffCategory: category,
        academicRank: category === 'Academic' ? prev.academicRank : '',
        placement: placementChosen ? prev.placement : category === 'Academic' ? 'academic' : 'office',
      };
    });

  const setRank = (value: string) =>
    setForm((prev) => {
      const academicRank = value === '_none' ? '' : (value as AcademicRank);
      const previousLabel = prev.academicRank ? RANK_LABEL.get(prev.academicRank) : undefined;
      const titleFollowsRank = !prev.role.trim() || prev.role.trim() === previousLabel;
      const nextLabel = academicRank ? RANK_LABEL.get(academicRank) : undefined;
      return {
        ...prev,
        academicRank,
        role: titleFollowsRank && nextLabel ? nextLabel : prev.role,
      };
    });

  const statusOptions =
    mode === 'create' ? NEW_HIRE_STATUSES : STATUSES.includes(form.status) ? STATUSES : [...STATUSES, form.status];

  const setPlacement = (placement: StaffPlacementKind) =>
    setForm((prev) =>
      placement === 'academic'
        ? { ...prev, placement, orgUnitId: '' }
        : { ...prev, placement, departmentId: '', schoolId: '' }
    );

  const visibleDepts = useMemo(
    () => (form.schoolId ? departments.filter((d) => d.schoolId === form.schoolId) : departments),
    [departments, form.schoolId]
  );

  const supervisorOptions = useMemo(
    () => [
      { value: AUTO_SUPERVISOR, label: 'Automatic (from organisation structure)' },
      ...supervisors
        .filter((s) => s.id !== excludeStaffId)
        .map((s) => ({ value: s.id, label: `${s.firstName} ${s.lastName} · ${s.role} (${s.staffNumber})` })),
    ],
    [supervisors, excludeStaffId]
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const missing = missingFields(form, mode);
    if (missing.length) {
      setError(`Please complete: ${missing.join(', ')}.`);
      return;
    }
    if (!EMAIL_PATTERN.test(form.email.trim())) {
      setError('Enter a valid email address.');
      return;
    }
    const passwordProblem = form.tempPassword.trim() ? passwordPolicyProblem(form.tempPassword.trim()) : null;
    if (passwordProblem) {
      setError(passwordProblem);
      return;
    }
    setSaving(true);
    setError('');
    try {
      await onSubmit({
        ...form,
        firstName: form.firstName.trim(),
        lastName: form.lastName.trim(),
        email: form.email.trim(),
        staffNumber: form.staffNumber.trim(),
        role: form.role.trim(),
        phone: form.phone.trim(),
      });
      onOpenChange(false);
    } catch (err: any) {
      setError(err?.response?.data?.message || err?.message || 'Failed to save staff record.');
    } finally {
      setSaving(false);
    }
  };

  const isAcademic = form.staffCategory === 'Academic';

  return (
    <Dialog open={open} onOpenChange={(v) => !saving && onOpenChange(v)}>
      <DialogContent className="flex max-h-[92vh] w-[96vw] max-w-3xl flex-col gap-0 p-0">
        <DialogHeader className="border-b px-6 py-4">
          <DialogTitle>{mode === 'create' ? 'Add Employee' : 'Edit Employee'}</DialogTitle>
          <DialogDescription>
            {mode === 'create'
              ? 'Create the staff record, place the person in the organisation and set up their sign-in.'
              : 'Update the staff record and where the person works.'}
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col" noValidate>
          <div className="min-h-0 flex-1 space-y-6 overflow-y-auto px-6 py-5">
            <FormSection title="Personal details">
              <div className="space-y-1.5">
                <Label htmlFor="staff-first-name">First name *</Label>
                <Input
                  id="staff-first-name"
                  value={form.firstName}
                  onChange={(e) => set('firstName', e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-last-name">Last name *</Label>
                <Input
                  id="staff-last-name"
                  value={form.lastName}
                  onChange={(e) => set('lastName', e.target.value)}
                  autoComplete="off"
                />
              </div>
              <div className="space-y-1.5">
                <Label>Gender {mode === 'create' ? '*' : ''}</Label>
                <Select value={form.gender || '_none'} onValueChange={(v) => set('gender', v === '_none' ? '' : v)}>
                  <SelectTrigger className="w-full"><SelectValue placeholder="Select gender" /></SelectTrigger>
                  <SelectContent>
                    {mode === 'edit' && <SelectItem value="_none">Not recorded</SelectItem>}
                    {mode === 'create' && <SelectItem value="_none" disabled>Select gender</SelectItem>}
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-phone">Phone</Label>
                <Input
                  id="staff-phone"
                  type="tel"
                  value={form.phone}
                  onChange={(e) => set('phone', e.target.value)}
                  placeholder="+256 7XX XXX XXX"
                />
              </div>
              <div className="space-y-1.5 sm:col-span-2">
                <LabelWithInfo
                  htmlFor="staff-email"
                  info="The official university email. It is also the sign-in username for the system account."
                >
                  Work email *
                </LabelWithInfo>
                <Input
                  id="staff-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => set('email', e.target.value)}
                  placeholder="name@kcu.ac.ug"
                  autoComplete="off"
                />
              </div>
            </FormSection>

            <FormSection title="Employment">
              <div className="space-y-1.5">
                <LabelWithInfo
                  htmlFor="staff-number"
                  info={
                    mode === 'create'
                      ? 'Optional. Leave blank and a unique staff number is assigned. You can replace it later with the number from the appointment letter.'
                      : 'The number on the appointment letter. It must be unique.'
                  }
                >
                  Staff number{mode === 'edit' ? ' *' : ''}
                </LabelWithInfo>
                <Input
                  id="staff-number"
                  value={form.staffNumber}
                  onChange={(e) => set('staffNumber', e.target.value)}
                  placeholder={mode === 'create' ? 'Generated if blank' : 'e.g. KCU-0042'}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="staff-hire-date">Date joined</Label>
                <Input
                  id="staff-hire-date"
                  type="date"
                  value={form.hireDate}
                  onChange={(e) => set('hireDate', e.target.value)}
                />
              </div>
              <div className="space-y-1.5">
                <LabelWithInfo info="Academic staff teach and hold an academic rank. Administrative, support and clinical staff usually work in an office or unit.">
                  Staff category *
                </LabelWithInfo>
                <Select value={form.staffCategory} onValueChange={(v) => setCategory(v as StaffCategory)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {STAFF_CATEGORY_OPTIONS.map((c) => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {isAcademic && (
                <div className="space-y-1.5">
                  <LabelWithInfo info="The academic grade used for workload and reports. Choosing a rank fills an empty job title with the same name.">
                    Academic rank
                  </LabelWithInfo>
                  <Select value={form.academicRank || '_none'} onValueChange={setRank}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Select rank" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_none">Not set</SelectItem>
                      {ACADEMIC_RANK_OPTIONS.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className={cn('space-y-1.5', isAcademic && 'sm:col-span-2')}>
                <LabelWithInfo
                  htmlFor="staff-job-title"
                  info="The position on the appointment letter, e.g. Senior Lecturer, Accountant, Assistant Librarian. Leadership roles such as Dean or Head of Department are assigned in Organisation Structure."
                >
                  Job title *
                </LabelWithInfo>
                <Input
                  id="staff-job-title"
                  value={form.role}
                  onChange={(e) => set('role', e.target.value)}
                  placeholder={isAcademic ? 'e.g. Senior Lecturer' : 'e.g. Accountant'}
                />
              </div>
              <div className="space-y-1.5">
                <Label>Employment type</Label>
                <Select value={form.employmentType} onValueChange={(v) => set('employmentType', v)}>
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
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
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {statusOptions.map((s) => (
                      <SelectItem key={s} value={s}>{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-center gap-2 sm:col-span-2">
                <Checkbox
                  id="staff-has-phd"
                  checked={form.hasPhd}
                  onCheckedChange={(v) => set('hasPhd', v === true)}
                />
                <Label htmlFor="staff-has-phd">Holds a PhD</Label>
              </div>
            </FormSection>

            <section className="space-y-3">
              <h3 className="border-b pb-1.5 text-sm font-semibold text-foreground">Placement and reporting</h3>
              <div className="space-y-1.5">
                <LabelWithInfo info="Each person has one home: an academic department inside a school, or an administrative office or unit. A lecturer who also holds an office (for example the DVC) keeps the department here and gets the office as an appointment in Organisation Structure.">
                  Works in *
                </LabelWithInfo>
                <div role="radiogroup" aria-label="Works in" className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  {PLACEMENT_CHOICES.map((choice) => {
                    const selected = form.placement === choice.value;
                    const Icon = choice.icon;
                    return (
                      <button
                        key={choice.value}
                        type="button"
                        role="radio"
                        aria-checked={selected}
                        onClick={() => setPlacement(choice.value)}
                        className={cn(
                          'flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-colors',
                          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring',
                          selected ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:bg-muted/60'
                        )}
                      >
                        <Icon className={cn('mt-0.5 h-5 w-5 shrink-0', selected ? 'text-primary' : 'text-muted-foreground')} />
                        <span className="min-w-0">
                          <span className="block text-sm font-medium">{choice.title}</span>
                          <span className="block text-xs text-muted-foreground">{choice.hint}</span>
                        </span>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {form.placement === 'academic' ? (
                  <>
                    <div className="space-y-1.5">
                      <Label>School</Label>
                      <Combobox
                        className="font-normal"
                        options={schools.map((s) => ({ value: s.id, label: s.name }))}
                        value={form.schoolId}
                        onValueChange={(v) => setForm((prev) => ({ ...prev, schoolId: v, departmentId: '' }))}
                        placeholder="Any school"
                        searchPlaceholder="Search schools..."
                        initialDisplayCount={50}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Department *</Label>
                      <Combobox
                        className="font-normal"
                        options={visibleDepts.map((d) => ({ value: d.id, label: d.name }))}
                        value={form.departmentId}
                        onValueChange={(v) => {
                          const dept = departments.find((d) => d.id === v);
                          setForm((prev) => ({ ...prev, departmentId: v, schoolId: dept?.schoolId ?? prev.schoolId }));
                        }}
                        placeholder="Select department"
                        searchPlaceholder="Search departments..."
                        emptyText="No department found."
                        initialDisplayCount={100}
                      />
                    </div>
                  </>
                ) : (
                  <div className="space-y-1.5 sm:col-span-2">
                    <Label>Office or unit *</Label>
                    <Combobox
                      className="font-normal"
                      options={offices.map((o) => ({ value: o.id, label: o.label }))}
                      value={form.orgUnitId}
                      onValueChange={(v) => set('orgUnitId', v)}
                      placeholder="Select office, directorate or unit"
                      searchPlaceholder="Search offices..."
                      emptyText="No office found. Add it in Organisation Structure."
                      initialDisplayCount={200}
                    />
                  </div>
                )}

                <div className="space-y-1.5 sm:col-span-2">
                  <LabelWithInfo info="Automatic follows the organisation structure: the head of department, then the dean, then the office heads up to the Vice Chancellor. Pick a person only for exceptions.">
                    Supervisor / line manager
                  </LabelWithInfo>
                  <Combobox
                    className="font-normal"
                    options={supervisorOptions}
                    value={form.supervisorId || AUTO_SUPERVISOR}
                    onValueChange={(v) => set('supervisorId', !v || v === AUTO_SUPERVISOR ? '' : v)}
                    placeholder="Automatic (from organisation structure)"
                    searchPlaceholder="Search staff by name or number..."
                    emptyText="No staff found."
                    initialDisplayCount={50}
                  />
                </div>
              </div>
            </section>

            <FormSection title="System access">
              {mode === 'create' && (
                <div className="space-y-1.5">
                  <LabelWithInfo info="Automatic gives academic staff Lecturer and everyone else Staff. Place QA officers, clinical QA and clinical coordinators in Quality Assurance on Organisation Structure — their menus come from that post. Use Timekeeper only for the attendance desk.">
                    Account type
                  </LabelWithInfo>
                  <Select value={form.userRole || '_auto'} onValueChange={(v) => set('userRole', v === '_auto' ? '' : v)}>
                    <SelectTrigger className="w-full"><SelectValue placeholder="Automatic" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="_auto">Automatic from category</SelectItem>
                      {roleOptions.map((r) => (
                        <SelectItem key={r.value} value={r.value}>{r.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-1.5">
                <LabelWithInfo
                  htmlFor="staff-temp-password"
                  info={
                    mode === 'create'
                      ? `The first password for signing in. Leave blank to generate a secure one, shown once after saving. ${PASSWORD_POLICY_SUMMARY} The person must choose their own password at first sign-in.`
                      : `Set only to reset this person's password. ${PASSWORD_POLICY_SUMMARY} They must choose their own password at next sign-in. Leave blank to keep the current one.`
                  }
                >
                  {mode === 'create' ? 'Temporary password' : 'Reset password'}
                </LabelWithInfo>
                <Input
                  id="staff-temp-password"
                  type="text"
                  value={form.tempPassword}
                  onChange={(e) => set('tempPassword', e.target.value)}
                  placeholder={mode === 'create' ? 'Generated if blank' : 'Unchanged if blank'}
                  autoComplete="new-password"
                />
              </div>
            </FormSection>
          </div>

          <div className="border-t px-6 py-4">
            {error && <p className="mb-3 text-sm font-medium text-destructive">{error}</p>}
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
                Cancel
              </Button>
              <Button type="submit" disabled={saving}>
                {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {mode === 'create' ? 'Create employee' : 'Save changes'}
              </Button>
            </DialogFooter>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
