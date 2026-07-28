import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useParams, useSearchParams } from 'react-router';
import { Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { GraduationPageShell } from '@/components/graduation/GraduationPageShell';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  GRADUATION_COMMITTEES,
  GRADUATION_COMMITTEE_BY_SLUG,
  GRADUATION_ROUTES,
  committeeWorkspaceSections,
} from '@/features/graduation/constants';
import type { CommitteeWorkspaceSection } from '@/features/graduation/types';
import { buildGraduationAccess } from '@/lib/graduation-access';
import {
  graduationModuleService,
  type GraduationCommitteeWorkspace,
} from '@/services/graduation-module.service';
import { CommitteeWorkspacePanel } from '../components/CommitteeWorkspacePanel';

const DEFAULT_COMMITTEE = GRADUATION_COMMITTEES[0]?.slug ?? 'steering';

export default function GraduationCommitteesPage() {
  const { user, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const committeeSlug = searchParams.get('committee') || DEFAULT_COMMITTEE;
  const sectionParam = searchParams.get('section') as CommitteeWorkspaceSection | null;

  const [loadingList, setLoadingList] = useState(true);
  const [loadingWorkspace, setLoadingWorkspace] = useState(false);
  const [hasEvent, setHasEvent] = useState(false);
  const [workspace, setWorkspace] = useState<GraduationCommitteeWorkspace | null>(null);

  const access = buildGraduationAccess({
    permissions: user?.permissions,
    role: userRole,
  });

  const meta = GRADUATION_COMMITTEE_BY_SLUG[committeeSlug];
  const sections = useMemo(
    () => (meta ? committeeWorkspaceSections(meta.type) : ['members'] as CommitteeWorkspaceSection[]),
    [meta]
  );
  const section: CommitteeWorkspaceSection =
    sectionParam && sections.includes(sectionParam) ? sectionParam : sections[0];

  const setCommittee = (slug: string) => {
    const nextMeta = GRADUATION_COMMITTEE_BY_SLUG[slug];
    const nextSections = nextMeta ? committeeWorkspaceSections(nextMeta.type) : ['members'];
    setSearchParams(
      { committee: slug, section: nextSections[0] },
      { replace: true }
    );
  };

  const setSection = (next: CommitteeWorkspaceSection) => {
    setSearchParams(
      { committee: committeeSlug, section: next },
      { replace: true }
    );
  };

  const loadEventState = useCallback(async () => {
    setLoadingList(true);
    try {
      const res = await graduationModuleService.listCommittees();
      setHasEvent(!!res.event);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load committees');
      setHasEvent(false);
    } finally {
      setLoadingList(false);
    }
  }, []);

  const loadWorkspace = useCallback(async () => {
    if (!meta || !hasEvent) {
      setWorkspace(null);
      return;
    }
    setLoadingWorkspace(true);
    try {
      const data = await graduationModuleService.getCommitteeWorkspace(committeeSlug);
      setWorkspace(data);
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Failed to load committee workspace');
      setWorkspace(null);
    } finally {
      setLoadingWorkspace(false);
    }
  }, [committeeSlug, hasEvent, meta]);

  useEffect(() => {
    loadEventState();
  }, [loadEventState]);

  useEffect(() => {
    loadWorkspace();
  }, [loadWorkspace]);

  if (!meta && committeeSlug) {
    return <Navigate to={`${GRADUATION_ROUTES.committees}?committee=${DEFAULT_COMMITTEE}`} replace />;
  }

  if (loadingList) {
    return (
      <GraduationPageShell title="Committees">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </GraduationPageShell>
    );
  }

  if (!hasEvent) {
    return (
      <GraduationPageShell
        title="Committees"
        description="Manage graduation committees, members, expenses, and vendors."
      >
        <Card>
          <CardContent className="py-10 text-center text-muted-foreground">
            Create a graduation event first.
            {access.canManageEvent ? (
              <div className="mt-4">
                <Button asChild>
                  <Link to={GRADUATION_ROUTES.event}>Create event</Link>
                </Button>
              </div>
            ) : null}
          </CardContent>
        </Card>
      </GraduationPageShell>
    );
  }

  return (
    <GraduationPageShell
      title="Committees"
      description="Select a committee to manage members, expenses, vendors, and tasks."
    >
      <Tabs
        value={committeeSlug}
        onValueChange={setCommittee}
        className="min-w-0 w-full space-y-4"
      >
        <TabsList className="bg-gray-100 h-auto w-full max-w-full flex flex-wrap items-center justify-start gap-1 p-1 [&_[data-slot=tabs-trigger]]:h-8 [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:flex-none">
          {GRADUATION_COMMITTEES.map((c) => (
            <TabsTrigger key={c.slug} value={c.slug} className="text-xs sm:text-sm">
              {c.shortName}
            </TabsTrigger>
          ))}
        </TabsList>

        {GRADUATION_COMMITTEES.map((c) => (
          <TabsContent key={c.slug} value={c.slug} className="space-y-4 mt-0">
            {committeeSlug === c.slug ? (
              loadingWorkspace ? (
                <div className="flex items-center gap-2 py-12 text-muted-foreground">
                  <Loader2 className="h-5 w-5 animate-spin" />
                  Loading {c.shortName} committee…
                </div>
              ) : workspace ? (
                <CommitteeWorkspacePanel
                  workspace={workspace}
                  section={section}
                  onSectionChange={setSection}
                  onRefresh={loadWorkspace}
                />
              ) : (
                <Card>
                  <CardContent className="py-10 text-center text-muted-foreground">
                    Could not load this committee workspace.
                  </CardContent>
                </Card>
              )
            ) : null}
          </TabsContent>
        ))}
      </Tabs>
    </GraduationPageShell>
  );
}

export function GraduationCommitteeSlugRedirect() {
  const { slug = DEFAULT_COMMITTEE } = useParams();
  const [searchParams] = useSearchParams();
  const section = searchParams.get('section');
  const query = new URLSearchParams({ committee: slug });
  if (section) query.set('section', section);
  return <Navigate to={`${GRADUATION_ROUTES.committees}?${query.toString()}`} replace />;
}
