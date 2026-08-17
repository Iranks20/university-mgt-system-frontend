import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardCheck, Send, Save, Loader2, Users } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/contexts/AuthContext';
import {
  getTeamAppraisalReviews,
  resolveAppraisalReviewForAccount,
  saveAppraisalReview,
} from '@/features/hr/hr-appraisal-store';
import type { AppraisalReviewResponses, HrAppraisalReview } from '@/features/hr/types';
import { appraisalStatusBadge } from '@/components/hr/HrBadges';
import { AppraisalSectionForm } from '@/components/hr/AppraisalSectionForm';
import { emptyResponsesForSections } from '@/features/hr/appraisal-form-utils';

function formatScore(value?: number | null) {
  return value == null ? '—' : `${value}%`;
}

export default function StaffAppraisalPage() {
  const { user } = useAuth();
  const [review, setReview] = useState<HrAppraisalReview | null>(null);
  const [draft, setDraft] = useState<HrAppraisalReview | null>(null);
  const [teamReviews, setTeamReviews] = useState<HrAppraisalReview[]>([]);
  const [teamDraft, setTeamDraft] = useState<HrAppraisalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const reload = async () => {
    const [resolved, team] = await Promise.all([
      resolveAppraisalReviewForAccount(),
      getTeamAppraisalReviews().catch(() => [] as HrAppraisalReview[]),
    ]);
    if (resolved) {
      setReview(resolved);
      setDraft(JSON.parse(JSON.stringify(resolved)) as HrAppraisalReview);
    } else {
      setReview(null);
      setDraft(null);
    }
    setTeamReviews(team);
  };

  useEffect(() => {
    let cancelled = false;

    async function load() {
      if (!user?.email) {
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        await reload();
      } catch {
        if (!cancelled) {
          setReview(null);
          setDraft(null);
          setTeamReviews([]);
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

  const pendingTeam = teamReviews.filter((r) => r.status === 'Supervisor Review');
  const hasSelf = !!review && !!draft;
  const hasTeam = teamReviews.length > 0;

  if (!hasSelf && !hasTeam) {
    return (
      <div className="p-6">
        <Card>
          <CardContent className="py-12 text-center text-gray-500">
            No active appraisal cycle is open for your profile, and you have no team reviews waiting.
            Contact HR when the next review period begins.
          </CardContent>
        </Card>
      </div>
    );
  }

  const sections = draft?.sections ?? [];
  const responses: AppraisalReviewResponses =
    draft?.responses ?? emptyResponsesForSections(sections);
  const canEdit =
    !!draft &&
    (draft.status === 'Self Assessment Pending' || draft.status === 'Not Started');
  const submitted = !!draft && !canEdit;

  const updateResponses = (next: AppraisalReviewResponses) => {
    if (!draft) return;
    setDraft({ ...draft, responses: next });
  };

  const handleSaveDraft = async () => {
    if (!draft) return;
    setSaving(true);
    try {
      const saved = await saveAppraisalReview({ ...draft, responses }, 'save');
      setReview(saved);
      setDraft(saved);
      toast.success('Draft saved');
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save draft');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmit = async () => {
    if (!draft) return;
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
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit appraisal');
    } finally {
      setSaving(false);
    }
  };

  const openTeamReview = (row: HrAppraisalReview) => {
    setTeamDraft(JSON.parse(JSON.stringify(row)) as HrAppraisalReview);
  };

  const handleSaveSupervisor = async () => {
    if (!teamDraft) return;
    setSaving(true);
    try {
      const saved = await saveAppraisalReview(teamDraft, 'save');
      setTeamDraft(saved);
      toast.success('Supervisor review draft saved');
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to save supervisor review');
    } finally {
      setSaving(false);
    }
  };

  const handleSubmitSupervisor = async () => {
    if (!teamDraft) return;
    const teamSections = teamDraft.sections ?? [];
    const teamResponses = teamDraft.responses ?? emptyResponsesForSections(teamSections);
    const kpiCriteria = teamSections
      .filter((section) => section.kind === 'kpi')
      .flatMap((section) => section.criteria);
    const incomplete = kpiCriteria.some((criterion) => {
      const row = teamResponses.criteria.find((item) => item.criterionId === criterion.id);
      return row?.supervisorRating === null || row?.supervisorRating === undefined;
    });
    if (incomplete) {
      toast.error('Please provide supervisor ratings for all KPI rows before submitting');
      return;
    }
    if (!teamDraft.supervisorComments.trim()) {
      toast.error('Add supervisor comments before submitting to HR');
      return;
    }

    setSaving(true);
    try {
      await saveAppraisalReview(teamDraft, 'submit_supervisor');
      setTeamDraft(null);
      toast.success('Supervisor review submitted to HR');
      await reload();
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to submit supervisor review');
    } finally {
      setSaving(false);
    }
  };

  const defaultTab = hasSelf ? 'mine' : 'team';

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-[#015F2B]" />
          Performance Appraisal
        </h1>
        <p className="text-gray-500 mt-1">Self-assessment and team reviews</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {hasSelf ? <TabsTrigger value="mine">My appraisal</TabsTrigger> : null}
          <TabsTrigger value="team">
            Team reviews{pendingTeam.length ? ` (${pendingTeam.length})` : ''}
          </TabsTrigger>
        </TabsList>

        {hasSelf && draft ? (
          <TabsContent value="mine" className="mt-4 space-y-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>{draft.formTemplateName}</CardTitle>
                  <CardDescription>
                    {draft.cycleName} · {draft.formTemplateCode} · Due {draft.dueDate} · Supervisor:{' '}
                    {draft.supervisorName}
                  </CardDescription>
                </div>
                {appraisalStatusBadge(draft.status)}
              </CardHeader>
              <CardContent className="text-sm text-gray-600">
                <p>
                  <strong>Workflow:</strong> You complete this form → Supervisor reviews → HR
                  finalizes.
                  {submitted
                    ? ' Your submission is with your supervisor.'
                    : ' Save a draft anytime before submitting.'}
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
                  Self-assessment submitted. You will be notified when your supervisor completes their
                  review.
                  {draft.supervisorComments ? (
                    <p className="mt-2">
                      <strong>Supervisor feedback:</strong> {draft.supervisorComments}
                    </p>
                  ) : null}
                </CardContent>
              </Card>
            )}
          </TabsContent>
        ) : null}

        <TabsContent value="team" className="mt-4 space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-lg">
                <Users className="h-5 w-5" />
                Direct reports
              </CardTitle>
              <CardDescription>
                Reviews where you are the assigned supervisor. Complete ratings, then submit to HR.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Self / Sup</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamReviews.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        No team appraisals assigned to you in an open cycle.
                      </TableCell>
                    </TableRow>
                  ) : (
                    teamReviews.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell>
                          <div className="font-medium">{row.employeeName}</div>
                          <div className="text-xs text-gray-500">{row.department}</div>
                        </TableCell>
                        <TableCell className="text-sm">{row.formTemplateName}</TableCell>
                        <TableCell>{appraisalStatusBadge(row.status)}</TableCell>
                        <TableCell className="text-sm">
                          {formatScore(row.overallSelfScore)} / {formatScore(row.overallSupervisorScore)}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button
                            size="sm"
                            variant={row.status === 'Supervisor Review' ? 'default' : 'outline'}
                            onClick={() => openTeamReview(row)}
                          >
                            {row.status === 'Supervisor Review' ? 'Review' : 'View'}
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!teamDraft} onOpenChange={(open) => !open && setTeamDraft(null)}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {teamDraft ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {teamDraft.employeeName} — Supervisor review
                </DialogTitle>
                <DialogDescription>
                  {teamDraft.cycleName} · {teamDraft.formTemplateName} · Due {teamDraft.dueDate}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4">
                {(teamDraft.sections ?? []).map((section) => (
                  <section key={section.id}>
                    <h4 className="font-semibold mb-2">{section.title}</h4>
                    <AppraisalSectionForm
                      section={section}
                      responses={
                        teamDraft.responses ?? emptyResponsesForSections(teamDraft.sections ?? [])
                      }
                      onChange={(next) => setTeamDraft({ ...teamDraft, responses: next })}
                      mode={teamDraft.status === 'Supervisor Review' ? 'supervisor' : 'readonly'}
                      ratingScaleMax={teamDraft.ratingScaleMax ?? 3}
                      ratingIncludesNa={teamDraft.ratingIncludesNa ?? true}
                    />
                  </section>
                ))}

                <section className="grid gap-3 sm:grid-cols-2 text-sm">
                  <div>
                    <Label>Employee strengths</Label>
                    <p className="mt-1 text-gray-600">{teamDraft.selfStrengths || '—'}</p>
                  </div>
                  <div>
                    <Label>Employee improvements</Label>
                    <p className="mt-1 text-gray-600">{teamDraft.selfImprovements || '—'}</p>
                  </div>
                </section>

                <section>
                  <Label>Supervisor comments</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    disabled={teamDraft.status !== 'Supervisor Review'}
                    value={teamDraft.supervisorComments}
                    onChange={(e) =>
                      setTeamDraft({ ...teamDraft, supervisorComments: e.target.value })
                    }
                  />
                </section>
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setTeamDraft(null)}>
                  Close
                </Button>
                {teamDraft.status === 'Supervisor Review' ? (
                  <>
                    <Button variant="outline" onClick={handleSaveSupervisor} disabled={saving}>
                      <Save className="h-4 w-4 mr-2" /> Save draft
                    </Button>
                    <Button onClick={handleSubmitSupervisor} disabled={saving}>
                      <Send className="h-4 w-4 mr-2" /> Submit to HR
                    </Button>
                  </>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
