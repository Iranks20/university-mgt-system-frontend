import type { HrAppraisalReview } from '@/features/hr/types';
import { AppraisalSectionForm } from '@/components/hr/AppraisalSectionForm';
import { emptyResponsesForSections } from '@/features/hr/appraisal-form-utils';

type AppraisalPrintViewProps = {
  review: HrAppraisalReview;
};

function formatScore(value?: number | null) {
  return value == null ? '—' : `${value}%`;
}

export function AppraisalPrintView({ review }: AppraisalPrintViewProps) {
  const sections = review.sections ?? [];
  const responses = review.responses ?? emptyResponsesForSections(sections);

  return (
    <div className="print-appraisal space-y-6 text-sm">
      <header className="border-b pb-4">
        <h1 className="text-xl font-bold">KING CEASOR UNIVERSITY</h1>
        <h2 className="text-lg font-semibold mt-2">{review.formTemplateName}</h2>
        <p className="text-gray-600 mt-2">Period: {review.cycleName}</p>
        <div className="grid grid-cols-2 gap-2 mt-4">
          <p>
            <strong>Appraisee:</strong> {review.employeeName}
          </p>
          <p>
            <strong>Job title:</strong> {review.jobTitle}
          </p>
          <p>
            <strong>Department:</strong> {review.department}
          </p>
          <p>
            <strong>Supervisor:</strong> {review.supervisorName}
          </p>
          <p>
            <strong>Status:</strong> {review.status}
          </p>
          <p>
            <strong>Completed:</strong>{' '}
            {review.completedAt ? review.completedAt.slice(0, 10) : '—'}
          </p>
        </div>
        {review.archivedDocumentTitle ? (
          <p className="mt-3 text-xs text-gray-500">Archive: {review.archivedDocumentTitle}</p>
        ) : null}
      </header>

      {sections.map((section) => (
        <section key={section.id} className="break-inside-avoid">
          <h3 className="font-semibold text-base mb-2">{section.title}</h3>
          <AppraisalSectionForm
            section={section}
            responses={responses}
            onChange={() => undefined}
            mode="readonly"
            ratingScaleMax={review.ratingScaleMax ?? 3}
            ratingIncludesNa={review.ratingIncludesNa ?? true}
          />
        </section>
      ))}

      <section className="break-inside-avoid">
        <h3 className="font-semibold text-base mb-2">Summary scores</h3>
        <p>Self: {formatScore(review.overallSelfScore)}</p>
        <p>Supervisor: {formatScore(review.overallSupervisorScore)}</p>
        <p>HR: {formatScore(review.overallHrScore)}</p>
      </section>

      {review.selfStrengths ? (
        <section>
          <h3 className="font-semibold">Strengths</h3>
          <p>{review.selfStrengths}</p>
        </section>
      ) : null}
      {review.selfImprovements ? (
        <section>
          <h3 className="font-semibold">Areas for improvement</h3>
          <p>{review.selfImprovements}</p>
        </section>
      ) : null}
      {review.selfDevelopmentPlan ? (
        <section>
          <h3 className="font-semibold">Development plan</h3>
          <p>{review.selfDevelopmentPlan}</p>
        </section>
      ) : null}
      {review.supervisorComments ? (
        <section>
          <h3 className="font-semibold">Supervisor comments</h3>
          <p>{review.supervisorComments}</p>
        </section>
      ) : null}
      {review.hrComments ? (
        <section>
          <h3 className="font-semibold">HR comments</h3>
          <p>{review.hrComments}</p>
        </section>
      ) : null}
    </div>
  );
}
