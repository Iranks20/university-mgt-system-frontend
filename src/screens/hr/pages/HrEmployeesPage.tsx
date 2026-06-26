import { useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { employmentStatusBadge } from '@/components/hr/HrBadges';
import { getHrEmployees } from '@/features/hr/hr-demo-store';
import type { EmployeeCategory, EmploymentStatus, HrEmployee } from '@/features/hr/types';
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
} from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Search, UserPlus, Download, Eye } from 'lucide-react';
import { toast } from 'sonner';

export default function HrEmployeesPage() {
  const [employees] = useState(() => getHrEmployees());
  const [search, setSearch] = useState('');
  const [deptFilter, setDeptFilter] = useState('All');
  const [statusFilter, setStatusFilter] = useState<EmploymentStatus | 'All'>('All');
  const [categoryFilter, setCategoryFilter] = useState<EmployeeCategory | 'All'>('All');
  const [selected, setSelected] = useState<HrEmployee | null>(null);

  const departments = useMemo(
    () => ['All', ...new Set(employees.map((e) => e.department))],
    [employees]
  );

  const filtered = useMemo(() => {
    return employees.filter((e) => {
      const q = search.toLowerCase();
      const matchSearch =
        !q ||
        e.firstName.toLowerCase().includes(q) ||
        e.lastName.toLowerCase().includes(q) ||
        e.staffNumber.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q);
      const matchDept = deptFilter === 'All' || e.department === deptFilter;
      const matchStatus = statusFilter === 'All' || e.status === statusFilter;
      const matchCat = categoryFilter === 'All' || e.category === categoryFilter;
      return matchSearch && matchDept && matchStatus && matchCat;
    });
  }, [employees, search, deptFilter, statusFilter, categoryFilter]);

  return (
    <HrPageShell
      title="Employee Directory"
      description="Central employee master file — academic and non-teaching staff records."
      actions={
        <>
          <Button variant="outline" onClick={() => toast.info('Export will connect to backend')}>
            <Download className="h-4 w-4 mr-2" /> Export
          </Button>
          <Button onClick={() => toast.info('Add employee form will connect to backend')}>
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
              placeholder="Search by name, staff number, or email..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Select value={deptFilter} onValueChange={setDeptFilter}>
            <SelectTrigger className="w-full lg:w-48">
              <SelectValue placeholder="Department" />
            </SelectTrigger>
            <SelectContent>
              {departments.map((d) => (
                <SelectItem key={d} value={d}>{d}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select value={statusFilter} onValueChange={(v) => setStatusFilter(v as EmploymentStatus | 'All')}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All statuses</SelectItem>
              <SelectItem value="Active">Active</SelectItem>
              <SelectItem value="On Leave">On Leave</SelectItem>
              <SelectItem value="Probation">Probation</SelectItem>
              <SelectItem value="Suspended">Suspended</SelectItem>
            </SelectContent>
          </Select>
          <Select value={categoryFilter} onValueChange={(v) => setCategoryFilter(v as EmployeeCategory | 'All')}>
            <SelectTrigger className="w-full lg:w-40">
              <SelectValue placeholder="Category" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All categories</SelectItem>
              <SelectItem value="Academic">Academic</SelectItem>
              <SelectItem value="Administrative">Administrative</SelectItem>
              <SelectItem value="Support">Support</SelectItem>
              <SelectItem value="Clinical">Clinical</SelectItem>
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Staff No.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Job Title</TableHead>
                <TableHead>Department</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Leave Bal.</TableHead>
                <TableHead className="text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-mono text-xs">{e.staffNumber}</TableCell>
                  <TableCell className="font-medium">{e.firstName} {e.lastName}</TableCell>
                  <TableCell>{e.jobTitle}</TableCell>
                  <TableCell>{e.department}</TableCell>
                  <TableCell><Badge variant="secondary">{e.category}</Badge></TableCell>
                  <TableCell>{employmentStatusBadge(e.status)}</TableCell>
                  <TableCell>{e.leaveBalanceDays} days</TableCell>
                  <TableCell className="text-right">
                    <Button variant="ghost" size="sm" onClick={() => setSelected(e)}>
                      <Eye className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!selected} onOpenChange={() => setSelected(null)}>
        <DialogContent className="max-w-lg">
          {selected ? (
            <>
              <DialogHeader>
                <DialogTitle>{selected.firstName} {selected.lastName}</DialogTitle>
                <DialogDescription>{selected.staffNumber} · {selected.jobTitle}</DialogDescription>
              </DialogHeader>
              <dl className="grid grid-cols-2 gap-3 text-sm">
                <div><dt className="text-gray-500">Email</dt><dd>{selected.email}</dd></div>
                <div><dt className="text-gray-500">Phone</dt><dd>{selected.phone}</dd></div>
                <div><dt className="text-gray-500">School</dt><dd>{selected.school}</dd></div>
                <div><dt className="text-gray-500">Department</dt><dd>{selected.department}</dd></div>
                <div><dt className="text-gray-500">Employment</dt><dd>{selected.employmentType}</dd></div>
                <div><dt className="text-gray-500">Hire date</dt><dd>{selected.hireDate}</dd></div>
                <div><dt className="text-gray-500">Line manager</dt><dd>{selected.managerName}</dd></div>
                <div><dt className="text-gray-500">System account</dt><dd>{selected.hasUserAccount ? 'Yes' : 'No'}</dd></div>
                <div className="col-span-2"><dt className="text-gray-500">Status</dt><dd className="mt-1">{employmentStatusBadge(selected.status)}</dd></div>
              </dl>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </HrPageShell>
  );
}
