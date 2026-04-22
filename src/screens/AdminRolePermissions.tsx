import React, { useEffect, useMemo, useState } from 'react';
import { Loader2, Save, RotateCcw, Search } from 'lucide-react';
import { toast } from 'sonner';
import { adminService, type AdminRole, type RolePermissionsSnapshot } from '@/services/admin.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';

export default function AdminRolePermissions() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [snapshot, setSnapshot] = useState<RolePermissionsSnapshot | null>(null);
  const [selectedRole, setSelectedRole] = useState<AdminRole>('Admin');
  const [workingSet, setWorkingSet] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');

  const load = async () => {
    setLoading(true);
    try {
      const data = await adminService.getRolePermissions();
      setSnapshot(data);
      const defaultRole = (data.roles[0] as AdminRole) || 'Admin';
      setSelectedRole(defaultRole);
      setWorkingSet(new Set(data.byRole[defaultRole] || []));
    } catch (error: any) {
      toast.error(error?.message || 'Failed to load role permissions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!snapshot) return;
    setWorkingSet(new Set(snapshot.byRole[selectedRole] || []));
  }, [selectedRole, snapshot]);

  const filteredPermissions = useMemo(() => {
    if (!snapshot) return [];
    const term = search.trim().toLowerCase();
    if (!term) return snapshot.permissions;
    return snapshot.permissions.filter((code) => code.toLowerCase().includes(term));
  }, [snapshot, search]);

  const togglePermission = (code: string) => {
    setWorkingSet((prev) => {
      const next = new Set(prev);
      if (next.has(code)) {
        next.delete(code);
      } else {
        next.add(code);
      }
      return next;
    });
  };

  const currentSavedSet = useMemo(() => new Set(snapshot?.byRole[selectedRole] || []), [snapshot, selectedRole]);
  const hasChanges = useMemo(() => {
    if (!snapshot) return false;
    if (workingSet.size !== currentSavedSet.size) return true;
    for (const code of workingSet) {
      if (!currentSavedSet.has(code)) return true;
    }
    return false;
  }, [workingSet, currentSavedSet, snapshot]);

  const handleReset = () => {
    setWorkingSet(new Set(snapshot?.byRole[selectedRole] || []));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const updated = await adminService.updateRolePermissions(selectedRole, Array.from(workingSet).sort());
      setSnapshot(updated);
      setWorkingSet(new Set(updated.byRole[selectedRole] || []));
      toast.success(`Permissions updated for ${selectedRole}`);
    } catch (error: any) {
      toast.error(error?.message || 'Failed to save role permissions');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-6 flex justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
      </div>
    );
  }

  if (!snapshot) {
    return (
      <div className="p-6">
        <Card>
          <CardHeader>
            <CardTitle>Role Permissions</CardTitle>
            <CardDescription>Unable to load data. Try refreshing.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Role Permissions</h1>
        <p className="text-gray-500">Manage what each role can access. Changes apply immediately to newly authenticated sessions.</p>
      </div>

      <Card>
        <CardHeader className="space-y-4">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <CardTitle>Permissions Matrix</CardTitle>
              <CardDescription>Select a role and toggle permissions.</CardDescription>
            </div>
            <div className="w-full md:w-64">
              <Select value={selectedRole} onValueChange={(v) => setSelectedRole(v as AdminRole)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {snapshot.roles.map((role) => (
                    <SelectItem key={role} value={role}>{role}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Search permission code..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 max-h-[520px] overflow-y-auto border rounded-md p-4">
            {filteredPermissions.length === 0 ? (
              <p className="text-sm text-muted-foreground">No permissions match your search.</p>
            ) : (
              filteredPermissions.map((code) => (
                <div key={code} className="flex items-center gap-3">
                  <Checkbox
                    id={`perm-${code}`}
                    checked={workingSet.has(code)}
                    onCheckedChange={() => togglePermission(code)}
                    disabled={saving}
                  />
                  <Label htmlFor={`perm-${code}`} className="font-mono text-sm cursor-pointer">{code}</Label>
                </div>
              ))
            )}
          </div>
          <div className="flex items-center justify-between mt-4">
            <p className="text-sm text-muted-foreground">
              {workingSet.size} selected for {selectedRole}
            </p>
            <div className="flex gap-2">
              <Button variant="outline" onClick={handleReset} disabled={!hasChanges || saving}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Reset
              </Button>
              <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={handleSave} disabled={!hasChanges || saving}>
                {saving ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                Save
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
