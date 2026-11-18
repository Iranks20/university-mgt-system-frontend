import { useEffect, useMemo, useState } from 'react';
import { Building2, Globe2, Loader2, ShieldCheck, X } from 'lucide-react';
import { toast } from 'sonner';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { adminService, type UserAccessDetails } from '@/services/admin.service';
import { academicService } from '@/services';
import { getApiErrorMessage } from '@/lib/api';
import type { AccessGrant } from '@/contexts/AuthContext';
import { menuOpen, menuPermissionSets, visibleMenus } from '@/lib/sidebar-nav';

type NamedOption = { value: string; label: string };
type ScopeKey = 'schoolIds' | 'departmentIds' | 'programIds';
type DirectScope = Record<ScopeKey, string[]>;

const EMPTY_SCOPE: DirectScope = { schoolIds: [], departmentIds: [], programIds: [] };

const SOURCE_LABEL: Record<AccessGrant['source'], string> = {
  Role: 'Account type',
  AdditionalRole: 'Additional role',
  Position: 'Position',
  HeadOfDepartment: 'Head of department',
};

const SCOPE_FIELDS: { key: ScopeKey; label: string; info: string; placeholder: string }[] = [
  {
    key: 'schoolIds',
    label: 'Schools',
    info: 'Limits school-wide access to these schools, including all their departments and programmes.',
    placeholder: 'Add a school…',
  },
  {
    key: 'departmentIds',
    label: 'Departments',
    info: 'Limits access to these departments and their programmes.',
    placeholder: 'Add a department…',
  },
  {
    key: 'programIds',
    label: 'Programmes',
    info: 'Limits access to students on these programmes only.',
    placeholder: 'Add a programme…',
  },
];

function toOptions(rows: { id: string; name: string; code?: string | null }[]): NamedOption[] {
  return rows
    .map((r) => ({ value: r.id, label: r.code ? `${r.name} (${r.code})` : r.name }))
    .sort((a, b) => a.label.localeCompare(b.label));
}

type UserAccessDialogProps = {
  userId: string | null;
  userName?: string;
  onClose: () => void;
};

