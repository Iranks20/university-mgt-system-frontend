import { useState } from 'react';
import { Pencil, Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { COMMITTEE_SECTION_LABELS } from '@/features/graduation/constants';
import type {
  CommitteeWorkspaceSection,
  GraduationCommitteeActivityRecord,
  GraduationCommitteeExpenseRecord,
  GraduationCommitteeMemberRecord,
  GraduationCommitteeSupplierRecord,
} from '@/features/graduation/types';
import {
  graduationModuleService,
  type GraduationCommitteeWorkspace,
} from '@/services/graduation-module.service';

type CommitteeWorkspacePanelProps = {
  workspace: GraduationCommitteeWorkspace;
  section: CommitteeWorkspaceSection;
  onSectionChange: (section: CommitteeWorkspaceSection) => void;
  onRefresh: () => Promise<void>;
};

function formatMoney(value: number) {
  return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'UGX', maximumFractionDigits: 0 }).format(
    value
  );
}

export function CommitteeWorkspacePanel({
  workspace,
  section,
  onSectionChange,
  onRefresh,
}: CommitteeWorkspacePanelProps) {
  const { committee, sections, canEdit } = workspace;
  const metaDescription =
    sections.includes('expenses')
      ? 'Track committee members and every expense with who recorded it.'
      : sections.includes('suppliers')
        ? 'Track members and vendors or companies engaged for this committee.'
        : 'Track members and tasks so everyone knows who is responsible.';

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">{workspace.event.title}</CardTitle>
          <CardDescription>{metaDescription}</CardDescription>
        </CardHeader>
      </Card>

      <Tabs
        value={section}
        onValueChange={(v) => onSectionChange(v as CommitteeWorkspaceSection)}
        className="min-w-0 w-full space-y-4"
      >
        <TabsList className="bg-gray-100 h-auto w-full max-w-full flex flex-wrap items-center justify-start gap-1 p-1 [&_[data-slot=tabs-trigger]]:h-8 [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:flex-none">
          {sections.map((s) => (
            <TabsTrigger key={s} value={s} className="text-xs sm:text-sm">
              {COMMITTEE_SECTION_LABELS[s]}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="members" className="mt-0">
          <MembersSection
            committeeId={committee.id}
            members={workspace.members}
            canEdit={canEdit}
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="expenses" className="mt-0">
          <ExpensesSection
            committeeId={committee.id}
            expenses={workspace.expenses}
            canEdit={canEdit}
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="suppliers" className="mt-0">
          <SuppliersSection
            committeeId={committee.id}
            suppliers={workspace.suppliers}
            canEdit={canEdit}
            onRefresh={onRefresh}
          />
        </TabsContent>

        <TabsContent value="activities" className="mt-0">
          <ActivitiesSection
            committeeId={committee.id}
            activities={workspace.activities}
            canEdit={canEdit}
            onRefresh={onRefresh}
          />
        </TabsContent>
      </Tabs>
    </div>
  );
}

type SectionProps<T> = {
  committeeId: string;
  canEdit: boolean;
  onRefresh: () => Promise<void>;
};

function MembersSection({
  committeeId,
  members,
  canEdit,
  onRefresh,
}: SectionProps<GraduationCommitteeMemberRecord[]> & { members: GraduationCommitteeMemberRecord[] }) {
  const empty = { fullName: '', roleTitle: '', organization: '', email: '', phone: '', notes: '' };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GraduationCommitteeMemberRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GraduationCommitteeMemberRecord | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (row: GraduationCommitteeMemberRecord) => {
    setEditing(row);
    setForm({
      fullName: row.fullName,
      roleTitle: row.roleTitle,
      organization: row.organization,
      email: row.email,
      phone: row.phone,
      notes: row.notes,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.fullName.trim()) {
      toast.error('Full name is required');
      return;
    }
    setSaving(true);
    try {
      if (editing) {
        await graduationModuleService.updateCommitteeMember(committeeId, editing.id, form);
        toast.success('Member updated');
      } else {
        await graduationModuleService.createCommitteeMember(committeeId, form);
        toast.success('Member added');
      }
      setOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save member');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await graduationModuleService.deleteCommitteeMember(committeeId, deleteTarget.id);
      toast.success('Member removed');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete member');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudTableShell
      title="Committee members"
      description="People serving on this committee — name, role, organisation, and contact details."
      canEdit={canEdit}
      onAdd={openAdd}
      addLabel="Add member"
      emptyMessage="No members yet. Add the chair, secretary, and other committee contacts."
      rows={members}
      columns={['Name', 'Role', 'Organisation', 'Contact', 'Updated by', '']}
      renderRow={(row) => (
        <TableRow key={row.id}>
          <TableCell className="font-medium">{row.fullName}</TableCell>
          <TableCell>{row.roleTitle || '—'}</TableCell>
          <TableCell>{row.organization || '—'}</TableCell>
          <TableCell>
            <div className="text-sm">{row.email || row.phone || '—'}</div>
            {row.email && row.phone ? (
              <div className="text-xs text-muted-foreground">{row.phone}</div>
            ) : null}
          </TableCell>
          <TableCell className="text-sm text-muted-foreground">{row.updatedByName || row.createdByName || '—'}</TableCell>
          <TableCell className="text-right">
            {canEdit ? (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row)} />
            ) : null}
          </TableCell>
        </TableRow>
      )}
      dialog={
        <>
          <MemberDialog open={open} onOpenChange={setOpen} editing={editing} form={form} setForm={setForm} saving={saving} onSubmit={save} />
          <DeleteDialog
            open={!!deleteTarget}
            onOpenChange={(v) => !v && setDeleteTarget(null)}
            title="Remove member?"
            description={`Remove ${deleteTarget?.fullName} from this committee?`}
            saving={saving}
            onConfirm={confirmDelete}
          />
        </>
      }
    />
  );
}

function ExpensesSection({
  committeeId,
  expenses,
  canEdit,
  onRefresh,
}: { expenses: GraduationCommitteeExpenseRecord[] } & SectionProps<GraduationCommitteeExpenseRecord[]>) {
  const empty = { description: '', amount: '', vendor: '', expenseDate: '', status: 'Planned', notes: '' };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GraduationCommitteeExpenseRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GraduationCommitteeExpenseRecord | null>(null);

  const total = expenses.reduce((sum, e) => sum + e.amount, 0);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (row: GraduationCommitteeExpenseRecord) => {
    setEditing(row);
    setForm({
      description: row.description,
      amount: String(row.amount),
      vendor: row.vendor,
      expenseDate: row.expenseDate,
      status: row.status,
      notes: row.notes,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(form.amount);
    if (!form.description.trim() || Number.isNaN(amount) || amount < 0) {
      toast.error('Description and a valid amount are required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        description: form.description.trim(),
        amount,
        vendor: form.vendor.trim(),
        expenseDate: form.expenseDate || null,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editing) {
        await graduationModuleService.updateCommitteeExpense(committeeId, editing.id, payload);
        toast.success('Expense updated');
      } else {
        await graduationModuleService.createCommitteeExpense(committeeId, payload);
        toast.success('Expense recorded');
      }
      setOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save expense');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await graduationModuleService.deleteCommitteeExpense(committeeId, deleteTarget.id);
      toast.success('Expense removed');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete expense');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudTableShell
      title="Expenses"
      description={`All graduation expenses for Finance. Total recorded: ${formatMoney(total)}`}
      canEdit={canEdit}
      onAdd={openAdd}
      addLabel="Add expense"
      emptyMessage="No expenses recorded yet."
      rows={expenses}
      columns={['Date', 'Description', 'Vendor', 'Amount', 'Status', 'Recorded by', '']}
      renderRow={(row) => (
        <TableRow key={row.id}>
          <TableCell>{row.expenseDate || '—'}</TableCell>
          <TableCell className="font-medium">{row.description}</TableCell>
          <TableCell>{row.vendor || '—'}</TableCell>
          <TableCell>{formatMoney(row.amount)}</TableCell>
          <TableCell>{row.status}</TableCell>
          <TableCell className="text-sm text-muted-foreground">{row.recordedByName || '—'}</TableCell>
          <TableCell className="text-right">
            {canEdit ? (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row)} />
            ) : null}
          </TableCell>
        </TableRow>
      )}
      dialog={
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit expense' : 'Record expense'}</DialogTitle>
                <DialogDescription>Who paid, how much, and for what — saved with your name.</DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <Field label="Description" required>
                  <Input value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} required />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Amount (UGX)" required>
                    <Input type="number" min={0} step="0.01" value={form.amount} onChange={(e) => setForm((f) => ({ ...f, amount: e.target.value }))} required />
                  </Field>
                  <Field label="Date">
                    <Input type="date" value={form.expenseDate} onChange={(e) => setForm((f) => ({ ...f, expenseDate: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Vendor / payee">
                  <Input value={form.vendor} onChange={(e) => setForm((f) => ({ ...f, vendor: e.target.value }))} />
                </Field>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Planned">Planned</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Paid">Paid</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Notes">
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
                </Field>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add expense'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <DeleteDialog
            open={!!deleteTarget}
            onOpenChange={(v) => !v && setDeleteTarget(null)}
            title="Delete expense?"
            description="This expense record will be permanently removed."
            saving={saving}
            onConfirm={confirmDelete}
          />
        </>
      }
    />
  );
}

function SuppliersSection({
  committeeId,
  suppliers,
  canEdit,
  onRefresh,
}: { suppliers: GraduationCommitteeSupplierRecord[] } & SectionProps<GraduationCommitteeSupplierRecord[]>) {
  const empty = {
    companyName: '',
    serviceDescription: '',
    contactName: '',
    contactPhone: '',
    contactEmail: '',
    estimatedCost: '',
    status: 'Pending',
    notes: '',
  };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GraduationCommitteeSupplierRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GraduationCommitteeSupplierRecord | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (row: GraduationCommitteeSupplierRecord) => {
    setEditing(row);
    setForm({
      companyName: row.companyName,
      serviceDescription: row.serviceDescription,
      contactName: row.contactName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      estimatedCost: row.estimatedCost != null ? String(row.estimatedCost) : '',
      status: row.status,
      notes: row.notes,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.companyName.trim()) {
      toast.error('Company name is required');
      return;
    }
    const estimatedCost = form.estimatedCost.trim() ? Number(form.estimatedCost) : null;
    if (form.estimatedCost.trim() && (Number.isNaN(estimatedCost) || estimatedCost! < 0)) {
      toast.error('Estimated cost must be a valid number');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        companyName: form.companyName.trim(),
        serviceDescription: form.serviceDescription.trim(),
        contactName: form.contactName.trim(),
        contactPhone: form.contactPhone.trim(),
        contactEmail: form.contactEmail.trim(),
        estimatedCost,
        status: form.status,
        notes: form.notes.trim(),
      };
      if (editing) {
        await graduationModuleService.updateCommitteeSupplier(committeeId, editing.id, payload);
        toast.success('Vendor updated');
      } else {
        await graduationModuleService.createCommitteeSupplier(committeeId, payload);
        toast.success('Vendor added');
      }
      setOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save vendor');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await graduationModuleService.deleteCommitteeSupplier(committeeId, deleteTarget.id);
      toast.success('Vendor removed');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete vendor');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudTableShell
      title="Vendors & suppliers"
      description="Companies or contractors engaged — decor, AV, venue services, media, etc."
      canEdit={canEdit}
      onAdd={openAdd}
      addLabel="Add vendor"
      emptyMessage="No vendors recorded yet."
      rows={suppliers}
      columns={['Company', 'Service', 'Contact', 'Est. cost', 'Status', 'Recorded by', '']}
      renderRow={(row) => (
        <TableRow key={row.id}>
          <TableCell className="font-medium">{row.companyName}</TableCell>
          <TableCell>{row.serviceDescription || '—'}</TableCell>
          <TableCell>
            <div className="text-sm">{row.contactName || '—'}</div>
            {(row.contactPhone || row.contactEmail) && (
              <div className="text-xs text-muted-foreground">
                {[row.contactPhone, row.contactEmail].filter(Boolean).join(' · ')}
              </div>
            )}
          </TableCell>
          <TableCell>{row.estimatedCost != null ? formatMoney(row.estimatedCost) : '—'}</TableCell>
          <TableCell>{row.status}</TableCell>
          <TableCell className="text-sm text-muted-foreground">{row.recordedByName || '—'}</TableCell>
          <TableCell className="text-right">
            {canEdit ? (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row)} />
            ) : null}
          </TableCell>
        </TableRow>
      )}
      dialog={
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit vendor' : 'Add vendor'}</DialogTitle>
                <DialogDescription>Company doing the work, contact person, and estimated cost.</DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <Field label="Company name" required>
                  <Input value={form.companyName} onChange={(e) => setForm((f) => ({ ...f, companyName: e.target.value }))} required />
                </Field>
                <Field label="Service / scope">
                  <Input value={form.serviceDescription} onChange={(e) => setForm((f) => ({ ...f, serviceDescription: e.target.value }))} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Contact name">
                    <Input value={form.contactName} onChange={(e) => setForm((f) => ({ ...f, contactName: e.target.value }))} />
                  </Field>
                  <Field label="Phone">
                    <Input value={form.contactPhone} onChange={(e) => setForm((f) => ({ ...f, contactPhone: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Email">
                  <Input type="email" value={form.contactEmail} onChange={(e) => setForm((f) => ({ ...f, contactEmail: e.target.value }))} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Estimated cost (UGX)">
                    <Input type="number" min={0} value={form.estimatedCost} onChange={(e) => setForm((f) => ({ ...f, estimatedCost: e.target.value }))} />
                  </Field>
                  <Field label="Status">
                    <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Pending">Pending</SelectItem>
                        <SelectItem value="Confirmed">Confirmed</SelectItem>
                        <SelectItem value="Completed">Completed</SelectItem>
                        <SelectItem value="Cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                  </Field>
                </div>
                <Field label="Notes">
                  <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
                </Field>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add vendor'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <DeleteDialog
            open={!!deleteTarget}
            onOpenChange={(v) => !v && setDeleteTarget(null)}
            title="Delete vendor?"
            description={`Remove ${deleteTarget?.companyName}?`}
            saving={saving}
            onConfirm={confirmDelete}
          />
        </>
      }
    />
  );
}

function ActivitiesSection({
  committeeId,
  activities,
  canEdit,
  onRefresh,
}: { activities: GraduationCommitteeActivityRecord[] } & SectionProps<GraduationCommitteeActivityRecord[]>) {
  const empty = { title: '', description: '', status: 'Pending', assignedTo: '', dueDate: '' };
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<GraduationCommitteeActivityRecord | null>(null);
  const [form, setForm] = useState(empty);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<GraduationCommitteeActivityRecord | null>(null);

  const openAdd = () => {
    setEditing(null);
    setForm(empty);
    setOpen(true);
  };

  const openEdit = (row: GraduationCommitteeActivityRecord) => {
    setEditing(row);
    setForm({
      title: row.title,
      description: row.description,
      status: row.status,
      assignedTo: row.assignedTo,
      dueDate: row.dueDate,
    });
    setOpen(true);
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      toast.error('Title is required');
      return;
    }
    setSaving(true);
    try {
      const payload = {
        title: form.title.trim(),
        description: form.description.trim(),
        status: form.status,
        assignedTo: form.assignedTo.trim(),
        dueDate: form.dueDate || null,
      };
      if (editing) {
        await graduationModuleService.updateCommitteeActivity(committeeId, editing.id, payload);
        toast.success('Task updated');
      } else {
        await graduationModuleService.createCommitteeActivity(committeeId, payload);
        toast.success('Task added');
      }
      setOpen(false);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save task');
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setSaving(true);
    try {
      await graduationModuleService.deleteCommitteeActivity(committeeId, deleteTarget.id);
      toast.success('Task removed');
      setDeleteTarget(null);
      await onRefresh();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete task');
    } finally {
      setSaving(false);
    }
  };

  return (
    <CrudTableShell
      title="Tasks & activities"
      description="Work items with assignee and due date — who is doing what."
      canEdit={canEdit}
      onAdd={openAdd}
      addLabel="Add task"
      emptyMessage="No tasks recorded yet."
      rows={activities}
      columns={['Task', 'Assigned to', 'Due', 'Status', 'Recorded by', '']}
      renderRow={(row) => (
        <TableRow key={row.id}>
          <TableCell>
            <div className="font-medium">{row.title}</div>
            {row.description ? (
              <div className="text-xs text-muted-foreground line-clamp-2">{row.description}</div>
            ) : null}
          </TableCell>
          <TableCell>{row.assignedTo || '—'}</TableCell>
          <TableCell>{row.dueDate || '—'}</TableCell>
          <TableCell>{row.status}</TableCell>
          <TableCell className="text-sm text-muted-foreground">{row.recordedByName || '—'}</TableCell>
          <TableCell className="text-right">
            {canEdit ? (
              <RowActions onEdit={() => openEdit(row)} onDelete={() => setDeleteTarget(row)} />
            ) : null}
          </TableCell>
        </TableRow>
      )}
      dialog={
        <>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>{editing ? 'Edit task' : 'Add task'}</DialogTitle>
                <DialogDescription>Assign work and track progress for this committee.</DialogDescription>
              </DialogHeader>
              <form onSubmit={save} className="space-y-4">
                <Field label="Title" required>
                  <Input value={form.title} onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))} required />
                </Field>
                <Field label="Description">
                  <Textarea value={form.description} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} rows={3} />
                </Field>
                <div className="grid grid-cols-2 gap-4">
                  <Field label="Assigned to">
                    <Input value={form.assignedTo} onChange={(e) => setForm((f) => ({ ...f, assignedTo: e.target.value }))} />
                  </Field>
                  <Field label="Due date">
                    <Input type="date" value={form.dueDate} onChange={(e) => setForm((f) => ({ ...f, dueDate: e.target.value }))} />
                  </Field>
                </div>
                <Field label="Status">
                  <Select value={form.status} onValueChange={(v) => setForm((f) => ({ ...f, status: v }))}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="InProgress">In progress</SelectItem>
                      <SelectItem value="Done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </Field>
                <DialogFooter>
                  <Button type="button" variant="outline" onClick={() => setOpen(false)} disabled={saving}>Cancel</Button>
                  <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add task'}</Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
          <DeleteDialog
            open={!!deleteTarget}
            onOpenChange={(v) => !v && setDeleteTarget(null)}
            title="Delete task?"
            description={`Remove "${deleteTarget?.title}"?`}
            saving={saving}
            onConfirm={confirmDelete}
          />
        </>
      }
    />
  );
}

function MemberDialog({
  open,
  onOpenChange,
  editing,
  form,
  setForm,
  saving,
  onSubmit,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  editing: GraduationCommitteeMemberRecord | null;
  form: { fullName: string; roleTitle: string; organization: string; email: string; phone: string; notes: string };
  setForm: React.Dispatch<React.SetStateAction<typeof form>>;
  saving: boolean;
  onSubmit: (e: React.FormEvent) => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[96vw] max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? 'Edit member' : 'Add member'}</DialogTitle>
          <DialogDescription>Committee member details — chair, secretary, external contacts, etc.</DialogDescription>
        </DialogHeader>
        <form onSubmit={onSubmit} className="space-y-4">
          <Field label="Full name" required>
            <Input value={form.fullName} onChange={(e) => setForm((f) => ({ ...f, fullName: e.target.value }))} required />
          </Field>
          <Field label="Role on committee">
            <Input value={form.roleTitle} onChange={(e) => setForm((f) => ({ ...f, roleTitle: e.target.value }))} placeholder="e.g. Chair, Secretary" />
          </Field>
          <Field label="Organisation / company">
            <Input value={form.organization} onChange={(e) => setForm((f) => ({ ...f, organization: e.target.value }))} />
          </Field>
          <div className="grid grid-cols-2 gap-4">
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
            </Field>
            <Field label="Phone">
              <Input value={form.phone} onChange={(e) => setForm((f) => ({ ...f, phone: e.target.value }))} />
            </Field>
          </div>
          <Field label="Notes">
            <Textarea value={form.notes} onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))} rows={3} />
          </Field>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>Cancel</Button>
            <Button type="submit" disabled={saving}>{saving ? 'Saving…' : editing ? 'Save changes' : 'Add member'}</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}

function CrudTableShell<T>({
  title,
  description,
  canEdit,
  onAdd,
  addLabel,
  emptyMessage,
  rows,
  columns,
  renderRow,
  dialog,
}: {
  title: string;
  description: string;
  canEdit: boolean;
  onAdd: () => void;
  addLabel: string;
  emptyMessage: string;
  rows: T[];
  columns: string[];
  renderRow: (row: T) => React.ReactNode;
  dialog: React.ReactNode;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </div>
        {canEdit ? (
          <Button size="sm" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            {addLabel}
          </Button>
        ) : null}
      </CardHeader>
      <CardContent>
        {rows.length === 0 ? (
          <p className="text-sm text-muted-foreground py-6 text-center">{emptyMessage}</p>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  {columns.map((col) => (
                    <TableHead key={col}>{col}</TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>{rows.map((row) => renderRow(row))}</TableBody>
            </Table>
          </div>
        )}
      </CardContent>
      {dialog}
    </Card>
  );
}

function RowActions({ onEdit, onDelete }: { onEdit: () => void; onDelete: () => void }) {
  return (
    <div className="flex justify-end gap-1">
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
        <Pencil className="h-4 w-4" />
      </Button>
      <Button type="button" variant="ghost" size="icon" className="h-8 w-8 text-destructive" onClick={onDelete}>
        <Trash2 className="h-4 w-4" />
      </Button>
    </div>
  );
}

function Field({ label, required, children }: { label: string; required?: boolean; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <Label>
        {label}
        {required ? ' *' : ''}
      </Label>
      {children}
    </div>
  );
}

function DeleteDialog({
  open,
  onOpenChange,
  title,
  description,
  saving,
  onConfirm,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  saving: boolean;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={saving}>
            Cancel
          </Button>
          <Button type="button" variant="destructive" onClick={onConfirm} disabled={saving}>
            {saving ? 'Removing…' : 'Delete'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
