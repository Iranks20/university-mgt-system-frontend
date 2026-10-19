import React, { useEffect, useMemo, useState } from 'react';
import { Plus, Pencil, Trash2, Loader2, Search, Shield, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  adminService,
  type AccessScopeMode,
  type CustomRoleRow,
  type PermissionCatalogRow,
  type PermissionGroupRow,
} from '@/services/admin.service';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { PositionAccessPanel } from '@/components/admin/PositionAccessPanel';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
import { menuLabelsForPermission } from '@/lib/nav-permissions';

const SCOPE_MODE_INFO =
  'University-wide: permissions apply across the institution. Unit: when used on a post, permissions cover that unit and units under it.';

type MainTab = 'roles' | 'organisation' | 'permissions';
type RoleTypeFilter = 'all' | 'position_profile' | 'custom' | 'portal';

const PORTAL_ROLE_CODES = new Set(['Admin', 'Student']);

function isPositionRole(r: CustomRoleRow): boolean {
  return r.kind === 'position_profile' || !!r.isPositionProfile;
}

function isPortalRole(r: CustomRoleRow): boolean {
  return PORTAL_ROLE_CODES.has(String(r.code || '').trim());
}

function isListedRole(r: CustomRoleRow): boolean {
  return isPositionRole(r) || r.kind === 'custom' || isPortalRole(r);
}

function roleTypeLabel(r: CustomRoleRow): string {
  if (isPositionRole(r)) return 'Position';
  if (r.kind === 'custom') return 'Custom';
  if (isPortalRole(r)) return 'Portal';
  return 'Other';
}

