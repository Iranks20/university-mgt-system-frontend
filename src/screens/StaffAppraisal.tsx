import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { ClipboardCheck, Send, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import { resolveAppraisalReviewForAccount, saveAppraisalReview } from '@/features/hr/hr-appraisal-store';
import type { AppraisalReviewResponses, HrAppraisalReview } from '@/features/hr/types';
import { appraisalStatusBadge } from '@/components/hr/HrBadges';
import { AppraisalSectionForm } from '@/components/hr/AppraisalSectionForm';
import { emptyResponsesForSections } from '@/features/hr/appraisal-form-utils';

export default function StaffAppraisalPage() {
  const { user } = useAuth();
  const [review, setReview] = useState<HrAppraisalReview | null>(null);
  const [draft, setDraft] = useState<HrAppraisalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const resolved = await resolveAppraisalReviewForAccount();
        if (!cancelled) {
          if (resolved) {
            setReview(resolved);
            setDraft(JSON.parse(JSON.stringify(resolved)) as HrAppraisalReview);
          } else {
            setReview(null);
            setDraft(null);
          }
        }
      } catch {
        if (!cancelled) {
          setReview(null);
          setDraft(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, [user?.email]);

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh] text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading your appraisal...
      </div>
    );
  }

  if (!review || !draft) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No active appraisal cycle is open for your profile. Contact HR when the next review period begins.
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = draft.sections ?? [];
  const responses: AppraisalReviewResponses =
    draft.responses ?? emptyResponsesForSections(sections);
  const canEdit =
    draft.status === 'Self Assessment Pending' || draft.status === 'Not Started';
  const submitted = !canEdit;

  const updateResponses = (next: AppraisalReviewResponses) => {
    setDraft({ ...draft, responses: next });
  };

  const handleSaveDraft = async () => {
    setSaving(true);
    try {
      const saved = await saveAppraisalReview({ ...draft, responses }, 'save');
      setReview(saved);
      setDraft(saved);
      toast.success('Draft saved');
    } catch {
      toast.error('Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    const kpiCriteria = sections
      .filter((section) => section.kind === 'kpi')
      .flatMap((section) => section.criteria);
    const incomplete = kpiCriteria.some((criterion) => {
      const row = responses.criteria.find((item) => item.criterionId === criterion.id);
      return row?.selfRating === null || row?.selfRating === undefined;
    });
    if (incomplete) {
      toast.error('Please rate all KPI rows before submitting');
      return;
    }

    setSaving(true);
    try {
      const saved = await saveAppraisalReview({ ...draft, responses }, 'submit_self');
      setReview(saved);
      setDraft(saved);
      toast.success('Self-assessment submitted to your supervisor');
    } catch {
      toast.error('Failed to submit appraisal');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-[#015F2B]" />
          My Performance Appraisal
        </h1>
        <p className="text-gray-500 mt-1">
          {draft.cycleName} — complete your self-assessment for supervisor review
        </p>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>{draft.formTemplateName}</CardTitle>
            <CardDescription>
              {draft.formTemplateCode} · Due {draft.dueDate} · Supervisor: {draft.supervisorName}
            </CardDescription>
          </div>
          {appraisalStatusBadge(draft.status)}
        </CardHeader>
        <CardContent className="text-sm text-gray-600">
          <p>
            <strong>Workflow:</strong> You complete this form → Supervisor reviews → HR finalizes.
            {submitted ? ' Your submission is with your supervisor.' : ' Save a draft anytime before submitting.'}
          </p>
          {draft.overallSelfScore != null ? (
            <p className="mt-2">Current self score: {draft.overallSelfScore}%</p>
          ) : null}
        </CardContent>
      </Card>

      {sections.map((section) => (
        <Card key={section.id}>
          <CardHeader>
            <CardTitle className="text-lg">{section.title}</CardTitle>
            <CardDescription>
              {section.kind === 'scorecard'
                ? 'Summary domain scores (0–3 scale)'
                : 'Complete achievement evidence and self-ratings for each KPI'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <AppraisalSectionForm
              section={section}
              responses={responses}
              onChange={updateResponses}
              mode={canEdit ? 'self' : 'readonly'}
              ratingScaleMax={draft.ratingScaleMax ?? 3}
              ratingIncludesNa={draft.ratingIncludesNa ?? true}
            />
          </CardContent>
        </Card>
      ))}

      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Reflection & development</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Key strengths this period</Label>
            <Textarea
              className="mt-1"
              rows={3}
              disabled={!canEdit}
              value={draft.selfStrengths}
              onChange={(e) => setDraft({ ...draft, selfStrengths: e.target.value })}
            />
          </div>
          <div>
            <Label>Areas for improvement</Label>
            <Textarea
              className="mt-1"
              rows={3}
              disabled={!canEdit}
              value={draft.selfImprovements}
              onChange={(e) => setDraft({ ...draft, selfImprovements: e.target.value })}
            />
          </div>
          <div>
            <Label>Professional development plan</Label>
            <Textarea
              className="mt-1"
              rows={3}
              disabled={!canEdit}
              value={draft.selfDevelopmentPlan}
              onChange={(e) => setDraft({ ...draft, selfDevelopmentPlan: e.target.value })}
            />
          </div>
        </CardContent>
      </Card>

      {canEdit ? (
        <div className="flex flex-wrap gap-3 justify-end">
          <Button variant="outline" onClick={handleSaveDraft} disabled={saving}>
            <Save className="h-4 w-4 mr-2" /> Save draft
          </Button>
          <Button onClick={handleSubmit} disabled={saving}>
            <Send className="h-4 w-4 mr-2" /> Submit to supervisor
          </Button>
        </div>
      ) : (
        <Card className="bg-green-50 border-green-200">
          <CardContent className="py-4 text-sm text-green-900">
            Self-assessment submitted. You will be notified when your supervisor completes their review.
            {draft.supervisorComments ? (
              <p className="mt-2"><strong>Supervisor feedback:</strong> {draft.supervisorComments}</p>
            ) : null}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
