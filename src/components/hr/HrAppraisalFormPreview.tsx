import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { AppraisalFormTemplate } from '@/features/hr/types';

type HrAppraisalFormPreviewProps = {
  template: AppraisalFormTemplate;
  compact?: boolean;
};

export function HrAppraisalFormPreview({ template, compact = false }: HrAppraisalFormPreviewProps) {
  const sections = template.sections ?? [];
  const kpiCount = sections
    .filter((section) => section.kind === 'kpi')
    .reduce((sum, section) => sum + section.criteria.length, 0);
  const scorecardCount = sections.find((section) => section.kind === 'scorecard')?.criteria.length ?? 0;

  return (
    <Card className={compact ? 'border-dashed' : undefined}>
      <CardHeader className={compact ? 'pb-2' : undefined}>
        <div className="flex flex-wrap items-start justify-between gap-2">
          <div>
            <CardTitle className={compact ? 'text-base' : 'text-lg'}>{template.name}</CardTitle>
            <CardDescription>{template.intendedFor}</CardDescription>
          </div>
          <Badge variant="outline">{template.code}</Badge>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 text-sm">
        <p className="text-gray-600">{template.description}</p>

        <div className="flex flex-wrap gap-2 text-xs">
          <Badge variant="secondary">
            Rating scale 0–{template.ratingScaleMax ?? 3}
            {template.ratingIncludesNa ? ' + N/A' : ''}
          </Badge>
          {template.cycleKind ? <Badge variant="outline">{template.cycleKind}</Badge> : null}
        </div>

        {scorecardCount > 0 ? (
          <div>
            <p className="font-medium text-gray-900 mb-2">Summary scorecard domains ({scorecardCount})</p>
            <ul className="list-disc pl-5 space-y-1 text-gray-600">
              {sections
                .filter((section) => section.kind === 'scorecard')
                .flatMap((section) => section.criteria)
                .map((criterion) => (
                  <li key={criterion.id}>{criterion.title}</li>
                ))}
            </ul>
          </div>
        ) : null}

        {sections
          .filter((section) => section.kind === 'kpi')
          .map((section) => (
            <div key={section.id}>
              <p className="font-medium text-gray-900 mb-2">
                {section.title} ({section.criteria.length} KPIs
                {section.maxSectionScore ? ` · max ${section.maxSectionScore}` : ''})
              </p>
              <ul className="space-y-2">
                {section.criteria.map((criterion) => (
                  <li key={criterion.id} className="rounded-md border p-3">
                    <div className="flex justify-between gap-2">
                      <span className="font-medium">{criterion.title}</span>
                      <Badge variant="secondary">wt {criterion.weight}</Badge>
                    </div>
                    <p className="text-xs text-gray-500 mt-1">{criterion.targetPrompt}</p>
                  </li>
                ))}
              </ul>
            </div>
          ))}

        {!sections.length && template.goals.length ? (
          <div>
            <p className="font-medium text-gray-900 mb-2">Legacy goals</p>
            <ul className="space-y-2">
              {template.goals.map((goal) => (
                <li key={goal.id} className="rounded-md border p-3">
                  <span className="font-medium">{goal.title}</span>
                </li>
              ))}
            </ul>
          </div>
        ) : null}

        <div className="flex flex-wrap gap-2 text-xs">
          {template.includesDevelopmentPlan ? (
            <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Development plan section</Badge>
          ) : null}
          {template.includesTrainingNeeds ? (
            <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100">Training needs section</Badge>
          ) : null}
          {kpiCount > 0 ? (
            <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100">{kpiCount} detailed KPI rows</Badge>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
