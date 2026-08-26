import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, ChevronRight, Loader2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  academicService,
  type AcademicTerm,
  type GenerateClassListsResult,
  type PromoteStudentsResult,
  type RegisterStudentsResult,
} from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';
import { downloadCsv } from '@/lib/academic-term-scope';
import { useAcademicRolloverPromoteState } from '@/lib/academic-rollover-promote';
import {
  DEFAULT_CLASS_LIST_MODE,
  DEFAULT_REGISTRATION_POLICY,
  DEFAULT_SKIP_CLASS_LISTS,
  DEFAULT_SKIP_PROMOTE,
  DEFAULT_SKIP_REGISTER,
  type RegistrationPolicy,
} from '@/lib/academic-rollover-defaults';
import {
  ROLLOVER_WIZARD_STEPS,
  buildRolloverPreviewCsvRows,
  buildRolloverWizardPayload,
  isRegisterBlockedByOfferings,
  suggestNextTerm,
} from '@/lib/academic-rollover-wizard';
import { AcademicRolloverPromoteForm } from '@/components/admin/AcademicRolloverPromoteForm';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type WizardPreview = {
  closeTermId: string | null;
  close: {
    term: AcademicTerm;
    classesToDeactivate: number;
    linkedActiveClassCount: number;
    unscopedActiveClassCount: number;
  } | null;
  nextTerm: {
    name: string;
    academicYear: number;
    semester: number;
    startDate: string;
    endDate: string;
  };
  promote: PromoteStudentsResult | null;
  classLists: GenerateClassListsResult | null;
  register: RegisterStudentsResult | null;
  classListMode: 'clone-from-term' | 'from-curriculum';
  registrationPolicy: RegistrationPolicy;
  skipPromote: boolean;
  skipClassLists: boolean;
  skipRegister: boolean;
  notes: string[];
};

type WizardResult = {
  nextTermId: string;
  nextTermName: string;
  timetableHandoff: string;
  promote: { promoted: number; heldBack: number; completedCandidates: number; skippedAlreadyPromoted?: number } | null;
  classLists: { created: number; skippedExisting: number } | null;
  register: {
    policy: string;
    enrolled: number;
    studentsRegistered: number;
    registrationOpened: boolean;
  } | null;
  steps: Array<{ step: string; status: string }>;
};