export default function AdminCustomRoles() {
  const [tab, setTab] = useState<MainTab>('roles');

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [roles, setRoles] = useState<CustomRoleRow[]>([]);
  const [typeFilter, setTypeFilter] = useState<RoleTypeFilter>('all');
  const [search, setSearch] = useState('');
  const [includeInactive, setIncludeInactive] = useState(false);

  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [permOpen, setPermOpen] = useState(false);

  const [selected, setSelected] = useState<CustomRoleRow | null>(null);
  const [createForm, setCreateForm] = useState<{
    code: string;
    name: string;
    description: string;
    scopeMode: AccessScopeMode;
  }>({ code: '', name: '', description: '', scopeMode: 'University' });
  const [editForm, setEditForm] = useState<{
    name: string;
    description: string;
    isActive: boolean;
    scopeMode: AccessScopeMode;
  }>({ name: '', description: '', isActive: true, scopeMode: 'University' });

  const [permissionGroups, setPermissionGroups] = useState<
    Array<{ key: string; label: string; codes: Array<{ code: string; label: string }> }>
  >([]);
  const [workingPerms, setWorkingPerms] = useState<Set<string>>(new Set());
  const [permSearch, setPermSearch] = useState('');
  const [permGroupFilter, setPermGroupFilter] = useState<string>('all');

  const [groupsLoading, setGroupsLoading] = useState(false);
  const [groups, setGroups] = useState<PermissionGroupRow[]>([]);
  const [groupCreateOpen, setGroupCreateOpen] = useState(false);
  const [groupEditOpen, setGroupEditOpen] = useState(false);
  const [selectedGroup, setSelectedGroup] = useState<PermissionGroupRow | null>(null);
  const [groupCreateForm, setGroupCreateForm] = useState({
    key: '',
    name: '',
    sortOrder: 0,
    isActive: true,
  });
  const [groupEditForm, setGroupEditForm] = useState({ name: '', sortOrder: 0, isActive: true });

  const [catalogLoading, setCatalogLoading] = useState(false);
  const [catalog, setCatalog] = useState<PermissionCatalogRow[]>([]);
  const [catalogSearch, setCatalogSearch] = useState('');
  const [catalogEditOpen, setCatalogEditOpen] = useState(false);
  const [permCreateOpen, setPermCreateOpen] = useState(false);
  const [selectedPermission, setSelectedPermission] = useState<PermissionCatalogRow | null>(null);
  const [permMetaForm, setPermMetaForm] = useState({
    label: '',
    description: '',
    groupId: '',
    sortOrder: 0,
    isVisible: true,
  });
  const [permCreateForm, setPermCreateForm] = useState({
    code: '',
    label: '',
    description: '',
    groupId: '',
    sortOrder: 0,
    isVisible: true,
  });
  const loadRoles = async () => {
    setLoading(true);
    try {
      const data = await adminService.listCustomRoles({
        search: search.trim() || undefined,
        includeInactive,
      });
      setRoles(data.filter(isListedRole));
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load roles');
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load groups');
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
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load permissions');
      setCatalog([]);
    } finally {
      setCatalogLoading(false);
    }
  };

  useEffect(() => {
    if (tab === 'roles') void loadRoles();
  }, [tab, includeInactive]);

  useEffect(() => {
    if (tab !== 'roles') return;
    const t = setTimeout(() => void loadRoles(), 250);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    if (tab === 'permissions') {
      void loadGroups();
      void loadCatalog();
    }
  }, [tab]);

  const visibleRoles = useMemo(() => {
    if (typeFilter === 'all') return roles;
    if (typeFilter === 'position_profile') return roles.filter(isPositionRole);
    if (typeFilter === 'custom') return roles.filter((r) => r.kind === 'custom');
    if (typeFilter === 'portal') return roles.filter(isPortalRole);
    return roles;
  }, [roles, typeFilter]);

  const filteredCatalog = useMemo(() => {
    const term = catalogSearch.trim().toLowerCase();
    const rows = term
      ? catalog.filter(
          (p) =>
            p.code.toLowerCase().includes(term) ||
            (p.label || '').toLowerCase().includes(term) ||
            (p.description || '').toLowerCase().includes(term) ||
            (p.group?.name || '').toLowerCase().includes(term)
        )
      : catalog;
    return rows.slice(0, 250);
  }, [catalog, catalogSearch]);

  const openEdit = (r: CustomRoleRow) => {
    setSelected(r);
    setEditForm({
      name: r.name,
      description: r.description ?? '',
      isActive: !!r.isActive,
      scopeMode: r.scopeMode ?? 'University',
    });
    setEditOpen(true);
  };

  const openPermissions = async (r: CustomRoleRow) => {
    setSelected(r);
    setSaving(true);
    try {
      const [snap, rolePerm, catalogRows] = await Promise.all([
        adminService.getRolePermissions(),
        adminService.getCustomRolePermissions(r.id),
        adminService.getPermissionsCatalog(),
      ]);
      const labelByCode = new Map(
        catalogRows.map((p) => [p.code, (p.label || '').trim() || p.code])
      );
      const groups = snap.permissionGroups ?? [];
      const allCodes = groups.length ? groups.flatMap((g) => g.codes) : snap.permissions;
      setPermissionGroups(
        groups.length > 0
          ? groups.map((g) => ({
              key: g.key,
              label: g.label,
              codes: g.codes.map((code) => ({ code, label: labelByCode.get(code) || code })),
            }))
          : [
              {
                key: 'all',
                label: 'Permissions',
                codes: allCodes.map((code) => ({ code, label: labelByCode.get(code) || code })),
              },
            ]
      );
      setWorkingPerms(new Set(rolePerm.permissionCodes || []));
      setPermSearch('');
      setPermGroupFilter('all');
      setPermOpen(true);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load permissions');
    } finally {
      setSaving(false);
    }
  };

  const filteredPermissionGroups = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    return permissionGroups
      .map((g) => ({
        ...g,
        codes: g.codes.filter((c) => {
          if (term) {
            const menus = menuLabelsForPermission(c.code).join(' ').toLowerCase();
            const hit =
              c.code.toLowerCase().includes(term) ||
              c.label.toLowerCase().includes(term) ||
              menus.includes(term);
            if (!hit) return false;
          }
          return true;
        }),
      }))
      .filter((g) => g.codes.length > 0)
      .filter((g) => permGroupFilter === 'all' || g.key === permGroupFilter);
  }, [permSearch, permissionGroups, permGroupFilter]);

  const permGroupCounts = useMemo(() => {
    const term = permSearch.trim().toLowerCase();
    return permissionGroups.map((g) => {
      const codes = term
        ? g.codes.filter((c) => {
            const menus = menuLabelsForPermission(c.code).join(' ').toLowerCase();
            return (
              c.code.toLowerCase().includes(term) ||
              c.label.toLowerCase().includes(term) ||
              menus.includes(term)
            );
          })
        : g.codes;
      const selected = codes.filter((c) => workingPerms.has(c.code)).length;
      return { key: g.key, label: g.label, total: codes.length, selected };
    });
  }, [permissionGroups, permSearch, workingPerms]);

  const togglePerm = (code: string) => {
    setWorkingPerms((prev) => {
      const next = new Set(prev);
      if (next.has(code)) next.delete(code);
      else next.add(code);
      return next;
    });
  };

  const setGroupPerms = (codes: string[], on: boolean) => {
    setWorkingPerms((prev) => {
      const next = new Set(prev);
      for (const code of codes) {
        if (on) next.add(code);
        else next.delete(code);
      }
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
        description: createForm.description.trim() || null,
        scopeMode: createForm.scopeMode,
      });
      toast.success('Role created');
      setCreateOpen(false);
      setCreateForm({ code: '', name: '', description: '', scopeMode: 'University' });
      setTypeFilter('custom');
      void loadRoles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create role');
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
        description: editForm.description.trim() || null,
        isActive: editForm.isActive,
        scopeMode: editForm.scopeMode,
      });
      toast.success('Role updated');
      setEditOpen(false);
      setSelected(null);
      void loadRoles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to update role');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (r: CustomRoleRow) => {
    const protectedRole = isPositionRole(r) || isPortalRole(r) || !!r.isSystemRole;
    const ok = window.confirm(
      protectedRole
        ? `Deactivate role "${r.name}"?`
        : `Delete role "${r.name}"? This cannot be undone.`
    );
    if (!ok) return;
    setSaving(true);
    try {
      await adminService.deleteCustomRole(r.id);
      toast.success(protectedRole ? 'Role deactivated' : 'Role deleted');
      void loadRoles();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete role');
    } finally {
      setSaving(false);
    }
  };

  const savePermissions = async () => {
    if (!selected) return;
    setSaving(true);
    try {
      await adminService.setCustomRolePermissions(selected.id, Array.from(workingPerms));
      toast.success('Permissions saved');
      setPermOpen(false);
      setSelected(null);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to save permissions');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Roles & Permissions</h1>
        <p className="text-gray-500">
          Define roles, assign them to organisation units, and manage permissions. Changes here are stored in the
          database and are not reset on server restart. Day-to-day office access comes from the role on a
          person&apos;s post.
        </p>
      </div>

      <Tabs value={tab} onValueChange={(v) => setTab(v as MainTab)}>
        <TabsList>
          <TabsTrigger value="roles">Roles</TabsTrigger>
          <TabsTrigger value="organisation">Organisation</TabsTrigger>
          <TabsTrigger value="permissions">Permissions</TabsTrigger>
        </TabsList>

        <TabsContent value="roles" className="mt-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Roles</CardTitle>
                  <CardDescription>
                    Position roles for office posts, Portal roles for Admin and Student (not on the org chart), and
                    custom packs. Lecturers are created in HR; their access follows the lecturer employee path, not a
                    separate legacy account type list.
                  </CardDescription>
                </div>
                <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={() => setCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add role
                </Button>
              </div>
              <div className="flex flex-col md:flex-row gap-2 pt-2">
                <div className="relative flex-1 min-w-[200px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    className="pl-9"
                    placeholder="Search roles..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                  />
                </div>
                <Select value={typeFilter} onValueChange={(v) => setTypeFilter(v as RoleTypeFilter)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All types</SelectItem>
                    <SelectItem value="position_profile">Position</SelectItem>
                    <SelectItem value="portal">Portal</SelectItem>
                    <SelectItem value="custom">Custom</SelectItem>
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch checked={includeInactive} onCheckedChange={setIncludeInactive} />
                  <span className="text-sm text-muted-foreground">Inactive</span>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {loading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Scope</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Usage</TableHead>
                      <TableHead className="text-right">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {visibleRoles.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                          No roles found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      visibleRoles.map((r) => (
                        <TableRow key={r.id}>
                          <TableCell>
                            <div className="font-medium">{r.name}</div>
                            <div className="font-mono text-xs text-muted-foreground">{r.code}</div>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="text-[10px] font-normal">
                              {roleTypeLabel(r)}
                            </Badge>
                          </TableCell>
                          <TableCell className="text-sm">
                            {r.scopeMode === 'OrgUnit' ? 'Unit' : 'University'}
                          </TableCell>
                          <TableCell>{r.isActive ? 'Active' : 'Inactive'}</TableCell>
                          <TableCell className="text-sm tabular-nums">
                            {isPositionRole(r)
                              ? `${r.linkedUnitCount ?? 0} units`
                              : `${r.userCount ?? 0} users`}
                          </TableCell>
                          <TableCell className="text-right">
                            <Button
                              variant="outline"
                              size="sm"
                              className="mr-2"
                              onClick={() => openPermissions(r)}
                              disabled={saving}
                            >
                              <Shield className="h-4 w-4 mr-2" /> Permissions
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="mr-1"
                              onClick={() => openEdit(r)}
                              disabled={saving}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDelete(r)}
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

        <TabsContent value="organisation" className="mt-4">
          {tab === 'organisation' && <PositionAccessPanel />}
        </TabsContent>

        <TabsContent value="permissions" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Groups</CardTitle>
                  <CardDescription>Organize permissions for easier assignment.</CardDescription>
                </div>
                <Button variant="outline" onClick={() => setGroupCreateOpen(true)}>
                  <Plus className="h-4 w-4 mr-2" /> Add group
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {groupsLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-[#015F2B]" />
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {groups.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No groups yet.</p>
                  ) : (
                    groups.map((g) => (
                      <div
                        key={g.id}
                        className="inline-flex items-center gap-1 rounded-md border px-2 py-1 text-sm"
                      >
                        <span className={!g.isActive ? 'text-muted-foreground' : ''}>{g.name}</span>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={() => {
                            setSelectedGroup(g);
                            setGroupEditForm({
                              name: g.name,
                              sortOrder: g.sortOrder,
                              isActive: g.isActive,
                            });
                            setGroupEditOpen(true);
                          }}
                        >
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          className="h-7 w-7 p-0"
                          onClick={async () => {
                            const ok = window.confirm(`Delete group "${g.name}"?`);
                            if (!ok) return;
                            try {
                              await adminService.deletePermissionGroup(g.id);
                              toast.success('Group deleted');
                              loadGroups();
                              loadCatalog();
                            } catch (e: unknown) {
                              toast.error(e instanceof Error ? e.message : 'Failed to delete group');
                            }
                          }}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    ))
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                <div>
                  <CardTitle>Permissions</CardTitle>
                  <CardDescription>
                    Create and label permissions, then attach them to roles.
                  </CardDescription>
                </div>
                <Button
                  className="bg-[#015F2B] hover:bg-[#014022]"
                  onClick={() => setPermCreateOpen(true)}
                >
                  <Plus className="h-4 w-4 mr-2" /> Add permission
                </Button>
              </div>
              <div className="relative max-w-sm pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search permissions..."
                  value={catalogSearch}
                  onChange={(e) => setCatalogSearch(e.target.value)}
                />
              </div>
            </CardHeader>
            <CardContent>
              {catalogLoading ? (
                <div className="flex justify-center py-12">
                  <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Permission</TableHead>
                      <TableHead>Group</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Edit</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredCatalog.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                          No permissions found.
                        </TableCell>
                      </TableRow>
                    ) : (
                      filteredCatalog.map((p) => (
                        <TableRow key={p.code}>
                          <TableCell>
                            <div className="font-medium">{p.label || p.code}</div>
                            <div className="font-mono text-xs text-muted-foreground">{p.code}</div>
                            {menuLabelsForPermission(p.code).length > 0 ? (
                              <div className="text-xs text-muted-foreground">
                                Menus: {menuLabelsForPermission(p.code).join(', ')}
                              </div>
                            ) : null}
                          </TableCell>
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
                      ))
                    )}
                  </TableBody>
                </Table>
              )}
              {catalog.length > 250 && (
                <p className="text-xs text-muted-foreground mt-3">
                  Showing first 250. Use search to narrow results.
                </p>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add role</DialogTitle>
            <DialogDescription>
              Create a custom role. Position roles are linked to units under Organisation.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreate} className="space-y-4">
            <div>
              <Label htmlFor="role-code">Code</Label>
              <Input
                id="role-code"
                value={createForm.code}
                onChange={(e) => setCreateForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. finance.viewer"
                required
              />
            </div>
            <div>
              <Label htmlFor="role-name">Name</Label>
              <Input
                id="role-name"
                value={createForm.name}
                onChange={(e) => setCreateForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="e.g. Finance Viewer"
                required
              />
            </div>
            <div>
              <Label htmlFor="role-desc">Description</Label>
              <Textarea
                id="role-desc"
                value={createForm.description}
                onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <LabelWithInfo info={SCOPE_MODE_INFO}>Scope</LabelWithInfo>
              <Select
                value={createForm.scopeMode}
                onValueChange={(v) =>
                  setCreateForm((f) => ({ ...f, scopeMode: v as AccessScopeMode }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="University">University-wide</SelectItem>
                  <SelectItem value="OrgUnit">Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit role</DialogTitle>
            <DialogDescription>
              {selected ? <span className="font-mono">{selected.code}</span> : null}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleUpdate} className="space-y-4">
            <div>
              <Label htmlFor="edit-name">Name</Label>
              <Input
                id="edit-name"
                value={editForm.name}
                onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label htmlFor="edit-desc">Description</Label>
              <Textarea
                id="edit-desc"
                value={editForm.description}
                onChange={(e) => setEditForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="space-y-1.5">
              <LabelWithInfo info={SCOPE_MODE_INFO}>Scope</LabelWithInfo>
              <Select
                value={editForm.scopeMode}
                onValueChange={(v) =>
                  setEditForm((f) => ({ ...f, scopeMode: v as AccessScopeMode }))
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="University">University-wide</SelectItem>
                  <SelectItem value="OrgUnit">Unit</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={editForm.isActive}
                onCheckedChange={(v) => setEditForm((f) => ({ ...f, isActive: !!v }))}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permOpen} onOpenChange={setPermOpen}>
        <DialogContent className="flex h-[min(92vh,900px)] w-[min(98vw,72rem)] max-w-[72rem] flex-col gap-0 overflow-hidden p-0 sm:max-w-[72rem]">
          <div className="shrink-0 border-b px-4 py-3 sm:px-6 sm:py-4">
            <DialogHeader className="pr-8 text-left">
              <DialogTitle>Role permissions</DialogTitle>
              <DialogDescription className="text-left">
                {selected ? (
                  <>
                    <span className="font-medium text-foreground">{selected.name}</span>
                    <span className="font-mono text-xs"> · {selected.code}</span>
                  </>
                ) : null}
              </DialogDescription>
            </DialogHeader>
            <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="relative min-w-0 flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  className="pl-9"
                  placeholder="Search by name, code, or menu..."
                  value={permSearch}
                  onChange={(e) => setPermSearch(e.target.value)}
                />
              </div>
              <p className="shrink-0 text-sm text-muted-foreground sm:px-1">
                <span className="font-medium text-foreground">{workingPerms.size}</span> selected
              </p>
            </div>
          </div>

          <div className="flex min-h-0 flex-1 flex-col md:flex-row">
            <aside className="shrink-0 border-b md:w-56 md:overflow-y-auto md:border-b-0 md:border-r lg:w-64">
              <div className="flex gap-1 overflow-x-auto p-2 md:flex-col md:overflow-x-visible md:p-3">
                <button
                  type="button"
                  onClick={() => setPermGroupFilter('all')}
                  className={`shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors md:w-full ${
                    permGroupFilter === 'all'
                      ? 'bg-[#015F2B]/10 font-medium text-[#015F2B]'
                      : 'text-muted-foreground hover:bg-muted'
                  }`}
                >
                  <span className="block">All groups</span>
                  <span className="text-xs opacity-80">
                    {workingPerms.size} /{' '}
                    {permissionGroups.reduce((n, g) => n + g.codes.length, 0)}
                  </span>
                </button>
                {permGroupCounts.map((g) => (
                  <button
                    key={g.key}
                    type="button"
                    onClick={() => setPermGroupFilter(g.key)}
                    className={`shrink-0 rounded-md px-3 py-2 text-left text-sm transition-colors md:w-full ${
                      permGroupFilter === g.key
                        ? 'bg-[#015F2B]/10 font-medium text-[#015F2B]'
                        : 'text-muted-foreground hover:bg-muted'
                    }`}
                  >
                    <span className="block truncate">{g.label}</span>
                    <span className="text-xs opacity-80">
                      {g.selected} / {g.total}
                    </span>
                  </button>
                ))}
              </div>
            </aside>

            <div className="min-h-0 flex-1 overflow-y-auto p-3 sm:p-4">
              {filteredPermissionGroups.length === 0 ? (
                <p className="py-12 text-center text-sm text-muted-foreground">
                  No permissions match.
                </p>
              ) : (
                <div className="space-y-5">
                  {filteredPermissionGroups.map((g) => {
                    const codes = g.codes.map((c) => c.code);
                    const allOn = codes.length > 0 && codes.every((c) => workingPerms.has(c));
                    return (
                      <section key={g.key} className="space-y-3">
                        <div className="flex flex-wrap items-center justify-between gap-2 border-b pb-2">
                          <h3 className="text-sm font-semibold text-gray-900">{g.label}</h3>
                          <div className="flex items-center gap-2">
                            <span className="text-xs text-muted-foreground">
                              {codes.filter((c) => workingPerms.has(c)).length}/{codes.length}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="h-7 text-xs"
                              disabled={saving || codes.length === 0}
                              onClick={() => setGroupPerms(codes, !allOn)}
                            >
                              {allOn ? 'Clear group' : 'Select all'}
                            </Button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                          {g.codes.map(({ code, label }) => {
                            const menus = menuLabelsForPermission(code);
                            const checked = workingPerms.has(code);
                            return (
                              <label
                                key={code}
                                htmlFor={`crp-${code}`}
                                className={`flex cursor-pointer items-start gap-3 rounded-lg border p-3 transition-colors ${
                                  checked
                                    ? 'border-[#015F2B]/40 bg-[#015F2B]/5'
                                    : 'border-border hover:bg-muted/40'
                                }`}
                              >
                                <Checkbox
                                  id={`crp-${code}`}
                                  checked={checked}
                                  onCheckedChange={() => togglePerm(code)}
                                  disabled={saving}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0 space-y-0.5">
                                  <span className="block text-sm font-medium leading-snug text-gray-900">
                                    {label}
                                  </span>
                                  {label !== code ? (
                                    <span className="block break-all font-mono text-[11px] text-muted-foreground">
                                      {code}
                                    </span>
                                  ) : null}
                                  {menus.length > 0 ? (
                                    <span className="block text-xs leading-snug text-muted-foreground">
                                      {menus.join(' · ')}
                                    </span>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                        </div>
                      </section>
                    );
                  })}
                </div>
              )}
            </div>
          </div>

          <div className="flex shrink-0 flex-col-reverse gap-2 border-t bg-background px-4 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-6">
            <p className="text-sm text-muted-foreground">
              {workingPerms.size} permission{workingPerms.size === 1 ? '' : 's'} selected
            </p>
            <div className="flex gap-2">
              <Button type="button" variant="outline" onClick={() => setPermOpen(false)} disabled={saving}>
                Cancel
              </Button>
              <Button
                className="bg-[#015F2B] hover:bg-[#014022]"
                onClick={savePermissions}
                disabled={saving}
              >
                {saving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Save className="h-4 w-4 mr-2" />
                )}
                Save
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={groupCreateOpen} onOpenChange={setGroupCreateOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add group</DialogTitle>
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
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Failed to create group');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Key</Label>
              <Input
                value={groupCreateForm.key}
                onChange={(e) => setGroupCreateForm((f) => ({ ...f, key: e.target.value }))}
                placeholder="e.g. students"
                required
              />
            </div>
            <div>
              <Label>Name</Label>
              <Input
                value={groupCreateForm.name}
                onChange={(e) => setGroupCreateForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={String(groupCreateForm.sortOrder)}
                onChange={(e) =>
                  setGroupCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={groupCreateForm.isActive}
                onCheckedChange={(v) => setGroupCreateForm((f) => ({ ...f, isActive: !!v }))}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setGroupCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={groupEditOpen} onOpenChange={setGroupEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit group</DialogTitle>
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
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Failed to update group');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Name</Label>
              <Input
                value={groupEditForm.name}
                onChange={(e) => setGroupEditForm((f) => ({ ...f, name: e.target.value }))}
                required
              />
            </div>
            <div>
              <Label>Sort order</Label>
              <Input
                type="number"
                value={String(groupEditForm.sortOrder)}
                onChange={(e) =>
                  setGroupEditForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                }
              />
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={groupEditForm.isActive}
                onCheckedChange={(v) => setGroupEditForm((f) => ({ ...f, isActive: !!v }))}
              />
              <span className="text-sm text-muted-foreground">Active</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setGroupEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={permCreateOpen} onOpenChange={setPermCreateOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Add permission</DialogTitle>
            <DialogDescription>
              Code is permanent (e.g. reports.export). Wire it into pages/API when you need it enforced.
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              setSaving(true);
              try {
                await adminService.createPermission({
                  code: permCreateForm.code.trim(),
                  label: permCreateForm.label.trim() || null,
                  description: permCreateForm.description.trim() || null,
                  groupId: permCreateForm.groupId || null,
                  sortOrder: Number(permCreateForm.sortOrder) || 0,
                  isVisible: !!permCreateForm.isVisible,
                });
                toast.success('Permission created');
                setPermCreateOpen(false);
                setPermCreateForm({
                  code: '',
                  label: '',
                  description: '',
                  groupId: '',
                  sortOrder: 0,
                  isVisible: true,
                });
                loadCatalog();
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Failed to create permission');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Code</Label>
              <Input
                value={permCreateForm.code}
                onChange={(e) => setPermCreateForm((f) => ({ ...f, code: e.target.value }))}
                placeholder="e.g. reports.export"
                required
              />
            </div>
            <div>
              <Label>Label</Label>
              <Input
                value={permCreateForm.label}
                onChange={(e) => setPermCreateForm((f) => ({ ...f, label: e.target.value }))}
                placeholder="Display name"
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={permCreateForm.description}
                onChange={(e) => setPermCreateForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Group</Label>
                <Select
                  value={permCreateForm.groupId || 'none'}
                  onValueChange={(v) =>
                    setPermCreateForm((f) => ({ ...f, groupId: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {groups
                      .filter((g) => g.isActive)
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={String(permCreateForm.sortOrder)}
                  onChange={(e) =>
                    setPermCreateForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={permCreateForm.isVisible}
                onCheckedChange={(v) => setPermCreateForm((f) => ({ ...f, isVisible: !!v }))}
              />
              <span className="text-sm text-muted-foreground">Visible</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setPermCreateOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={catalogEditOpen} onOpenChange={setCatalogEditOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Edit permission</DialogTitle>
            <DialogDescription>
              {selectedPermission ? (
                <span className="font-mono">{selectedPermission.code}</span>
              ) : null}
            </DialogDescription>
          </DialogHeader>
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              if (!selectedPermission) return;
              setSaving(true);
              try {
                await adminService.updatePermissionMetadata(selectedPermission.code, {
                  label: permMetaForm.label.trim() || null,
                  description: permMetaForm.description.trim() || null,
                  groupId: permMetaForm.groupId || null,
                  sortOrder: Number(permMetaForm.sortOrder) || 0,
                  isVisible: !!permMetaForm.isVisible,
                });
                toast.success('Permission updated');
                setCatalogEditOpen(false);
                setSelectedPermission(null);
                loadCatalog();
              } catch (err: unknown) {
                toast.error(err instanceof Error ? err.message : 'Failed to update permission');
              } finally {
                setSaving(false);
              }
            }}
            className="space-y-4"
          >
            <div>
              <Label>Label</Label>
              <Input
                value={permMetaForm.label}
                onChange={(e) => setPermMetaForm((f) => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div>
              <Label>Description</Label>
              <Textarea
                value={permMetaForm.description}
                onChange={(e) => setPermMetaForm((f) => ({ ...f, description: e.target.value }))}
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label>Group</Label>
                <Select
                  value={permMetaForm.groupId || 'none'}
                  onValueChange={(v) =>
                    setPermMetaForm((f) => ({ ...f, groupId: v === 'none' ? '' : v }))
                  }
                >
                  <SelectTrigger>
                    <SelectValue placeholder="None" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {groups
                      .filter((g) => g.isActive)
                      .map((g) => (
                        <SelectItem key={g.id} value={g.id}>
                          {g.name}
                        </SelectItem>
                      ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Sort order</Label>
                <Input
                  type="number"
                  value={String(permMetaForm.sortOrder)}
                  onChange={(e) =>
                    setPermMetaForm((f) => ({ ...f, sortOrder: Number(e.target.value) }))
                  }
                />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch
                checked={permMetaForm.isVisible}
                onCheckedChange={(v) => setPermMetaForm((f) => ({ ...f, isVisible: !!v }))}
              />
              <span className="text-sm text-muted-foreground">Visible</span>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button type="button" variant="outline" onClick={() => setCatalogEditOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="bg-[#015F2B]" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save'}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
