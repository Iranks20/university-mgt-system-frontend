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
import { AppraiseeDetails, OseiTable, ScoreComparison } from './AppraisalSummaryParts';
import { ReportBlock, SUPERVISOR_CERTIFICATION_TEXT } from './AppraisalReport';
import { SignatureCapture, type SignatureCaptureHandle } from './Signature';

function ratingsPayload(responses: AppraisalReviewResponses) {
  return responses.criteria.map((row) => ({ criterionId: row.criterionId, rating: row.supervisorRating }));
}

/** "Supervisor Rating" page: staff rating next to the supervisor's, narratives, certification and signature. */
export function SupervisorRatingForm({
  review,
  defaultSignerName,
  onSaved,
  onSubmitted,
}: {
  review: HrAppraisalReview;
  defaultSignerName: string;
  onSaved: (review: HrAppraisalReview) => void;
  onSubmitted: (review: HrAppraisalReview) => void;
}) {
  const [responses, setResponses] = useState(review.responses);
  const [improvements, setImprovements] = useState(review.supervisorImprovements);
  const [strengths, setStrengths] = useState(review.supervisorStrengths);
  const [recommendations, setRecommendations] = useState(review.supervisorRecommendations);
  const [signerName, setSignerName] = useState(defaultSignerName);
  const [signerPosition, setSignerPosition] = useState(review.agreement.supervisorRank);
  const [busy, setBusy] = useState(false);
  const signatureRef = useRef<SignatureCaptureHandle>(null);

  const overall = useMemo(
    () => overallPercent(review.sections, responses, 'supervisorRating'),
    [review.sections, responses]
  );
  const remaining = unratedCount(review.sections, responses, 'supervisorRating');
  const narrative = {
    supervisorImprovements: improvements,
    supervisorStrengths: strengths,
    supervisorRecommendations: recommendations,
  };

  const saveDraft = async () => {
    setBusy(true);
    try {
      const saved = await hrAppraisalService.saveDraft(review.id, { ratings: ratingsPayload(responses), ...narrative });
      toast.success('Draft saved');
      onSaved(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not save the rating'));
    } finally {
      setBusy(false);
    }
  };

  const submit = async () => {
    if (remaining > 0) {
      toast.error(`Please give a supervisor rating for every item (${remaining} left)`);
      return;
    }
    if (signerName.trim().length < 2 || signerPosition.trim().length < 2) {
      toast.error("Enter the supervisor's name and position");
      return;
    }
    const sig = signatureRef.current?.read();
    if (!sig || 'error' in sig) {
      toast.error(sig && 'error' in sig ? sig.error : 'Please sign');
      return;
    }
    setBusy(true);
    try {
      const saved = await hrAppraisalService.submitSupervisor(review.id, {
        ratings: ratingsPayload(responses),
        ...narrative,
        signerName: signerName.trim(),
        signerPosition: signerPosition.trim(),
        ...sig,
      });
      toast.success('Rating submitted to HR');
      onSubmitted(saved);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not submit the rating'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <ReportBlock title="Appraisee Details">
        <AppraiseeDetails review={review} />
      </ReportBlock>

      <AppraisalRatingSections
        sections={review.sections}
        responses={responses}
        mode="supervisor"
        includeNa={review.ratingIncludesNa}
        disabled={busy}
        onRate={(criterionId, field, value) => setResponses((prev) => setRating(prev, criterionId, field, value))}
      />

      <ScoreComparison selfScore={review.overallSelfScore} supervisorScore={overall} />

      <ReportBlock title="Supervisor's Comments">
        <div className="grid gap-4">
          <div>
            <Label htmlFor="sup-improvements">State the staff areas of improvements</Label>
            <Textarea id="sup-improvements" className="mt-1" rows={3} value={improvements} onChange={(e) => setImprovements(e.target.value)} disabled={busy} />
          </div>
          <div>
            <Label htmlFor="sup-strengths">State the staff areas of strengths</Label>
            <Textarea id="sup-strengths" className="mt-1" rows={3} value={strengths} onChange={(e) => setStrengths(e.target.value)} disabled={busy} />
          </div>
          <div>
            <Label htmlFor="sup-recommendations">Your overall impression and recommendations on the staff performance</Label>
            <Textarea id="sup-recommendations" className="mt-1" rows={3} value={recommendations} onChange={(e) => setRecommendations(e.target.value)} disabled={busy} />
          </div>
          {review.trainingNeeds ? (
            <div className="rounded-md bg-gray-50 p-3">
              <p className="text-xs uppercase tracking-wide text-gray-500">Training needs stated by the staff member</p>
              <p className="mt-1 whitespace-pre-line">{review.trainingNeeds}</p>
            </div>
          ) : null}
        </div>
      </ReportBlock>

      <ReportBlock title="Supervisor's Assessment">
        <p className="mb-4 text-gray-700">{SUPERVISOR_CERTIFICATION_TEXT(review.employeeName)}</p>
        <div className="grid gap-4 sm:grid-cols-2 mb-4">
          <div>
            <Label htmlFor="sup-name">Supervisor's Name</Label>
            <Input id="sup-name" className="mt-1" value={signerName} onChange={(e) => setSignerName(e.target.value)} disabled={busy} />
          </div>
          <div>
            <Label htmlFor="sup-position">Position of Supervisor</Label>
            <Input
              id="sup-position"
              className="mt-1"
              placeholder="e.g. Dean, HOD"
              value={signerPosition}
              onChange={(e) => setSignerPosition(e.target.value)}
              disabled={busy}
            />
          </div>
        </div>
        <SignatureCapture ref={signatureRef} disabled={busy} />
      </ReportBlock>

      <div className="rounded-lg border bg-blue-50 px-4 py-3 flex flex-wrap items-center justify-between gap-2">
        <p className="font-semibold text-blue-700">Overall Score: {formatPercent(overall)}</p>
        <p className="text-xs text-gray-600">{remaining > 0 ? `${remaining} item(s) still to rate` : 'All items rated'}</p>
      </div>

      <OseiTable score={oseiScoreForPercent(overall)} basis="Shown from your current supervisor rating." />

      <div className="flex flex-wrap justify-end gap-3">
        <Button variant="outline" onClick={saveDraft} disabled={busy}>
          <Save className="h-4 w-4 mr-2" /> Save draft
        </Button>
        <Button onClick={submit} disabled={busy}>
          <Send className="h-4 w-4 mr-2" /> Submit rating
        </Button>
      </div>
    </div>
  );
}
