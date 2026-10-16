import { useCallback, useEffect, useMemo, useState } from 'react';
import { Loader2, Search } from 'lucide-react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  adminService,
  type PositionAccessSnapshot,
  type PositionAccessUnit,
} from '@/services/admin.service';
import { getApiErrorMessage } from '@/lib/api';

const NONE = '__none';

type ProfileField = 'headAccessRoleId' | 'memberAccessRoleId';
type OrderedUnit = PositionAccessUnit & { depth: number };

function orderUnitsAsTree(units: PositionAccessUnit[]): OrderedUnit[] {
  const ids = new Set(units.map((u) => u.id));
  const children = new Map<string | null, PositionAccessUnit[]>();
  for (const unit of units) {
    const parent = unit.parentId && ids.has(unit.parentId) ? unit.parentId : null;
    const list = children.get(parent) ?? [];
    list.push(unit);
    children.set(parent, list);
  }
  const ordered: OrderedUnit[] = [];
  const visit = (parentId: string | null, depth: number) => {
    for (const unit of children.get(parentId) ?? []) {
      ordered.push({ ...unit, depth });
      visit(unit.id, depth + 1);
    }
  };
  visit(null, 0);
  return ordered;
}

export function PositionAccessPanel() {
  const [snapshot, setSnapshot] = useState<PositionAccessSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingKey, setSavingKey] = useState<string | null>(null);
  const [search, setSearch] = useState('');

  const load = useCallback(async () => {
    setLoading(true);
    try {
      setSnapshot(await adminService.listPositionAccess());
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to load position access'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const rows = useMemo(() => {
    const ordered = orderUnitsAsTree(snapshot?.units ?? []);
    const term = search.trim().toLowerCase();
    if (!term) return ordered;
    return ordered.filter((u) =>
      [u.name, u.code, u.headTitle, u.headAccessRole?.name, u.memberAccessRole?.name]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(term))
    );
  }, [snapshot, search]);

  const profiles = snapshot?.profiles ?? [];

  const updateProfile = async (unit: PositionAccessUnit, field: ProfileField, value: string) => {
    const roleId = value === NONE ? null : value;
    const key = `${unit.id}:${field}`;
    setSavingKey(key);
    try {
      const saved = await adminService.setUnitPositionAccess(unit.id, { [field]: roleId });
      setSnapshot((prev) =>
        prev
          ? {
              ...prev,
              units: prev.units.map((u) =>
                u.id === unit.id
                  ? { ...u, headAccessRole: saved.headAccessRole, memberAccessRole: saved.memberAccessRole }
                  : u
              ),
            }
          : prev
      );
      toast.success(`Access updated for ${unit.name}. Holders get it within a minute.`);
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to update access'));
    } finally {
      setSavingKey(null);
    }
  };

  const profileSelect = (unit: PositionAccessUnit, field: ProfileField) => {
    const current = field === 'headAccessRoleId' ? unit.headAccessRole : unit.memberAccessRole;
    const busy = savingKey === `${unit.id}:${field}`;
    return (
      <div className="flex items-center gap-2">
        <Select
          value={current?.id ?? NONE}
          onValueChange={(v) => updateProfile(unit, field, v)}
          disabled={busy || savingKey !== null}
        >
          <SelectTrigger className="w-full min-w-[180px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={NONE}>No extra access</SelectItem>
            {profiles.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.name}
                {p.scopeMode === 'OrgUnit' ? ' · unit' : ' · university'}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {busy && <Loader2 className="h-4 w-4 animate-spin text-[#015F2B]" />}
      </div>
    );
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Position access</CardTitle>
        <CardDescription>
          Link each post on the organisation chart to an access profile. Whoever is appointed to the post (including
          acting) gets that access automatically, and loses it when the appointment ends.
        </CardDescription>
        <div className="relative max-w-sm pt-2">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            className="pl-9"
            placeholder="Search units or profiles..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[220px]">Unit</TableHead>
                  <TableHead>
                    <LabelWithInfo info="Access given to the person appointed as head of this unit (for example Dean, Registrar or Director).">
                      Head of unit gets
                    </LabelWithInfo>
                  </TableHead>
                  <TableHead>
                    <LabelWithInfo info="Access given to every other person appointed to this unit, and to staff whose home placement is this unit.">
                      Members get
                    </LabelWithInfo>
                  </TableHead>
                  <TableHead className="text-right">Appointments</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                      No units found.
                    </TableCell>
                  </TableRow>
                ) : (
                  rows.map((unit) => (
                    <TableRow key={unit.id}>
                      <TableCell>
                        <div style={{ paddingLeft: search.trim() ? 0 : unit.depth * 16 }}>
                          <div className="font-medium">{unit.name}</div>
                          <div className="text-xs text-muted-foreground">
                            {[unit.unitType, unit.headTitle ? `Head: ${unit.headTitle}` : null]
                              .filter(Boolean)
                              .join(' · ')}
                          </div>
                        </div>
                      </TableCell>
                      <TableCell>{profileSelect(unit, 'headAccessRoleId')}</TableCell>
                      <TableCell>{profileSelect(unit, 'memberAccessRoleId')}</TableCell>
                      <TableCell className="text-right tabular-nums">{unit.appointmentCount}</TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
