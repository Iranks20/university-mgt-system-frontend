import { useState, useMemo, useEffect, useCallback } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { HrNewAppraisalCycleDialog } from '@/components/hr/HrNewAppraisalCycleDialog';
import { appraisalStatusBadge, cycleStatusBadge } from '@/components/hr/HrBadges';
import {
  getHrAppraisalCycles,
  getHrAppraisalReviewById,
  getHrAppraisalReviews,
  getAppraisalFormTemplates,
  saveAppraisalReview,
  getCalibrationForCycle,
} from '@/features/hr/hr-appraisal-store';
import { HrAppraisalFormPreview } from '@/components/hr/HrAppraisalFormPreview';
import { HrTemplateEditorDialog } from '@/components/hr/HrTemplateEditorDialog';
import { AppraisalSectionForm } from '@/components/hr/AppraisalSectionForm';
import { AppraisalPrintView } from '@/components/hr/AppraisalPrintView';
import { EMPLOYEE_CATEGORY_LABELS } from '@/features/hr/appraisal-form-utils';
import { emptyResponsesForSections } from '@/features/hr/appraisal-form-utils';
import type { AppraisalFormTemplate, HrAppraisalCycle, HrAppraisalReview } from '@/features/hr/types';
import type { CalibrationRow } from '@/services/hr-appraisal.service';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Eye, ClipboardCheck, Plus, FileStack, Printer, BarChart3, Pencil } from 'lucide-react';
import { toast } from 'sonner';

function formatScore(value?: number | null) {
  return value == null ? '—' : `${value}%`;
}