export function UserAccessDialog({ userId, userName, onClose }: UserAccessDialogProps) {
  const [details, setDetails] = useState<UserAccessDetails | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [direct, setDirect] = useState<DirectScope>(EMPTY_SCOPE);
  const [options, setOptions] = useState<Record<ScopeKey, NamedOption[]>>({
    schoolIds: [],
    departmentIds: [],
    programIds: [],
  });

  useEffect(() => {
    if (!userId) return;
    let cancelled = false;
    setLoading(true);
    setDetails(null);
    Promise.all([
      adminService.getUserAccess(userId),
      academicService.getSchools(),
      academicService.getDepartments(),
      academicService.getPrograms(),
    ])
      .then(([access, schools, departments, programs]) => {
        if (cancelled) return;
        setDetails(access);
        setDirect(access.directScope);
        setOptions({
          schoolIds: toOptions(schools as { id: string; name: string; code?: string | null }[]),
          departmentIds: toOptions(departments as { id: string; name: string; code?: string | null }[]),
          programIds: toOptions(programs as { id: string; name: string; code?: string | null }[]),
        });
      })
      .catch((err) => {
        if (!cancelled) toast.error(getApiErrorMessage(err, 'Failed to load access'));
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [userId]);

  const labelFor = useMemo(() => {
    const map = new Map<string, string>();
    for (const list of Object.values(options)) for (const o of list) map.set(o.value, o.label);
    return (id: string) => map.get(id) ?? id;
  }, [options]);

  const dirty = useMemo(() => {
    if (!details) return false;
    return (Object.keys(EMPTY_SCOPE) as ScopeKey[]).some(
      (key) => [...direct[key]].sort().join() !== [...details.directScope[key]].sort().join()
    );
  }, [details, direct]);

  const addScope = (key: ScopeKey, id: string) => {
    if (!id) return;
    setDirect((prev) => (prev[key].includes(id) ? prev : { ...prev, [key]: [...prev[key], id] }));
  };

  const removeScope = (key: ScopeKey, id: string) => {
    setDirect((prev) => ({ ...prev, [key]: prev[key].filter((v) => v !== id) }));
  };

  const saveScopes = async () => {
    if (!userId) return;
    setSaving(true);
    try {
      const updated = await adminService.setUserOrgScopes(userId, direct);
      setDetails(updated);
      setDirect(updated.directScope);
      toast.success('Direct scope saved');
    } catch (err) {
      toast.error(getApiErrorMessage(err, 'Failed to save scope'));
    } finally {
      setSaving(false);
    }
  };

  /** Each menu this person sees, with the grant(s) that open it, so "why can they see this?" has an answer. */
  const menuSources = useMemo(() => {
    if (!details) return [];
    const have = new Set(details.permissions);
    const grantName = (g: AccessGrant) => `${SOURCE_LABEL[g.source]}: ${g.positionTitle ?? g.name}`;
    return visibleMenus(details.permissions).map((menu) => {
      const alone = details.grants.filter((g) => menuOpen(g.permissions, menu.path));
      if (alone.length) return { menu, sources: alone.map(grantName), together: false };
      const openingSets = menuPermissionSets(menu.path).filter((set) => set.every((c) => have.has(c)));
      const contributors = details.grants.filter((g) =>
        openingSets.some((set) => set.some((c) => g.permissions.includes(c)))
      );
      return { menu, sources: contributors.map(grantName), together: true };
    });
  }, [details]);

  const scope = details?.scope;
  const scopeSummary = !scope
    ? null
    : scope.unrestricted
      ? 'Whole university'
      : [
          scope.schoolIds.length ? `${scope.schoolIds.length} school(s)` : null,
          scope.departmentIds.length ? `${scope.departmentIds.length} department(s)` : null,
          scope.programIds.length ? `${scope.programIds.length} programme(s)` : null,
          scope.orgUnitIds.length ? `${scope.orgUnitIds.length} unit(s)` : null,
        ]
          .filter(Boolean)
          .join(', ') || 'Own records only';

  return (
    <Dialog open={Boolean(userId)} onOpenChange={(next) => !next && onClose()}>
      <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShieldCheck className="h-5 w-5 text-[#015F2B]" />
            Access for {details?.user.name ?? userName ?? 'user'}
          </DialogTitle>
          <DialogDescription>
            Where this person&apos;s access comes from: their account type, extra roles, and positions held
            on the organisation chart.
          </DialogDescription>
        </DialogHeader>

        {loading || !details ? (
          <div className="flex justify-center py-12">
            <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
          </div>
        ) : (
          <div className="space-y-6">
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 p-3 text-sm">
              {scope?.unrestricted ? (
                <Globe2 className="h-4 w-4 text-[#015F2B]" />
              ) : (
                <Building2 className="h-4 w-4 text-amber-600" />
              )}
              <span className="font-medium">Data scope:</span>
              <span>{scopeSummary}</span>
              <span className="text-muted-foreground">· {details.permissions.length} permissions in total</span>
            </div>

            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Source</TableHead>
                    <TableHead>Grant</TableHead>
                    <TableHead>Covers</TableHead>
                    <TableHead className="text-right">Permissions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {details.grants.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-6 text-center text-muted-foreground">
                        No access grants.
                      </TableCell>
                    </TableRow>
                  ) : (
                    details.grants.map((g, i) => (
                      <TableRow key={`${g.source}-${g.code ?? g.name}-${i}`}>
                        <TableCell>
                          <Badge variant={g.source === 'Position' ? 'default' : 'secondary'}>
                            {SOURCE_LABEL[g.source]}
                          </Badge>
                          {g.isActing && (
                            <Badge variant="outline" className="ml-1">
                              Acting
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <div className="font-medium">{g.positionTitle ?? g.name}</div>
                          {g.positionTitle && <div className="text-xs text-muted-foreground">{g.name}</div>}
                          {g.endDate && (
                            <div className="text-xs text-muted-foreground">
                              Until {new Date(g.endDate).toLocaleDateString()}
                            </div>
                          )}
                        </TableCell>
                        <TableCell className="text-sm">{g.unitName ?? g.scopeLabel}</TableCell>
                        <TableCell className="text-right tabular-nums">{g.permissions.length}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <div className="space-y-2">
              <div>
                <h3 className="text-sm font-semibold">Menus this person sees</h3>
                <p className="text-xs text-muted-foreground">
                  To take a menu away, switch it off on <strong>every</strong> source listed for it (Roles &amp;
                  Permissions › Permissions › Menus). If a source is a position, ending the appointment also removes it.
                </p>
              </div>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Menu</TableHead>
                      <TableHead>Given by</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {menuSources.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={2} className="py-6 text-center text-muted-foreground">
                          Only the Dashboard.
                        </TableCell>
                      </TableRow>
                    ) : (
                      menuSources.map(({ menu, sources, together }) => (
                        <TableRow key={menu.path}>
                          <TableCell>
                            <div className="font-medium">{menu.label}</div>
                            <div className="text-xs text-muted-foreground">{menu.sectionLabel}</div>
                          </TableCell>
                          <TableCell className="text-sm">
                            {sources.join(together ? ' + ' : ' · ')}
                            {together ? (
                              <span className="block text-xs text-muted-foreground">These together open it</span>
                            ) : null}
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <h3 className="text-sm font-semibold">Direct scope</h3>
                <p className="text-xs text-muted-foreground">
                  Optional. Limits the account type and additional roles to these areas instead of the whole
                  university. Positions always cover their own unit.
                </p>
              </div>
              {SCOPE_FIELDS.map((field) => (
                <div key={field.key} className="space-y-2">
                  <LabelWithInfo info={field.info}>{field.label}</LabelWithInfo>
                  <div className="flex flex-wrap gap-2">
                    {direct[field.key].map((id) => (
                      <Badge key={id} variant="secondary" className="gap-1 pr-1">
                        {labelFor(id)}
                        <button
                          type="button"
                          className="rounded-sm p-0.5 hover:bg-muted"
                          onClick={() => removeScope(field.key, id)}
                          aria-label={`Remove ${labelFor(id)}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                  <Combobox
                    options={options[field.key].filter((o) => !direct[field.key].includes(o.value))}
                    value=""
                    onValueChange={(v) => addScope(field.key, v)}
                    placeholder={field.placeholder}
                    searchPlaceholder="Search…"
                    className="w-full sm:w-96"
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2">
          <Button type="button" variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            type="button"
            className="bg-[#015F2B] hover:bg-[#014022]"
            disabled={!dirty || saving || loading}
            onClick={saveScopes}
          >
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Save direct scope'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
