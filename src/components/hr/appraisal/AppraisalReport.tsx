import type { ReactNode } from 'react';
import type { AppraisalSignoff, AppraisalSignoffStage, HrAppraisalReview } from '@/features/hr/types';
import { AppraisalRatingSections } from './AppraisalRatingTable';
import { AppraiseeDetails, OseiTable, ScoreComparison } from './AppraisalSummaryParts';
import { SignatureImage } from './Signature';

export const SELF_ATTESTATION_TEXT = (name: string) =>
  `I ${name} hereby declare that the self-rating given above is true and correct to the best of my ability and knowledge, and reflects my accurate performance for the period under review.`;

export const SUPERVISOR_CERTIFICATION_TEXT = (name: string) =>
  `This is to certify that Mr/Ms ${name} has been under my supervision and the performance rating given above reflects the accurate competence and outputs of the staff during the period under review.`;

export function ReportBlock({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="rounded-lg border break-inside-avoid">
      <h3 className="border-b bg-gray-50 px-4 py-3 font-semibold text-gray-900">{title}</h3>
      <div className="p-4 text-sm">{children}</div>
    </section>
  );
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
      <dd className="mt-0.5 whitespace-pre-line text-gray-900">{children || '—'}</dd>
    </div>
  );
}

function SignoffFields({ reviewId, signoff }: { reviewId: string; signoff: AppraisalSignoff }) {
  return (
    <>
      <Field label="Name">{signoff.signerName}</Field>
      {signoff.signerPosition ? <Field label="Position">{signoff.signerPosition}</Field> : null}
      {signoff.signerPhone ? <Field label="Phone">{signoff.signerPhone}</Field> : null}
      <Field label="Date">{signoff.signedOn}</Field>
      <Field label="Signature">
        <SignatureImage reviewId={reviewId} stage={signoff.stage} />
      </Field>
    </>
  );
}

export function findSignoff(review: HrAppraisalReview, stage: AppraisalSignoffStage) {
  return review.signoffs.find((s) => s.stage === stage);
}

type Props = {
  review: HrAppraisalReview;
  /** HR may change item ratings while the appraisal is with HR. */
  onEditRating?: (criterionId: string, itemNumber: number) => void;
  showHeader?: boolean;
};

/** Complete appraisal, read-only, in the order of the previous system's report and PDF. */
export function AppraisalReport({ review, onEditRating, showHeader = false }: Props) {
  const supervisorRated = review.progress.supervisorRating;
  const supervisor = findSignoff(review, 'Supervisor');
  const attestation = findSignoff(review, 'SelfAttestation');
  const hr = findSignoff(review, 'Hr');
  const vc = findSignoff(review, 'Vc');

  return (
    <div className="space-y-5 print:space-y-3">
      {showHeader ? (
        <header className="text-center border-b pb-3">
          <h1 className="text-xl font-bold tracking-wide">KING CEASOR UNIVERSITY</h1>
          <h2 className="text-lg font-semibold uppercase mt-1">{review.formTemplateName}</h2>
          <p className="text-sm text-gray-600">
            {review.appraisalTypeLabel}: {review.agreement.periodFrom ?? '—'} — {review.agreement.periodTo ?? '—'}
          </p>
        </header>
      ) : null}

      <ReportBlock title="Appraisee Details">
        <AppraiseeDetails review={review} />
      </ReportBlock>

      <AppraisalRatingSections
        sections={review.sections}
        responses={review.responses}
        mode={onEditRating ? 'hr' : 'review'}
        onEdit={onEditRating}
      />

      <ScoreComparison
        selfScore={review.overallSelfScore}
        supervisorScore={review.overallSupervisorScore}
        showSupervisor={supervisorRated}
      />

      {supervisorRated ? (
        <OseiTable score={review.oseiScore} basis="Ticked automatically from the supervisor's overall score." />
      ) : null}

      {supervisor ? (
        <ReportBlock title="Supervisor Signing Details">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Areas of Improvement">{review.supervisorImprovements}</Field>
            <Field label="Areas of Strengths">{review.supervisorStrengths}</Field>
            <Field label="Overall Impression & Recommendations">{review.supervisorRecommendations}</Field>
            <Field label="Areas the appraisee needs to be trained on">{review.trainingNeeds}</Field>
            <SignoffFields reviewId={review.id} signoff={supervisor} />
          </dl>
        </ReportBlock>
      ) : null}

      {attestation ? (
        <ReportBlock title="Attestation of Self-Appraisal">
          <p className="mb-3 text-gray-700">{SELF_ATTESTATION_TEXT(review.employeeName)}</p>
          <dl className="grid gap-4 sm:grid-cols-2">
            <SignoffFields reviewId={review.id} signoff={attestation} />
          </dl>
        </ReportBlock>
      ) : null}

      {hr ? (
        <ReportBlock title="HR Comments">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Comment">{review.hrComments}</Field>
            <SignoffFields reviewId={review.id} signoff={hr} />
          </dl>
        </ReportBlock>
      ) : null}

      {vc ? (
        <ReportBlock title="VC Comments">
          <dl className="grid gap-4 sm:grid-cols-2">
            <Field label="Comment">{review.vcComments}</Field>
            <SignoffFields reviewId={review.id} signoff={vc} />
          </dl>
        </ReportBlock>
      ) : null}

      {showHeader ? (
        <p className="hidden print:block pt-4 text-center text-xs text-gray-400 border-t">
          This is a computer-generated document. Generated on {new Date().toLocaleString()}.
        </p>
      ) : null}
    </div>
  );
}
