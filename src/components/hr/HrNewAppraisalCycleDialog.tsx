import { useEffect, useMemo, useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ChevronLeft, ChevronRight, Eye, FileStack, Rocket, Users } from 'lucide-react';
import { toast } from 'sonner';
import { HrAppraisalFormPreview } from '@/components/hr/HrAppraisalFormPreview';
import { staffService } from '@/services/staff.service';
import { hrAppraisalService, type CycleLaunchReadiness } from '@/services/hr-appraisal.service';
import {
  categoriesInScope,
  defaultFormAssignmentsForScope,
  employeeInScope,
  EMPLOYEE_CATEGORY_LABELS,
  getTemplatesForCategory,
  inferEmployeeCategory,
  resolveTemplateForStaff,
} from '@/features/hr/appraisal-form-utils';
import {
  createAndLaunchAppraisalCycle,
  getAppraisalFormTemplates,
  getHrAppraisalCycles,
} from '@/features/hr/hr-appraisal-store';
import { getApiErrorMessage } from '@/lib/api';
import type { Staff } from '@/types';
import type {
  AppraisalCycleScope,
  AppraisalFormTemplate,
  CreateAppraisalCycleInput,
  CycleFormAssignment,
} from '@/features/hr/types';
import { Link } from 'react-router';

const STEPS = [
  { id: 1, title: 'Cycle details', description: 'Name and performance period' },
  { id: 2, title: 'Appraisal forms', description: 'Form type per staff category' },
  { id: 3, title: 'Participation', description: 'Who is included' },
  { id: 4, title: 'Timeline', description: 'Deadlines for each stage' },
  { id: 5, title: 'Launch', description: 'Review and open cycle' },
] as const;

type HrNewAppraisalCycleDialogProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunched: () => void;
};

function defaultForm(): CreateAppraisalCycleInput {
  const year = new Date().getFullYear();
  const scope: AppraisalCycleScope = 'all';
  return {
    name: `Annual Performance Review ${year}`,
    periodLabel: `Jan ${year} – Dec ${year}`,
    startDate: new Date().toISOString().slice(0, 10),
    endDate: `${year}-08-31`,
    selfAssessmentDeadline: `${year}-07-15`,
    supervisorDeadline: `${year}-08-15`,
    scope,
    categorySelections: [],
    closePreviousOpen: true,
  };
}

function syncAssignmentsForScope(
  scope: AppraisalCycleScope,
  current: CycleFormAssignment[],
  templates: AppraisalFormTemplate[]
): CycleFormAssignment[] {
  const categories = categoriesInScope(scope);
  const defaults = defaultFormAssignmentsForScope(templates, scope);
  return categories.map((category) => {
    const existing = current.find((a) => a.category === category);
    return {
      category,
      templateId: existing?.templateId ?? defaults.find((a) => a.category === category)?.templateId ?? '',
    };
  });
}

