import { useCallback, useEffect, useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { StaffFormDialog, type StaffFormValues } from '@/components/hr/StaffFormDialog';
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
import { Search, UserPlus, Download, Eye, MoreHorizontal, Pencil, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { staffService } from '@/services/staff.service';
import { academicService } from '@/services/academic.service';
import { hrReportsService } from '@/services/hr-reports.service';
import { getApiErrorMessage } from '@/lib/api';
import { useSearchParams } from 'react-router';

type StaffRecord = {
  id: string;
  userId?: string | null;
  staffNumber: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string | null;
  departmentId: string;
  departmentName?: string | null;
  schoolId?: string | null;
  role: string;
  status?: string;
  employmentType?: string;
  hireDate: string | Date;
  supervisorId?: string | null;
  supervisorName?: string | null;
  hasResolvedSupervisor?: boolean;
  supervisorSource?: 'explicit' | 'department' | 'missing';
};

type DeptOption = { id: string; name: string; schoolId: string | null };
type SchoolOption = { id: string; name: string };

export default function HrEmployeesPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [employees, setEmployees] = useState<StaffRecord[]>([]);
  const [departments, setDepartments] = useState<DeptOption[]>([]);
  const [schools, setSchools] = useState<SchoolOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState('all');
  const [deptFilter, setDeptFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [supervisionFilter, setSupervisionFilter] = useState(
    searchParams.get('supervision') === 'missing' ? 'missing' : 'all'
  );

  const [viewing, setViewing] = useState<StaffRecord | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [formMode, setFormMode] = useState<'create' | 'edit'>('create');
  const [editTarget, setEditTarget] = useState<StaffRecord | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<StaffRecord | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [exporting, setExporting] = useState(false);

  const [page, setPage] = useState(1);
  const [total, setTotal] = useState(0);
  const pageSize = 50;

  const loadData = useCallback(async (pageNum = 1) => {
    setLoading(true);
    try {
      const [staffRes, schoolRes, levelRes, departmentRes] = await Promise.all([
        staffService.getStaff({
          page: pageNum,
          limit: pageSize,
          ...(supervisionFilter === 'missing' ? { missingSupervisor: true } : {}),
        }),
        academicService.getSchools(),
        academicService.getLevels(),
        academicService.getDepartments(),
      ]);

      const levelToSchool = new Map(levelRes.map((l: any) => [l.id, l.schoolId]));

      const deptList: DeptOption[] = departmentRes.map((d: any) => ({
        id: d.id,
        name: d.name,
        schoolId: (d.schoolId ?? null) || levelToSchool.get(d.levelId) || null,
      }));
      const deptMap = new Map(deptList.map((d) => [d.id, d]));

      const mapped: StaffRecord[] = ((staffRes.data ?? []) as StaffRecord[]).map((s) => {
        const dept = deptMap.get(s.departmentId);
        return {
          ...s,
          departmentName: s.departmentName || dept?.name || 'Unknown',
          schoolId: s.schoolId || dept?.schoolId || null,
          status: s.status || 'Active',
          employmentType: s.employmentType || 'Full-time',
        };
      });

      setSchools(schoolRes.map((s: any) => ({ id: s.id, name: s.name })));
      setDepartments(deptList);
      setEmployees(mapped);
      setTotal(staffRes.total ?? mapped.length);
      setPage(pageNum);
    } finally {
      setLoading(false);
    }
  }, [supervisionFilter]);

  useEffect(() => {
    setSearchParams((prev) => {
      const next = new URLSearchParams(prev);
      if (supervisionFilter === 'missing') next.set('supervision', 'missing');
      else next.delete('supervision');
      return next;
    });
    loadData(1);
  }, [loadData, setSearchParams, supervisionFilter]);

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
        e.email.toLowerCase().includes(q);
      const matchSchool = schoolFilter === 'all' || e.schoolId === schoolFilter;
      const matchDept = deptFilter === 'all' || e.departmentId === deptFilter;
      const matchStatus = statusFilter === 'all' || (e.status || '').toLowerCase() === statusFilter;
      const matchSupervision =
        supervisionFilter === 'all' ||
        (supervisionFilter === 'missing' ? !e.hasResolvedSupervisor : !!e.hasResolvedSupervisor);
      return matchSearch && matchSchool && matchDept && matchStatus && matchSupervision;
    });
  }, [employees, search, schoolFilter, deptFilter, statusFilter, supervisionFilter]);

  const schoolName = (id?: string | null) => schools.find((s) => s.id === id)?.name || '-';

  const openCreate = () => {
    setEditTarget(null);
    setFormMode('create');
    setFormOpen(true);
  };

  const openEdit = (record: StaffRecord) => {
    setEditTarget(record);
    setFormMode('edit');
    setFormOpen(true);
  };

  const handleFormSubmit = async (values: StaffFormValues) => {
    const payload = {
      ...values,
      phone: values.phone || null,
      schoolId: values.schoolId || null,
      supervisorId: values.supervisorId || null,
      userRole: values.userRole || undefined,
      tempPassword: values.tempPassword || undefined,
    };
    if (formMode === 'create') {
      await staffService.createStaff(payload as any);
      toast.success('Employee created successfully.');
    } else if (editTarget) {
      await staffService.updateStaff(editTarget.id, payload as any);
      toast.success('Employee updated successfully.');
    }
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

  const formInitial: Partial<StaffFormValues> | undefined = editTarget
    ? {
        staffNumber: editTarget.staffNumber,
        firstName: editTarget.firstName,
        lastName: editTarget.lastName,
        email: editTarget.email,
        phone: editTarget.phone || '',
        departmentId: editTarget.departmentId,
        schoolId: editTarget.schoolId || '',
        role: editTarget.role,
        employmentType: editTarget.employmentType || 'Full-time',
        status: editTarget.status || 'Active',
        supervisorId: editTarget.supervisorId || '',
      }
    : undefined;

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
              placeholder="Search by name, staff number, or email…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={schoolFilter} onValueChange={setSchoolFilter}>
            <SelectTrigger className="w-full lg:w-56">
              <SelectValue placeholder="School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All schools</SelectItem>
              {schools.map((s) => (
                <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All departments</SelectItem>
              {visibleDepts.map((d) => (
                <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
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
                    <TableHead>School</TableHead>
                    <TableHead>Department</TableHead>
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
                      <TableCell>{e.role}</TableCell>
                      <TableCell>{schoolName(e.schoolId)}</TableCell>
                      <TableCell>{e.departmentName || '-'}</TableCell>
                      <TableCell>
                        {e.supervisorName ? (
                          e.supervisorName
                        ) : e.supervisorSource === 'department' ? (
                          'Dept HOD'
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
                <div><dt className="text-gray-500">School</dt><dd>{schoolName(viewing.schoolId)}</dd></div>
                <div><dt className="text-gray-500">Department</dt><dd>{viewing.departmentName || '-'}</dd></div>
                <div><dt className="text-gray-500">Employment</dt><dd>{viewing.employmentType || '-'}</dd></div>
                <div><dt className="text-gray-500">Hire date</dt><dd>{new Date(viewing.hireDate).toLocaleDateString()}</dd></div>
                <div>
                  <dt className="text-gray-500">Supervisor</dt>
                  <dd>
                    {viewing.supervisorName
                      ? viewing.supervisorName
                      : viewing.supervisorSource === 'department'
                        ? 'Department HOD (default)'
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
        supervisors={employees}
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
    </HrPageShell>
  );
}
