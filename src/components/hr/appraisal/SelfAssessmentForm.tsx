import { useMemo, useRef, useState } from 'react';
import { Save, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { getApiErrorMessage } from '@/lib/api';
import type { AppraisalReviewResponses, HrAppraisalReview } from '@/features/hr/types';
import {
  formatPercent,
  oseiScoreForPercent,
  overallPercent,
  setRating,
  unratedCount,
} from '@/features/hr/appraisal-form-utils';
import { hrAppraisalService } from '@/services/hr-appraisal.service';
import { AppraisalRatingSections } from './AppraisalRatingTable';
import { OseiTable } from './AppraisalSummaryParts';
import { ReportBlock, SELF_ATTESTATION_TEXT } from './AppraisalReport';
import { SignatureCapture, type SignatureCaptureHandle } from './Signature';

function ratingsPayload(responses: AppraisalReviewResponses) {
  return responses.criteria.map((row) => ({ criterionId: row.criterionId, rating: row.selfRating }));
}

/** "Self Assessment Rating": ratings, training needs, OSEI band and the attestation. */
export function SelfAssessmentForm({
  review,
  onSaved,
  onSubmitted,
}: {
  review: HrAppraisalReview;
  onSaved: (review: HrAppraisalReview) => void;
  onSubmitted: (review: HrAppraisalReview) => void;
}) {
  const [responses, setResponses] = useState(review.responses);
  const [trainingNeeds, setTrainingNeeds] = useState(review.trainingNeeds);
  const [phone, setPhone] = useState(review.employeePhone ?? '');
  const [busy, setBusy] = useState(false);
  const signatureRef = useRef<SignatureCaptureHandle>(null);

  const overall = useMemo(() => overallPercent(review.sections, responses, 'selfRating'), [review.sections, responses]);
  const remaining = unratedCount(review.sections, responses, 'selfRating');

  const saveDraft = async () => {
    setBusy(true);
    try {
      const saved = await hrAppraisalService.saveDraft(review.id, { ratings: ratingsPayload(responses), trainingNeeds });
      toast.success('Draft saved');
      onSaved(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save your draft'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (remaining > 0) {
      toast.error(`Please rate all items before submitting (${remaining} left)`);
      return;
    }
    if (phone.trim().length < 7) {
      toast.error('Enter your phone number in the attestation');
      return;
    }
    const sig = signatureRef.current?.read();
    if (!sig || 'error' in sig) {
      toast.error(sig && 'error' in sig ? sig.error : 'Please sign the attestation');
      return;
    }
    setBusy(true);
    try {
      const saved = await hrAppraisalService.submitSelf(review.id, {
        ratings: ratingsPayload(responses),
        trainingNeeds,
        phone: phone.trim(),
        ...sig,
      });
      toast.success('Self-assessment submitted to your supervisor');
      onSubmitted(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not submit your self-assessment'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <AppraisalRatingSections
        sections={review.sections}
        responses={responses}
        mode="self"
        includeNa={review.ratingIncludesNa}
        disabled={busy}
        onRate={(criterionId, field, value) => setResponses((prev) => setRating(prev, criterionId, field, value))}
      />

      <ReportBlock title="Training Needs">
        <Label htmlFor="training-needs">State the areas you need to be trained on</Label>
        <Textarea
          id="training-needs"
          className="mt-1"
          rows={4}
          value={trainingNeeds}
          onChange={(e) => setTrainingNeeds(e.target.value)}
          disabled={busy}
        />
      </ReportBlock>

      <div className="rounded-lg border bg-green-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-[#015F2B]">Overall Score: {formatPercent(overall)}</p>
        <p className="text-xs text-gray-600">
          {remaining > 0 ? `${remaining} item(s) still to rate` : 'All items rated'} · N/A items are not counted
        </p>
      </div>

      <OseiTable score={oseiScoreForPercent(overall)} basis="Shown from your current self-rating." />

      <ReportBlock title="Attestation of Self-Appraisal">
        <p className="mb-4 text-gray-700">{SELF_ATTESTATION_TEXT(review.employeeName)}</p>
        <div className="space-y-4">
          <SignatureCapture ref={signatureRef} disabled={busy} />
          <div className="sm:max-w-xs">
            <Label htmlFor="attest-phone">Phone</Label>
            <Input
              id="attest-phone"
              type="tel"
              className="mt-1"
              placeholder="e.g. +256 7XX XXX XXX"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
      </ReportBlock>

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={saveDraft} disabled={busy}>
          <Save className="h-4 w-4 mr-2" /> Save draft
        </Button>
        <Button onClick={submit} disabled={busy}>
          <Send className="h-4 w-4 mr-2" /> Submit to supervisor
        </Button>
      </div>
    </div>
  );
}
