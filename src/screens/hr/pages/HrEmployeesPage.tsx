import { useCallback, useEffect, useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import {
  StaffFormDialog,
  type OfficeOption,
  type StaffFormValues,
  type SupervisorOption,
} from '@/components/hr/StaffFormDialog';
import { organizationService } from '@/services/organization.service';
import { buildOfficeOptions } from '@/lib/office-options';
import { STAFF_CATEGORY_OPTIONS, type Staff } from '@/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Download, Eye, MoreHorizontal, Pencil, QrCode, Trash2 } from 'lucide-react';
import { staffAttendanceService } from '@/services/staff-attendance.service';
import { printStaffBadge } from '@/lib/staff-badge-print';
import { toast } from 'sonner';
import { staffService } from '@/services/staff.service';
import { academicService } from '@/services/academic.service';
import { hrReportsService } from '@/services/hr-reports.service';
import { getApiErrorMessage } from '@/lib/api';
import { useSearchParams } from 'react-router';
import { TemporaryCredentialsDialog, type TemporaryCredential } from '@/components/TemporaryCredentialsDialog';

type StaffRecord = Omit<Staff, 'phone' | 'status' | 'employmentType'> & {
  phone?: string | null;
  status?: string;
  employmentType?: string;
};

type DeptOption = { id: string; name: string; schoolId: string | null };
type SchoolOption = { id: string; name: string };

const SUPERVISOR_EXCLUDED_STATUSES = new Set(['Terminated', 'Inactive', 'Suspended']);

const CATEGORY_LABEL = Object.fromEntries(STAFF_CATEGORY_OPTIONS.map((c) => [c.value, c.label.split(' (')[0]]));

export default function HrEmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<StaffRecord[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [offices, setOffices] = useState<OfficeOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [officeFilter, setOfficeFilter] = useState(searchParams.get('unit') ?? 'all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supervisionFilter, setSupervisionFilter] = useState(
    searchParams.get('supervision') === 'missing'
      ? 'missing'
      : searchParams.get('placement') === 'unplaced'
        ? 'unplaced'
        : 'all'
  );

  const [viewing, setViewing] = useState<StaffRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<StaffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [staffDirectory, setStaffDirectory] = useState<SupervisorOption[]>([]);
  const [issuedCredentials, setIssuedCredentials] = useState<TemporaryCredential[]>([]);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const [staffRes, schoolRes, levelRes, departmentRes, orgTree] = await Promise.all([
        staffService.getStaff({
          page: pageNum,
          limit: pageSize,
          ...(supervisionFilter === 'missing' ? { missingSupervisor: true } : {}),
          ...(supervisionFilter === 'unplaced' ? { unplaced: true } : {}),
          ...(categoryFilter !== 'all' ? { category: categoryFilter } : {}),
          ...(officeFilter !== 'all' ? { orgUnitId: officeFilter } : {}),
          ...(schoolFilter !== 'all' ? { schoolId: schoolFilter } : {}),
          ...(deptFilter !== 'all' ? { department: deptFilter } : {}),
        }),
        academicService.getSchools(),
        academicService.getLevels(),
        academicService.getDepartments(),
        organizationService.getTree().catch(() => null),
      ]);

      const levelToSchool = new Map(levelRes.map((l: any) => [l.id, l.schoolId]));

      const deptList: DeptOption[] = departmentRes.map((d: any) => ({
        id: d.id,
        name: d.name,
        schoolId: (d.schoolId ?? null) || levelToSchool.get(d.levelId) || null,
      }));
      const deptMap = new Map(deptList.map((d) => [d.id, d]));

      const mapped: StaffRecord[] = ((staffRes.data ?? []) as StaffRecord[]).map((s) => {
        const dept = s.departmentId ? deptMap.get(s.departmentId) : undefined;
        return {
          ...s,
          departmentName: s.departmentName || dept?.name || null,
          schoolId: s.schoolId || dept?.schoolId || null,
          status: s.status || 'Active',
          employmentType: s.employmentType || 'Full-time',
        };
      });

      setSchools(schoolRes.map((s: any) => ({ id: s.id, name: s.name })));
      setDepartments(deptList);
      if (orgTree) setOffices(buildOfficeOptions(orgTree.units));
      setEmployees(mapped);
      setTotal(staffRes.total ?? mapped.length);
      setPage(pageNum);
    } finally {
      setLoading(false);
    }
  }, [supervisionFilter, categoryFilter, officeFilter, schoolFilter, deptFilter]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (supervisionFilter === 'missing') next.set('supervision', 'missing');
      else next.delete('supervision');
      if (supervisionFilter === 'unplaced') next.set('placement', 'unplaced');
      else next.delete('placement');
      if (officeFilter !== 'all') next.set('unit', officeFilter);
      else next.delete('unit');
      return next;
    });
    loadData(1);
  }, [loadData, setSearchParams, supervisionFilter, officeFilter]);

  const visibleDepts = useMemo(() => {
    if (schoolFilter === 'all') return departments;
    return departments.filter((d) => d.schoolId === schoolFilter);
  }, [departments, schoolFilter]);

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.staffNumber.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        e.role.toLowerCase().includes(q);
      const matchStatus = statusFilter === 'all' || (e.status || '').toLowerCase() === statusFilter;
      const matchSupervision = supervisionFilter !== 'missing' || !e.hasResolvedSupervisor;
      return matchSearch && matchStatus && matchSupervision;
    });
  }, [employees, search, statusFilter, supervisionFilter]);

  const schoolName = (id?: string | null) => schools.find((s) => s.id === id)?.name || '-';
  const placementOf = (e: StaffRecord) =>
    e.departmentName || e.orgUnitName || e.placementLabel || null;

  const openCreate = () => {
    setEditTarget(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const printBadge = async (staffId: string) => {
    try {
      printStaffBadge(await staffAttendanceService.getBadge(staffId));
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not print the badge'));
    }
  };

  const openEdit = (record: StaffRecord) => {
    setEditTarget(record);
    setFormMode('edit');
    setFormOpen(true);
  };

  useEffect(() => {
    if (!formOpen || staffDirectory.length) return;
    let cancelled = false;
    staffService.getStaff({ limit: 5000 }).then((res) => {
      if (cancelled) return;
      const eligible = ((res.data ?? []) as Array<SupervisorOption & { status?: string }>).filter(
        (s) => !SUPERVISOR_EXCLUDED_STATUSES.has(s.status ?? 'Active')
      );
      setStaffDirectory(eligible);
    });
    return () => {
      cancelled = true;
    };
  }, [formOpen, staffDirectory.length]);

  const handleFormSubmit = async (values: StaffFormValues) => {
    const { placement, userRole, tempPassword, ...rest } = values;
    const payload = {
      ...rest,
      phone: values.phone || null,
      departmentId: placement === 'academic' ? values.departmentId : null,
      schoolId: placement === 'academic' ? values.schoolId || null : null,
      orgUnitId: placement === 'office' ? values.orgUnitId : null,
      academicRank: values.staffCategory === 'Academic' ? values.academicRank || null : null,
      gender: values.gender || null,
      hireDate: values.hireDate || undefined,
      supervisorId: values.supervisorId || null,
      ...(formMode === 'create' && userRole ? { userRole } : {}),
      ...(tempPassword.trim() ? { tempPassword: tempPassword.trim() } : {}),
    };
    if (formMode === 'create') {
      const created = (await staffService.createStaff(payload as any)) as {
        temporaryPassword?: string | null;
      } | null;
      toast.success('Employee created successfully.');
      if (created?.temporaryPassword) {
        setIssuedCredentials([
          {
            name: `${values.firstName} ${values.lastName}`.trim(),
            login: values.email.trim(),
            temporaryPassword: created.temporaryPassword,
          },
        ]);
      }
    } else if (editTarget) {
      const updated = (await staffService.updateStaff(editTarget.id, payload as any)) as {
        loginChange?: 'deactivated' | 'reactivated' | null;
      } | null;
      toast.success('Employee updated successfully.');
      if (updated?.loginChange === 'deactivated') {
        toast.info('Their sign-in has been disabled because they are no longer active.');
      } else if (updated?.loginChange === 'reactivated') {
        toast.info('Their sign-in has been re-enabled.');
      }
    }
    setStaffDirectory([]);
    await loadData(page);
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await staffService.deleteStaff(deleteTarget.id);
      toast.success(`${deleteTarget.firstName} ${deleteTarget.lastName} deleted.`);
      setDeleteTarget(null);
      await loadData(page);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || err?.message || 'Delete failed.');
    } finally {
      setDeleting(false);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    try {
      const result = await hrReportsService.downloadExport({ type: 'headcount' });
      toast.success(`Downloaded ${result.filename}`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Export failed'));
    } finally {
      setExporting(false);
    }
  };

  const totalPages = Math.max(1, Math.ceil(total / pageSize));

  const formInitial = useMemo<Partial<StaffFormValues> | undefined>(() => editTarget
    ? {
        staffNumber: editTarget.staffNumber,
        firstName: editTarget.firstName,
        lastName: editTarget.lastName,
        email: editTarget.email,
        phone: editTarget.phone || '',
        placement: editTarget.orgUnitId && !editTarget.departmentId ? 'office' : 'academic',
        departmentId: editTarget.departmentId || '',
        schoolId: editTarget.schoolId || '',
        orgUnitId: editTarget.orgUnitId || '',
        role: editTarget.role,
        staffCategory: editTarget.staffCategory || 'Administrative',
        academicRank: editTarget.academicRank || '',
        gender: editTarget.gender || '',
        hireDate: editTarget.hireDate ? String(editTarget.hireDate).slice(0, 10) : '',
        hasPhd: Boolean(editTarget.hasPhd),
        employmentType: editTarget.employmentType || 'Full-time',
        status: editTarget.status || 'Active',
        supervisorId: editTarget.supervisorId || '',
      }
    : undefined, [editTarget]);

  return (
    <HrPageShell
      title="Employee Directory"
      description="Employee master"
      actions={
        <>
          <Button variant="outline" onClick={handleExport} disabled={exporting}>
            <Download className="h-4 w-4 mr-2" /> {exporting ? 'Exporting…' : 'Export'}
          </Button>
          <Button onClick={openCreate}>
            <UserPlus className="h-4 w-4 mr-2" /> Add Employee
          </Button>
        </>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Search & filter</CardTitle>
        </CardHeader>
        <CardContent className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
            <Input
              className="pl-9"
              placeholder="Search by name, staff number, email or job title…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full lg:w-44">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All categories</SelectItem>
              {STAFF_CATEGORY_OPTIONS.map((c) => (
                <SelectItem key={c.value} value={c.value}>{CATEGORY_LABEL[c.value]}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Combobox
            className="w-full lg:w-56"
            options={[
              { value: 'all', label: 'All offices' },
              ...offices.map((o) => ({ value: o.id, label: o.label })),
            ]}
            value={officeFilter}
            onValueChange={(v) => setOfficeFilter(v || 'all')}
            placeholder="Office / unit"
            searchPlaceholder="Search offices..."
            emptyText="No office found."
            initialDisplayCount={200}
          />
          <Combobox
            className="w-full lg:w-56"
            options={[
              { value: 'all', label: 'All schools' },
              ...schools.map((s) => ({ value: s.id, label: s.name })),
            ]}
            value={schoolFilter}
            onValueChange={(v) => {
              setSchoolFilter(v || 'all');
              setDeptFilter('all');
            }}
            placeholder="School"
            searchPlaceholder="Search schools..."
            emptyText="No school found."
            initialDisplayCount={50}
          />
          <Combobox
            className="w-full lg:w-48"
            options={[
              { value: 'all', label: 'All departments' },
              ...visibleDepts.map((d) => ({ value: d.id, label: d.name })),
            ]}
            value={deptFilter}
            onValueChange={(v) => setDeptFilter(v || 'all')}
            placeholder="Department"
            searchPlaceholder="Search departments..."
            emptyText="No department found."
            initialDisplayCount={50}
          />
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All statuses</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="on leave">On Leave</SelectItem>
              <SelectItem value="probation">Probation</SelectItem>
              <SelectItem value="suspended">Suspended</SelectItem>
              <SelectItem value="inactive">Inactive</SelectItem>
            </SelectContent>
          </Select>
          <Select value={supervisionFilter} onValueChange={setSupervisionFilter}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Supervisor" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All reporting lines</SelectItem>
              <SelectItem value="missing">Needs supervisor</SelectItem>
              <SelectItem value="unplaced">Not placed in a department or office</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {loading ? (
            <div className="p-6 text-sm text-gray-500">Loading employees…</div>
          ) : filtered.length === 0 ? (
            <div className="p-6 text-sm text-gray-500">No employees found for the selected filters.</div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff No.</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Job Title</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Department / Office</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((e) => (
                    <TableRow key={e.id}>
                      <TableCell className="font-mono text-xs">{e.staffNumber}</TableCell>
                      <TableCell className="font-medium">{e.firstName} {e.lastName}</TableCell>
                      <TableCell>
                        <div>{e.role}</div>
                        {(e.leadershipRoles ?? []).map((r) => (
                          <Badge key={r} variant="outline" className="mt-1 mr-1 text-[11px] font-normal">
                            {r}
                          </Badge>
                        ))}
                      </TableCell>
                      <TableCell>
                        <div>{e.staffCategory ? CATEGORY_LABEL[e.staffCategory] : '-'}</div>
                        {e.academicRankLabel && (
                          <div className="text-xs text-muted-foreground">{e.academicRankLabel}</div>
                        )}
                      </TableCell>
                      <TableCell>
                        {placementOf(e) ? (
                          <>
                            <div>{placementOf(e)}</div>
                            {e.departmentId && (
                              <div className="text-xs text-muted-foreground">
                                {e.schoolName || schoolName(e.schoolId)}
                              </div>
                            )}
                          </>
                        ) : (
                          <Badge variant="destructive">Not placed</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        {e.supervisorName ? (
                          <>
                            <div>{e.supervisorName}</div>
                            {e.supervisorSource !== 'explicit' && (
                              <div className="text-xs text-muted-foreground">
                                {e.supervisorSource === 'department' ? 'Head of department' : 'From organisation structure'}
                              </div>
                            )}
                          </>
                        ) : (
                          <Badge variant="destructive">Missing</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant="secondary">{e.status || 'Active'}</Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => setViewing(e)}>
                              <Eye className="mr-2 h-4 w-4" /> View
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => openEdit(e)}>
                              <Pencil className="mr-2 h-4 w-4" /> Edit
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => void printBadge(e.id)}>
                              <QrCode className="mr-2 h-4 w-4" /> Print attendance badge
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-red-600"
                              onClick={() => setDeleteTarget(e)}
                            >
                              <Trash2 className="mr-2 h-4 w-4" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {total > pageSize && (
                <div className="flex items-center justify-between border-t px-4 py-2">
                  <span className="text-sm text-muted-foreground">{total} total</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => loadData(page - 1)}>
                      Previous
                    </Button>
                    <span className="text-sm">Page {page} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => loadData(page + 1)}>
                      Next
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* View detail dialog */}
      <Dialog open={!!viewing} onOpenChange={() => setViewing(null)}>
        <DialogContent className="max-w-lg">
          {viewing && (
            <>
              <DialogHeader>
                <DialogTitle>{viewing.firstName} {viewing.lastName}</DialogTitle>
                <DialogDescription>{viewing.staffNumber} · {viewing.role}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">Email</dt><dd>{viewing.email}</dd></div>
                <div><dt className="text-gray-500">Phone</dt><dd>{viewing.phone || '-'}</dd></div>
                <div>
                  <dt className="text-gray-500">Category</dt>
                  <dd>
                    {viewing.staffCategory ? CATEGORY_LABEL[viewing.staffCategory] : '-'}
                    {viewing.academicRankLabel ? ` · ${viewing.academicRankLabel}` : ''}
                  </dd>
                </div>
                <div><dt className="text-gray-500">Gender</dt><dd>{viewing.gender || '-'}</dd></div>
                <div><dt className="text-gray-500">Department / Office</dt><dd>{placementOf(viewing) || 'Not placed'}</dd></div>
                <div>
                  <dt className="text-gray-500">School</dt>
                  <dd>{viewing.departmentId ? viewing.schoolName || schoolName(viewing.schoolId) : '-'}</dd>
                </div>
                <div className="col-span-2">
                  <dt className="text-gray-500">Leadership roles</dt>
                  <dd>{viewing.leadershipRoles?.length ? viewing.leadershipRoles.join('; ') : 'None'}</dd>
                </div>
                <div><dt className="text-gray-500">PhD holder</dt><dd>{viewing.hasPhd ? 'Yes' : 'No'}</dd></div>
                <div><dt className="text-gray-500">Employment</dt><dd>{viewing.employmentType || '-'}</dd></div>
                <div><dt className="text-gray-500">Hire date</dt><dd>{new Date(viewing.hireDate).toLocaleDateString()}</dd></div>
                <div>
                  <dt className="text-gray-500">Supervisor</dt>
                  <dd>
                    {viewing.supervisorName
                      ? `${viewing.supervisorName}${viewing.supervisorSource === 'explicit' ? '' : ' (automatic)'}`
                      : 'Missing'}
                  </dd>
                </div>
                <div><dt className="text-gray-500">System account</dt><dd>{viewing.userId ? 'Linked' : 'None'}</dd></div>
                <div><dt className="text-gray-500">Status</dt><dd><Badge variant="secondary">{viewing.status || 'Active'}</Badge></dd></div>
              </dl>
            </>
          )}
        </DialogContent>
      </Dialog>

      {/* Create / Edit form dialog */}
      <StaffFormDialog
        open={formOpen}
        onOpenChange={setFormOpen}
        mode={formMode}
        initial={formInitial}
        departments={departments}
        schools={schools}
        offices={offices}
        supervisors={staffDirectory.length ? staffDirectory : employees}
        excludeStaffId={editTarget?.id}
        onSubmit={handleFormSubmit}
      />

      {/* Delete confirmation dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={() => !deleting && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Delete Employee</DialogTitle>
            <DialogDescription>
              This will permanently remove{' '}
              <strong>{deleteTarget?.firstName} {deleteTarget?.lastName}</strong> and their linked
              user account. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)} disabled={deleting}>
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
              {deleting ? 'Deleting…' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <TemporaryCredentialsDialog credentials={issuedCredentials} onClose={() => setIssuedCredentials([])} />
    </HrPageShell>
  );
}
