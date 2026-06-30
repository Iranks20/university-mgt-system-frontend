import { Link } from 'react-router';
import { ArrowRight, Users } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { GRADUATION_ROUTES } from '@/features/graduation/constants';
import type { GraduationCommitteeProgress } from '@/features/graduation/types';

type CommitteeCardProps = {
  progress: GraduationCommitteeProgress;
  slug: string;
  canOpen: boolean;
};

export function CommitteeCard({ progress, slug, canOpen }: CommitteeCardProps) {
  const body = (
    <Card className={canOpen ? 'hover:border-primary/40 transition-colors' : 'opacity-60'}>
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-base">{progress.shortName}</CardTitle>
          <Badge variant="secondary">{progress.percent}%</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground line-clamp-2">{progress.name}</p>
        <Progress value={progress.percent} className="h-2" />
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>
            {progress.done}/{progress.total} tasks
          </span>
          <span className="inline-flex items-center gap-1">
            <Users className="h-3.5 w-3.5" />
            {progress.memberCount}
          </span>
        </div>
        {canOpen ? (
          <span className="inline-flex items-center text-sm text-primary font-medium">
            Open workspace
            <ArrowRight className="ml-1 h-4 w-4" />
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">Not assigned to this committee</span>
        )}
      </CardContent>
    </Card>
  );

  if (!canOpen) return body;
  return (
    <Link to={GRADUATION_ROUTES.committee(slug)} className="block">
      {body}
    </Link>
  );
}
