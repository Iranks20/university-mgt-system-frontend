import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  KeyRound,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Building2,
  Shield,
  ShieldCheck,
  LockOpen,
  Pencil,
} from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { staffService } from '@/services/staff.service';
import { adminService } from '@/services/admin.service';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/TemporaryCredentialsDialog';
import { UserAccessDialog } from '@/components/admin/UserAccessDialog';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { PASSWORD_POLICY_SUMMARY, passwordPolicyProblem } from '@/lib/password-policy';
import { getApiErrorMessage } from '@/lib/api';
import { formatRoleLabel } from '@/lib/role-labels';
import type { Staff, StaffCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { ResetFiltersButton } from '@/components/ui/reset-filters-button';

const PAGE_SIZE = 20;
const CATEGORY_FILTERS: Array<{ value: 'all' | StaffCategory; label: string }> = [
  { value: 'all', label: 'All non-teaching' },
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Support', label: 'Support' },
  { value: 'Clinical', label: 'Clinical' },
];

type LoginTarget = {
  userId: string;
  name: string;
  email: string;
  role: string;
  isActive: boolean;
  customRoles: { id: string; code: string; name: string; isActive: boolean }[];
};

export default function AdminAdministrationStaff() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | StaffCategory>('all');
  const [selected, setSelected] = useState<LoginTarget | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [editForm, setEditForm] = useState({ name: '', isActive: true });
  const [resetPassword, setResetPassword] = useState('');
  const [customRoles, setCustomRoles] = useState<{ id: string; code: string; name: string; isActive: boolean }[]>([]);
  const [selectedCustomRoleIds, setSelectedCustomRoleIds] = useState<Set<string>>(new Set());
  const [roleSearch, setRoleSearch] = useState('');
  const [issuedCredentials, setIssuedCredentials] = useState<TemporaryCredential[]>([]);
  const [accessUser, setAccessUser] = useState<LoginTarget | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const result = await staffService.getStaff({
          page: pageNum,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          ...(category === 'all' ? { excludeCategory: 'Academic' } : { category }),
        });
        setRows(result.data ?? []);
        setTotal(result.total ?? 0);
        setPage(result.page ?? pageNum);
      } catch {
        toast.error('Failed to load administration staff');
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [search, category]
  );

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search.trim() !== '' || category !== 'all';

  const toLoginTarget = (row: Staff): LoginTarget | null => {
    if (!row.userId) return null;
    return {
      userId: row.userId,
      name: `${row.firstName} ${row.lastName}`.trim(),
      email: row.email,
      role: row.userRole || 'Staff',
      isActive: row.loginIsActive !== false,
      customRoles: row.loginCustomRoles ?? [],
    };
  };

  const handleUnlock = async (row: Staff) => {
    const target = toLoginTarget(row);
    if (!target) return;
    setUnlockingId(target.userId);
    try {
      await adminService.unlockUser(target.userId);
      toast.success(`${target.name} can sign in again`);
      void load(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to unlock account'));
    } finally {
      setUnlockingId(null);
    }
  };

  const openEdit = (row: Staff) => {
    const target = toLoginTarget(row);
    if (!target) return;
    setSelected(target);
    setEditForm({ name: target.name, isActive: target.isActive });
    setEditOpen(true);
  };

  const openReset = (row: Staff) => {
    const target = toLoginTarget(row);
    if (!target) return;
    setSelected(target);
    setResetPassword('');
    setResetOpen(true);
  };

  const openAssignRoles = async (row: Staff) => {
    const target = toLoginTarget(row);
    if (!target) return;
    setSelected(target);
    setRoleSearch('');
    setSelectedCustomRoleIds(new Set(target.customRoles.map((r) => r.id)));
    setAssignLoading(true);
    setAssignOpen(true);
    try {
      const roles = await adminService.listCustomRoles({ includeInactive: false, kind: 'custom' });
      setCustomRoles(roles.map((r) => ({ id: r.id, code: r.code, name: r.name, isActive: r.isActive })));
      setSelectedCustomRoleIds(
        new Set(
          target.customRoles
            .filter((r) => roles.some((row) => row.id === r.id))
            .map((r) => r.id)
        )
      );
    } catch (e: unknown) {
      toast.error(getApiErrorMessage(e, 'Failed to load roles'));
      setCustomRoles([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminService.updateUser(selected.userId, {
        name: editForm.name.trim(),
        isActive: editForm.isActive,
      });
      toast.success('Login updated');
      setEditOpen(false);
      setSelected(null);
      void load(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update login'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    const chosenPassword = resetPassword.trim();
    const policyProblem = chosenPassword ? passwordPolicyProblem(chosenPassword) : null;
    if (policyProblem) {
      toast.error(policyProblem);
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminService.resetUserPassword(selected.userId, chosenPassword || undefined);
      toast.success('Password reset. They must choose a new one at next sign-in.');
      if (result?.temporaryPassword) {
        setIssuedCredentials([
          {
            name: selected.name,
            login: selected.email,
            temporaryPassword: result.temporaryPassword,
          },
        ]);
      }
      setResetOpen(false);
      setSelected(null);
      setResetPassword('');
      void load(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to reset password'));
    } finally {
      setSubmitting(false);
    }
  };

  const filteredCustomRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return customRoles;
    return customRoles.filter((r) => (r.name + ' ' + r.code).toLowerCase().includes(term));
  }, [customRoles, roleSearch]);

  const handleSaveAssignedRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSubmitting(true);
    try {
      await adminService.setUserCustomRoles(selected.userId, Array.from(selectedCustomRoleIds));
      toast.success('Additional roles updated');
      setAssignOpen(false);
      setSelected(null);
      void load(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update roles'));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration</h1>
        <p className="text-gray-500">
          All non-teaching people (offices, QA, HR, clinical, support) in one place — directory, login security and
          access review. Add people in{' '}
          <Link to="/hr/employees" className="text-[#015F2B] underline-offset-2 hover:underline">
            HR › Employees
          </Link>
          , place them on{' '}
          <Link to="/hr/organisation" className="text-[#015F2B] underline-offset-2 hover:underline">
            Organisation Structure
          </Link>
          . Menus follow the post they hold. Lecturers stay under Lecturers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> People & logins
              </CardTitle>
              <CardDescription>
                Not filtered by old account types (QA, HR, …). Filter by staff category or office placement instead.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email or staff number..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={(v) => setCategory(v as 'all' | StaffCategory)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTERS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters ? (
              <ResetFiltersButton
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                }}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No administration staff found. Create them in HR › Employees and appoint them on the organisation chart.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Office / unit</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const name = `${row.firstName} ${row.lastName}`.trim();
                    const locked = Boolean(row.loginLockedUntil);
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">{row.staffNumber}</div>
                        </TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          {row.placementLabel || row.orgUnitName || row.departmentName || '—'}
                          {row.leadershipRoles && row.leadershipRoles.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.leadershipRoles.map((title) => (
                                <Badge key={title} variant="secondary" className="text-xs">
                                  {title}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">
                          <div>{row.email}</div>
                          {row.userRole ? (
                            <div className="text-xs text-muted-foreground">{formatRoleLabel(row.userRole)}</div>
                          ) : (
                            <div className="text-xs text-muted-foreground">No login</div>
                          )}
                        </TableCell>
                        <TableCell>
                          {!row.userId ? (
                            <span className="text-xs text-muted-foreground">—</span>
                          ) : (
                            <div className="flex flex-wrap gap-1">
                              {row.loginIsActive !== false ? (
                                <Badge className="bg-green-100 text-green-800">Active</Badge>
                              ) : (
                                <Badge variant="secondary">Inactive</Badge>
                              )}
                              {locked ? <Badge variant="destructive">Locked</Badge> : null}
                              {row.loginMustChangePassword ? (
                                <Badge variant="outline" className="border-amber-500 text-amber-700">
                                  Must change password
                                </Badge>
                              ) : null}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {row.userId ? (
                            <>
                              {locked ? (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="mr-1"
                                  title="Unlock account"
                                  disabled={unlockingId === row.userId}
                                  onClick={() => void handleUnlock(row)}
                                >
                                  {unlockingId === row.userId ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <LockOpen className="h-4 w-4" />
                                  )}
                                </Button>
                              ) : null}
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mr-1"
                                title="View access"
                                onClick={() => setAccessUser(toLoginTarget(row))}
                              >
                                <ShieldCheck className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mr-1"
                                title="Additional roles"
                                onClick={() => void openAssignRoles(row)}
                              >
                                <Shield className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="mr-1"
                                title="Edit login"
                                onClick={() => openEdit(row)}
                              >
                                <Pencil className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                title="Reset password"
                                onClick={() => openReset(row)}
                              >
                                <KeyRound className="h-4 w-4" />
                              </Button>
                            </>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {total} people · page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit login</DialogTitle>
            <DialogDescription>
              Update display name and whether they can sign in. Job access comes from their organisation post — not
              from account type here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleUpdate(e)} className="space-y-4">
            {selected ? (
              <p className="text-sm text-muted-foreground">
                {selected.email} · {formatRoleLabel(selected.role)}
              </p>
            ) : null}
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div className="flex items-center gap-2">
              <input
                type="checkbox"
                id="edit-active"
                checked={editForm.isActive}
                onChange={(e) => setEditForm((f) => ({ ...f, isActive: e.target.checked }))}
                className="rounded"
              />
              <Label htmlFor="edit-active">Active (can log in)</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Issue a temporary password for {selected?.name}. Other sessions are signed out and they must choose a new
              password at next sign-in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleResetPassword(e)} className="space-y-4">
            <div>
              <LabelWithInfo
                htmlFor="new-password"
                info={`Optional. Leave empty to generate a secure temporary password. ${PASSWORD_POLICY_SUMMARY}`}
              >
                Temporary password
              </LabelWithInfo>
              <Input
                id="new-password"
                type="password"
                value={resetPassword}
                onChange={(e) => setResetPassword(e.target.value)}
                placeholder="Leave empty to generate"
                autoComplete="new-password"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Additional roles</DialogTitle>
            <DialogDescription>
              {selected
                ? `Optional extra permission packs for ${selected.name}. Prefer an organisation appointment when the access is because of their job.`
                : 'Assign custom roles.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={(e) => void handleSaveAssignedRoles(e)} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Search roles..."
                value={roleSearch}
                onChange={(e) => setRoleSearch(e.target.value)}
              />
            </div>
            <div className="max-h-[360px] overflow-y-auto border rounded-md p-3 space-y-2">
              {assignLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#015F2B]" />
                </div>
              ) : filteredCustomRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles found.</p>
              ) : (
                filteredCustomRoles.map((r) => (
                  <div key={r.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`ucr-${r.id}`}
                      checked={selectedCustomRoleIds.has(r.id)}
                      onCheckedChange={() => {
                        setSelectedCustomRoleIds((prev) => {
                          const next = new Set(prev);
                          if (next.has(r.id)) next.delete(r.id);
                          else next.add(r.id);
                          return next;
                        });
                      }}
                      disabled={submitting}
                    />
                    <Label htmlFor={`ucr-${r.id}`} className="cursor-pointer">
                      <span className="font-medium">{r.name}</span>{' '}
                      <span className="font-mono text-xs text-muted-foreground">({r.code})</span>
                    </Label>
                  </div>
                ))
              )}
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TemporaryCredentialsDialog credentials={issuedCredentials} onClose={() => setIssuedCredentials([])} />
      <UserAccessDialog
        userId={accessUser?.userId ?? null}
        userName={accessUser?.name}
        onClose={() => setAccessUser(null)}
      />
    </div>
  );
}