export function AcademicRolloverWizard({ onCompleted }: { onCompleted?: () => void }) {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [active, setActive] = useState<AcademicTerm | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<WizardPreview | null>(null);
  const [result, setResult] = useState<WizardResult | null>(null);
  const promote = useAcademicRolloverPromoteState();
  const [closeTermId, setCloseTermId] = useState<string>('');
  const [classListMode, setClassListMode] = useState(DEFAULT_CLASS_LIST_MODE);
  const [registrationPolicy, setRegistrationPolicy] = useState<RegistrationPolicy>(
    DEFAULT_REGISTRATION_POLICY
  );
  const [skipPromote, setSkipPromote] = useState(DEFAULT_SKIP_PROMOTE);
  const [skipClassLists, setSkipClassLists] = useState(DEFAULT_SKIP_CLASS_LISTS);
  const [skipRegister, setSkipRegister] = useState(DEFAULT_SKIP_REGISTER);
  const [registerNoOfferingsOverride, setRegisterNoOfferingsOverride] = useState(false);
  const [maxStepReached, setMaxStepReached] = useState(0);
  const [form, setForm] = useState(suggestNextTerm(null));

  const [programs, setPrograms] = useState<Array<{ id: string; name: string; code?: string }>>([]);

  const [readiness, setReadiness] = useState<{
    hasActiveTerm: boolean;
    unscopedActiveClassCount: number;
    activeClassCount: number;
    activeStudentCount: number;
  } | null>(null);

  const load = async () => {
    try {
      const [rows, activeTerm, ready] = await Promise.all([
        academicService.getAcademicTerms(),
        academicService.getActiveAcademicTerm(),
        academicService.getRolloverReadiness(),
      ]);
      setTerms(rows);
      setActive(activeTerm);
      setReadiness(ready);
      if (activeTerm) {
        setCloseTermId(activeTerm.id);
        setForm(suggestNextTerm(activeTerm));
      } else {
        const closed = rows.find((t) => t.status === 'Closed');
        if (closed) setCloseTermId(closed.id);
        setForm(suggestNextTerm(null));
      }
    } catch {
      setTerms([]);
      setActive(null);
    }
  };

  useEffect(() => {
    load();
    academicService
      .getPrograms()
      .then((rows) => {
        const list = Array.isArray(rows) ? rows : (rows as { data?: unknown[] })?.data ?? [];
        setPrograms(
          (list as Array<{ id: string; name: string; code?: string }>).map((p) => ({
            id: p.id,
            name: p.name,
            code: p.code,
          }))
        );
      })
      .catch(() => setPrograms([]));
  }, []);

  const closeable = useMemo(
    () => terms.filter((t) => t.status === 'Active' || t.status === 'Draft'),
    [terms]
  );

  const payload = () =>
    buildRolloverWizardPayload({
      closeTermId,
      form,
      promotePayload: promote.buildPayload(),
      classListMode,
      skipPromote,
      skipClassLists,
      skipRegister,
      registrationPolicy,
    });

  const runPreview = async () => {
    setBusy(true);
    try {
      const data = await academicService.previewRolloverWizard(payload());
      setPreview(data);
      setResult(null);
      toast.success('Rollover preview ready');
      goToStep(5);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not preview rollover'));
    } finally {
      setBusy(false);
    }
  };

  const runExecute = async () => {
    if (!preview) {
      toast.error('Run preview first');
      return;
    }
    const ok = window.confirm(
      `Run semester rollover?\n\n` +
        `Close: ${preview.close?.term.name ?? 'none'}\n` +
        `Next: ${preview.nextTerm.name}\n` +
        `Publish offerings: ${preview.classLists?.created ?? 0} to create\n` +
        `Promote: ${preview.promote?.toPromote ?? 0} students\n` +
        `Register policy: ${preview.registrationPolicy}\n\n` +
        `This writes an audit log entry.`
    );
    if (!ok) return;

    setBusy(true);
    try {
      const data = await academicService.executeRolloverWizard(payload());
      setResult(data as WizardResult);
      toast.success(`Rollover complete — ${data.nextTermName}`);
      await load();
      onCompleted?.();
      goToStep(5);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Rollover failed'));
    } finally {
      setBusy(false);
    }
  };

  const goToStep = (next: number) => {
    setStep(next);
    setMaxStepReached((prev) => Math.max(prev, next));
  };

  const downloadPreviewCsv = () => {
    if (!preview) return;
    downloadCsv(
      `rollover-preview-${preview.nextTerm.name.replace(/\s+/g, '-')}.csv`,
      buildRolloverPreviewCsvRows(preview)
    );
  };

  const registerBlockedByOfferings = isRegisterBlockedByOfferings({
    skipRegister,
    registrationPolicy,
    skipClassLists,
    preview,
  });

  return (
    <Card>
      <CardHeader>
        <CardTitle>Semester rollover</CardTitle>
        <CardDescription>Close the current term and open the next one.</CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {ROLLOVER_WIZARD_STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => {
                if (i <= maxStepReached) goToStep(i);
              }}
              disabled={i > maxStepReached}
              className={`text-xs px-2.5 py-1 rounded-md border disabled:opacity-40 disabled:cursor-not-allowed ${
                step === i
                  ? 'bg-[#015F2B] text-white border-[#015F2B]'
                  : 'bg-background text-muted-foreground'
              }`}
            >
              {i + 1}. {label}
            </button>
          ))}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {readiness ? (
          <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
            <p className="font-medium">Preconditions</p>
            <p>
              Active term:{' '}
              <strong>{readiness.hasActiveTerm ? active?.name ?? 'yes' : 'none — create or activate first'}</strong>
            </p>
            <p>
              Active-term classes: <strong>{readiness.activeClassCount}</strong> · Active students:{' '}
              <strong>{readiness.activeStudentCount}</strong>
            </p>
            {readiness.unscopedActiveClassCount > 0 ? (
              <p className="text-amber-800">
                {readiness.unscopedActiveClassCount} unscoped active class(es) — attach from Terms
                before closing.
              </p>
            ) : null}
          </div>
        ) : null}
        {step === 0 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Closing freezes the previous term and deactivates its classes. Historical attendance is
              kept. Registration on that term is closed.
            </p>
            <div>
              <Label>Term to close</Label>
              <Select
                value={closeTermId || '__none__'}
                onValueChange={(v) => setCloseTermId(v === '__none__' ? '' : v)}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="None" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__">None (skip close)</SelectItem>
                  {closeable.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name} ({t.status})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button onClick={() => goToStep(1)} className="bg-[#015F2B] hover:bg-[#014a22]">
              Next <ChevronRight className="h-4 w-4 ml-1" />
            </Button>
          </div>
        )}

        {step === 1 && (
          <div className="space-y-3">
            <div>
              <Label htmlFor="wiz-name">Next term name</Label>
              <Input
                id="wiz-name"
                className="mt-1"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Academic year</Label>
                <Input
                  type="number"
                  className="mt-1"
                  value={form.academicYear}
                  onChange={(e) => setForm({ ...form, academicYear: e.target.value })}
                />
              </div>
              <div>
                <LabelWithInfo info="Both lets Sem 1 and Sem 2 classes share this term. Student year/semester is still advanced under Promote.">
                  Coverage
                </LabelWithInfo>
                <Select
                  value={form.semester}
                  onValueChange={(v) => setForm({ ...form, semester: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="0">Both (Sem 1 & Sem 2)</SelectItem>
                    <SelectItem value="1">Semester 1 only</SelectItem>
                    <SelectItem value="2">Semester 2 only</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Start date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.startDate}
                  onChange={(e) => setForm({ ...form, startDate: e.target.value })}
                />
              </div>
              <div>
                <Label>End date</Label>
                <Input
                  type="date"
                  className="mt-1"
                  value={form.endDate}
                  onChange={(e) => setForm({ ...form, endDate: e.target.value })}
                />
              </div>
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToStep(0)}>
                Back
              </Button>
              <Button onClick={() => goToStep(2)} className="bg-[#015F2B] hover:bg-[#014a22]">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Publish class offerings for the new Active term (clone previous term or build from
              curriculum). Enrollment happens later in Register — not here.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipClassLists}
                onChange={(e) => setSkipClassLists(e.target.checked)}
              />
              Skip publish offerings (use Timetable Builder / manual create later)
            </label>
            {!skipClassLists ? (
              <div>
                <Label>Publish mode</Label>
                <Select
                  value={classListMode}
                  onValueChange={(v) => setClassListMode(v as 'clone-from-term' | 'from-curriculum')}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="clone-from-term">Clone from closed term</SelectItem>
                    <SelectItem value="from-curriculum">From curriculum + intakes</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToStep(1)}>
                Back
              </Button>
              <Button onClick={() => goToStep(3)} className="bg-[#015F2B] hover:bg-[#014a22]">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Update student standing for the next period.
            </p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipPromote}
                onChange={(e) => setSkipPromote(e.target.checked)}
              />
              Skip promote step
            </label>
            {!skipPromote ? (
              <AcademicRolloverPromoteForm
                programs={programs}
                promoteProgramId={promote.promoteProgramId}
                onPromoteProgramIdChange={promote.setPromoteProgramId}
                promoteYear={promote.promoteYear}
                onPromoteYearChange={promote.setPromoteYear}
                promoteSemester={promote.promoteSemester}
                onPromoteSemesterChange={promote.setPromoteSemester}
                holdbackGroups={promote.holdbackGroups}
                onRemoveHoldbackGroup={(g) => promote.removeHoldbackGroup(g)}
                holdbackRaw={promote.holdbackRaw}
                onHoldbackRawChange={promote.setHoldbackRaw}
                groupProgramId={promote.groupProgramId}
                onGroupProgramIdChange={promote.setGroupProgramId}
                groupYear={promote.groupYear}
                onGroupYearChange={promote.setGroupYear}
                groupSemester={promote.groupSemester}
                onGroupSemesterChange={promote.setGroupSemester}
                groupReason={promote.groupReason}
                onGroupReasonChange={promote.setGroupReason}
            onAddHoldbackGroup={() => promote.addHoldbackGroup(programs)}
            onResetHoldbackDraft={promote.resetHoldbackGroupDraft}
            holdbackTextareaId="wiz-holdbacks"
              />
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToStep(2)}>
                Back
              </Button>
              <Button onClick={() => goToStep(4)} className="bg-[#015F2B] hover:bg-[#014a22]">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">Seat students into Active-term offerings.</p>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={skipRegister}
                onChange={(e) => setSkipRegister(e.target.checked)}
              />
              Skip register step
            </label>
            {!skipRegister ? (
              <div>
                <LabelWithInfo info="Auto enrolls required courses. Hybrid also opens self-registration for elective/Self courses. Self opens the registration window only.">
                  Registration policy
                </LabelWithInfo>
                <Select
                  value={registrationPolicy}
                  onValueChange={(v) => setRegistrationPolicy(v as RegistrationPolicy)}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="auto">Auto (required courses)</SelectItem>
                    <SelectItem value="hybrid">Hybrid (auto + open self window)</SelectItem>
                    <SelectItem value="self">Self only (open registration window)</SelectItem>
                    <SelectItem value="none">None</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            {registerBlockedByOfferings ? (
              <label className="flex items-center gap-2 text-sm text-amber-900">
                <input
                  type="checkbox"
                  checked={registerNoOfferingsOverride}
                  onChange={(e) => setRegisterNoOfferingsOverride(e.target.checked)}
                />
                No offerings detected in preview — confirm register anyway
              </label>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => goToStep(3)}>
                Back
              </Button>
              <Button
                onClick={async () => {
                  if (registerBlockedByOfferings && !registerNoOfferingsOverride) {
                    toast.error('Confirm register without offerings or run preview after publishing offerings.');
                    return;
                  }
                  await runPreview();
                  goToStep(5);
                }}
                disabled={busy}
                className="bg-[#015F2B] hover:bg-[#014a22]"
              >
                {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                Preview & review
              </Button>
            </div>
          </div>
        )}

        {step === 5 && (
          <div className="space-y-3">
            {preview ? (
              <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-2">
                <p>
                  Close:{' '}
                  <strong>
                    {preview.close
                      ? `${preview.close.term.name} (${preview.close.classesToDeactivate} classes)`
                      : 'skipped'}
                  </strong>
                </p>
                <p>
                  Next term: <strong>{preview.nextTerm.name}</strong>
                </p>
                <p>
                  Publish offerings:{' '}
                  <strong>
                    {preview.skipClassLists
                      ? 'skipped'
                      : preview.classLists
                        ? `${preview.classLists.created} would create · ${preview.classLists.skippedExisting} skip`
                        : 'unavailable until after activate'}
                  </strong>
                </p>
                <p>
                  Promote:{' '}
                  <strong>
                    {preview.skipPromote
                      ? 'skipped'
                      : preview.promote
                        ? `${preview.promote.toPromote} to promote · ${preview.promote.heldBack} holdbacks · ${preview.promote.completedCandidates} completed${preview.promote.skippedAlreadyPromoted > 0 ? ` · ${preview.promote.skippedAlreadyPromoted} already promoted this term` : ''}${(preview.promote.skippedWrongCohort ?? 0) > 0 ? ` · ${preview.promote.skippedWrongCohort} wrong cohort` : ''}`
                        : 'unavailable (no Active term for preview)'}
                  </strong>
                </p>
                <p>
                  Register:{' '}
                  <strong>
                    {preview.skipRegister
                      ? 'skipped'
                      : preview.register
                        ? `policy ${preview.register.policy} · ~${preview.register.studentsConsidered} students · open window: ${preview.register.registrationOpened ? 'yes' : 'no'}`
                        : `policy ${preview.registrationPolicy}`}
                  </strong>
                </p>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                Complete the earlier steps and run Preview & review.
              </p>
            )}

            {result ? (
              <div className="rounded-md border border-green-200 bg-green-50 p-3 text-sm space-y-2">
                <p className="flex items-center gap-2 font-medium text-green-900">
                  <CheckCircle2 className="h-4 w-4" /> Rollover finished — {result.nextTermName}
                </p>
                <p>
                  Offerings created: {result.classLists?.created ?? 0} · Promoted:{' '}
                  {result.promote?.promoted ?? 0}
                  {(result.promote?.skippedAlreadyPromoted ?? 0) > 0
                    ? ` · Skipped (already promoted): ${result.promote?.skippedAlreadyPromoted}`
                    : ''}{' '}
                  · Auto seats: {result.register?.enrolled ?? 0}
                  {result.register?.registrationOpened ? ' · Self-registration opened' : ''}
                </p>
                <p className="text-muted-foreground">Audit log: entity AcademicTermRollover</p>
                <Button
                  className="bg-[#015F2B] hover:bg-[#014a22]"
                  onClick={() => navigate(result.timetableHandoff || '/timetable-builder')}
                >
                  Open Timetable Builder
                </Button>
              </div>
            ) : (
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" onClick={() => goToStep(4)} disabled={busy}>
                  Back
                </Button>
                <Button variant="outline" onClick={runPreview} disabled={busy}>
                  Refresh preview
                </Button>
                <Button variant="outline" onClick={downloadPreviewCsv} disabled={!preview}>
                  Download CSV
                </Button>
                <Button
                  className="bg-[#015F2B] hover:bg-[#014a22]"
                  disabled={busy || !preview}
                  onClick={runExecute}
                >
                  {busy ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                  Execute rollover
                </Button>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
