import { useCallback, useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, ClipboardCheck, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useAuth } from '@/contexts/AuthContext';
import { hrAppraisalService } from '@/services/hr-appraisal.service';
import type { HrAppraisalReview } from '@/features/hr/types';
import { appraisalStatusBadge } from '@/components/hr/HrBadges';
import { AgreementForm } from '@/components/hr/appraisal/AgreementForm';
import { SelfAssessmentForm } from '@/components/hr/appraisal/SelfAssessmentForm';
import { AppraisalReport } from '@/components/hr/appraisal/AppraisalReport';
import { AppraisalProgressTracker } from '@/components/hr/appraisal/AppraisalSummaryParts';
import { AppraiseesRegistry } from '@/components/hr/appraisal/AppraiseesRegistry';
import { SupervisorRatingForm } from '@/components/hr/appraisal/SupervisorRatingForm';
import { PrintAppraisalButton } from '@/components/hr/AppraisalPrintView';

type TabKey = 'info' | 'self' | 'results' | 'appraisees';

const SELF_STAGES = ['NotStarted', 'SelfPending', 'Overdue'];

function defaultTab(review: HrAppraisalReview | null, hasTeam: boolean): TabKey {
  if (!review) return hasTeam ? 'appraisees' : 'info';
  if (SELF_STAGES.includes(review.statusCode)) return review.agreement.savedAt ? 'self' : 'info';
  return 'results';
}

