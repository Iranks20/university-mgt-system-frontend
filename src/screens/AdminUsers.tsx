import React, { useEffect, useState } from 'react';
import { Plus, Pencil, KeyRound, Loader2, Search, ChevronLeft, ChevronRight } from 'lucide-react';
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

type UserRow = {
  id: string;
  email: string;
  name: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  linkedRecord?: { type: string; number?: string; role?: string } | null;
};

const ROLES = ['QA', 'Staff', 'Management', 'Admin'];

const PAGE_SIZE = 20;

export default function AdminUsers() {
  const [users, setUsers] = useState<UserRow[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState<string>('all');
  const [addOpen, setAddOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [resetOpen, setResetOpen] = useState(false);
  const [selectedUser, setSelectedUser] = useState<UserRow | null>(null);
  const [addForm, setAddForm] = useState({ email: '', password: '', name: '', role: 'QA' });
  const [editForm, setEditForm] = useState({ name: '', role: 'QA', isActive: true });
  const [resetPassword, setResetPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);

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

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!addForm.email.trim() || !addForm.password.trim() || !addForm.name.trim()) {
      toast.error('Email, password and name are required');
      return;
    }
    setSubmitting(true);
    try {
      await adminService.createUser({
        email: addForm.email.trim(),
        password: addForm.password,
        name: addForm.name.trim(),
        role: addForm.role,
      });
      toast.success('User created');
      setAddOpen(false);
      setAddForm({ email: '', password: '', name: '', role: 'QA' });
      loadUsers(page);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create user');
    } finally {
      setSubmitting(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUser) return;
    setSubmitting(true);
    try {
      await adminService.updateUser(selectedUser.id, {
        name: editForm.name.trim(),
        role: editForm.role,
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
    if (!selectedUser || !resetPassword.trim()) {
      toast.error('Enter a new password');
      return;
    }
    setSubmitting(true);
    try {
      await adminService.resetUserPassword(selectedUser.id, resetPassword);
      toast.success('Password reset');
      setResetOpen(false);
      setSelectedUser(null);
      setResetPassword('');
    } catch (err: any) {
      toast.error(err?.message || 'Failed to reset password');
    } finally {
      setSubmitting(false);
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

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Users</h1>
        <p className="text-gray-500">Manage system users (QA, Management, Admin, Staff). Create and edit accounts used for backoffice access.</p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle>All users</CardTitle>
              <CardDescription>Create, edit and reset passwords for QA, Management and Admin users.</CardDescription>
            </div>
            <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => setAddOpen(true)}>
              <Plus className="mr-2 h-4 w-4" /> Add user
            </Button>
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
                {ROLES.map(r => (
                  <SelectItem key={r} value={r}>{r}</SelectItem>
                ))}
              </SelectContent>
            </Select>
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
                        <TableCell><Badge variant="secondary">{u.role}</Badge></TableCell>
                        <TableCell>{u.isActive ? <Badge className="bg-green-100 text-green-800">Active</Badge> : <Badge variant="secondary">Inactive</Badge>}</TableCell>
                        <TableCell className="text-muted-foreground">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : '—'}</TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" className="mr-1" onClick={() => openEdit(u)}><Pencil className="h-4 w-4" /></Button>
                          <Button variant="ghost" size="sm" onClick={() => openReset(u)}><KeyRound className="h-4 w-4" /></Button>
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

      <Dialog open={addOpen} onOpenChange={setAddOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add user</DialogTitle>
            <DialogDescription>Create a new system user (QA, Management, Admin or Staff). They can log in with email and the password you set.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="add-name">Name</Label>
              <Input id="add-name" value={addForm.name} onChange={e => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="Full name" required />
            </div>
            <div>
              <Label htmlFor="add-email">Email</Label>
              <Input id="add-email" type="email" value={addForm.email} onChange={e => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="user@kcu.ac.ug" required />
            </div>
            <div>
              <Label htmlFor="add-password">Password</Label>
              <Input id="add-password" type="password" value={addForm.password} onChange={e => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Temporary password" required />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={addForm.role} onValueChange={v => setAddForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setAddOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit user</DialogTitle>
            <DialogDescription>Update name, role and active status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {selectedUser && <p className="text-sm text-muted-foreground">Email: {selectedUser.email}</p>}
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={e => setEditForm(f => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Role</Label>
              <Select value={editForm.role} onValueChange={v => setEditForm(f => ({ ...f, role: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {ROLES.map(r => (<SelectItem key={r} value={r}>{r}</SelectItem>))}
                </SelectContent>
              </Select>
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Reset password</DialogTitle>
            <DialogDescription>Set a new password for {selectedUser?.name}. They will use this to log in.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleResetPassword} className="space-y-4">
            <div>
              <Label htmlFor="new-password">New password</Label>
              <Input id="new-password" type="password" value={resetPassword} onChange={e => setResetPassword(e.target.value)} placeholder="New password" required />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setResetOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={submitting || !resetPassword.trim()}>{submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Reset password'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
