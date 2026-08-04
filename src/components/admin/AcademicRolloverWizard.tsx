import { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router';
import { CheckCircle2, ChevronRight, Loader2, Wand2 } from 'lucide-react';
import { toast } from 'sonner';
import {
  academicService,
  type AcademicTerm,
  type GenerateClassListsResult,
  type PromoteStudentsResult,
  type RegisterStudentsResult,
} from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RegistrationPolicy = 'auto' | 'hybrid' | 'self' | 'none';

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
  promote: { promoted: number; heldBack: number; completedCandidates: number } | null;
  classLists: { created: number; skippedExisting: number } | null;
  register: {
    policy: string;
    enrolled: number;
    studentsRegistered: number;
    registrationOpened: boolean;
  } | null;
  steps: Array<{ step: string; status: string }>;
};

function parseHoldbackIds(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

function suggestNextTerm(active: AcademicTerm | null) {
  const yearNow = new Date().getFullYear();
  if (!active) {
    return {
      name: `Academic Year ${yearNow} — Semester 1`,
      academicYear: String(yearNow),
      semester: '1',
      startDate: `${yearNow}-01-15`,
      endDate: `${yearNow}-05-30`,
    };
  }
  if (active.semester === 1) {
    return {
      name: `Academic Year ${active.academicYear} — Semester 2`,
      academicYear: String(active.academicYear),
      semester: '2',
      startDate: `${active.academicYear}-07-01`,
      endDate: `${active.academicYear}-12-15`,
    };
  }
  const nextYear = active.academicYear + 1;
  return {
    name: `Academic Year ${nextYear} — Semester 1`,
    academicYear: String(nextYear),
    semester: '1',
    startDate: `${nextYear}-01-15`,
    endDate: `${nextYear}-05-30`,
  };
}

const STEPS = [
  'Close',
  'Next term',
  'Publish offerings',
  'Promote',
  'Register',
  'Review',
] as const;

export function AcademicRolloverWizard({ onCompleted }: { onCompleted?: () => void }) {
  const navigate = useNavigate();
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [active, setActive] = useState<AcademicTerm | null>(null);
  const [step, setStep] = useState(0);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState<WizardPreview | null>(null);
  const [result, setResult] = useState<WizardResult | null>(null);
  const [holdbackRaw, setHoldbackRaw] = useState('');
  const [closeTermId, setCloseTermId] = useState<string>('');
  const [classListMode, setClassListMode] = useState<'clone-from-term' | 'from-curriculum'>(
    'clone-from-term'
  );
  const [registrationPolicy, setRegistrationPolicy] = useState<RegistrationPolicy>('auto');
  const [skipPromote, setSkipPromote] = useState(false);
  const [skipClassLists, setSkipClassLists] = useState(false);
  const [skipRegister, setSkipRegister] = useState(false);
  const [form, setForm] = useState(suggestNextTerm(null));

  const load = async () => {
    try {
      const [rows, activeTerm] = await Promise.all([
        academicService.getAcademicTerms(),
        academicService.getActiveAcademicTerm(),
      ]);
      setTerms(rows);
      setActive(activeTerm);
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
  }, []);

  const closeable = useMemo(
    () => terms.filter((t) => t.status === 'Active' || t.status === 'Draft'),
    [terms]
  );

  const payload = () => ({
    closeTermId: closeTermId || undefined,
    includeUnscopedActiveClasses: true,
    nextTerm: {
      name: form.name.trim(),
      academicYear: Number(form.academicYear),
      semester: Number(form.semester) as 1 | 2,
      startDate: form.startDate,
      endDate: form.endDate,
    },
    holdbackStudentIds: parseHoldbackIds(holdbackRaw),
    classListMode,
    sourceTermId: closeTermId || undefined,
    skipPromote,
    skipClassLists,
    skipRegister: skipRegister || registrationPolicy === 'none',
    registrationPolicy,
    openRegistration: registrationPolicy === 'self' || registrationPolicy === 'hybrid',
  });

  const runPreview = async () => {
    setBusy(true);
    try {
      const data = await academicService.previewRolloverWizard(payload());
      setPreview(data);
      setResult(null);
      toast.success('Rollover preview ready');
      setStep(5);
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
      setStep(5);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Rollover failed'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Card className="border-[#015F2B]/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Wand2 className="h-5 w-5 text-[#015F2B]" /> Semester rollover wizard
        </CardTitle>
        <CardDescription>
          Industry flow: close → activate next term → publish offerings → promote (standing only) →
          register by policy → timetable. Admin / academic.write only.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-2">
          {STEPS.map((label, i) => (
            <button
              key={label}
              type="button"
              onClick={() => setStep(i)}
              className={`text-xs px-2.5 py-1 rounded-md border ${
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
            <Button onClick={() => setStep(1)} className="bg-[#015F2B] hover:bg-[#014a22]">
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
                <Label>Semester</Label>
                <Select
                  value={form.semester}
                  onValueChange={(v) => setForm({ ...form, semester: v })}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="1">Semester 1</SelectItem>
                    <SelectItem value="2">Semester 2</SelectItem>
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
              <Button variant="outline" onClick={() => setStep(0)}>
                Back
              </Button>
              <Button onClick={() => setStep(2)} className="bg-[#015F2B] hover:bg-[#014a22]">
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
              <Button variant="outline" onClick={() => setStep(1)}>
                Back
              </Button>
              <Button onClick={() => setStep(3)} className="bg-[#015F2B] hover:bg-[#014a22]">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Promote updates year/semester and marks students registration-eligible. It does not
              enroll into classes (that is the Register step).
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
              <div>
                <Label htmlFor="wiz-holdbacks">Holdback student IDs (optional)</Label>
                <Textarea
                  id="wiz-holdbacks"
                  className="mt-1 font-mono text-xs"
                  rows={3}
                  placeholder="Paste student UUIDs, one per line"
                  value={holdbackRaw}
                  onChange={(e) => setHoldbackRaw(e.target.value)}
                />
              </div>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(2)}>
                Back
              </Button>
              <Button onClick={() => setStep(4)} className="bg-[#015F2B] hover:bg-[#014a22]">
                Next <ChevronRight className="h-4 w-4 ml-1" />
              </Button>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Auto: enroll eligible students into Auto (required) courses. Hybrid: Auto plus open
              student self-enrollment for Self courses. Self: open registration window only. None:
              skip seating.
            </p>
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
                <Label>Registration policy</Label>
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
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => setStep(3)}>
                Back
              </Button>
              <Button
                onClick={runPreview}
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
                        ? `${preview.promote.toPromote} to promote · ${preview.promote.heldBack} holdbacks · ${preview.promote.completedCandidates} completed`
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
                  {result.promote?.promoted ?? 0} · Auto seats: {result.register?.enrolled ?? 0}
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
                <Button variant="outline" onClick={() => setStep(4)} disabled={busy}>
                  Back
                </Button>
                <Button variant="outline" onClick={runPreview} disabled={busy}>
                  Refresh preview
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