export default function StaffAppraisalPage() {
  const { user } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const [review, setReview] = useState<HrAppraisalReview | null>(null);
  const [team, setTeam] = useState<HrAppraisalReview[]>([]);
  const [rating, setRating] = useState<HrAppraisalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const reportRef = useRef<HTMLDivElement>(null);
  const ratingReportRef = useRef<HTMLDivElement>(null);

  const load = useCallback(async () => {
    const [mine, mineTeam] = await Promise.all([
      hrAppraisalService.getMyReview().catch(() => null),
      hrAppraisalService.getTeamReviews().catch(() => [] as HrAppraisalReview[]),
    ]);
    setReview(mine);
    setTeam(mineTeam);
    return { mine, mineTeam };
  }, []);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    load()
      .then(({ mine, mineTeam }) => {
        if (cancelled) return;
        const requested = searchParams.get('tab') as TabKey | null;
        if (!requested) {
          setSearchParams({ tab: defaultTab(mine, mineTeam.length > 0) }, { replace: true });
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
    // Load once per user; tab changes are handled through the URL.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, load]);

  const tab = (searchParams.get('tab') as TabKey | null) ?? defaultTab(review, team.length > 0);
  const goTo = (next: TabKey) => setSearchParams({ tab: next });

  const replaceTeamRow = (updated: HrAppraisalReview) =>
    setTeam((rows) => rows.map((row) => (row.id === updated.id ? updated : row)));

  if (loading) {
    return (
      <div className="p-6 flex items-center justify-center min-h-[40vh] text-gray-500">
        <Loader2 className="h-6 w-6 animate-spin mr-2" />
        Loading your appraisal…
      </div>
    );
  }

  if (!review && team.length === 0) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No appraisal is open for you at the moment, and you have no appraisees waiting. HR will notify you when
            the next appraisal period begins.
          </CardContent>
        </Card>
      </div>
    );
  }

  // Supervisor working on one appraisee: full page, as in the previous system.
  if (tab === 'appraisees' && rating) {
    const canRate = rating.statusCode === 'SupervisorReview';
    return (
      <div className="p-6 space-y-5 max-w-6xl mx-auto">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Button variant="ghost" size="sm" onClick={() => setRating(null)}>
              <ArrowLeft className="h-4 w-4 mr-1" /> Appraisees Registry
            </Button>
            <h1 className="mt-2 text-2xl font-bold text-gray-900">
              {canRate ? 'Supervisor Rating' : 'Rating Results'} — {rating.employeeName}
            </h1>
            <p className="text-gray-500">
              {rating.appraisalTypeLabel}: {rating.agreement.periodFrom} — {rating.agreement.periodTo} ·{' '}
              {rating.formTemplateName}
            </p>
          </div>
          <div className="flex items-center gap-2">
            {appraisalStatusBadge(rating.status)}
            {!canRate ? <PrintAppraisalButton targetRef={ratingReportRef} review={rating} /> : null}
          </div>
        </div>
        {canRate ? (
          <SupervisorRatingForm
            key={rating.id}
            review={rating}
            defaultSignerName={user?.name ?? ''}
            onSaved={(saved) => {
              setRating(saved);
              replaceTeamRow(saved);
            }}
            onSubmitted={(saved) => {
              setRating(saved);
              replaceTeamRow(saved);
            }}
          />
        ) : (
          <div ref={ratingReportRef}>
            <AppraisalReport review={rating} showHeader />
          </div>
        )}
      </div>
    );
  }

  const inSelfStage = !!review && SELF_STAGES.includes(review.statusCode);
  const pendingTeam = team.filter((r) => r.statusCode === 'SupervisorReview').length;

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
            <ClipboardCheck className="h-7 w-7 text-[#015F2B]" />
            {review ? review.formTemplateName : 'Performance Appraisal'}
          </h1>
          {review ? (
            <p className="text-gray-500 mt-1">
              {review.appraisalTypeLabel}
              {review.cycleName !== review.appraisalTypeLabel ? ` · ${review.cycleName}` : ''} · Due {review.dueDate}
              {review.isOverdue ? <span className="ml-2 font-semibold text-red-600">Overdue</span> : null}
            </p>
          ) : null}
        </div>
        {review ? appraisalStatusBadge(review.status) : null}
      </div>

      <Tabs value={tab} onValueChange={(v) => goTo(v as TabKey)}>
        <TabsList className="flex-wrap h-auto">
          {review ? (
            <>
              <TabsTrigger value="info">Appraisal Information</TabsTrigger>
              <TabsTrigger value="self">Self Assessment</TabsTrigger>
              <TabsTrigger value="results">Results</TabsTrigger>
            </>
          ) : null}
          {team.length ? (
            <TabsTrigger value="appraisees">Appraisees{pendingTeam ? ` (${pendingTeam})` : ''}</TabsTrigger>
          ) : null}
        </TabsList>

        {review ? (
          <>
            <TabsContent value="info" className="mt-4">
              <Card>
                <CardHeader>
                  <CardTitle>Fill this form to begin your appraisal</CardTitle>
                  <CardDescription>
                    Performance Agreement. Most details come from your HR record; correct anything that is out of date.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <AgreementForm
                    key={`${review.id}-${review.agreement.savedAt ?? 'new'}`}
                    review={review}
                    editable={inSelfStage}
                    onSaved={(saved) => {
                      const first = !review.agreement.savedAt;
                      setReview(saved);
                      if (first) goTo('self');
                    }}
                  />
                </CardContent>
              </Card>
            </TabsContent>

            <TabsContent value="self" className="mt-4 space-y-4">
              {!inSelfStage ? (
                <Card className="bg-green-50 border-green-200">
                  <CardContent className="py-6 text-center space-y-3">
                    <p className="font-semibold text-green-900">Self Assessment Already Done</p>
                    <p className="text-sm text-green-900/80">
                      Your self-assessment has been submitted. You will be notified as it moves through your supervisor,
                      HR and the Vice Chancellor.
                    </p>
                    <Button onClick={() => goTo('results')}>View results</Button>
                  </CardContent>
                </Card>
              ) : !review.agreement.savedAt ? (
                <Card>
                  <CardContent className="py-8 text-center space-y-3">
                    <p className="text-gray-700">
                      Please complete the Appraisal Information form first before starting your self-assessment.
                    </p>
                    <Button onClick={() => goTo('info')}>Go to Appraisal Information</Button>
                  </CardContent>
                </Card>
              ) : (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle>Self Assessment Rating</CardTitle>
                      <CardDescription>
                        {review.appraisalTypeLabel}: {review.agreement.periodFrom} — {review.agreement.periodTo} ·
                        Supervisor: {review.supervisorName ?? 'not assigned yet (HR will assign one)'}
                      </CardDescription>
                    </CardHeader>
                  </Card>
                  <SelfAssessmentForm
                    key={review.id}
                    review={review}
                    onSaved={setReview}
                    onSubmitted={(saved) => {
                      setReview(saved);
                      goTo('results');
                    }}
                  />
                </>
              )}
            </TabsContent>

            <TabsContent value="results" className="mt-4 space-y-5">
              {inSelfStage ? (
                <Card>
                  <CardContent className="py-8 text-center text-gray-600">
                    Your results will appear here once you submit your self-assessment.
                  </CardContent>
                </Card>
              ) : (
                <>
                  <div className="flex justify-end">
                    <PrintAppraisalButton targetRef={reportRef} review={review} />
                  </div>
                  <AppraisalProgressTracker progress={review.progress} />
                  <div ref={reportRef}>
                    <AppraisalReport review={review} showHeader />
                  </div>
                </>
              )}
            </TabsContent>
          </>
        ) : null}

        {team.length ? (
          <TabsContent value="appraisees" className="mt-4 space-y-3">
            <div>
              <h2 className="text-lg font-semibold">Appraisees Registry</h2>
              <p className="text-sm text-gray-500">
                Staff you supervise. Start rating once they have submitted their self-assessment.
              </p>
            </div>
            <AppraiseesRegistry reviews={team} onOpen={setRating} />
          </TabsContent>
        ) : null}
      </Tabs>
    </div>
  );
}
