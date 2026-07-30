import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { appraisalStatusBadge } from '@/components/hr/HrBadges';
import { getHrAppraisalDashboardSummary } from '@/features/hr/hr-appraisal-store';
import type { HrAppraisalReview } from '@/features/hr/types';
import { Users, CalendarOff, ClipboardCheck, UserPlus, ArrowRight, TrendingUp } from 'lucide-react';
import { Link } from 'react-router';
import { staffService } from '@/services/staff.service';
import { academicService } from '@/services/academic.service';
import type { Staff } from '@/types';

function daysSince(hireDate: string | Date) {
  return Math.floor((Date.now() - new Date(hireDate).getTime()) / 86400000);
}

export default function HrDashboardPage() {
  const [loading, setLoading] = useState(true);
  const [totalStaff, setTotalStaff] = useState(0);
  const [onLeave, setOnLeave] = useState(0);
  const [onboardingActive, setOnboardingActive] = useState(0);
  const [pendingAppraisals, setPendingAppraisals] = useState(0);
  const [recentAppraisals, setRecentAppraisals] = useState<HrAppraisalReview[]>([]);
  const [activeCycleLabel, setActiveCycleLabel] = useState<string | null>(null);
  const [headcountBySchool, setHeadcountBySchool] = useState<
    { school: string; count: number; pct: number }[]
  >([]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      try {
        const [staffResult, schools, appraisalSummary] = await Promise.all([
          staffService.getStaff({ limit: 1000 }),
          academicService.getSchools().catch(() => []),
          getHrAppraisalDashboardSummary().catch(() => null),
        ]);

        if (cancelled) return;

        const staff = (staffResult.data ?? []).filter((s) => s.status !== 'Terminated');
        setTotalStaff(staff.length);
        setOnLeave(staff.filter((s) => s.status === 'On Leave').length);
        setOnboardingActive(
          staff.filter(
            (s) =>
              s.status !== 'Inactive' &&
              (s.status === 'Probation' || daysSince(s.hireDate) <= 90)
          ).length
        );

        const schoolNameById = Object.fromEntries(
          (schools ?? []).map((s: { id: string; name: string }) => [s.id, s.name])
        );
        const counts = new Map<string, number>();
        for (const s of staff as Staff[]) {
          const label = s.schoolId
            ? schoolNameById[s.schoolId] ?? 'Unassigned school'
            : 'Unassigned school';
          counts.set(label, (counts.get(label) ?? 0) + 1);
        }
        const total = staff.length || 1;
        const rows = [...counts.entries()]
          .map(([school, count]) => ({
            school,
            count,
            pct: Math.round((count / total) * 100),
          }))
          .sort((a, b) => b.count - a.count)
          .slice(0, 8);
        setHeadcountBySchool(rows);

        setPendingAppraisals(appraisalSummary?.inProgressCount ?? 0);
        setRecentAppraisals((appraisalSummary?.recentReviews ?? []).slice(0, 4));
        setActiveCycleLabel(appraisalSummary?.activeCycle?.name ?? null);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, []);

  const summaryCards = [
    { label: 'Total Employees', value: totalStaff, icon: Users, color: 'text-[#015F2B]' },
    { label: 'On Leave', value: onLeave, icon: CalendarOff, color: 'text-blue-600' },
    {
      label: 'Appraisals In Progress',
      value: pendingAppraisals,
      icon: ClipboardCheck,
      color: 'text-indigo-600',
    },
    { label: 'Onboarding pool', value: onboardingActive, icon: UserPlus, color: 'text-purple-600' },
  ];

  return (
    <HrPageShell title="HR Dashboard" description="Workforce overview">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {summaryCards.map((s) => (
          <Card key={s.label}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium text-gray-600">{s.label}</CardTitle>
              <s.icon className={`h-5 w-5 ${s.color}`} />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold">{loading ? '—' : s.value}</div>
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Performance Appraisals</CardTitle>
              <CardDescription>
                {activeCycleLabel ? `${activeCycleLabel} — action required` : 'No open cycle'}
              </CardDescription>
            </div>
            <Button variant="outline" size="sm" asChild>
              <Link to="/hr/appraisals">
                Manage <ArrowRight className="ml-1 h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {recentAppraisals.length === 0 ? (
              <p className="text-sm text-gray-500">No appraisals in progress.</p>
            ) : (
              recentAppraisals.map((a) => (
                <div key={a.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium text-sm">{a.employeeName}</p>
                    <p className="text-xs text-gray-500">
                      {a.jobTitle} · Due {a.dueDate}
                    </p>
                  </div>
                  {appraisalStatusBadge(a.status)}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-[#015F2B]" />
              Headcount by School
            </CardTitle>
          </CardHeader>
          <CardContent>
            {loading ? (
              <p className="text-sm text-gray-500">Loading…</p>
            ) : headcountBySchool.length === 0 ? (
              <p className="text-sm text-gray-500">No active staff to chart.</p>
            ) : (
              <div className="space-y-3">
                {headcountBySchool.map((row) => (
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
            )}
          </CardContent>
        </Card>
      </div>
    </HrPageShell>
  );
}
