import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import { adminService, type CustomRoleRow, type PermissionCatalogRow, type PermissionGroupRow } from '@/services/admin.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const SYSTEM_ROLE_CODES = new Set(['Admin', 'Management', 'QA', 'Lecturer', 'Staff', 'Student']);

export default function AdminCustomRoles() {
  const [tab, setTab] = useState<'roles' | 'permission-groups' | 'permissions'>('roles');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<CustomRoleRow[]>([]);
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);

  const [selected, setSelected] = useState<CustomRoleRow | null>(null);
  const [createForm, setCreateForm] = useState({ code: '', name: '', description: '' });
  const [editForm, setEditForm] = useState({ name: '', description: '', isActive: true });

  const [allPermissionCodes, setAllPermissionCodes] = useState<string[]>([]);
  const [permissionGroups, setPermissionGroups] = useState<Array<{ key: string; label: string; codes: string[] }>>([]);
  const [workingPerms, setWorkingPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');

  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groups, setGroups] = useState<PermissionGroupRow[]>([]);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroupRow | null>(null);
  const [groupCreateForm, setGroupCreateForm] = useState({ key: '', name: '', sortOrder: 0, isActive: true });
  const [groupEditForm, setGroupEditForm] = useState({ name: '', sortOrder: 0, isActive: true });

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalog, setCatalog] = useState<PermissionCatalogRow[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogEditOpen, setCatalogEditOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<PermissionCatalogRow | null>(null);
  const [permMetaForm, setPermMetaForm] = useState({ label: '', description: '', groupId: '', sortOrder: 0, isVisible: true });

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminService.listCustomRoles({
        search: search.trim() || undefined,
        includeInactive,
      });
      setRoles(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load roles');
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  const loadGroups = async () => {
    setGroupsLoading(true);
    try {
      const rows = await adminService.listPermissionGroups({ includeInactive: true });
      setGroups(rows);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load permission groups');
      setGroups([]);
    } finally {
      setGroupsLoading(false);
    }
  };

  const loadCatalog = async () => {
    setCatalogLoading(true);
    try {
      const rows = await adminService.getPermissionsCatalog();
      setCatalog(rows);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load permissions catalog');
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, [includeInactive]);

  useEffect(() => {
    const t = setTimeout(() => load(), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (tab === 'permission-groups') loadGroups();
    if (tab === 'permissions') {
      loadGroups();
      loadCatalog();
    }
  }, [tab]);

  const openEdit = (r: CustomRoleRow) => {
    setSelected(r);
    setEditForm({
      name: r.name,
      description: r.description ?? '',
      isActive: !!r.isActive,
    });
    setEditOpen(true);
  };

  const openPermissions = async (r: CustomRoleRow) => {
    setSelected(r);
    setSaving(true);
    try {
      const [snap, rolePerm] = await Promise.all([
        adminService.getRolePermissions(),
        adminService.getCustomRolePermissions(r.id),
      ]);
      const groups = snap.permissionGroups ?? [];
      setPermissionGroups(groups);
      const all = groups.length ? groups.flatMap(g => g.codes) : snap.permissions;
      setAllPermissionCodes(all);
      setWorkingPerms(new Set(rolePerm.permissionCodes || []));
      setPermSearch('');
      setPermOpen(true);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load role permissions');
    } finally {
      setSaving(false);
    }
  };

  const filteredPerms = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    if (!term) return allPermissionCodes;
    return allPermissionCodes.filter((c) => c.toLowerCase().includes(term));
  }, [permSearch, allPermissionCodes]);

  const filteredPermissionGroups = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    const groups = permissionGroups.length
      ? permissionGroups
      : [{ key: 'all', label: 'Permissions', codes: allPermissionCodes }];
    if (!term) return groups;
    return groups
      .map((g) => ({ ...g, codes: g.codes.filter((c) => c.toLowerCase().includes(term)) }))
      .filter((g) => g.codes.length > 0);
  }, [permSearch, permissionGroups, allPermissionCodes]);

  const togglePerm = (code: string) => {
    setWorkingPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      await adminService.createCustomRole({
        code: createForm.code.trim(),
        name: createForm.name.trim(),
        description: createForm.description.trim() ? createForm.description.trim() : null,
        isActive: true,
      });
      toast.success('Role created');
      setCreateOpen(false);
      setCreateForm({ code: '', name: '', description: '' });
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to create role');
    } finally {
      setSaving(false);
    }
  };

  const handleUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selected) return;
    setSaving(true);
    try {
      await adminService.updateCustomRole(selected.id, {
        name: editForm.name.trim(),
        description: editForm.description.trim() ? editForm.description.trim() : null,
        isActive: editForm.isActive,
      });
      toast.success('Role updated');
      setEditOpen(false);
      setSelected(null);
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: CustomRoleRow) => {
    const ok = window.confirm(
      SYSTEM_ROLE_CODES.has(r.code)
        ? `Deactivate role "${r.name}"? Users can keep their assignments, but the role will be inactive.`
        : `Delete role "${r.name}"? This will remove assignments and permissions.`
    );
    if (!ok) return;
    setSaving(true);
    try {
      await adminService.deleteCustomRole(r.id);
      toast.success(SYSTEM_ROLE_CODES.has(r.code) ? 'Role deactivated' : 'Role deleted');
      load();
    } catch (err: any) {
      toast.error(err?.message || 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminService.setCustomRolePermissions(selected.id, Array.from(workingPerms).sort());
      toast.success('Role permissions updated');
      setPermOpen(false);
      setSelected(null);
    } catch (err: any) {
      toast.error(err?.message || 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-gray-500">Manage roles, permission groups, and permission catalog metadata.</p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="permission-groups">Permission Groups</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>Manage roles and assign permission sets.</CardDescription>
                </div>
                <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add role
                </Button>
              </div>
              <div className="flex flex-col md:flex-row gap-2 pt-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search by name or code..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <div className="flex items-center gap-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                  <span className="text-sm text-muted-foreground">Include inactive</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Code</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Users</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {roles.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No roles found.</TableCell></TableRow>
                    ) : (
                      roles.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell className="font-medium">{r.name}</TableCell>
                          <TableCell className="font-mono text-sm">{r.code}</TableCell>
                          <TableCell>{r.isActive ? 'Active' : 'Inactive'}</TableCell>
                          <TableCell>{r.userCount ?? 0}</TableCell>
                          <TableCell className="text-right">
                            <Button variant="outline" size="sm" className="mr-2" onClick={() => openPermissions(r)} disabled={saving}>
                              <Shield className="h-4 w-4 mr-2" /> Permissions
                            </Button>
                            <Button variant="ghost" size="sm" className="mr-1" onClick={() => openEdit(r)} disabled={saving}>
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button variant="ghost" size="sm" onClick={() => handleDelete(r)} disabled={saving}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permission-groups" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Permission Groups</CardTitle>
                  <CardDescription>Organize permissions into functional areas.</CardDescription>
                </div>
                <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => setGroupCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Key</TableHead>
                      <TableHead>Order</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groups.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No groups found.</TableCell></TableRow>
                    ) : (
                      groups.map((g) => (
                        <TableRow key={g.id}>
                          <TableCell className="font-medium">{g.name}</TableCell>
                          <TableCell className="font-mono text-sm">{g.key}</TableCell>
                          <TableCell>{g.sortOrder}</TableCell>
                          <TableCell>{g.isActive ? 'Active' : 'Inactive'}</TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-1"
                              onClick={() => {
                                setSelectedGroup(g);
                                setGroupEditForm({ name: g.name, sortOrder: g.sortOrder, isActive: g.isActive });
                                setGroupEditOpen(true);
                              }}
                              disabled={saving}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={async () => {
                                const ok = window.confirm(`Delete group "${g.name}"? Permissions will fall back to prefix grouping.`);
                                if (!ok) return;
                                setSaving(true);
                                try {
                                  await adminService.deletePermissionGroup(g.id);
                                  toast.success('Group deleted');
                                  loadGroups();
                                } catch (e: any) {
                                  toast.error(e?.message || 'Failed to delete group');
                                } finally {
                                  setSaving(false);
                                }
                              }}
                              disabled={saving}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="permissions" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>Edit permission labels, descriptions, group assignment, and visibility.</CardDescription>
                </div>
                <div className="relative w-full sm:w-80">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input className="pl-9" placeholder="Search code/label..." value={catalogSearch} onChange={(e) => setCatalogSearch(e.target.value)} />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {catalogLoading ? (
                <div className="flex justify-center py-12"><Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" /></div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Code</TableHead>
                      <TableHead>Label</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {(catalogSearch.trim()
                      ? catalog.filter((p) => {
                          const t = catalogSearch.trim().toLowerCase();
                          return (
                            p.code.toLowerCase().includes(t) ||
                            (p.label || '').toLowerCase().includes(t) ||
                            (p.description || '').toLowerCase().includes(t) ||
                            (p.group?.name || '').toLowerCase().includes(t)
                          );
                        })
                      : catalog
                    ).slice(0, 250).map((p) => (
                      <TableRow key={p.code}>
                        <TableCell className="font-mono text-sm">{p.code}</TableCell>
                        <TableCell>{p.label || '—'}</TableCell>
                        <TableCell>{p.group?.name || '—'}</TableCell>
                        <TableCell>{p.isVisible ? 'Visible' : 'Hidden'}</TableCell>
                        <TableCell className="text-right">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => {
                              setSelectedPermission(p);
                              setPermMetaForm({
                                label: p.label || '',
                                description: p.description || '',
                                groupId: p.groupId || '',
                                sortOrder: p.sortOrder || 0,
                                isVisible: p.isVisible,
                              });
                              setCatalogEditOpen(true);
                            }}
                          >
                            <Pencil className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {catalog.length === 0 && (
                      <TableRow><TableCell colSpan={5} className="text-center py-8 text-muted-foreground">No permissions found.</TableCell></TableRow>
                    )}
                  </TableBody>
                </Table>
              )}
              {catalog.length > 250 && (
                <p className="text-xs text-muted-foreground mt-3">Showing first 250 rows. Use search to narrow down.</p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>Create a new custom role. Code is used as a stable identifier.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="role-code">Code</Label>
              <Input id="role-code" value={createForm.code} onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))} placeholder="e.g. finance.viewer" required />
            </div>
            <div>
              <Label htmlFor="role-name">Name</Label>
              <Input id="role-name" value={createForm.name} onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Finance Viewer" required />
            </div>
            <div>
              <Label htmlFor="role-desc">Description</Label>
              <Textarea id="role-desc" value={createForm.description} onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>Update role display fields and status.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            {selected && (
              <p className="text-sm text-muted-foreground">Code: <span className="font-mono">{selected.code}</span></p>
            )}
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input id="edit-name" value={editForm.name} onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea id="edit-desc" value={editForm.description} onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={editForm.isActive} onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: !!v }))} />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Role permissions</DialogTitle>
            <DialogDescription>{selected ? `${selected.name} (${selected.code})` : ''}</DialogDescription>
          </DialogHeader>
          <div className="space-y-3">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input className="pl-9" placeholder="Search permissions..." value={permSearch} onChange={(e) => setPermSearch(e.target.value)} />
            </div>
            <div className="max-h-[420px] overflow-y-auto border rounded-md">
              {filteredPermissionGroups.length === 0 ? (
                <div className="p-3">
                  <p className="text-sm text-muted-foreground">No permission codes match.</p>
                </div>
              ) : (
                <div className="divide-y">
                  {filteredPermissionGroups.map((g) => (
                    <div key={g.key} className="p-3">
                      <div className="text-sm font-semibold text-gray-900 mb-2">{g.label}</div>
                      <div className="space-y-2">
                        {g.codes.map((code) => (
                          <div key={code} className="flex items-center gap-3">
                            <Checkbox
                              id={`crp-${code}`}
                              checked={workingPerms.has(code)}
                              onCheckedChange={() => togglePerm(code)}
                              disabled={saving}
                            />
                            <Label htmlFor={`crp-${code}`} className="font-mono text-sm cursor-pointer">
                              {code}
                            </Label>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
            <div className="flex items-center justify-between">
              <p className="text-sm text-muted-foreground">{workingPerms.size} selected</p>
              <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={savePermissions} disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupCreateOpen} onOpenChange={setGroupCreateOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add permission group</DialogTitle>
            <DialogDescription>Groups are used to organize permissions in role editors.</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await adminService.createPermissionGroup({
                  key: groupCreateForm.key.trim().toLowerCase(),
                  name: groupCreateForm.name.trim(),
                  sortOrder: Number(groupCreateForm.sortOrder) || 0,
                  isActive: !!groupCreateForm.isActive,
                });
                toast.success('Group created');
                setGroupCreateOpen(false);
                setGroupCreateForm({ key: '', name: '', sortOrder: 0, isActive: true });
                loadGroups();
              } catch (err: any) {
                toast.error(err?.message || 'Failed to create group');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Key</Label>
              <Input value={groupCreateForm.key} onChange={(e) => setGroupCreateForm((f) => ({ ...f, key: e.target.value }))} placeholder="e.g. students" required />
            </div>
            <div>
              <Label>Name</Label>
              <Input value={groupCreateForm.name} onChange={(e) => setGroupCreateForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Students" required />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={String(groupCreateForm.sortOrder)} onChange={(e) => setGroupCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={groupCreateForm.isActive} onCheckedChange={(v) => setGroupCreateForm((f) => ({ ...f, isActive: !!v }))} />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setGroupCreateOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={groupEditOpen} onOpenChange={setGroupEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit permission group</DialogTitle>
            <DialogDescription>{selectedGroup ? `Key: ${selectedGroup.key}` : ''}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedGroup) return;
              setSaving(true);
              try {
                await adminService.updatePermissionGroup(selectedGroup.id, {
                  name: groupEditForm.name.trim(),
                  sortOrder: Number(groupEditForm.sortOrder) || 0,
                  isActive: !!groupEditForm.isActive,
                });
                toast.success('Group updated');
                setGroupEditOpen(false);
                setSelectedGroup(null);
                loadGroups();
              } catch (err: any) {
                toast.error(err?.message || 'Failed to update group');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input value={groupEditForm.name} onChange={(e) => setGroupEditForm((f) => ({ ...f, name: e.target.value }))} required />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input type="number" value={String(groupEditForm.sortOrder)} onChange={(e) => setGroupEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={groupEditForm.isActive} onCheckedChange={(v) => setGroupEditForm((f) => ({ ...f, isActive: !!v }))} />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setGroupEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={catalogEditOpen} onOpenChange={setCatalogEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit permission</DialogTitle>
            <DialogDescription>{selectedPermission ? selectedPermission.code : ''}</DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedPermission) return;
              setSaving(true);
              try {
                await adminService.updatePermissionMetadata(selectedPermission.code, {
                  label: permMetaForm.label.trim() ? permMetaForm.label.trim() : null,
                  description: permMetaForm.description.trim() ? permMetaForm.description.trim() : null,
                  groupId: permMetaForm.groupId ? permMetaForm.groupId : null,
                  sortOrder: Number(permMetaForm.sortOrder) || 0,
                  isVisible: !!permMetaForm.isVisible,
                });
                toast.success('Permission updated');
                setCatalogEditOpen(false);
                setSelectedPermission(null);
                loadCatalog();
              } catch (err: any) {
                toast.error(err?.message || 'Failed to update permission');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Label</Label>
              <Input value={permMetaForm.label} onChange={(e) => setPermMetaForm((f) => ({ ...f, label: e.target.value }))} placeholder="Optional display label" />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea value={permMetaForm.description} onChange={(e) => setPermMetaForm((f) => ({ ...f, description: e.target.value }))} placeholder="Optional" />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Group</Label>
                <Select value={permMetaForm.groupId || 'none'} onValueChange={(v) => setPermMetaForm((f) => ({ ...f, groupId: v === 'none' ? '' : v }))}>
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {groups.filter(g => g.isActive).map((g) => (
                      <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input type="number" value={String(permMetaForm.sortOrder)} onChange={(e) => setPermMetaForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={permMetaForm.isVisible} onCheckedChange={(v) => setPermMetaForm((f) => ({ ...f, isVisible: !!v }))} />
              <span className="text-sm text-muted-foreground">Visible</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCatalogEditOpen(false)}>Cancel</Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}</Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

