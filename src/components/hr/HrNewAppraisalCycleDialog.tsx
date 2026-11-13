import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router';
import { ChevronLeft, ChevronRight, Eye, Rocket, X } from 'lucide-react';
import { toast } from 'sonner';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { HrAppraisalFormPreview } from '@/components/hr/HrAppraisalFormPreview';
import { StaffSearchPicker } from '@/components/hr/appraisal/StaffSearchPicker';
import { hrAppraisalService, type CycleLaunchReadiness } from '@/services/hr-appraisal.service';
import { ALL_EMPLOYEE_CATEGORIES, EMPLOYEE_CATEGORY_LABELS } from '@/features/hr/appraisal-form-utils';
import { getAppraisalFormTemplates, getHrAppraisalCycles } from '@/features/hr/hr-appraisal-store';
import { getApiErrorMessage } from '@/lib/api';
import {
  APPRAISAL_JOB_CATEGORY_LABELS,
  APPRAISAL_TYPE_OPTIONS,
  type AppraisalAssignmentRule,
  type AppraisalCycleKind,
  type AppraisalFormTemplate,
  type AppraisalJobCategory,
  type EmployeeCategory,
} from '@/features/hr/types';
import type { Staff } from '@/types';

const STEPS = ['Appraisal details', 'Who is appraised', 'Forms', 'Deadlines', 'Launch'] as const;

type FormState = {
  kind: AppraisalCycleKind;
  name: string;
  periodLabel: string;
  startDate: string;
  endDate: string;
  selfDeadline: string;
  supervisorDeadline: string;
  scopeCategories: EmployeeCategory[];
  closePreviousOpen: boolean;
};

function defaultForm(): FormState {
  const year = new Date().getFullYear();
  return {
    kind: 'Annual',
    name: `Annual Appraisal ${year}/${year + 1}`,
    periodLabel: `July ${year} – June ${year + 1}`,
    startDate: `${year}-07-01`,
    endDate: `${year + 1}-06-30`,
    selfDeadline: `${year + 1}-05-31`,
    supervisorDeadline: `${year + 1}-06-15`,
    scopeCategories: [...ALL_EMPLOYEE_CATEGORIES],
    closePreviousOpen: true,
  };
}