export function HrNewAppraisalCycleDialog({
  open,
  onOpenChange,
  onLaunched,
}: HrNewAppraisalCycleDialogProps) {
  const [step, setStep] = useState(1);
  const [form, setForm] = useState<CreateAppraisalCycleInput>(defaultForm);
  const [templates, setTemplates] = useState<AppraisalFormTemplate[]>([]);
  const [openCycleName, setOpenCycleName] = useState<string | null>(null);
  const [launching, setLaunching] = useState(false);
  const [previewTemplateId, setPreviewTemplateId] = useState<string | null>(null);
  const [liveStaff, setLiveStaff] = useState<Staff[]>([]);
  const [readiness, setReadiness] = useState<CycleLaunchReadiness | null>(null);
  const [readinessLoading, setReadinessLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    staffService
      .getStaff({ status: 'Active', limit: 500, page: 1 })
      .then((result) => setLiveStaff(result.data))
      .catch(() => setLiveStaff([]));
    getAppraisalFormTemplates()
      .then((rows) => {
        setTemplates(rows);
        setForm((prev) => ({
          ...prev,
          categorySelections: syncAssignmentsForScope(prev.scope, prev.categorySelections ?? [], rows),
        }));
      })
      .catch(() => setTemplates([]));
    getHrAppraisalCycles()
      .then((rows) => setOpenCycleName(rows.find((c) => c.status === 'Open')?.name ?? null))
      .catch(() => setOpenCycleName(null));
  }, [open]);

  const templateById = useMemo(
    () => new Map(templates.map((template) => [template.id, template])),
    [templates]
  );
  const getTemplateById = (id: string) => templateById.get(id);

  const scopedCategories = useMemo(() => categoriesInScope(form.scope), [form.scope]);
  const categorySelections = form.categorySelections ?? [];

  const eligibleCount = useMemo(() => {
    return liveStaff.filter((member) => {
      const departmentName = (member as Staff & { departmentName?: string }).departmentName ?? '';
      const category = inferEmployeeCategory(undefined, member.role, departmentName);
      return employeeInScope(form.scope, category);
    }).length;
  }, [liveStaff, form.scope]);

  const formCountsByTemplate = useMemo(() => {
    const counts = new Map<string, number>();
    for (const member of liveStaff) {
      const departmentName = (member as Staff & { departmentName?: string }).departmentName ?? '';
      const category = inferEmployeeCategory(undefined, member.role, departmentName);
      if (!employeeInScope(form.scope, category)) continue;
      const template = resolveTemplateForStaff({
        templates,
        category,
        jobTitle: member.role,
        department: departmentName,
        preferredTemplateId: categorySelections.find((a) => a.category === category)?.templateId,
      });
      if (!template) continue;
      counts.set(template.id, (counts.get(template.id) ?? 0) + 1);
    }
    return counts;
  }, [liveStaff, form.scope, categorySelections, templates]);

  const previewTemplate = previewTemplateId ? getTemplateById(previewTemplateId) : null;

  useEffect(() => {
    if (!open || !templates.length) return;
    setForm((prev) => ({
      ...prev,
      categorySelections: syncAssignmentsForScope(prev.scope, prev.categorySelections ?? [], templates),
    }));
  }, [form.scope, open, templates]);

  const reset = () => {
    setStep(1);
    setForm(defaultForm());
    setLaunching(false);
    setPreviewTemplateId(null);
    setReadiness(null);
    setReadinessLoading(false);
  };

  const handleClose = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const setAssignmentTemplate = (category: CycleFormAssignment['category'], templateId: string) => {
    setForm((prev) => ({
      ...prev,
      categorySelections: (prev.categorySelections ?? []).map((a) =>
        a.category === category ? { ...a, templateId } : a
      ),
    }));
  };

  const launchAssignments = useMemo(
    () =>
      categorySelections
        .filter((assignment) => assignment.templateId)
        .map((assignment) => ({
          ruleType: 'category' as const,
          category: assignment.category,
          templateId: assignment.templateId,
        })),
    [categorySelections]
  );

  const canProceed = () => {
    if (step === 1) {
      return form.name.trim() && form.periodLabel.trim() && form.startDate && form.endDate;
    }
    if (step === 2) {
      return categorySelections.length > 0 && categorySelections.every((a) => a.templateId);
    }
    if (step === 4) {
      return (
        form.selfAssessmentDeadline &&
        form.supervisorDeadline &&
        form.selfAssessmentDeadline <= form.supervisorDeadline &&
        form.supervisorDeadline <= form.endDate
      );
    }
    if (step === 5) return eligibleCount > 0;
    return true;
  };

  useEffect(() => {
    if (!open || step !== 5 || !canProceed()) {
      if (step !== 5) setReadiness(null);
      return;
    }

    let cancelled = false;
    setReadinessLoading(true);
    hrAppraisalService
      .getCycleLaunchReadiness({
        scopeCategories: categoriesInScope(form.scope),
        formAssignments: launchAssignments,
      })
      .then((data) => {
        if (!cancelled) setReadiness(data);
      })
      .catch((error) => {
        if (!cancelled) {
          setReadiness(null);
          toast.error(getApiErrorMessage(error, 'Could not check launch readiness'));
        }
      })
      .finally(() => {
        if (!cancelled) setReadinessLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [open, step, form.scope, launchAssignments]);

  const handleLaunch = async () => {
    if (!canProceed()) {
      toast.error('Complete all required fields before launching');
      return;
    }
    setLaunching(true);
    try {
      const cycle = await createAndLaunchAppraisalCycle(form);
      toast.success(`Cycle launched — ${cycle.employeeCount} employees enrolled with assigned forms`);
      onLaunched();
      handleClose(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Failed to launch appraisal cycle'));
    } finally {
      setLaunching(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>New appraisal cycle</DialogTitle>
            <DialogDescription>
              Configure appraisal form types, participation, and launch a university-wide review cycle
            </DialogDescription>
          </DialogHeader>

          <div className="flex gap-2 overflow-x-auto pb-2">
            {STEPS.map((s) => (
              <div
                key={s.id}
                className={`flex-1 min-w-[100px] rounded-lg border p-2 text-center text-xs ${
                  step === s.id ? 'border-[#015F2B] bg-green-50' : 'border-gray-200'
                }`}
              >
                <div className="font-semibold">{s.id}. {s.title}</div>
                <div className="text-gray-500 hidden sm:block">{s.description}</div>
              </div>
            ))}
          </div>

          {step === 1 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="cycle-name">Cycle name</Label>
                <Input
                  id="cycle-name"
                  className="mt-1"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="Annual Performance Review 2027"
                />
              </div>
              <div>
                <Label htmlFor="period-label">Performance period label</Label>
                <Input
                  id="period-label"
                  className="mt-1"
                  value={form.periodLabel}
                  onChange={(e) => setForm({ ...form, periodLabel: e.target.value })}
                  placeholder="Jan 2027 – Dec 2027"
                />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="cycle-start">Cycle opens</Label>
                  <Input
                    id="cycle-start"
                    type="date"
                    className="mt-1"
                    value={form.startDate}
                    onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                  />
                </div>
                <div>
                  <Label htmlFor="cycle-end">Cycle closes</Label>
                  <Input
                    id="cycle-end"
                    type="date"
                    className="mt-1"
                    value={form.endDate}
                    onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 2 ? (
            <div className="space-y-4">
              <div className="rounded-lg border border-dashed p-3 text-sm text-gray-600 flex gap-2">
                <FileStack className="h-5 w-5 shrink-0 text-[#015F2B]" />
                <p>
                  Choose which appraisal form template is generated for each staff category in this cycle.
                  Employees receive the form matching their category when the cycle launches.
                </p>
              </div>

              {scopedCategories.map((category) => {
                const assignment = categorySelections.find((a) => a.category === category);
                const options = getTemplatesForCategory(templates, category);
                const selected = assignment ? getTemplateById(assignment.templateId) : undefined;

                return (
                  <Card key={category}>
                    <CardContent className="pt-4 space-y-3">
                      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                        <div className="flex-1">
                          <Label>{EMPLOYEE_CATEGORY_LABELS[category]}</Label>
                          <Select
                            value={assignment?.templateId ?? ''}
                            onValueChange={(v) => setAssignmentTemplate(category, v)}
                          >
                            <SelectTrigger className="mt-1">
                              <SelectValue placeholder="Select appraisal form" />
                            </SelectTrigger>
                            <SelectContent>
                              {options.map((t) => (
                                <SelectItem key={t.id} value={t.id}>
                                  {t.name} ({t.code})
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        {assignment?.templateId ? (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            onClick={() => setPreviewTemplateId(assignment.templateId)}
                          >
                            <Eye className="h-4 w-4 mr-1" /> Preview form
                          </Button>
                        ) : null}
                      </div>
                      {selected ? (
                        <p className="text-xs text-gray-500">{selected.description}</p>
                      ) : null}
                    </CardContent>
                  </Card>
                );
              })}

              <div className="rounded-lg bg-gray-50 border p-3 text-sm">
                <p className="font-medium text-gray-900 mb-2">Forms to be generated on launch</p>
                <div className="flex flex-wrap gap-2">
                  {[...formCountsByTemplate.entries()].map(([templateId, count]) => {
                    const template = getTemplateById(templateId);
                    if (!template) return null;
                    return (
                      <Badge key={templateId} variant="secondary">
                        {template.code}: {count} employees
                      </Badge>
                    );
                  })}
                </div>
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="space-y-4">
              <div>
                <Label>Employee scope</Label>
                <Select
                  value={form.scope}
                  onValueChange={(v) => {
                    const scope = v as AppraisalCycleScope;
                    setForm((prev) => ({
                      ...prev,
                      scope,
                      categorySelections: syncAssignmentsForScope(scope, prev.categorySelections ?? [], templates),
                    }));
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All active employees</SelectItem>
                    <SelectItem value="academic">Academic staff only (lecturers)</SelectItem>
                    <SelectItem value="administrative">Administrative staff</SelectItem>
                    <SelectItem value="support">Support staff</SelectItem>
                    <SelectItem value="clinical">Clinical staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <Users className="h-8 w-8 text-[#015F2B]" />
                  <div>
                    <p className="font-semibold">{eligibleCount} employees</p>
                    <p className="text-sm text-gray-500">
                      Will receive the selected appraisal forms when the cycle is launched
                    </p>
                  </div>
                </CardContent>
              </Card>
              <div className="flex items-start gap-2 rounded-lg border p-3">
                <Checkbox
                  id="close-previous"
                  checked={form.closePreviousOpen}
                  onCheckedChange={(checked) =>
                    setForm({ ...form, closePreviousOpen: checked === true })
                  }
                />
                <div>
                  <Label htmlFor="close-previous" className="cursor-pointer">
                    Close any currently open cycle
                  </Label>
                  <p className="text-xs text-gray-500 mt-1">
                    {openCycleName
                      ? `Will close "${openCycleName}" before opening the new cycle.`
                      : 'No open cycle detected — safe to proceed.'}
                  </p>
                </div>
              </div>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Set deadlines for each stage of the standard appraisal workflow.
              </p>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="self-deadline">Self-assessment deadline</Label>
                  <Input
                    id="self-deadline"
                    type="date"
                    className="mt-1"
                    value={form.selfAssessmentDeadline}
                    onChange={(e) =>
                      setForm({ ...form, selfAssessmentDeadline: e.target.value })
                    }
                  />
                </div>
                <div>
                  <Label htmlFor="supervisor-deadline">Supervisor review deadline</Label>
                  <Input
                    id="supervisor-deadline"
                    type="date"
                    className="mt-1"
                    value={form.supervisorDeadline}
                    onChange={(e) =>
                      setForm({ ...form, supervisorDeadline: e.target.value })
                    }
                  />
                </div>
              </div>
            </div>
          ) : null}

          {step === 5 ? (
            <div className="space-y-4">
              <Card
                className={
                  readiness && !readiness.readyToLaunch
                    ? 'bg-amber-50 border-amber-200'
                    : 'bg-green-50 border-green-200'
                }
              >
                <CardContent className="pt-4 space-y-2 text-sm">
                  <p
                    className={`font-semibold ${
                      readiness && !readiness.readyToLaunch ? 'text-amber-900' : 'text-green-900'
                    }`}
                  >
                    {readiness && !readiness.readyToLaunch
                      ? 'Launch blocked until supervisors are fixed'
                      : 'Ready to launch'}
                  </p>
                  <dl
                    className={`grid grid-cols-2 gap-2 ${
                      readiness && !readiness.readyToLaunch ? 'text-amber-900' : 'text-green-900'
                    }`}
                  >
                    <dt className="text-green-700">Cycle</dt>
                    <dd>{form.name}</dd>
                    <dt className="text-green-700">Period</dt>
                    <dd>{form.periodLabel}</dd>
                    <dt className="text-green-700">Employees</dt>
                    <dd>{readiness?.eligibleCount ?? eligibleCount}</dd>
                    <dt className="text-green-700">Ready with supervisor</dt>
                    <dd>{readiness?.readyCount ?? '—'}</dd>
                    <dt className="text-green-700">Missing supervisor</dt>
                    <dd>{readiness?.missingSupervisorCount ?? (readinessLoading ? 'Checking…' : '—')}</dd>
                    <dt className="text-green-700">Self-assessment due</dt>
                    <dd>{form.selfAssessmentDeadline}</dd>
                    <dt className="text-green-700">Supervisor due</dt>
                    <dd>{form.supervisorDeadline}</dd>
                    <dt className="text-green-700">Cycle closes</dt>
                    <dd>{form.endDate}</dd>
                  </dl>
                </CardContent>
              </Card>

              {readiness?.missingSupervisorCount ? (
                <div className="rounded-lg border border-amber-300 bg-amber-50 p-4 text-sm text-amber-950 space-y-3">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <p className="font-medium">
                        {readiness.missingSupervisorCount} staff member(s) in scope still have no
                        supervisor or department HOD.
                      </p>
                      <p className="text-amber-900/80">
                        Update reporting lines first, then launch again.
                      </p>
                    </div>
                    <Button variant="outline" asChild>
                      <Link to="/hr/employees?supervision=missing" onClick={() => handleClose(false)}>
                        Open employee directory
                      </Link>
                    </Button>
                  </div>

                  {readiness.missingSupervisorDepartments.length ? (
                    <div>
                      <p className="font-medium mb-2">Most affected departments</p>
                      <div className="flex flex-wrap gap-2">
                        {readiness.missingSupervisorDepartments.slice(0, 8).map((row) => (
                          <Badge key={row.department} variant="outline">
                            {row.department}: {row.count}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  <div>
                    <p className="font-medium mb-2">Examples</p>
                    <ul className="list-disc pl-5 space-y-1">
                      {readiness.missingSupervisors.map((label) => (
                        <li key={label}>{label}</li>
                      ))}
                    </ul>
                  </div>
                </div>
              ) : null}

              <div className="rounded-lg border p-4 text-sm">
                <p className="font-medium text-gray-900 mb-2">Appraisal forms in this cycle</p>
                <ul className="space-y-2">
                  {categorySelections.map((assignment) => {
                    const template = getTemplateById(assignment.templateId);
                    const count = formCountsByTemplate.get(assignment.templateId) ?? 0;
                    return (
                      <li key={assignment.category} className="flex justify-between gap-2">
                        <span>
                          <strong>{EMPLOYEE_CATEGORY_LABELS[assignment.category]}:</strong>{' '}
                          {template?.name ?? assignment.templateId}
                        </span>
                        <Badge variant="outline">{count} forms</Badge>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : null}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {step > 1 ? (
              <Button type="button" variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
            )}
            <div className="flex-1" />
            {step < 5 ? (
              <Button
                type="button"
                disabled={!canProceed()}
                onClick={() => setStep(step + 1)}
              >
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button
                type="button"
                disabled={launching || !canProceed() || readinessLoading || readiness?.readyToLaunch === false}
                onClick={handleLaunch}
              >
                <Rocket className="h-4 w-4 mr-2" />
                {launching ? 'Launching...' : 'Launch cycle'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewTemplate} onOpenChange={() => setPreviewTemplateId(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {previewTemplate ? (
            <>
              <DialogHeader>
                <DialogTitle>Form preview</DialogTitle>
                <DialogDescription>
                  Structure employees and supervisors will complete for this template
                </DialogDescription>
              </DialogHeader>
              <HrAppraisalFormPreview template={previewTemplate} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
