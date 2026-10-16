import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import {
  ArrowDown,
  ArrowUp,
  Building2,
  ChevronDown,
  ChevronRight,
  Crown,
  Pencil,
  Plus,
  Printer,
  Search,
  Trash2,
  UserPlus,
  Users,
} from 'lucide-react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { OrgUnitDialog } from '@/components/hr/organisation/OrgUnitDialog';
import {
  OrgAppointmentDialog,
  type AppointmentFormValues,
  type StaffPickerOption,
} from '@/components/hr/organisation/OrgAppointmentDialog';
import { DepartmentHeadDialog } from '@/components/hr/organisation/DepartmentHeadDialog';
import {
  organizationService,
  type OrgAcademicDepartment,
  type OrgAppointment,
  type OrgTree,
  type OrgUnitNode,
  type OrgUnitStaffMember,
  type UnitInput,
} from '@/services/organization.service';
import { staffService } from '@/services/staff.service';
import { getApiErrorMessage } from '@/lib/api';

const TYPE_LABEL: Record<OrgUnitNode['unitType'], string> = {
  Governance: 'Governance',
  Office: 'Office',
  Directorate: 'Directorate',
  Department: 'Department',
  Unit: 'Unit',
  Post: 'Post',
  SchoolGroup: 'Schools',
  School: 'School',
};

function headLabel(unit: OrgUnitNode): string | null {
  const head = unit.heads[0];
  if (!head) return null;
  return `${head.staffName}${head.isActing ? ' (Acting)' : ''}`;
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' })[c] as string);
}

function printChart(units: OrgUnitNode[], childrenOf: Map<string | null, OrgUnitNode[]>) {
  const render = (parentId: string | null): string => {
    const kids = (childrenOf.get(parentId) ?? []).filter((u) => u.isActive);
    if (!kids.length) return '';
    return `<ul>${kids
      .map((u) => {
        const head = headLabel(u);
        const role = u.headTitle ? `${escapeHtml(u.headTitle)}: ` : '';
        const headText = head ? `<div class="head">${role}${escapeHtml(head)}</div>` : u.isVacant ? '<div class="vacant">Vacant</div>' : '';
        const depts = u.departments.length
          ? `<ul>${u.departments
              .map(
                (d) =>
                  `<li><strong>${escapeHtml(d.name)}</strong><div class="head">Head: ${
                    d.headName ? `${escapeHtml(d.headName)}${d.headIsActing ? ' (Acting)' : ''}` : 'Vacant'
                  }</div></li>`
              )
              .join('')}</ul>`
          : '';
        const flag = u.isOnChart ? '' : ' <em>(not on official chart)</em>';
        return `<li><strong>${escapeHtml(u.name)}</strong>${flag}${headText}${render(u.id)}${depts}</li>`;
      })
      .join('')}</ul>`;
  };
  const html = `<!doctype html><html><head><title>Organisation Structure</title><style>
    body{font-family:Arial,sans-serif;font-size:12px;color:#111;margin:24px}
    h1{font-size:18px;margin:0 0 4px} p{color:#555;margin:0 0 16px}
    ul{list-style:none;margin:0;padding-left:18px;border-left:1px solid #ccc}
    li{margin:6px 0} .head{color:#333} .vacant{color:#b45309} em{color:#777}
  </style></head><body><h1>King Ceasor University: Organisation Structure</h1>
  <p>Printed ${new Date().toLocaleString()} · ${units.length} units</p>${render(null)}</body></html>`;
  const win = window.open('', '_blank');
  if (!win) {
    toast.error('Allow pop-ups to print the chart.');
    return;
  }
  win.document.write(html);
  win.document.close();
  win.focus();
  win.print();
}

