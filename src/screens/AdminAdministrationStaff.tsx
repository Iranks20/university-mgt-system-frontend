import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Loader2, Search, ChevronLeft, ChevronRight, Building2 } from 'lucide-react';
import { Link } from 'react-router';
import { toast } from 'sonner';
import { staffService } from '@/services/staff.service';
import { adminService, type LecturerLoginResult } from '@/services/admin.service';
import { LecturerLoginDialog } from '@/components/admin/LecturerLoginDialog';
import { formatRoleLabel } from '@/lib/role-labels';
import type { Staff, StaffCategory } from '@/types';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { ResetFiltersButton } from '@/components/ui/reset-filters-button';

const PAGE_SIZE = 20;
const CATEGORY_FILTERS: Array<{ value: 'all' | StaffCategory; label: string }> = [
  { value: 'all', label: 'All non-teaching' },
  { value: 'Administrative', label: 'Administrative' },
  { value: 'Support', label: 'Support' },
  { value: 'Clinical', label: 'Clinical' },
];

export default function AdminAdministrationStaff() {
  const [rows, setRows] = useState<Staff[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [category, setCategory] = useState<'all' | StaffCategory>('all');
  const [loginTarget, setLoginTarget] = useState<Staff | null>(null);

  const load = useCallback(
    async (pageNum: number) => {
      setLoading(true);
      try {
        const result = await staffService.getStaff({
          page: pageNum,
          limit: PAGE_SIZE,
          search: search.trim() || undefined,
          ...(category === 'all' ? { excludeCategory: 'Academic' } : { category }),
        });
        setRows(result.data ?? []);
        setTotal(result.total ?? 0);
        setPage(result.page ?? pageNum);
      } catch {
        toast.error('Failed to load administration staff');
        setRows([]);
        setTotal(0);
      } finally {
        setLoading(false);
      }
    },
    [search, category]
  );

  useEffect(() => {
    setPage(1);
  }, [search, category]);

  useEffect(() => {
    void load(page);
  }, [page, load]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const hasFilters = search.trim() !== '' || category !== 'all';

  const onLoginSaved = (result: LecturerLoginResult) => {
    setRows((prev) =>
      prev.map((r) => (r.id === result.staffId ? { ...r, email: result.email } : r))
    );
    setLoginTarget(null);
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Administration staff</h1>
        <p className="text-gray-500">
          Non-teaching employees (offices, QA, HR, clinical QA and coordinators). Add people in{' '}
          <Link to="/hr/employees" className="text-[#015F2B] underline-offset-2 hover:underline">
            HR › Employees
          </Link>
          , then place them on{' '}
          <Link to="/hr/organisation" className="text-[#015F2B] underline-offset-2 hover:underline">
            Organisation Structure
          </Link>
          . Their menu access comes from the post they hold.
        </p>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5" /> Directory
              </CardTitle>
              <CardDescription>
                Lecturers stay under Lecturers. This list is everyone else with an employee record.
              </CardDescription>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 pt-2">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search name, email or staff number..."
                className="pl-9"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <Select value={category} onValueChange={(v) => setCategory(v as 'all' | StaffCategory)}>
              <SelectTrigger className="w-[200px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                {CATEGORY_FILTERS.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {hasFilters ? (
              <ResetFiltersButton
                onClick={() => {
                  setSearch('');
                  setCategory('all');
                }}
              />
            ) : null}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : rows.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">
              No administration staff found. Create them in HR › Employees and appoint them under Quality
              Assurance or their office on the organisation chart.
            </p>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Job title</TableHead>
                    <TableHead>Office / unit</TableHead>
                    <TableHead>Login</TableHead>
                    <TableHead>Account type</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.map((row) => {
                    const name = `${row.firstName} ${row.lastName}`.trim();
                    return (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{name}</div>
                          <div className="text-xs text-muted-foreground">{row.staffNumber}</div>
                        </TableCell>
                        <TableCell>{row.role}</TableCell>
                        <TableCell>
                          {row.placementLabel || row.orgUnitName || row.departmentName || '—'}
                          {row.leadershipRoles && row.leadershipRoles.length > 0 ? (
                            <div className="mt-1 flex flex-wrap gap-1">
                              {row.leadershipRoles.map((title) => (
                                <Badge key={title} variant="secondary" className="text-xs">
                                  {title}
                                </Badge>
                              ))}
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell className="text-sm">{row.email}</TableCell>
                        <TableCell>
                          {row.userRole ? (
                            <Badge variant="outline">{formatRoleLabel(row.userRole)}</Badge>
                          ) : (
                            <span className="text-xs text-muted-foreground">No login</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          {row.userId ? (
                            <Button
                              variant="ghost"
                              size="icon"
                              title="Update login email or password"
                              onClick={() => setLoginTarget(row)}
                            >
                              <KeyRound className="h-4 w-4" />
                            </Button>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-between">
                <p className="text-sm text-muted-foreground">
                  {total} people · page {page} of {totalPages}
                </p>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <LecturerLoginDialog
        lecturer={
          loginTarget
            ? {
                id: loginTarget.id,
                name: `${loginTarget.firstName} ${loginTarget.lastName}`.trim(),
                email: loginTarget.email,
              }
            : null
        }
        onOpenChange={(open) => {
          if (!open) setLoginTarget(null);
        }}
        onSaved={onLoginSaved}
        updateLogin={(staffId, input) => adminService.updateStaffLogin(staffId, input)}
      />
    </div>
  );
}