export function HrNewAppraisalCycleDialog({
  open,
  onOpenChange,
  onLaunched,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onLaunched: () => void;
}) {
  const [step, setStep] = useState(0);
  const [form, setForm] = useState<FormState>(defaultForm);
  const [staff, setStaff] = useState<Staff[]>([]);
  const [templates, setTemplates] = useState<AppraisalFormTemplate[]>([]);
  const [rules, setRules] = useState<AppraisalAssignmentRule[]>([]);
  const [openCycleName, setOpenCycleName] = useState<string | null>(null);
  const [readiness, setReadiness] = useState<CycleLaunchReadiness | null>(null);
  const [checking, setChecking] = useState(false);
  const [launching, setLaunching] = useState(false);
  const [previewId, setPreviewId] = useState<string | null>(null);

  const individual = APPRAISAL_TYPE_OPTIONS.find((o) => o.value === form.kind)?.individual ?? false;
  const templateById = useMemo(() => new Map(templates.map((t) => [t.id, t])), [templates]);

  useEffect(() => {
    if (!open) return;
    Promise.all([getAppraisalFormTemplates(), hrAppraisalService.getDefaultAssignments(), getHrAppraisalCycles()])
      .then(([tpls, defaults, cycles]) => {
        setTemplates(tpls);
        setRules(defaults);
        setOpenCycleName(cycles.find((c) => c.status === 'Open' && !c.isIndividual)?.name ?? null);
      })
      .catch((error) => toast.error(getApiErrorMessage(error, 'Could not load appraisal forms')));
  }, [open]);

  const reset = () => {
    setStep(0);
    setForm(defaultForm());
    setStaff([]);
    setReadiness(null);
    setLaunching(false);
  };

  const close = (next: boolean) => {
    if (!next) reset();
    onOpenChange(next);
  };

  const payloadBase = () => ({
    scopeCategories: form.scopeCategories.length ? form.scopeCategories : [...ALL_EMPLOYEE_CATEGORIES],
    formAssignments: rules,
    ...(individual ? { staffIds: staff.map((s) => s.id) } : {}),
  });

  useEffect(() => {
    if (!open || step !== 4) return;
    let cancelled = false;
    setChecking(true);
    hrAppraisalService
      .getCycleLaunchReadiness(payloadBase())
      .then((r) => !cancelled && setReadiness(r))
      .catch((error) => !cancelled && toast.error(getApiErrorMessage(error, 'Could not check who will be included')))
      .finally(() => !cancelled && setChecking(false));
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, step]);

  const canProceed = (): boolean => {
    if (step === 0) return !!(form.name.trim() && form.periodLabel.trim() && form.startDate && form.endDate && form.startDate <= form.endDate);
    if (step === 1) return individual ? staff.length > 0 : form.scopeCategories.length > 0;
    if (step === 2) return rules.length > 0;
    if (step === 3) return !!(form.selfDeadline && form.supervisorDeadline && form.selfDeadline <= form.supervisorDeadline);
    return !!readiness?.readyToLaunch;
  };

  const setKind = (kind: AppraisalCycleKind) => {
    const option = APPRAISAL_TYPE_OPTIONS.find((o) => o.value === kind)!;
    setForm((prev) => ({
      ...prev,
      kind,
      name: option.individual ? option.label : prev.name,
      closePreviousOpen: option.individual ? false : prev.closePreviousOpen,
    }));
  };

  const ruleTemplateId = (jobCategory: AppraisalJobCategory) => {
    const rule = rules.find((r) => (jobCategory === 'other' ? r.ruleType === 'default' : r.ruleType === 'jobCategory' && r.jobCategory === jobCategory));
    return rule?.templateId ?? '';
  };

  const setRuleTemplate = (jobCategory: AppraisalJobCategory, templateId: string) => {
    setRules((prev) => {
      const isTarget = (r: AppraisalAssignmentRule) =>
        jobCategory === 'other' ? r.ruleType === 'default' : r.ruleType === 'jobCategory' && r.jobCategory === jobCategory;
      const next = prev.filter((r) => !isTarget(r));
      if (templateId) {
        next.push(
          jobCategory === 'other' ? { ruleType: 'default', templateId } : { ruleType: 'jobCategory', jobCategory, templateId }
        );
      }
      // The default rule must stay last so specific rules are checked first.
      return [...next.filter((r) => r.ruleType !== 'default'), ...next.filter((r) => r.ruleType === 'default')];
    });
  };

  const launch = async () => {
    setLaunching(true);
    try {
      const cycle = await hrAppraisalService.createCycle({
        kind: form.kind,
        name: form.name.trim(),
        periodLabel: form.periodLabel.trim(),
        startDate: form.startDate,
        endDate: form.endDate,
        selfDeadline: form.selfDeadline,
        supervisorDeadline: form.supervisorDeadline,
        closePreviousOpen: !individual && form.closePreviousOpen,
        ...payloadBase(),
      });
      toast.success(`${cycle.name} opened — ${cycle.employeeCount} appraisal(s) created`);
      onLaunched();
      close(false);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not open the appraisal period'));
    } finally {
      setLaunching(false);
    }
  };

  const jobCategories = Object.keys(APPRAISAL_JOB_CATEGORY_LABELS) as AppraisalJobCategory[];

  return (
    <>
      <Dialog open={open} onOpenChange={close}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto overflow-x-hidden">
          <DialogHeader>
            <DialogTitle>New appraisal period</DialogTitle>
            <DialogDescription>
              Opens appraisals for staff. Each person fills in their Appraisal Information and self-rating, then
              their supervisor, HR and the Vice Chancellor sign it off.
            </DialogDescription>
          </DialogHeader>

          <ol className="flex gap-2 overflow-x-auto pb-1 text-xs">
            {STEPS.map((label, i) => (
              <li
                key={label}
                className={`flex-1 min-w-[90px] rounded-md border px-2 py-1.5 text-center ${
                  step === i ? 'border-[#015F2B] bg-green-50 font-semibold' : 'border-gray-200 text-gray-500'
                }`}
              >
                {i + 1}. {label}
              </li>
            ))}
          </ol>

          {step === 0 ? (
            <div className="space-y-4">
              <div>
                <Label htmlFor="nc-kind">Appraisal Type</Label>
                <select
                  id="nc-kind"
                  className="mt-1 w-full rounded-md border px-3 py-2 text-sm"
                  value={form.kind}
                  onChange={(e) => setKind(e.target.value as AppraisalCycleKind)}
                >
                  {APPRAISAL_TYPE_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                      {o.individual ? ' (selected staff)' : ''}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <Label htmlFor="nc-name">Name</Label>
                <Input id="nc-name" className="mt-1" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="nc-label">Period label</Label>
                <Input id="nc-label" className="mt-1" value={form.periodLabel} onChange={(e) => setForm({ ...form, periodLabel: e.target.value })} />
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <Label htmlFor="nc-from">Period of appraisal — from</Label>
                  <Input id="nc-from" type="date" className="mt-1" value={form.startDate} onChange={(e) => setForm({ ...form, startDate: e.target.value })} />
                </div>
                <div>
                  <Label htmlFor="nc-to">Period of appraisal — to</Label>
                  <Input id="nc-to" type="date" className="mt-1" value={form.endDate} onChange={(e) => setForm({ ...form, endDate: e.target.value })} />
                </div>
              </div>
              <p className="text-xs text-gray-500">Staff see these dates pre-filled on their Appraisal Information and can correct them.</p>
            </div>
          ) : null}

          {step === 1 ? (
            individual ? (
              <div className="space-y-3">
                <p className="text-sm text-gray-600">Choose the staff member(s) to appraise.</p>
                <StaffSearchPicker
                  excludeIds={staff.map((s) => s.id)}
                  onPick={(s) => setStaff((prev) => [...prev, s])}
                />
                <div className="flex flex-wrap gap-2">
                  {staff.map((s) => (
                    <Badge key={s.id} variant="secondary" className="gap-1 py-1">
                      {s.firstName} {s.lastName}
                      <button type="button" aria-label={`Remove ${s.firstName}`} onClick={() => setStaff((prev) => prev.filter((p) => p.id !== s.id))}>
                        <X className="h-3 w-3" />
                      </button>
                    </Badge>
                  ))}
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <p className="text-sm text-gray-600">Active staff in these categories get an appraisal.</p>
                <div className="grid gap-2 sm:grid-cols-2">
                  {ALL_EMPLOYEE_CATEGORIES.map((cat) => (
                    <label key={cat} className="flex items-center gap-2 rounded-md border p-3 text-sm cursor-pointer">
                      <Checkbox
                        checked={form.scopeCategories.includes(cat)}
                        onCheckedChange={(checked) =>
                          setForm((prev) => ({
                            ...prev,
                            scopeCategories: checked
                              ? [...prev.scopeCategories, cat]
                              : prev.scopeCategories.filter((c) => c !== cat),
                          }))
                        }
                      />
                      {EMPLOYEE_CATEGORY_LABELS[cat]}
                    </label>
                  ))}
                </div>
                <label className="flex items-start gap-2 rounded-md border p-3 text-sm cursor-pointer">
                  <Checkbox
                    checked={form.closePreviousOpen}
                    onCheckedChange={(checked) => setForm({ ...form, closePreviousOpen: checked === true })}
                  />
                  <span>
                    Close the currently open appraisal period
                    <span className="block text-xs text-gray-500">
                      {openCycleName ? `Closes "${openCycleName}".` : 'No appraisal period is open.'} Individual reviews are not affected.
                    </span>
                  </span>
                </label>
              </div>
            )
          ) : null}

          {step === 2 ? (
            <div className="space-y-3">
              <p className="text-sm text-gray-600">
                Each staff member gets the form for their job category, as before. Heads of department, the Registrar,
                Librarian, ICT Manager, Lab Technologists and Director Finance are recognised from their post; academic
                staff from their rank.
              </p>
              <div className="rounded-md border divide-y">
                {jobCategories.map((jc) => {
                  const templateId = ruleTemplateId(jc);
                  return (
                    <div key={jc} className="flex flex-col gap-2 p-2 sm:flex-row sm:items-center">
                      <span className="sm:w-48 text-sm font-medium">{APPRAISAL_JOB_CATEGORY_LABELS[jc]}</span>
                      <select
                        aria-label={`Form for ${APPRAISAL_JOB_CATEGORY_LABELS[jc]}`}
                        className="min-w-0 w-full flex-1 truncate rounded-md border px-2 py-1.5 text-sm"
                        value={templateId}
                        onChange={(e) => setRuleTemplate(jc, e.target.value)}
                      >
                        <option value="">— Select form —</option>
                        {templates.map((t) => (
                          <option key={t.id} value={t.id}>
                            {t.name}
                          </option>
                        ))}
                      </select>
                      {templateId ? (
                        <Button type="button" variant="ghost" size="sm" onClick={() => setPreviewId(templateId)} aria-label="Preview form">
                          <Eye className="h-4 w-4" />
                        </Button>
                      ) : null}
                    </div>
                  );
                })}
              </div>
            </div>
          ) : null}

          {step === 3 ? (
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="nc-self">Self-assessment deadline</Label>
                <Input id="nc-self" type="date" className="mt-1" value={form.selfDeadline} onChange={(e) => setForm({ ...form, selfDeadline: e.target.value })} />
              </div>
              <div>
                <Label htmlFor="nc-sup">Supervisor rating deadline</Label>
                <Input id="nc-sup" type="date" className="mt-1" value={form.supervisorDeadline} onChange={(e) => setForm({ ...form, supervisorDeadline: e.target.value })} />
              </div>
              <p className="sm:col-span-2 text-xs text-gray-500">
                HR and the Vice Chancellor sign off after the supervisor; there is no fixed deadline for those steps.
              </p>
            </div>
          ) : null}

          {step === 4 ? (
            <div className="space-y-4 text-sm">
              <dl className="grid grid-cols-2 gap-2 rounded-md border p-4">
                <dt className="text-gray-500">Appraisal type</dt>
                <dd>{APPRAISAL_TYPE_OPTIONS.find((o) => o.value === form.kind)?.label}</dd>
                <dt className="text-gray-500">Name</dt>
                <dd>{form.name}</dd>
                <dt className="text-gray-500">Period</dt>
                <dd>
                  {form.startDate} to {form.endDate}
                </dd>
                <dt className="text-gray-500">Staff to appraise</dt>
                <dd>{checking ? 'Checking…' : readiness?.eligibleCount ?? '—'}</dd>
                <dt className="text-gray-500">Self-assessment due</dt>
                <dd>{form.selfDeadline}</dd>
                <dt className="text-gray-500">Supervisors due</dt>
                <dd>{form.supervisorDeadline}</dd>
              </dl>
              {readiness?.missingSupervisorCount ? (
                <div className="rounded-md border border-amber-300 bg-amber-50 p-4 text-amber-950 space-y-2">
                  <p className="font-medium">
                    {readiness.missingSupervisorCount} staff member(s) have no supervisor on the organisation chart.
                  </p>
                  <p>
                    Their appraisals are still created. Assign a supervisor from Staff Progress before they submit, or fix
                    the reporting line in the organisation chart.
                  </p>
                  <ul className="list-disc pl-5">
                    {readiness.missingSupervisors.slice(0, 8).map((label) => (
                      <li key={label}>{label}</li>
                    ))}
                  </ul>
                  <Button variant="outline" size="sm" asChild>
                    <Link to="/hr/employees?supervision=missing" onClick={() => close(false)}>
                      Open employee directory
                    </Link>
                  </Button>
                </div>
              ) : null}
              {readiness && !readiness.readyToLaunch ? (
                <p className="rounded-md bg-red-50 p-3 text-red-800">Nobody matches this selection.</p>
              ) : null}
            </div>
          ) : null}

          <DialogFooter className="flex-col sm:flex-row gap-2">
            {step > 0 ? (
              <Button variant="outline" onClick={() => setStep(step - 1)}>
                <ChevronLeft className="h-4 w-4 mr-1" /> Back
              </Button>
            ) : (
              <Button variant="outline" onClick={() => close(false)}>
                Cancel
              </Button>
            )}
            <div className="flex-1" />
            {step < STEPS.length - 1 ? (
              <Button disabled={!canProceed()} onClick={() => setStep(step + 1)}>
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            ) : (
              <Button disabled={launching || checking || !canProceed()} onClick={launch}>
                <Rocket className="h-4 w-4 mr-2" /> {launching ? 'Opening…' : 'Open appraisal period'}
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!previewId} onOpenChange={() => setPreviewId(null)}>
        <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
          {previewId && templateById.get(previewId) ? (
            <>
              <DialogHeader>
                <DialogTitle>Form preview</DialogTitle>
                <DialogDescription>{templateById.get(previewId)!.name}</DialogDescription>
              </DialogHeader>
              <HrAppraisalFormPreview template={templateById.get(previewId)!} />
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
