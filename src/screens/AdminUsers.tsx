import React, { useEffect, useMemo, useState } from 'react';
import {
  Pencil,
  KeyRound,
  Loader2,
  Search,
  ChevronLeft,
  ChevronRight,
  Shield,
  ShieldCheck,
  LockOpen,
} from 'lucide-react';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/TemporaryCredentialsDialog';
import { UserAccessDialog } from '@/components/admin/UserAccessDialog';
import { PASSWORD_POLICY_SUMMARY, passwordPolicyProblem } from '@/lib/password-policy';
import { getApiErrorMessage } from '@/lib/api';
import { ResetFiltersButton } from '@/components/ui/reset-filters-button';
import { toast } from 'sonner';
import { adminService } from '@/services/admin.service';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { formatRoleLabel, SYSTEM_ACCOUNT_ROLES } from '@/lib/role-labels';

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  mustChangePassword?: boolean;
  lockedUntil?: string | null;
  linkedRecord?: { type: string; number?: string; role?: string } | null;
  customRoles?: { id: string; code: string; name: string; isActive: boolean }[];
};

const ROLE_FILTER_OPTIONS = [...SYSTEM_ACCOUNT_ROLES];

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [editForm, setEditForm] = useState({ name: '', role: 'QA', isActive: true });
  const [resetPassword, setResetPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [assignOpen, setAssignOpen] = useState(false);
  const [assignLoading, setAssignLoading] = useState(false);
  const [customRoles, setCustomRoles] = useState<{ id: string; code: string; name: string; isActive: boolean }[]>([]);
  const [selectedCustomRoleIds, setSelectedCustomRoleIds] = useState<Set<string>>(new Set());
  const [roleSearch, setRoleSearch] = useState('');
  const [issuedCredentials, setIssuedCredentials] = useState<TemporaryCredential[]>([]);
  const [accessUser, setAccessUser] = useState<UserRow | null>(null);
  const [unlockingId, setUnlockingId] = useState<string | null>(null);

  const resetFilters = () => {
    setSearch('');
    setRoleFilter('all');
    setPage(1);
  };

  const hasFiltersApplied = search.trim() !== '' || roleFilter !== 'all';

  const loadUsers = async (pageNum: number = page) => {
    setLoading(true);
    try {
      const result = await adminService.getUsers({
        page: pageNum,
        limit: PAGE_SIZE,
        search: search.trim() || undefined,
        role: roleFilter !== 'all' ? roleFilter : undefined,
      });
      setUsers(result.data ?? []);
      setTotal(result.total ?? 0);
      setPage(result.page ?? pageNum);
    } catch (e) {
      toast.error('Failed to load users');
      setUsers([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setPage(1);
  }, [search, roleFilter]);

  useEffect(() => {
    loadUsers(page);
  }, [page, search, roleFilter]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminService.updateUser(selectedUser.id, {
        name: editForm.name.trim(),
        isActive: editForm.isActive,
      });
      toast.success('User updated');
      setEditOpen(false);
      setSelectedUser(null);
      loadUsers(page);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    const chosenPassword = resetPassword.trim();
    const policyProblem = chosenPassword ? passwordPolicyProblem(chosenPassword) : null;
    if (policyProblem) {
      toast.error(policyProblem);
      return;
    }
    setSubmitting(true);
    try {
      const result = await adminService.resetUserPassword(selectedUser.id, chosenPassword || undefined);
      toast.success('Password reset. They must choose a new one at next sign-in.');
      if (result?.temporaryPassword) {
        setIssuedCredentials([
          {
            name: selectedUser.name,
            login: selectedUser.email,
            temporaryPassword: result.temporaryPassword,
          },
        ]);
      }
      setResetOpen(false);
      setSelectedUser(null);
      setResetPassword('');
      loadUsers(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to reset password'));
    } finally {
      setSubmitting(false);
    }
  };

  const handleUnlock = async (u: UserRow) => {
    setUnlockingId(u.id);
    try {
      await adminService.unlockUser(u.id);
      toast.success(`${u.name} can sign in again`);
      loadUsers(page);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to unlock account'));
    } finally {
      setUnlockingId(null);
    }
  };

  const openEdit = (u: UserRow) => {
    setSelectedUser(u);
    setEditForm({ name: u.name, role: u.role, isActive: u.isActive });
    setEditOpen(true);
  };

  const openReset = (u: UserRow) => {
    setSelectedUser(u);
    setResetPassword('');
    setResetOpen(true);
  };

  const openAssignRoles = async (u: UserRow) => {
    setSelectedUser(u);
    setRoleSearch('');
    setSelectedCustomRoleIds(new Set((u.customRoles || []).map(r => r.id)));
    setAssignLoading(true);
    setAssignOpen(true);
    try {
      const roles = await adminService.listCustomRoles({ includeInactive: false });
      setCustomRoles(roles.map(r => ({ id: r.id, code: r.code, name: r.name, isActive: r.isActive })));
      const systemRole = roles.find(r => r.code === u.role);
      if (systemRole) {
        setSelectedCustomRoleIds(prev => new Set([...Array.from(prev), systemRole.id]));
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load roles');
      setCustomRoles([]);
    } finally {
      setAssignLoading(false);
    }
  };

  const toggleCustomRole = (id: string) => {
    setSelectedCustomRoleIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const filteredCustomRoles = useMemo(() => {
    const term = roleSearch.trim().toLowerCase();
    if (!term) return customRoles;
    return customRoles.filter(r => (r.name + ' ' + r.code).toLowerCase().includes(term));
  }, [customRoles, roleSearch]);

  const handleSaveAssignedRoles = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminService.setUserCustomRoles(selectedUser.id, Array.from(selectedCustomRoleIds));
      toast.success('User roles updated');
      setAssignOpen(false);
      setSelectedUser(null);
      loadUsers(page);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update user roles');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Account security</h1>
        <p className="text-gray-500">
          Unlock accounts, reset passwords and review access for existing logins. New people are added in HR ›
          Employees and placed on the organisation chart (Quality Assurance for QA and clinical QA staff).
          Administration staff are listed under Administration; lecturers under Lecturers.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>Existing logins</CardTitle>
              <CardDescription>
                Same emails and passwords continue to work. Access also follows each person’s post on the
                organisation chart.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Search by name or email..." className="pl-9" value={search} onChange={e => setSearch(e.target.value)} />
            </div>
            <Select value={roleFilter} onValueChange={setRoleFilter}>
              <SelectTrigger className="w-[160px]">
                 <SelectValue placeholder="Role" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {ROLE_FILTER_OPTIONS.map(r => (
                  <SelectItem key={r} value={r}>{formatRoleLabel(r)}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <ResetFiltersButton onClick={resetFilters} disabled={!hasFiltersApplied} />
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" /></div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Role</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Last login</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No users match the filters.</TableCell></TableRow>
                  ) : (
                    users.map(u => (
                      <TableRow key={u.id}>
                        <TableCell className="font-medium">{u.name}</TableCell>
                        <TableCell>{u.email}</TableCell>
                        <TableCell><Badge variant="secondary">{formatRoleLabel(u.role)}</Badge></TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {u.isActive ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}
                            {u.lockedUntil && <Badge variant="destructive">Locked</Badge>}
                            {u.mustChangePassword && (
                              <Badge variant="outline" className="border-amber-500 text-amber-700">Must change password</Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-right whitespace-nowrap">
                          {u.lockedUntil && (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-1"
                              title="Unlock account"
                              disabled={unlockingId === u.id}
                              onClick={() => handleUnlock(u)}
                            >
                              {unlockingId === u.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <LockOpen className="h-4 w-4" />}
                            </Button>
                          )}
                          <Button variant="ghost" size="sm" className="mr-1" title="View access" onClick={() => setAccessUser(u)}><ShieldCheck className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="mr-1" title="Additional roles" onClick={() => openAssignRoles(u)}><Shield className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" className="mr-1" title="Edit" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" title="Reset password" onClick={() => openReset(u)}><KeyRound className="h-4 w-4" /></Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {total > 0 && (
                <div className="flex items-center justify-between border-t px-4 py-2">
                  <span className="text-sm text-muted-foreground">{total} total</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage(p => p - 1)}>
                      <ChevronLeft className="h-4 w-4" /> Previous
                    </Button>
                    <span className="text-sm">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => setPage(p => p + 1)}>
                      Next <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit login</DialogTitle>
            <DialogDescription>
              Update display name and whether they can sign in. Access comes from their organisation post and any
              additional roles — not from changing account type here.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {selectedUser && (
              <p className="text-sm text-muted-foreground">
                {selectedUser.email} · {formatRoleLabel(selectedUser.role)}
              </p>
            )}
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div className="flex items-center gap-2">
              <input type="checkbox" id="edit-active" checked={editForm.isActive} onChange={e => setEditForm(f => ({ ...f, isActive: e.target.checked }))} className="rounded" />
              <Label htmlFor="edit-active">Active (can log in)</Label>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={resetOpen} onOpenChange={setResetOpen}>
        <DialogContent className="w-[95vw] max-w-md">
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>
              Issue a temporary password for {selectedUser?.name}. Their other sessions are signed out, any lockout is
              cleared, and they must choose their own password at next sign-in.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <LabelWithInfo
                htmlFor="new-password"
                info={`Optional. Leave empty to generate a secure temporary password. ${PASSWORD_POLICY_SUMMARY}`}
              >
                Temporary password
              </LabelWithInfo>
              <Input id="new-password" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="Leave empty to generate" autoComplete="new-password" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={assignOpen} onOpenChange={setAssignOpen}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Assign roles</DialogTitle>
            <DialogDescription>
              {selectedUser ? `Assign custom roles to ${selectedUser.name} (${selectedUser.email}).` : 'Assign custom roles to this user.'}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSaveAssignedRoles} className="space-y-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search roles..." value={roleSearch} onChange={(e) => setRoleSearch(e.target.value)} />
            </div>
            <div className="max-h-[360px] overflow-y-auto border rounded-md p-3 space-y-2">
              {assignLoading ? (
                <div className="flex justify-center py-8"><Loader2 className="h-6 w-6 animate-spin text-[#015F2B]" /></div>
              ) : filteredCustomRoles.length === 0 ? (
                <p className="text-sm text-muted-foreground">No roles found.</p>
              ) : (
                filteredCustomRoles.map(r => (
                  <div key={r.id} className="flex items-center gap-3">
                    <Checkbox
                      id={`ucr-${r.id}`}
                      checked={selectedCustomRoleIds.has(r.id)}
                      onCheckedChange={() => toggleCustomRole(r.id)}
                      disabled={submitting || (selectedUser ? r.code === selectedUser.role : false)}
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
              <Button type="button" variant="outline" onClick={() => setAssignOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>
                {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <TemporaryCredentialsDialog credentials={issuedCredentials} onClose={() => setIssuedCredentials([])} />
      <UserAccessDialog
        userId={accessUser?.id ?? null}
        userName={accessUser?.name}
        onClose={() => setAccessUser(null)}
      />
    </div>
  );
}
