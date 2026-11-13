import { Pencil } from 'lucide-react';
import type { AppraisalCriterionRating, AppraisalFormSection, AppraisalReviewResponses } from '@/features/hr/types';
import { ratingFor, sectionPercent, type RatingField } from '@/features/hr/appraisal-form-utils';
import { RatingBadge, RatingSelect } from './RatingControls';

export type RatingTableMode = 'self' | 'supervisor' | 'review' | 'hr';

type Props = {
  section: AppraisalFormSection;
  sectionNumber: number;
  /** S/N of the first item in this section (numbering runs across the whole form). */
  firstItemNumber: number;
  responses: AppraisalReviewResponses;
  /**
   * self: staff rate themselves · supervisor: staff rating shown, supervisor rates ·
   * review: both shown read-only · hr: both shown with an edit button per item.
   */
  mode: RatingTableMode;
  onRate?: (criterionId: string, field: RatingField, value: AppraisalCriterionRating | null) => void;
  onEdit?: (criterionId: string, itemNumber: number) => void;
  includeNa?: boolean;
  disabled?: boolean;
};

/** One appraisal section as a table laid out like the previous KCU system. */
export function AppraisalRatingTable({
  section,
  sectionNumber,
  firstItemNumber,
  responses,
  mode,
  onRate,
  onEdit,
  includeNa = true,
  disabled,
}: Props) {
  const weight = section.maxSectionScore ?? section.criteria.length * 3;
  const selfPct = sectionPercent(section, responses, 'selfRating');
  const supPct = sectionPercent(section, responses, 'supervisorRating');
  const showSelf = true;
  const showSupervisor = mode !== 'self';

  return (
    <div className="rounded-lg border border-gray-200 overflow-hidden break-inside-avoid">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900">
          SECTION {sectionNumber}: {section.title}{' '}
          <span className="font-normal text-gray-500">(Weight: {weight})</span>
        </h3>
        <div className="flex gap-3 text-xs text-gray-600">
          {selfPct !== null ? <span>Self: {Math.round(selfPct)}%</span> : null}
          {showSupervisor && supPct !== null ? <span>Supervisor: {Math.round(supPct)}%</span> : null}
        </div>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-white text-left text-xs uppercase tracking-wide text-gray-500">
            <tr className="border-b">
              <th className="px-3 py-2 w-10">S/N</th>
              <th className="px-3 py-2 min-w-[12rem]">Key Outputs</th>
              <th className="px-3 py-2 min-w-[12rem]">Performance Targets</th>
              <th className="px-3 py-2 min-w-[12rem]">Means of Verification</th>
              <th className="px-3 py-2 w-16 text-center">Weight</th>
              {showSelf ? (
                <th className="px-3 py-2 w-40">{mode === 'supervisor' ? 'Staff Rating' : 'Self-Rating'}</th>
              ) : null}
              {showSupervisor ? <th className="px-3 py-2 w-40">Supervisor Rating</th> : null}
              {mode === 'hr' ? <th className="px-3 py-2 w-12 text-center">Edit</th> : null}
            </tr>
          </thead>
          <tbody>
            {section.criteria.map((criterion, index) => {
              const itemNumber = firstItemNumber + index;
              const self = ratingFor(responses, criterion.id, 'selfRating');
              const sup = ratingFor(responses, criterion.id, 'supervisorRating');
              return (
                <tr key={criterion.id} className="border-b last:border-0 align-top">
                  <td className="px-3 py-2 font-semibold text-gray-700">{itemNumber}</td>
                  <td className="px-3 py-2 text-gray-900">{criterion.title}</td>
                  <td className="px-3 py-2 text-gray-600">{criterion.targetPrompt}</td>
                  <td className="px-3 py-2 text-gray-600">{criterion.meansOfVerification}</td>
                  <td className="px-3 py-2 text-center font-semibold">{criterion.weight}</td>
                  <td className="px-3 py-2">
                    {mode === 'self' ? (
                      <RatingSelect
                        label={`Self-rating for item ${itemNumber}`}
                        value={self}
                        includeNa={includeNa}
                        disabled={disabled}
                        onChange={(v) => onRate?.(criterion.id, 'selfRating', v)}
                      />
                    ) : (
                      <RatingBadge value={self} />
                    )}
                  </td>
                  {showSupervisor ? (
                    <td className="px-3 py-2">
                      {mode === 'supervisor' ? (
                        <RatingSelect
                          label={`Supervisor rating for item ${itemNumber}`}
                          value={sup}
                          includeNa={includeNa}
                          disabled={disabled}
                          onChange={(v) => onRate?.(criterion.id, 'supervisorRating', v)}
                        />
                      ) : (
                        <RatingBadge value={sup} />
                      )}
                    </td>
                  ) : null}
                  {mode === 'hr' ? (
                    <td className="px-3 py-2 text-center">
                      <button
                        type="button"
                        className="rounded p-1 text-blue-600 hover:bg-blue-50"
                        aria-label={`Edit ratings for item ${itemNumber}`}
                        onClick={() => onEdit?.(criterion.id, itemNumber)}
                      >
                        <Pencil className="h-4 w-4" />
                      </button>
                    </td>
                  ) : null}
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/** Renders every section with S/N numbering running across the form. */
export function AppraisalRatingSections(props: Omit<Props, 'section' | 'sectionNumber' | 'firstItemNumber'> & {
  sections: AppraisalFormSection[];
}) {
  const { sections, ...rest } = props;
  let next = 1;
  return (
    <div className="space-y-5">
      {sections.map((section, index) => {
        const first = next;
        next += section.criteria.length;
        return (
          <AppraisalRatingTable
            key={section.id}
            section={section}
            sectionNumber={index + 1}
            firstItemNumber={first}
            {...rest}
          />
        );
      })}
    </div>
  );
}
