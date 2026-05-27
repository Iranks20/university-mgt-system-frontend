import { useEffect, useState } from 'react';
import { Link } from 'react-router';
import { Briefcase, CheckCircle, ClipboardList, MapPin, Users, UserCheck } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useRole } from '@/components/RoleProvider';
import { CLINICAL_ROUTES } from '@/lib/clinical-routes';
import { clinicalService } from '@/services/clinical.service';

type DashboardOverview = Awaited<ReturnType<typeof clinicalService.getDashboardOverview>>;

export function ClinicalRoleDashboard() {
  const { role } = useRole();
  const [overview, setOverview] = useState<DashboardOverview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const data = await clinicalService.getDashboardOverview();
        if (!cancelled) setOverview(data);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const totals = overview?.totals;
  const siteRows = overview?.sites ?? [];

  if (role === 'ClinicalCoordinator') {
    return (
      <div className="p-6 space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Clinical coordination</h1>
          <p className="text-gray-500">Oversee hospital sites, placements, and session verification.</p>
        </div>
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-5">
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Clinical sites</CardDescription>
              <CardTitle className="text-3xl">{loading ? '—' : totals?.sites ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Active rotations</CardDescription>
              <CardTitle className="text-3xl">{loading ? '—' : totals?.activeRotations ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Students on placement</CardDescription>
              <CardTitle className="text-3xl text-primary">{loading ? '—' : totals?.studentsOnPlacement ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Awaiting verification</CardDescription>
              <CardTitle className="text-3xl text-amber-700">{loading ? '—' : totals?.pendingVerification ?? 0}</CardTitle>
            </CardHeader>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardDescription>Total sessions</CardDescription>
              <CardTitle className="text-3xl">{loading ? '—' : totals?.totalSessions ?? 0}</CardTitle>
            </CardHeader>
          </Card>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <CheckCircle className="h-5 w-5 text-primary" />
                Verify sessions
              </CardTitle>
              <CardDescription>Review submissions from QA clinicals officers at teaching sites.</CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild className="bg-[#015F2B] hover:bg-[#014022]">
                <Link to={CLINICAL_ROUTES.sessions}>Open verification queue</Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <MapPin className="h-5 w-5 text-primary" />
                Sites & placements
              </CardTitle>
              <CardDescription>Manage hospitals, rotations, and student rosters.</CardDescription>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button asChild variant="outline">
                <Link to={CLINICAL_ROUTES.sites}>Clinical sites</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={CLINICAL_ROUTES.siteTeam}>Site team</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={CLINICAL_ROUTES.rotations}>Rotations</Link>
              </Button>
              <Button asChild variant="outline">
                <Link to={CLINICAL_ROUTES.policies}>Eligibility policies (edit)</Link>
              </Button>
            </CardContent>
          </Card>
        </div>
        {!loading && siteRows.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserCheck className="h-5 w-5 text-primary" />
                Placement by site
              </CardTitle>
              <CardDescription>Active roster counts and sessions per hospital site.</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-muted-foreground">
                      <th className="py-2 pr-4 font-medium">Site</th>
                      <th className="py-2 pr-4 font-medium">Rotations</th>
                      <th className="py-2 pr-4 font-medium">On placement</th>
                      <th className="py-2 pr-4 font-medium">Pending verify</th>
                      <th className="py-2 font-medium">Sessions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {siteRows.map((row) => (
                      <tr key={row.clinicalSiteId} className="border-b border-gray-100 last:border-0">
                        <td className="py-2 pr-4 font-medium">{row.clinicalSiteName}</td>
                        <td className="py-2 pr-4">{row.activeRotations}</td>
                        <td className="py-2 pr-4 text-primary font-medium">{row.studentsOnPlacement}</td>
                        <td className="py-2 pr-4 text-amber-700">{row.pendingSessions}</td>
                        <td className="py-2">{row.totalSessions}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Clinical teaching</h1>
        <p className="text-gray-500">Record sessions, manage rotations, and capture student attendance at hospital sites.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Students on placement</CardDescription>
            <CardTitle className="text-3xl text-primary">{loading ? '—' : totals?.studentsOnPlacement ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Active rotations</CardDescription>
            <CardTitle className="text-3xl">{loading ? '—' : totals?.activeRotations ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Pending verification</CardDescription>
            <CardTitle className="text-3xl text-amber-700">{loading ? '—' : totals?.pendingVerification ?? 0}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total sessions</CardDescription>
            <CardTitle className="text-3xl">{loading ? '—' : totals?.totalSessions ?? 0}</CardTitle>
          </CardHeader>
        </Card>
      </div>
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Briefcase className="h-5 w-5 text-primary" />
              Record session
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild className="w-full bg-[#015F2B] hover:bg-[#014022]">
              <Link to={CLINICAL_ROUTES.sessions}>New clinical session</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <ClipboardList className="h-5 w-5 text-primary" />
              Rotations
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to={CLINICAL_ROUTES.rotations}>Manage rotations</Link>
            </Button>
          </CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Users className="h-5 w-5 text-primary" />
              Attendance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline" className="w-full">
              <Link to={CLINICAL_ROUTES.attendance}>Mark attendance</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
      {!loading && siteRows.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Your sites — students on placement</CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-gray-700 space-y-2">
            {siteRows.map((row) => (
              <div key={row.clinicalSiteId} className="flex justify-between border-b border-gray-100 py-2 last:border-0">
                <span>{row.clinicalSiteName}</span>
                <span>
                  <span className="font-medium text-primary">{row.studentsOnPlacement}</span> on placement ·{' '}
                  {row.pendingSessions} pending
                </span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
