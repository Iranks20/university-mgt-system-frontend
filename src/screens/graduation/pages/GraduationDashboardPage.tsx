import { useMemo } from 'react';
import { Link } from 'react-router';
import { CalendarDays, ClipboardList, Loader2, PartyPopper, Settings2 } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationPageShell } from '@/components/graduation/GraduationPageShell';
import { CommitteeCard } from '@/components/graduation/CommitteeCard';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { GRADUATION_COMMITTEES, GRADUATION_ROUTES } from '@/features/graduation/constants';
import { useGraduationDashboard } from '@/features/graduation/use-graduation-module';
import { buildGraduationAccess } from '@/lib/graduation-access';

function formatDate(value: string): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return value;
  return d.toLocaleDateString(undefined, { weekday: 'short', year: 'numeric', month: 'short', day: 'numeric' });
}

function daysUntil(value: string): number | null {
  if (!value) return null;
  const target = new Date(value);
  if (Number.isNaN(target.getTime())) return null;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  target.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

export default function GraduationDashboardPage() {
  const { user, userRole } = useAuth();
  const { data, loading, reload } = useGraduationDashboard();
  const activeEvent = data?.activeEvent ?? null;
  const progress = data?.committeeProgress ?? [];
  const overallPercent = data?.overallPercent ?? 0;

  const access = useMemo(
    () =>
      buildGraduationAccess({
        permissions: user?.permissions,
        role: userRole,
        serverAccess: data?.access ?? null,
      }),
    [user?.permissions, userRole, data?.access]
  );

  if (loading) {
    return (
      <GraduationPageShell title="Graduation" description="Loading graduation dashboard…">
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading…
        </div>
      </GraduationPageShell>
    );
  }

  if (!activeEvent) {
    return (
      <GraduationPageShell
        title="Graduation"
        description="Plan and coordinate the graduation ceremony with your committees."
        actions={
          access.canManageEvent ? (
            <Button asChild>
              <Link to={GRADUATION_ROUTES.event}>
                <Settings2 className="h-4 w-4 mr-2" />
                Create event
              </Link>
            </Button>
          ) : undefined
        }
      >
        <Card>
          <CardContent className="py-12 text-center space-y-3">
            <PartyPopper className="h-10 w-10 mx-auto text-muted-foreground" />
            <p className="text-lg font-medium">No graduation event yet</p>
            <p className="text-sm text-muted-foreground max-w-md mx-auto">
              {access.canManageEvent
                ? 'Create the ceremony to set up committees, checklists, and track progress.'
                : 'The graduation management team must create the ceremony event first.'}
            </p>
          </CardContent>
        </Card>
      </GraduationPageShell>
    );
  }

  const countdown = daysUntil(activeEvent.ceremonyDate);

  return (
    <GraduationPageShell
      title={activeEvent.title}
      description={`${activeEvent.cohort} · ${formatDate(activeEvent.ceremonyDate)} · ${activeEvent.venue || 'Venue TBC'}`}
      actions={
        <div className="flex flex-wrap gap-2">
          {access.canViewRegistrations ? (
            <Button variant="outline" asChild>
              <Link to={GRADUATION_ROUTES.registrations}>Registrations</Link>
            </Button>
          ) : null}
          {access.canManageEvent ? (
            <Button variant="outline" asChild>
              <Link to={GRADUATION_ROUTES.event}>Manage event</Link>
            </Button>
          ) : null}
          <Button variant="ghost" size="sm" onClick={() => reload()}>
            Refresh
          </Button>
        </div>
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Ceremony date</CardTitle>
          </CardHeader>
          <CardContent className="flex items-center gap-3">
            <CalendarDays className="h-8 w-8 text-primary" />
            <div>
              <p className="font-semibold">{formatDate(activeEvent.ceremonyDate)}</p>
              <p className="text-sm text-muted-foreground">
                {countdown == null
                  ? 'Date not set'
                  : countdown > 0
                    ? `${countdown} day${countdown === 1 ? '' : 's'} to go`
                    : countdown === 0
                      ? 'Today'
                      : `${Math.abs(countdown)} day${Math.abs(countdown) === 1 ? '' : 's'} ago`}
              </p>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall progress</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{overallPercent}%</p>
            <p className="text-sm text-muted-foreground">Average across visible committees</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Status</CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            <Badge>{activeEvent.status}</Badge>
            {activeEvent.overallBudget != null ? (
              <p className="text-sm text-muted-foreground">
                Budget: UGX {activeEvent.overallBudget.toLocaleString()}
              </p>
            ) : null}
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between gap-3">
        <h2 className="text-lg font-semibold inline-flex items-center gap-2">
          <ClipboardList className="h-5 w-5" />
          Committees
        </h2>
        <Button variant="ghost" size="sm" asChild>
          <Link to={GRADUATION_ROUTES.committees}>View all</Link>
        </Button>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {progress.map((row) => {
          const meta = GRADUATION_COMMITTEES.find((c) => c.type === row.type);
          const slug = meta?.slug ?? row.type;
          return (
            <CommitteeCard
              key={row.type}
              slug={slug}
              progress={row}
              canOpen
            />
          );
        })}
      </div>
    </GraduationPageShell>
  );
}
