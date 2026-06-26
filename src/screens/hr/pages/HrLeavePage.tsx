import { useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { leaveStatusBadge } from '@/components/hr/HrBadges';
import { getHrEmployees, getHrLeaveRequests, updateLeaveRequestStatus } from '@/features/hr/hr-demo-store';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';

export default function HrLeavePage() {
  const { user } = useAuth();
  const [requests, setRequests] = useState(() => getHrLeaveRequests());
  const employees = getHrEmployees();

  const refresh = () => setRequests([...getHrLeaveRequests()]);

  const handleDecision = (id: string, approved: boolean) => {
    updateLeaveRequestStatus(id, approved ? 'Approved' : 'Rejected', user?.name || 'HR Officer');
    refresh();
    toast.success(approved ? 'Leave approved' : 'Leave rejected');
  };

  const pending = requests.filter((r) => r.status === 'Pending');
  const balances = employees
    .filter((e) => e.status !== 'Terminated')
    .map((e) => ({
      name: `${e.firstName} ${e.lastName}`,
      department: e.department,
      balance: e.leaveBalanceDays,
    }));

  return (
    <HrPageShell
      title="Leave Management"
      description="Annual, sick, maternity, study, and other leave types — requests, approvals, and balances."
    >
      <Tabs defaultValue="pending">
        <TabsList>
          <TabsTrigger value="pending">Pending ({pending.length})</TabsTrigger>
          <TabsTrigger value="all">All Requests</TabsTrigger>
          <TabsTrigger value="balances">Leave Balances</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Approval queue</CardTitle>
              <CardDescription>Standard workflow: Employee → HOD → HR (demo: HR action only)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Dates</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {pending.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-gray-500 py-8">
                        No pending leave requests
                      </TableCell>
                    </TableRow>
                  ) : (
                    pending.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.employeeName}</div>
                          <div className="text-xs text-gray-500">{r.department}</div>
                        </TableCell>
                        <TableCell>{r.leaveType}</TableCell>
                        <TableCell className="text-sm">{r.startDate} → {r.endDate}</TableCell>
                        <TableCell>{r.days}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm">{r.reason}</TableCell>
                        <TableCell>{leaveStatusBadge(r.status)}</TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button size="sm" variant="outline" className="text-green-700" onClick={() => handleDecision(r.id, true)}>
                            <Check className="h-4 w-4" />
                          </Button>
                          <Button size="sm" variant="outline" className="text-red-700" onClick={() => handleDecision(r.id, false)}>
                            <X className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Type</TableHead>
                    <TableHead>Period</TableHead>
                    <TableHead>Days</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed by</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {requests.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell>{r.leaveType}</TableCell>
                      <TableCell>{r.startDate} → {r.endDate}</TableCell>
                      <TableCell>{r.days}</TableCell>
                      <TableCell>{leaveStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-sm text-gray-500">{r.reviewedBy || '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="balances" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle>Annual leave balances</CardTitle>
              <CardDescription>Per-employee entitlement remaining (demo data)</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Balance (days)</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {balances.map((b) => (
                    <TableRow key={b.name}>
                      <TableCell>{b.name}</TableCell>
                      <TableCell>{b.department}</TableCell>
                      <TableCell>{b.balance}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </HrPageShell>
  );
}
