import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type {
  AppraisalCriterionRating,
  AppraisalFormSection,
  AppraisalReviewResponses,
} from '@/features/hr/types';
import { KCU_APPRAISAL_RATING_LABELS } from '@/features/hr/types';
import {
  getCriterionResponse,
  upsertCriterionResponse,
} from '@/features/hr/appraisal-form-utils';

type AppraisalSectionFormProps = {
  section: AppraisalFormSection;
  responses: AppraisalReviewResponses;
  onChange: (responses: AppraisalReviewResponses) => void;
  mode: 'self' | 'supervisor' | 'hr' | 'readonly';
  ratingScaleMax?: number;
  ratingIncludesNa?: boolean;
};

function ratingOptions(max: number, includesNa: boolean): AppraisalCriterionRating[] {
  const values: AppraisalCriterionRating[] = [];
  for (let i = max; i >= 0; i -= 1) {
    values.push(i as AppraisalCriterionRating);
  }
  if (includesNa) values.push('N/A');
  return values;
}

export function AppraisalKcuRatingSelect({
  value,
  onChange,
  disabled,
  ratingScaleMax = 3,
  ratingIncludesNa = true,
}: {
  value: AppraisalCriterionRating | null;
  onChange: (value: AppraisalCriterionRating) => void;
  disabled?: boolean;
  ratingScaleMax?: number;
  ratingIncludesNa?: boolean;
}) {
  return (
    <Select
      value={value === null ? '' : String(value)}
      onValueChange={(v) => onChange(v === 'N/A' ? 'N/A' : (Number(v) as AppraisalCriterionRating))}
      disabled={disabled}
    >
      <SelectTrigger className="w-36">
        <SelectValue placeholder="Rate" />
      </SelectTrigger>
      <SelectContent>
        {ratingOptions(ratingScaleMax, ratingIncludesNa).map((rating) => (
          <SelectItem key={String(rating)} value={String(rating)}>
            {rating} — {KCU_APPRAISAL_RATING_LABELS[rating]}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export function AppraisalSectionForm({
  section,
  responses,
  onChange,
  mode,
  ratingScaleMax = 3,
  ratingIncludesNa = true,
}: AppraisalSectionFormProps) {
  if (section.kind === 'scorecard') {
    const summary = responses.summaryScores.find((row) => row.sectionId === section.id);
    return (
      <div className="rounded-lg border overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Assessment area</TableHead>
              <TableHead>Self</TableHead>
              <TableHead>Supervisor</TableHead>
              {mode === 'hr' || mode === 'readonly' ? <TableHead>HR comment</TableHead> : null}
            </TableRow>
          </TableHeader>
          <TableBody>
            {section.criteria.map((criterion) => {
              const row = getCriterionResponse(responses, criterion.id);
              return (
                <TableRow key={criterion.id}>
                  <TableCell className="font-medium">{criterion.title}</TableCell>
                  <TableCell>
                    {mode === 'self' ? (
                      <AppraisalKcuRatingSelect
                        value={row?.selfRating ?? null}
                        onChange={(selfRating) =>
                          onChange(upsertCriterionResponse(responses, criterion.id, { selfRating }))
                        }
                        ratingScaleMax={ratingScaleMax}
                        ratingIncludesNa={ratingIncludesNa}
                      />
                    ) : (
                      (row?.selfRating ?? '—')
                    )}
                  </TableCell>
                  <TableCell>
                    {mode === 'supervisor' ? (
                      <AppraisalKcuRatingSelect
                        value={row?.supervisorRating ?? null}
                        onChange={(supervisorRating) =>
                          onChange(upsertCriterionResponse(responses, criterion.id, { supervisorRating }))
                        }
                        ratingScaleMax={ratingScaleMax}
                        ratingIncludesNa={ratingIncludesNa}
                      />
                    ) : (
                      (row?.supervisorRating ?? '—')
                    )}
                  </TableCell>
                  {mode === 'hr' || mode === 'readonly' ? (
                    <TableCell className="text-sm text-gray-600">{summary?.hrComment || '—'}</TableCell>
                  ) : null}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    );
  }

  return (
    <div className="rounded-lg border overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="min-w-[180px]">Key output / KPI</TableHead>
            <TableHead>Performance target</TableHead>
            <TableHead>Means of verification</TableHead>
            <TableHead>Achievement / evidence</TableHead>
            <TableHead>Weight</TableHead>
            <TableHead>Self</TableHead>
            <TableHead>Supervisor</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {section.criteria.map((criterion) => {
            const row = getCriterionResponse(responses, criterion.id);
            return (
              <TableRow key={criterion.id}>
                <TableCell className="font-medium align-top">{criterion.title}</TableCell>
                <TableCell className="text-sm text-gray-600 align-top">{criterion.targetPrompt}</TableCell>
                <TableCell className="text-sm text-gray-600 align-top">{criterion.meansOfVerification || '—'}</TableCell>
                <TableCell className="align-top">
                  {mode === 'self' || mode === 'supervisor' ? (
                    <Textarea
                      rows={2}
                      value={row?.achievement ?? ''}
                      onChange={(e) =>
                        onChange(upsertCriterionResponse(responses, criterion.id, { achievement: e.target.value }))
                      }
                      disabled={mode === 'readonly'}
                    />
                  ) : (
                    <span className="text-sm">{row?.achievement || '—'}</span>
                  )}
                </TableCell>
                <TableCell className="align-top">{criterion.weight}</TableCell>
                <TableCell className="align-top">
                  {mode === 'self' ? (
                    <AppraisalKcuRatingSelect
                      value={row?.selfRating ?? null}
                      onChange={(selfRating) =>
                        onChange(upsertCriterionResponse(responses, criterion.id, { selfRating }))
                      }
                      ratingScaleMax={ratingScaleMax}
                      ratingIncludesNa={ratingIncludesNa}
                    />
                  ) : (
                    (row?.selfRating ?? '—')
                  )}
                </TableCell>
                <TableCell className="align-top">
                  {mode === 'supervisor' ? (
                    <AppraisalKcuRatingSelect
                      value={row?.supervisorRating ?? null}
                      onChange={(supervisorRating) =>
                        onChange(upsertCriterionResponse(responses, criterion.id, { supervisorRating }))
                      }
                      ratingScaleMax={ratingScaleMax}
                      ratingIncludesNa={ratingIncludesNa}
                    />
                  ) : (
                    (row?.supervisorRating ?? '—')
                  )}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {section.maxSectionScore ? (
        <p className="text-xs text-gray-500 p-3 border-t">Section maximum score: {section.maxSectionScore}</p>
      ) : null}
    </div>
  );
}