export default function HrAppraisalsPage() {
  const [cycles, setCycles] = useState<HrAppraisalCycle[]>([]);
  const [reviews, setReviews] = useState<HrAppraisalReview[]>([]);
  const [formTemplates, setFormTemplates] = useState<AppraisalFormTemplate[]>([]);
  const [calibration, setCalibration] = useState<CalibrationRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [editReview, setEditReview] = useState<HrAppraisalReview | null>(null);
  const [newCycleOpen, setNewCycleOpen] = useState(false);
  const [templatePreviewId, setTemplatePreviewId] = useState<string | null>(null);
  const [templateEditId, setTemplateEditId] = useState<string | null>(null);
  const [printReview, setPrintReview] = useState<HrAppraisalReview | null>(null);
  const [loading, setLoading] = useState(true);

  const templateById = useMemo(
    () => new Map(formTemplates.map((template) => [template.id, template])),
    [formTemplates]
  );
  const previewTemplate = templatePreviewId ? templateById.get(templatePreviewId) : null;
  const editTemplate = templateEditId ? templateById.get(templateEditId) : null;

  const refreshAll = useCallback(async () => {
    setLoading(true);
    try {
      const [nextCycles, nextReviews, nextTemplates] = await Promise.all([
        getHrAppraisalCycles(),
        getHrAppraisalReviews(),
        getAppraisalFormTemplates(),
      ]);
      setCycles(nextCycles);
      setReviews(nextReviews);
      setFormTemplates(nextTemplates);
      const active = nextCycles.find((cycle) => cycle.status === 'Open');
      if (active) {
        setCalibration(await getCalibrationForCycle(active.id));
      } else {
        setCalibration([]);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  const openReview = async (id: string) => {
    const r = await getHrAppraisalReviewById(id);
    if (r) {
      setEditReview(JSON.parse(JSON.stringify(r)) as HrAppraisalReview);
      setSelectedId(id);
    }
  };

  const handleFinalize = async () => {
    if (!editReview) return;
    try {
      await saveAppraisalReview(editReview, 'complete');
      await refreshAll();
      setSelectedId(null);
      setEditReview(null);
      toast.success('Appraisal finalized and archived to HR documents');
    } catch {
      toast.error('Failed to finalize appraisal');
    }
  };

  const handleAdvanceToHr = async (id: string) => {
    const r = await getHrAppraisalReviewById(id);
    if (!r) return;
    try {
      await saveAppraisalReview(r, 'advance_hr');
      await refreshAll();
      toast.success('Moved to HR review queue');
    } catch {
      toast.error('Failed to update review');
    }
  };

  const activeCycle = cycles.find((c) => c.status === 'Open');

  return (
    <HrPageShell
      title="Performance Appraisal"
      description="Annual review cycles — self-assessment, supervisor review, HR calibration, and final ratings (standard university workflow)."
      actions={
        <Button variant="outline" onClick={() => setNewCycleOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> New Cycle
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
                  Review period: {activeCycle.periodLabel} · Due by {activeCycle.endDate}
                </CardDescription>
              </div>
              <div className="w-full sm:w-64">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Completion</span>
                  <span>
                    {activeCycle.completedCount} / {activeCycle.employeeCount}
                  </span>
                </div>
                <Progress
                  value={(activeCycle.completedCount / activeCycle.employeeCount) * 100}
                  className="h-2"
                />
              </div>
            </div>
          </CardHeader>
        </Card>
      ) : null}

      <Card className="border-dashed">
        <CardHeader>
          <CardTitle className="text-base">Standard appraisal workflow</CardTitle>
        </CardHeader>
        <CardContent className="text-sm text-gray-600 flex flex-wrap gap-2 items-center">
          <span className="rounded bg-gray-100 px-2 py-1">1. HR opens cycle</span>
          <span>→</span>
          <span className="rounded bg-amber-100 px-2 py-1">2. Employee self-assessment</span>
          <span>→</span>
          <span className="rounded bg-blue-100 px-2 py-1">3. Supervisor review</span>
          <span>→</span>
          <span className="rounded bg-indigo-100 px-2 py-1">4. HR review & calibration</span>
          <span>→</span>
          <span className="rounded bg-green-100 px-2 py-1">5. Completed & filed</span>
        </CardContent>
      </Card>

      <Tabs defaultValue="queue">
        <TabsList>
          <TabsTrigger value="queue">Review Queue</TabsTrigger>
          <TabsTrigger value="forms">Form Templates</TabsTrigger>
          <TabsTrigger value="cycles">Cycles</TabsTrigger>
          <TabsTrigger value="calibration">Calibration</TabsTrigger>
          <TabsTrigger value="all">All Reviews</TabsTrigger>
        </TabsList>

        <TabsContent value="queue" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Form type</TableHead>
                    <TableHead>Department</TableHead>
                    <TableHead>Supervisor</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due</TableHead>
                    <TableHead>Ratings (Self / Sup / HR)</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews
                    .filter((r) => r.status !== 'Completed')
                    .map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          <div className="font-medium">{r.employeeName}</div>
                          <div className="text-xs text-gray-500">{r.jobTitle}</div>
                        </TableCell>
                        <TableCell className="text-sm">
                          <Badge variant="outline">{r.formTemplateName}</Badge>
                        </TableCell>
                        <TableCell>{r.department}</TableCell>
                        <TableCell className="text-sm">{r.supervisorName}</TableCell>
                        <TableCell>{appraisalStatusBadge(r.status)}</TableCell>
                        <TableCell>{r.dueDate}</TableCell>
                        <TableCell className="text-sm">
                          {formatScore(r.overallSelfScore)} / {formatScore(r.overallSupervisorScore)} /{' '}
                          {formatScore(r.overallHrScore)}
                        </TableCell>
                        <TableCell className="text-right space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => openReview(r.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {r.status === 'Supervisor Review' ? (
                            <Button size="sm" variant="outline" onClick={() => handleAdvanceToHr(r.id)}>
                              To HR
                            </Button>
                          ) : null}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forms" className="mt-4 space-y-4">
          <Card className="border-dashed">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <FileStack className="h-5 w-5" />
                Appraisal form library
              </CardTitle>
              <CardDescription>
                Standard form types HR assigns when launching a cycle. Each category of staff receives
                the matching template (configurable in New Cycle → Appraisal forms).
              </CardDescription>
            </CardHeader>
          </Card>
          <div className="grid gap-4 lg:grid-cols-2">
            {formTemplates.map((template) => (
              <Card key={template.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <CardTitle className="text-lg">{template.name}</CardTitle>
                      <CardDescription>{template.code} · {template.intendedFor}</CardDescription>
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
                  <p className="text-gray-600 line-clamp-2">{template.description}</p>
                  <div className="flex flex-wrap gap-1">
                    {template.categories.map((cat) => (
                      <Badge key={cat} variant="secondary" className="font-normal">
                        {EMPLOYEE_CATEGORY_LABELS[cat]}
                      </Badge>
                    ))}
                  </div>
                  <p className="text-xs text-gray-500">
                    {(template.sections?.length ?? template.goals.length)} sections · rating 0–
                    {template.ratingScaleMax ?? 3}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="cycles" className="mt-4">
          <div className="grid gap-4">
            {cycles.map((c) => (
              <Card key={c.id}>
                <CardHeader className="flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-lg">{c.name}</CardTitle>
                    <CardDescription>{c.periodLabel}</CardDescription>
                  </div>
                  {cycleStatusBadge(c.status)}
                </CardHeader>
                <CardContent className="text-sm text-gray-600 space-y-3">
                  <p>{c.completedCount} of {c.employeeCount} reviews completed</p>
                  {c.formAssignments?.length ? (
                    <div>
                      <p className="font-medium text-gray-900 mb-1">Assignment rules</p>
                      <ul className="space-y-1">
                        {c.formAssignments.slice(0, 6).map((assignment, index) => {
                          const template = templateById.get(assignment.templateId);
                          return (
                            <li key={`${assignment.ruleType}-${index}`} className="text-xs">
                              {assignment.ruleType}: {template?.name ?? assignment.templateId}
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  ) : null}
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
              <CardDescription>
                Compare average self and supervisor scores across departments for the active cycle.
              </CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Department</TableHead>
                    <TableHead>Reviews</TableHead>
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
                        <TableCell>{formatScore(row.avgSelf)}</TableCell>
                        <TableCell>{formatScore(row.avgSupervisor)}</TableCell>
                      </TableRow>
                    ))
                  ) : (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-gray-500 py-8">
                        {loading ? 'Loading calibration...' : 'Open a cycle to view calibration data.'}
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="all" className="mt-4">
          <Card>
            <CardContent className="p-0">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Employee</TableHead>
                    <TableHead>Cycle</TableHead>
                    <TableHead>Form</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Final HR Rating</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {reviews.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>{r.employeeName}</TableCell>
                      <TableCell>{r.cycleName}</TableCell>
                      <TableCell className="text-sm">{r.formTemplateName}</TableCell>
                      <TableCell>{appraisalStatusBadge(r.status)}</TableCell>
                      <TableCell>
                        {r.overallHrScore != null ? formatScore(r.overallHrScore) : '—'}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!selectedId && !!editReview} onOpenChange={() => { setSelectedId(null); setEditReview(null); }}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          {editReview ? (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <ClipboardCheck className="h-5 w-5" />
                  {editReview.employeeName} — Appraisal Review
                </DialogTitle>
                <DialogDescription>
                  {editReview.cycleName} · {editReview.formTemplateName} · Supervisor: {editReview.supervisorName}
                </DialogDescription>
              </DialogHeader>

              <div className="space-y-4 text-sm">
                {(editReview.sections ?? []).map((section) => (
                  <section key={section.id}>
                    <h4 className="font-semibold mb-2">{section.title}</h4>
                    <AppraisalSectionForm
                      section={section}
                      responses={editReview.responses ?? emptyResponsesForSections(editReview.sections ?? [])}
                      onChange={(responses) => setEditReview({ ...editReview, responses })}
                      mode={editReview.status === 'HR Review' ? 'hr' : 'readonly'}
                      ratingScaleMax={editReview.ratingScaleMax ?? 3}
                      ratingIncludesNa={editReview.ratingIncludesNa ?? true}
                    />
                  </section>
                ))}

                {editReview.selfStrengths ? (
                  <section>
                    <h4 className="font-semibold">Employee self-assessment</h4>
                    <p className="text-gray-600 mt-1"><strong>Strengths:</strong> {editReview.selfStrengths}</p>
                    <p className="text-gray-600"><strong>Improvements:</strong> {editReview.selfImprovements}</p>
                    <p className="text-gray-600"><strong>Development plan:</strong> {editReview.selfDevelopmentPlan}</p>
                  </section>
                ) : null}

                {editReview.supervisorComments ? (
                  <section>
                    <h4 className="font-semibold">Supervisor comments</h4>
                    <p className="text-gray-600 mt-1">{editReview.supervisorComments}</p>
                  </section>
                ) : null}

                <section className="grid gap-3 sm:grid-cols-3">
                  <div>
                    <Label>Overall self</Label>
                    <p className="mt-1">{formatScore(editReview.overallSelfScore)}</p>
                  </div>
                  <div>
                    <Label>Overall supervisor</Label>
                    <p className="mt-1">{formatScore(editReview.overallSupervisorScore)}</p>
                  </div>
                  <div>
                    <Label>Overall HR score (%)</Label>
                    <Input
                      type="number"
                      min={0}
                      max={100}
                      value={editReview.overallHrScore ?? ''}
                      onChange={(e) =>
                        setEditReview({
                          ...editReview,
                          overallHrScore: e.target.value ? Number(e.target.value) : null,
                        })
                      }
                    />
                  </div>
                </section>

                <section>
                  <Label>HR comments & calibration notes</Label>
                  <Textarea
                    className="mt-1"
                    rows={3}
                    value={editReview.hrComments}
                    onChange={(e) => setEditReview({ ...editReview, hrComments: e.target.value })}
                    placeholder="Final HR notes, calibration decisions, promotion recommendations..."
                  />
                </section>

                {editReview.archivedDocumentTitle ? (
                  <p className="text-xs text-gray-500">
                    HR document archive title: {editReview.archivedDocumentTitle}
                  </p>
                ) : null}
              </div>

              <DialogFooter>
                <Button variant="outline" onClick={() => setPrintReview(editReview)}>
                  <Printer className="h-4 w-4 mr-2" /> Print / PDF
                </Button>
                <Button variant="outline" onClick={() => { setSelectedId(null); setEditReview(null); }}>
                  Close
                </Button>
                {editReview.status === 'HR Review' ? (
                  <Button onClick={handleFinalize}>Finalize appraisal</Button>
                ) : null}
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <Dialog open={!!printReview} onOpenChange={() => setPrintReview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none">
          {printReview ? (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle>Print appraisal</DialogTitle>
                <DialogDescription>Use browser print to save as PDF</DialogDescription>
              </DialogHeader>
              <AppraisalPrintView review={printReview} />
              <DialogFooter className="print:hidden">
                <Button onClick={() => window.print()}>Print</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>

      <HrNewAppraisalCycleDialog
        open={newCycleOpen}
        onOpenChange={setNewCycleOpen}
        onLaunched={refreshAll}
      />

      <HrTemplateEditorDialog
        open={!!editTemplate}
        template={editTemplate ?? null}
        onOpenChange={(open) => {
          if (!open) setTemplateEditId(null);
        }}
        onSaved={refreshAll}
      />

      <Dialog open={!!previewTemplate} onOpenChange={() => setTemplatePreviewId(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {previewTemplate ? (
            <>
              <DialogHeader>
                <DialogTitle>Appraisal form template</DialogTitle>
                <DialogDescription>Standard structure for this staff category</DialogDescription>
              </DialogHeader>
              <HrAppraisalFormPreview template={previewTemplate} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </HrPageShell>
  );
}
