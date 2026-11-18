import { useCallback, useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router';
import { BarChart3, Eye, Pencil, Plus, Search, Signature } from 'lucide-react';
import { toast } from 'sonner';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { HrNewAppraisalCycleDialog } from '@/components/hr/HrNewAppraisalCycleDialog';
import { appraisalStatusBadge, cycleStatusBadge } from '@/components/hr/HrBadges';
import { HrAppraisalFormPreview } from '@/components/hr/HrAppraisalFormPreview';
import { HrTemplateEditorDialog } from '@/components/hr/HrTemplateEditorDialog';
import { HrReviewDetail } from '@/components/hr/appraisal/HrReviewDetail';
import { DoneBadge } from '@/components/hr/appraisal/AppraiseesRegistry';
import {
  getAppraisalFormTemplates,
  getCalibrationForCycle,
  getHrAppraisalCycles,
  updateAppraisalCycleStatus,
} from '@/features/hr/hr-appraisal-store';
import { EMPLOYEE_CATEGORY_LABELS, formatPercent } from '@/features/hr/appraisal-form-utils';
import type { AppraisalFormTemplate, HrAppraisalCycle, HrAppraisalReview } from '@/features/hr/types';
import { hrAppraisalService, type CalibrationRow } from '@/services/hr-appraisal.service';
import { TablePagination } from '@/components/ui/table-pagination';
import { emptyPage, type Paged } from '@/lib/pagination';
import { usePaging } from '@/hooks/usePaging';
import { getApiErrorMessage } from '@/lib/api';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

type TabKey = 'received' | 'progress' | 'cycles' | 'forms' | 'calibration';

function hrStatusLabel(review: HrAppraisalReview) {
  return review.progress.hrSigned ? (
    <span className="inline-flex rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-semibold text-green-800">
      Signed &amp; Verified by HR
    </span>
  ) : (
    <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-semibold text-amber-800">
      Awaiting HR Review
    </span>
  );
}

function SearchBox({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <div className="relative w-full sm:w-72">
      <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
      <Input className="pl-9" placeholder="Search staff" value={value} onChange={(e) => onChange(e.target.value)} />
    </div>
  );
}

function useDebounced(value: string, delay = 300) {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(t);
  }, [value, delay]);
  return debounced;
}

