import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { leaveStatusBadge, appraisalStatusBadge } from '@/components/hr/HrBadges';
import {
  getHrEmployees,
  getHrLeaveRequests,
  getHrOnboarding,
} from '@/features/hr/hr-demo-store';
import { getHrAppraisalDashboardSummary } from '@/features/hr/hr-appraisal-store';
import type { HrAppraisalReview } from '@/features/hr/types';
import {
  Users,
  CalendarOff,
  ClipboardCheck,
  UserPlus,
  FileWarning,
  ArrowRight,
  TrendingUp,
} from 'lucide-react';
import { Link } from 'react-router';
import { Badge } from '@/components/ui/badge';

export default function HrDashboardPage() {
  const [stats, setStats] = useState({
    totalStaff: 0,
    onLeave: 0,
    pendingLeave: 0,
    pendingAppraisals: 0,
    onboardingActive: 0,
    expiringDocs: 0,
  });
  const [pendingLeave, setPendingLeave] = useState<ReturnType<typeof getHrLeaveRequests>>([]);
  const [pendingAppraisals, setPendingAppraisals] = useState<HrAppraisalReview[]>([]);

  const [activeCycleLabel, setActiveCycleLabel] = useState<string | null>(null);

  useEffect(() => {
    const employees = getHrEmployees();
    const leave = getHrLeaveRequests();
    const onboarding = getHrOnboarding();

    setStats({
      totalStaff: employees.filter((e) => e.status !== 'Terminated').length,
      onLeave: employees.filter((e) => e.status === 'On Leave').length,
      pendingLeave: leave.filter((l) => l.status === 'Pending').length,
      pendingAppraisals: 0,
      onboardingActive: onboarding.filter((o) => o.progress < 100).length,
      expiringDocs: 2,
    });
    setPendingLeave(leave.filter((l) => l.status === 'Pending').slice(0, 4));

    getHrAppraisalDashboardSummary()
      .then((summary) => {
        setStats((prev) => ({ ...prev, pendingAppraisals: summary.inProgressCount }));
        setPendingAppraisals(summary.recentReviews.slice(0, 4));
        setActiveCycleLabel(summary.activeCycle?.name ?? null);
      })
      .catch(() => {
        setPendingAppraisals([]);
        setActiveCycleLabel(null);
      });
  }, []);

  const statCards = [
    { label: 'Total Employees', value: stats.totalStaff, icon: Users, color: 'text-[#015F2B]' },
    { label: 'On Leave Today', value: stats.onLeave, icon: CalendarOff, color: 'text-blue-600' },
    { label: 'Pending Leave', value: stats.pendingLeave, icon: CalendarOff, color: 'text-amber-600' },
    { label: 'Appraisals In Progress', value: stats.pendingAppraisals, icon: ClipboardCheck, color: 'text-indigo-600' },
    { label: 'Active Onboarding', value: stats.onboardingActive, icon: UserPlus, color: 'text-purple-600' },
    { label: 'Expiring Documents', value: stats.expiringDocs, icon: FileWarning, color: 'text-red-600' },
  ];

  return (
    <HrPageShell
      title="HR Dashboard"
      description="Workforce overview for the Human Resources office — headcount, leave, appraisals, and onboarding."
    >
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {statCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Pending Leave Approvals</CardTitle>
              <CardDescription>Requires HR or HOD action</CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/hr/leave">View all <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingLeave.length === 0 ? (
              <p className="text-sm text-gray-500">No pending leave requests.</p>
            ) : (
              pendingLeave.map((l) => (
                <div key={l.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{l.employeeName}</p>
                    <p className="text-xs text-gray-500">
                      {l.leaveType} · {l.startDate} → {l.endDate} ({l.days} days)
                    </p>
                  </div>
                  {leaveStatusBadge(l.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Performance Appraisals</CardTitle>
              <CardDescription>
                {activeCycleLabel ? `${activeCycleLabel} — action required` : 'No open cycle'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/hr/appraisals">Manage <ArrowRight className="ml-1 h-4 w-4" /></Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {pendingAppraisals.length === 0 ? (
              <p className="text-sm text-gray-500">No appraisals in progress.</p>
            ) : (
              pendingAppraisals.map((a) => (
              <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium text-sm">{a.employeeName}</p>
                  <p className="text-xs text-gray-500">{a.jobTitle} · Due {a.dueDate}</p>
                </div>
                {appraisalStatusBadge(a.status)}
              </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-[#015F2B]" />
            Headcount by School
          </CardTitle>
          <CardDescription>Preview chart — will connect to live data after backend build</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[
              { school: 'School of Health Sciences', count: 68, pct: 44 },
              { school: 'Central Administration', count: 52, pct: 33 },
              { school: 'School of Business', count: 24, pct: 15 },
              { school: 'Library & Support', count: 12, pct: 8 },
            ].map((row) => (
              <div key={row.school}>
                <div className="flex justify-between text-sm mb-1">
                  <span>{row.school}</span>
                  <span className="text-gray-500">{row.count}</span>
                </div>
                <div className="h-2 rounded-full bg-gray-100">
                  <div
                    className="h-2 rounded-full bg-[#015F2B]"
                    style={{ width: `${row.pct}%` }}
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="rounded-lg border border-dashed border-green-300 bg-green-50 p-4 text-sm text-green-900">
        <Badge variant="outline" className="mb-2 border-green-500 text-green-800">Live data</Badge>
        <p>
          Performance appraisals load from the HR API. Leave, employees, and onboarding still use browser
          preview data until those modules are connected to the backend.
        </p>
      </div>
    </HrPageShell>
  );
}