export default function HrOrganisationPage() {
  const [tree, setTree] = useState<OrgTree | null>(null);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [staffOptions, setStaffOptions] = useState<StaffPickerOption[]>([]);

  const [unitStaff, setUnitStaff] = useState<OrgUnitStaffMember[]>([]);
  const [includeSubUnits, setIncludeSubUnits] = useState(false);
  const [unitStaffLoading, setUnitStaffLoading] = useState(false);

  const [unitDialog, setUnitDialog] = useState<{ open: boolean; editing: OrgUnitNode | null; parentId: string | null }>({
    open: false,
    editing: null,
    parentId: null,
  });
  const [appointmentDialog, setAppointmentDialog] = useState<{ open: boolean; editing: OrgAppointment | null; asHead: boolean }>({
    open: false,
    editing: null,
    asHead: false,
  });
  const [hodDepartment, setHodDepartment] = useState<OrgAcademicDepartment | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<OrgUnitNode | null>(null);
  const [busy, setBusy] = useState(false);

  const loadTree = useCallback(async () => {
    try {
      const data = await organizationService.getTree();
      setTree(data);
      setExpanded((prev) => {
        if (prev.size) return prev;
        const byId = new Map(data.units.map((u) => [u.id, u]));
        const depth = (u: OrgUnitNode) => {
          let d = 0;
          let current = u.parentId ? byId.get(u.parentId) : undefined;
          while (current) {
            d += 1;
            current = current.parentId ? byId.get(current.parentId) : undefined;
          }
          return d;
        };
        return new Set(data.units.filter((u) => depth(u) < 4).map((u) => u.id));
      });
      setSelectedId((prev) => prev ?? data.units.find((u) => !u.parentId)?.id ?? null);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load the organisation structure'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTree();
    staffService.getStaff({ limit: 5000, status: undefined }).then((res) => {
      setStaffOptions(
        (res.data ?? [])
          .filter((s) => s.status !== 'Terminated')
          .map((s) => ({
            value: s.id,
            label: `${s.firstName} ${s.lastName} · ${s.role} (${s.staffNumber})`,
          }))
          .sort((a, b) => a.label.localeCompare(b.label))
      );
    });
  }, [loadTree]);

  const units = tree?.units ?? [];
  const unitById = useMemo(() => new Map(units.map((u) => [u.id, u])), [units]);
  const childrenOf = useMemo(() => {
    const map = new Map<string | null, OrgUnitNode[]>();
    for (const u of units) {
      const key = u.parentId && unitById.has(u.parentId) ? u.parentId : null;
      map.set(key, [...(map.get(key) ?? []), u]);
    }
    for (const list of map.values()) list.sort((a, b) => a.sortOrder - b.sortOrder || a.name.localeCompare(b.name));
    return map;
  }, [units, unitById]);

  const searchMatches = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return null;
    const visible = new Set<string>();
    for (const u of units) {
      const haystack = [
        u.name,
        u.headTitle ?? '',
        ...u.heads.map((h) => h.staffName),
        ...u.members.map((m) => `${m.staffName} ${m.title}`),
        ...u.departments.map((d) => `${d.name} ${d.headName ?? ''}`),
      ]
        .join(' ')
        .toLowerCase();
      if (!haystack.includes(q)) continue;
      let current: OrgUnitNode | undefined = u;
      while (current && !visible.has(current.id)) {
        visible.add(current.id);
        current = current.parentId ? unitById.get(current.parentId) : undefined;
      }
    }
    return visible;
  }, [search, units, unitById]);

  const selected = selectedId ? unitById.get(selectedId) ?? null : null;

  const loadUnitStaff = useCallback(async () => {
    if (!selectedId) return;
    setUnitStaffLoading(true);
    try {
      const res = await organizationService.getUnitStaff(selectedId, includeSubUnits);
      setUnitStaff(res.staff);
    } catch {
      setUnitStaff([]);
    } finally {
      setUnitStaffLoading(false);
    }
  }, [selectedId, includeSubUnits]);

  useEffect(() => {
    loadUnitStaff();
  }, [loadUnitStaff]);

  const refresh = async () => {
    await loadTree();
    await loadUnitStaff();
  };

  const toggle = (id: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const saveUnit = async (input: UnitInput) => {
    const editing = unitDialog.editing;
    if (editing) {
      const schoolManaged = editing.unitType === 'School' || editing.unitType === 'SchoolGroup';
      const { name: _name, unitType: _unitType, parentId: _parentId, ...schoolEditable } = input;
      await organizationService.updateUnit(editing.id, schoolManaged ? schoolEditable : input);
      toast.success('Unit updated.');
    } else {
      const created = await organizationService.createUnit(input);
      toast.success('Unit added.');
      if (input.parentId) setExpanded((prev) => new Set(prev).add(input.parentId as string));
      setSelectedId(created.id);
    }
    await loadTree();
  };

  const moveUnit = async (unit: OrgUnitNode, direction: -1 | 1) => {
    const siblings = childrenOf.get(unit.parentId && unitById.has(unit.parentId) ? unit.parentId : null) ?? [];
    const index = siblings.findIndex((s) => s.id === unit.id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= siblings.length) return;
    const ordered = siblings.map((s) => s.id);
    [ordered[index], ordered[target]] = [ordered[target], ordered[index]];
    try {
      await organizationService.reorderUnits(unit.parentId, ordered);
      await loadTree();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not reorder'));
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await organizationService.deleteUnit(deleteTarget.id);
      toast.success(`${deleteTarget.name} removed.`);
      if (selectedId === deleteTarget.id) setSelectedId(deleteTarget.parentId);
      setDeleteTarget(null);
      await loadTree();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not remove the unit'));
    } finally {
      setBusy(false);
    }
  };

  const saveAppointment = async (values: AppointmentFormValues) => {
    if (!selected) return;
    if (appointmentDialog.editing) {
      await organizationService.updateAppointment(appointmentDialog.editing.id, {
        title: values.title,
        isHead: values.isHead,
        isActing: values.isActing,
        startDate: values.startDate || null,
      });
    } else {
      await organizationService.createAppointment({
        staffId: values.staffId,
        orgUnitId: selected.id,
        title: values.title,
        isHead: values.isHead,
        isActing: values.isActing,
        startDate: values.startDate || null,
      });
    }
    toast.success('Appointment saved.');
    await refresh();
  };

  const endAppointment = async (appointment: OrgAppointment) => {
    try {
      await organizationService.updateAppointment(appointment.id, { isActive: false });
      toast.success(`${appointment.staffName}'s appointment ended.`);
      await refresh();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not end the appointment'));
    }
  };

  const saveDepartmentHead = async (headStaffId: string | null, isActing: boolean) => {
    if (!hodDepartment) return;
    await organizationService.setDepartmentHead(hodDepartment.id, headStaffId, isActing);
    toast.success(headStaffId ? 'Head of department updated.' : 'Department marked as vacant.');
    await loadTree();
  };

  const renderNode = (unit: OrgUnitNode, depth: number) => {
    if (searchMatches && !searchMatches.has(unit.id)) return null;
    const kids = childrenOf.get(unit.id) ?? [];
    const isOpen = searchMatches ? true : expanded.has(unit.id);
    const head = headLabel(unit);
    const isSelected = unit.id === selectedId;
    return (
      <div key={unit.id}>
        <div
          className={`flex items-center gap-1 rounded-md py-1 pr-2 text-sm cursor-pointer ${
            isSelected ? 'bg-primary/10 text-primary' : 'hover:bg-muted'
          } ${unit.isActive ? '' : 'opacity-60'}`}
          style={{ paddingLeft: depth * 16 + 4 }}
          onClick={() => setSelectedId(unit.id)}
        >
          <button
            type="button"
            className="flex h-5 w-5 shrink-0 items-center justify-center text-muted-foreground"
            onClick={(e) => {
              e.stopPropagation();
              toggle(unit.id);
            }}
            aria-label={isOpen ? 'Collapse' : 'Expand'}
          >
            {kids.length > 0 || unit.departments.length > 0 ? (
              isOpen ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />
            ) : null}
          </button>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="font-medium truncate">{unit.name}</span>
              {!unit.isOnChart && (
                <Badge variant="outline" className="text-[10px] font-normal">Off chart</Badge>
              )}
              {!unit.isActive && (
                <Badge variant="outline" className="text-[10px] font-normal">Inactive</Badge>
              )}
            </div>
            <div className="text-xs text-muted-foreground truncate">
              {head ? head : unit.isVacant ? <span className="text-amber-700">Vacant</span> : TYPE_LABEL[unit.unitType]}
            </div>
          </div>
        </div>
        {isOpen && (
          <>
            {kids.map((k) => renderNode(k, depth + 1))}
            {unit.departments.map((d) =>
              searchMatches && !`${d.name} ${d.headName ?? ''}`.toLowerCase().includes(search.trim().toLowerCase()) &&
              !unit.name.toLowerCase().includes(search.trim().toLowerCase()) ? null : (
                <div
                  key={d.id}
                  className="flex items-center gap-1 py-1 pr-2 text-sm text-muted-foreground"
                  style={{ paddingLeft: (depth + 1) * 16 + 28 }}
                >
                  <div className="min-w-0">
                    <div className="truncate text-foreground">{d.name}</div>
                    <div className="text-xs truncate">
                      {d.headName ? `HOD: ${d.headName}${d.headIsActing ? ' (Acting)' : ''}` : <span className="text-amber-700">HOD vacant</span>}
                    </div>
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>
    );
  };

  const summary = tree?.summary;
  const roots = childrenOf.get(null) ?? [];

  return (
    <HrPageShell
      title="Organisation Structure"
      description="Offices, directorates, schools and who leads them. Staff are placed here and reporting lines follow this chart."
      actions={
        <>
          <Button variant="outline" onClick={() => printChart(units, childrenOf)} disabled={!units.length}>
            <Printer className="mr-2 h-4 w-4" /> Print chart
          </Button>
          <Button onClick={() => setUnitDialog({ open: true, editing: null, parentId: selectedId })}>
            <Plus className="mr-2 h-4 w-4" /> Add unit
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Units on the chart</div>
            <div className="text-2xl font-semibold">{summary?.unitCount ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Vacant head posts</div>
            <div className="text-2xl font-semibold text-amber-700">{summary?.vacantCount ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Active appointments</div>
            <div className="text-2xl font-semibold">{summary?.appointmentCount ?? '—'}</div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="text-sm text-muted-foreground">Staff not yet placed</div>
            <div className="flex items-baseline gap-2">
              <span className={`text-2xl font-semibold ${summary?.unplacedStaffCount ? 'text-red-600' : ''}`}>
                {summary?.unplacedStaffCount ?? '—'}
              </span>
              {Boolean(summary?.unplacedStaffCount) && (
                <Link to="/hr/employees?placement=unplaced" className="text-sm text-primary underline">
                  Review
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <Card className="h-fit">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Chart</CardTitle>
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="Find an office, department or person…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </CardHeader>
          <CardContent className="max-h-[70vh] overflow-y-auto">
            {loading ? (
              <div className="text-sm text-muted-foreground">Loading structure…</div>
            ) : roots.length === 0 ? (
              <div className="text-sm text-muted-foreground">No units yet. Use “Add unit” to start the chart.</div>
            ) : (
              roots.map((r) => renderNode(r, 0))
            )}
          </CardContent>
        </Card>

        {selected ? (
          <div className="space-y-4">
            <Card>
              <CardHeader className="flex flex-row items-start justify-between gap-4 space-y-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-2">
                    <Building2 className="h-5 w-5 text-muted-foreground" />
                    <CardTitle className="text-lg">{selected.name}</CardTitle>
                    <Badge variant="secondary">{TYPE_LABEL[selected.unitType]}</Badge>
                    {!selected.isOnChart && <Badge variant="outline">Not on the official chart</Badge>}
                    {!selected.isActive && <Badge variant="outline">Inactive</Badge>}
                  </div>
                  <div className="mt-1 text-sm text-muted-foreground">
                    Reports to{' '}
                    {selected.parentId && unitById.get(selected.parentId) ? (
                      <button
                        type="button"
                        className="text-primary underline"
                        onClick={() => setSelectedId(selected.parentId)}
                      >
                        {unitById.get(selected.parentId)?.name}
                      </button>
                    ) : (
                      'nobody (top of chart)'
                    )}
                  </div>
                  {selected.description && <p className="mt-2 text-sm">{selected.description}</p>}
                </div>
                <div className="flex shrink-0 flex-wrap justify-end gap-1">
                  <Button variant="ghost" size="icon" title="Move up" onClick={() => moveUnit(selected, -1)}>
                    <ArrowUp className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="icon" title="Move down" onClick={() => moveUnit(selected, 1)}>
                    <ArrowDown className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Edit or move"
                    onClick={() => setUnitDialog({ open: true, editing: selected, parentId: selected.parentId })}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  {selected.unitType !== 'School' && selected.unitType !== 'SchoolGroup' && (
                    <Button
                      variant="ghost"
                      size="icon"
                      title="Remove"
                      className="text-red-600"
                      onClick={() => setDeleteTarget(selected)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setUnitDialog({ open: true, editing: null, parentId: selected.id })}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Sub-unit
                  </Button>
                </div>
              </CardHeader>
            </Card>

            {selected.unitType !== 'SchoolGroup' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base flex items-center gap-2">
                    <Crown className="h-4 w-4" /> {selected.headTitle ?? 'Head'}
                  </CardTitle>
                  <Button size="sm" onClick={() => setAppointmentDialog({ open: true, editing: null, asHead: true })}>
                    <UserPlus className="mr-1 h-4 w-4" /> {selected.heads.length ? 'Change head' : 'Assign head'}
                  </Button>
                </CardHeader>
                <CardContent>
                  {selected.heads.length === 0 ? (
                    <p className="text-sm text-amber-700">
                      Vacant. Staff here report to the next head up the chart until someone is appointed.
                    </p>
                  ) : (
                    <AppointmentList
                      appointments={selected.heads}
                      onEdit={(a) => setAppointmentDialog({ open: true, editing: a, asHead: true })}
                      onEnd={endAppointment}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {selected.unitType !== 'SchoolGroup' && (
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0">
                  <CardTitle className="text-base">Other appointments</CardTitle>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => setAppointmentDialog({ open: true, editing: null, asHead: false })}
                  >
                    <Plus className="mr-1 h-4 w-4" /> Add appointment
                  </Button>
                </CardHeader>
                <CardContent>
                  {selected.members.length === 0 ? (
                    <p className="text-sm text-muted-foreground">
                      {selected.unitType === 'School'
                        ? 'Add the Deputy Dean or School Administrator here.'
                        : 'No other appointments in this unit.'}
                    </p>
                  ) : (
                    <AppointmentList
                      appointments={selected.members}
                      onEdit={(a) => setAppointmentDialog({ open: true, editing: a, asHead: false })}
                      onEnd={endAppointment}
                    />
                  )}
                </CardContent>
              </Card>
            )}

            {selected.departments.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Academic departments</CardTitle>
                </CardHeader>
                <CardContent className="p-0">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Department</TableHead>
                        <TableHead>Head of department</TableHead>
                        <TableHead className="text-right">Staff</TableHead>
                        <TableHead className="text-right">Action</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selected.departments.map((d) => (
                        <TableRow key={d.id}>
                          <TableCell>
                            <div className="font-medium">{d.name}</div>
                            <div className="text-xs text-muted-foreground">{d.levelName}</div>
                          </TableCell>
                          <TableCell>
                            {d.headName ? (
                              <>
                                {d.headName}
                                {d.headIsActing && <Badge variant="outline" className="ml-2">Acting</Badge>}
                              </>
                            ) : (
                              <span className="text-amber-700">Vacant</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right">{d.staffCount}</TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="outline" onClick={() => setHodDepartment(d)}>
                              Set head
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </CardContent>
              </Card>
            )}

            <Card>
              <CardHeader className="flex flex-row items-center justify-between space-y-0">
                <CardTitle className="text-base flex items-center gap-2">
                  <Users className="h-4 w-4" /> Staff placed here
                </CardTitle>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-2">
                    <Switch id="include-sub-units" checked={includeSubUnits} onCheckedChange={setIncludeSubUnits} />
                    <Label htmlFor="include-sub-units" className="text-sm">Include sub-units</Label>
                  </div>
                  {selected.unitType !== 'School' && selected.unitType !== 'SchoolGroup' && (
                    <Link to={`/hr/employees?unit=${selected.id}`} className="text-sm text-primary underline">
                      Open in Employees
                    </Link>
                  )}
                </div>
              </CardHeader>
              <CardContent className="p-0">
                {unitStaffLoading ? (
                  <div className="p-4 text-sm text-muted-foreground">Loading staff…</div>
                ) : unitStaff.length === 0 ? (
                  <div className="p-4 text-sm text-muted-foreground">
                    Nobody is placed here yet. Set “Works in” on the employee record in Employees.
                  </div>
                ) : (
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Name</TableHead>
                        <TableHead>Job title</TableHead>
                        <TableHead>Category</TableHead>
                        <TableHead>Placed in</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {unitStaff.map((s) => (
                        <TableRow key={s.id}>
                          <TableCell>
                            <div className="font-medium">{s.name}</div>
                            <div className="text-xs text-muted-foreground">{s.staffNumber}</div>
                          </TableCell>
                          <TableCell>{s.role}</TableCell>
                          <TableCell>
                            {s.staffCategory}
                            {s.academicRankLabel ? ` · ${s.academicRankLabel}` : ''}
                          </TableCell>
                          <TableCell>{s.placement ?? '—'}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                )}
              </CardContent>
            </Card>
          </div>
        ) : (
          <Card>
            <CardContent className="p-6 text-sm text-muted-foreground">Select a unit on the chart.</CardContent>
          </Card>
        )}
      </div>

      <OrgUnitDialog
        open={unitDialog.open}
        onOpenChange={(open) => setUnitDialog((p) => ({ ...p, open }))}
        units={units}
        editing={unitDialog.editing}
        defaultParentId={unitDialog.parentId}
        onSubmit={saveUnit}
      />

      <OrgAppointmentDialog
        open={appointmentDialog.open}
        onOpenChange={(open) => setAppointmentDialog((p) => ({ ...p, open }))}
        unit={selected}
        editing={appointmentDialog.editing}
        asHead={appointmentDialog.asHead}
        staffOptions={staffOptions}
        onSubmit={saveAppointment}
      />

      <DepartmentHeadDialog
        open={Boolean(hodDepartment)}
        onOpenChange={(open) => !open && setHodDepartment(null)}
        department={hodDepartment}
        staffOptions={staffOptions}
        onSubmit={saveDepartmentHead}
      />

      <Dialog open={Boolean(deleteTarget)} onOpenChange={() => !busy && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Remove {deleteTarget?.name}?</DialogTitle>
            <DialogDescription>
              Only empty units can be removed: move its sub-units and staff and end its appointments first. To keep
              history, mark the unit inactive instead.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={busy}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={confirmDelete} disabled={busy}>
              Remove
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </HrPageShell>
  );
}

function AppointmentList({
  appointments,
  onEdit,
  onEnd,
}: {
  appointments: OrgAppointment[];
  onEdit: (a: OrgAppointment) => void;
  onEnd: (a: OrgAppointment) => void;
}) {
  return (
    <div className="divide-y">
      {appointments.map((a) => (
        <div key={a.id} className="flex flex-wrap items-center justify-between gap-2 py-2">
          <div>
            <div className="font-medium">
              {a.staffName}
              {a.isActing && <Badge variant="outline" className="ml-2">Acting</Badge>}
            </div>
            <div className="text-xs text-muted-foreground">
              {a.title} · {a.jobTitle} · {a.staffNumber}
              {a.startDate ? ` · since ${new Date(a.startDate).toLocaleDateString()}` : ''}
            </div>
          </div>
          <div className="flex gap-1">
            <Button size="sm" variant="ghost" onClick={() => onEdit(a)}>
              <Pencil className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" className="text-red-600" onClick={() => onEnd(a)}>
              End
            </Button>
          </div>
        </div>
      ))}
    </div>
  );
}