export default function HrAppraisalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const tab = (searchParams.get('tab') as TabKey | null) ?? 'received';
  const openReviewId = searchParams.get('review');

  const [cycles, setCycles] = useState<HrAppraisalCycle[]>([]);
  const [templates, setTemplates] = useState<AppraisalFormTemplate[]>([]);
  const [calibration, setCalibration] = useState<CalibrationRow[]>([]);
  const [received, setReceived] = useState<Paged<HrAppraisalReview>>(() => emptyPage());
  const [progress, setProgress] = useState<Paged<HrAppraisalReview>>(() => emptyPage());
  const [progressCycleId, setProgressCycleId] = useState<string>('');
  const [receivedSearch, setReceivedSearch] = useState('');
  const [progressSearch, setProgressSearch] = useState('');
  const debouncedReceived = useDebounced(receivedSearch);
  const debouncedProgress = useDebounced(progressSearch);
  const [version, setVersion] = useState(0);
  const receivedPaging = usePaging('received');
  const progressPaging = usePaging('progress');
  const [loading, setLoading] = useState(true);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [templateEditId, setTemplateEditId] = useState<string | null>(null);
  const [newTemplateDraft, setNewTemplateDraft] = useState<AppraisalFormTemplate | null>(null);

  const setParam = (changes: Record<string, string | null>) => {
    const next = new URLSearchParams(searchParams);
    for (const [k, v] of Object.entries(changes)) {
      if (v === null) next.delete(k);
      else next.set(k, v);
    }
    setSearchParams(next);
  };

  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);
  const activeCycle = cycles.find((c) => c.status === 'Open' && !c.isIndividual);

  const refreshMeta = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCycles, nextTemplates] = await Promise.all([getHrAppraisalCycles(), getAppraisalFormTemplates()]);
      setCycles(nextCycles);
      setTemplates(nextTemplates);
      const active = nextCycles.find((c) => c.status === 'Open' && !c.isIndividual);
      setCalibration(active ? await getCalibrationForCycle(active.id) : []);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not load appraisals'));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMeta();
  }, [refreshMeta]);

  useEffect(() => {
    let cancelled = false;
    hrAppraisalService
      .getReviews({ inbox: 'hr', page: receivedPaging.page, limit: receivedPaging.pageSize, search: debouncedReceived || undefined })
      .then((r) => !cancelled && setReceived(r))
      .catch(() => !cancelled && setReceived(emptyPage(receivedPaging.pageSize)));
    return () => {
      cancelled = true;
    };
  }, [receivedPaging.page, receivedPaging.pageSize, debouncedReceived, version]);

  useEffect(() => {
    let cancelled = false;
    hrAppraisalService
      .getReviews({
        cycleId: progressCycleId || undefined,
        page: progressPaging.page,
        limit: progressPaging.pageSize,
        search: debouncedProgress || undefined,
      })
      .then((r) => !cancelled && setProgress(r))
      .catch(() => !cancelled && setProgress(emptyPage(progressPaging.pageSize)));
    return () => {
      cancelled = true;
    };
  }, [progressCycleId, progressPaging.page, progressPaging.pageSize, debouncedProgress, version]);

  const refreshAll = () => {
    setVersion((v) => v + 1);
    void refreshMeta();
  };

  const changeCycleStatus = async (cycle: HrAppraisalCycle, status: HrAppraisalCycle['status'], message: string) => {
    try {
      await updateAppraisalCycleStatus(cycle.id, status);
      toast.success(message);
      refreshAll();
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not update the cycle'));
    }
  };

  const openNewTemplate = () => {
    setTemplateEditId(null);
    setNewTemplateDraft({
      id: '',
      code: `CUSTOM-${Date.now().toString(36).toUpperCase()}`,
      name: 'New appraisal form',
      description: '',
      intendedFor: 'Custom staff group',
      categories: ['Administrative'],
      jobTitlePatterns: [],
      departmentPatterns: [],
      ratingScaleMax: 3,
      ratingIncludesNa: true,
      cycleKind: 'Annual',
      includesDevelopmentPlan: false,
      includesTrainingNeeds: true,
      sections: [
        {
          id: 'sec-1',
          title: 'Key performance indicators',
          kind: 'kpi',
          maxSectionScore: 3,
          criteria: [
            { id: 'sec-1-c1', title: 'Core duty performance', targetPrompt: 'Describe expected standard', meansOfVerification: 'Evidence / reports', weight: 3 },
          ],
        },
      ],
    });
  };

  const editTemplate = newTemplateDraft ?? (templateEditId ? templateById.get(templateEditId) ?? null : null);
  const previewTemplate = templatePreviewId ? templateById.get(templatePreviewId) : null;

  if (openReviewId) {
    return (
      <HrPageShell title="Performance Appraisal" description="Detailed appraisal review">
        <HrReviewDetail
          key={openReviewId}
          reviewId={openReviewId}
          templates={templates}
          onBack={() => setParam({ review: null })}
          onChanged={() => setVersion((v) => v + 1)}
        />
      </HrPageShell>
    );
  }

  return (
    <HrPageShell
      title="Performance Appraisal"
      description="Received appraisals, staff progress, appraisal periods and forms"
      actions={
        <Button variant="outline" onClick={() => setNewCycleOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New appraisal period
        </Button>
      }
    >
      {activeCycle ? (
        <Card>
          <CardHeader>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2">
                  {activeCycle.name}
                  {cycleStatusBadge(activeCycle.status)}
                </CardTitle>
                <CardDescription>
                  {activeCycle.kindLabel} · {activeCycle.periodLabel} · Self-assessment due {activeCycle.selfDeadline} ·
                  Supervisors due {activeCycle.supervisorDeadline}
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Completed</span>
                  <span>
                    {activeCycle.completedCount} / {activeCycle.employeeCount}
                  </span>
                </div>
                <Progress
                  value={activeCycle.employeeCount ? (activeCycle.completedCount / activeCycle.employeeCount) * 100 : 0}
                  className="h-2"
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <Tabs value={tab} onValueChange={(v) => setParam({ tab: v })}>
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="received">Received Appraisals</TabsTrigger>
          <TabsTrigger value="progress">Staff Progress</TabsTrigger>
          <TabsTrigger value="cycles">Appraisal Periods</TabsTrigger>
          <TabsTrigger value="forms">Form Templates</TabsTrigger>
          <TabsTrigger value="calibration">Calibration</TabsTrigger>
        </TabsList>

        <TabsContent value="received" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Appraisal Verification Inflow</CardTitle>
                <CardDescription>Appraisals rated by supervisors, waiting for HR or already signed.</CardDescription>
              </div>
              <SearchBox value={receivedSearch} onChange={(v) => { setReceivedSearch(v); receivedPaging.setPage(1); }} />
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Staff Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Self / Supervisor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {received.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                        {loading ? 'Loading…' : 'Appraisal inbox is empty'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {received.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.employeeName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{r.employeeEmail}</TableCell>
                      <TableCell className="text-sm">{r.formTemplateName}</TableCell>
                      <TableCell className="text-sm">
                        {formatPercent(r.overallSelfScore)} / {formatPercent(r.overallSupervisorScore)}
                      </TableCell>
                      <TableCell>{hrStatusLabel(r)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant={r.progress.hrSigned ? 'outline' : 'default'} onClick={() => setParam({ review: r.id })}>
                          {r.progress.hrSigned ? (
                            <>
                              <BarChart3 className="h-4 w-4 mr-1" /> View Results
                            </>
                          ) : (
                            <>
                              <Signature className="h-4 w-4 mr-1" /> Review &amp; Sign
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={receivedPaging.page}
                pageSize={receivedPaging.pageSize}
                total={received.total}
                onPageChange={receivedPaging.setPage}
                onPageSizeChange={receivedPaging.setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="progress" className="mt-4">
          <Card>
            <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="text-base">Staff Appraisal Progress</CardTitle>
                <CardDescription>Every appraisal and how far it has gone. Open one to assign a supervisor or change its form.</CardDescription>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <select
                  className="rounded-md border px-3 py-2 text-sm"
                  aria-label="Appraisal period"
                  value={progressCycleId}
                  onChange={(e) => {
                    setProgressCycleId(e.target.value);
                    progressPaging.setPage(1);
                  }}
                >
                  <option value="">All appraisal periods</option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
                <SearchBox value={progressSearch} onChange={(v) => { setProgressSearch(v); progressPaging.setPage(1); }} />
              </div>
            </CardHeader>
            <CardContent className="p-0 overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Information</TableHead>
                    <TableHead>Self Rating</TableHead>
                    <TableHead>Supervisor Rating</TableHead>
                    <TableHead>HR</TableHead>
                    <TableHead>VC</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {progress.data.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={10} className="py-10 text-center text-gray-500">
                        {loading ? 'Loading…' : 'No appraisals yet'}
                      </TableCell>
                    </TableRow>
                  ) : null}
                  {progress.data.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div className="font-medium">{r.employeeName}</div>
                        <div className="text-xs text-gray-500">{r.cycleName}</div>
                      </TableCell>
                      <TableCell className="text-sm">{r.formTemplateCode}</TableCell>
                      <TableCell className="text-sm">
                        {r.supervisorName ?? <span className="font-semibold text-red-600">Not assigned</span>}
                      </TableCell>
                      <TableCell>
                        <DoneBadge done={!!r.agreement.savedAt} doneLabel="Submitted" />
                      </TableCell>
                      <TableCell>
                        <DoneBadge done={r.progress.selfAssessment} />
                      </TableCell>
                      <TableCell>
                        <DoneBadge done={r.progress.supervisorRating} />
                      </TableCell>
                      <TableCell>
                        <DoneBadge done={r.progress.hrSigned} doneLabel="Signed" />
                      </TableCell>
                      <TableCell>
                        <DoneBadge done={r.progress.vcSigned} doneLabel="Signed" />
                      </TableCell>
                      <TableCell>{appraisalStatusBadge(r.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="ghost" onClick={() => setParam({ review: r.id })} aria-label={`Open ${r.employeeName}`}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <TablePagination
                page={progressPaging.page}
                pageSize={progressPaging.pageSize}
                total={progress.total}
                onPageChange={progressPaging.setPage}
                onPageSizeChange={progressPaging.setPageSize}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="cycles" className="mt-4">
          <div className="grid gap-4">
            {cycles.length === 0 ? (
              <Card>
                <CardContent className="py-10 text-center text-gray-500">
                  No appraisal periods yet. Use “New appraisal period” to open one.
                </CardContent>
              </Card>
            ) : null}
            {cycles.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                  <div>
                    <CardTitle className="text-lg flex flex-wrap items-center gap-2">
                      {c.name}
                      {c.isIndividual ? <Badge variant="outline">Individual</Badge> : null}
                    </CardTitle>
                    <CardDescription>
                      {c.kindLabel} · {c.periodLabel} · {c.startDate} to {c.endDate}
                    </CardDescription>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {cycleStatusBadge(c.status)}
                    {c.status === 'Open' ? (
                      <Button size="sm" variant="outline" onClick={() => changeCycleStatus(c, 'Review', `Self-assessment closed for ${c.name}`)}>
                        Close self-assessment
                      </Button>
                    ) : null}
                    {c.status === 'Open' || c.status === 'Review' ? (
                      <Button size="sm" variant="outline" onClick={() => changeCycleStatus(c, 'Closed', `Closed ${c.name}`)}>
                        Close period
                      </Button>
                    ) : null}
                  </div>
                </CardHeader>
                <CardContent className="text-sm text-gray-600">
                  {c.completedCount} of {c.employeeCount} appraisals completed · self-assessment due {c.selfDeadline} ·
                  supervisors due {c.supervisorDeadline}
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="forms" className="mt-4 space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={openNewTemplate}>
              <Plus className="h-4 w-4 mr-2" /> New form
            </Button>
          </div>
          <div className="grid gap-4 lg:grid-cols-2">
            {templates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>
                        {template.code} · {template.intendedFor}
                      </CardDescription>
                    </div>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" onClick={() => setTemplatePreviewId(template.id)}>
                        <Eye className="h-4 w-4 mr-1" /> Preview
                      </Button>
                      <Button variant="outline" size="sm" onClick={() => setTemplateEditId(template.id)}>
                        <Pencil className="h-4 w-4 mr-1" /> Edit
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-sm space-y-2">
                  <div className="flex flex-wrap gap-1">
                    {template.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="font-normal">
                        {EMPLOYEE_CATEGORY_LABELS[cat]}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {template.sections?.length ?? 0} sections ·{' '}
                    {template.sections?.reduce((n, s) => n + s.criteria.length, 0) ?? 0} items · rating 0–
                    {template.ratingScaleMax ?? 3} or N/A
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="calibration" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-base">
                <BarChart3 className="h-5 w-5" />
                Calibration by department
              </CardTitle>
              <CardDescription>Average self and supervisor scores per department for the open appraisal period.</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Appraisals</TableHead>
                    <TableHead>Completed</TableHead>
                    <TableHead>Avg self</TableHead>
                    <TableHead>Avg supervisor</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {calibration.length ? (
                    calibration.map((row) => (
                      <TableRow key={row.department}>
                        <TableCell>{row.department}</TableCell>
                        <TableCell>{row.count}</TableCell>
                        <TableCell>{row.completed}</TableCell>
                        <TableCell>{formatPercent(row.avgSelf)}</TableCell>
                        <TableCell>{formatPercent(row.avgSupervisor)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="py-8 text-center text-gray-500">
                        {loading ? 'Loading…' : 'Open an appraisal period to see calibration.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <HrNewAppraisalCycleDialog open={newCycleOpen} onOpenChange={setNewCycleOpen} onLaunched={refreshAll} />

      <HrTemplateEditorDialog
        open={!!editTemplate}
        template={editTemplate ?? null}
        onOpenChange={(open) => {
          if (!open) {
            setTemplateEditId(null);
            setNewTemplateDraft(null);
          }
        }}
        onSaved={async () => {
          setNewTemplateDraft(null);
          setTemplateEditId(null);
          await refreshMeta();
        }}
      />

      <Dialog open={!!previewTemplate} onOpenChange={() => setTemplatePreviewId(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {previewTemplate ? (
            <>
              <DialogHeader>
                <DialogTitle>Appraisal form</DialogTitle>
                <DialogDescription>Sections and items on this form</DialogDescription>
              </DialogHeader>
              <HrAppraisalFormPreview template={previewTemplate} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </HrPageShell>
  );
}
