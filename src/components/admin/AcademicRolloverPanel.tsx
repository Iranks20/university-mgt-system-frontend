import { useEffect, useState } from 'react';
import { ArrowUpRight, Layers, UserCheck } from 'lucide-react';
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
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

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

function PromoteSummary({ result }: { result: PromoteStudentsResult }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
      <p>
        Active students: <strong>{result.totalActiveStudents}</strong>
      </p>
      <p>
        To promote: <strong>{result.toPromote}</strong>
        {result.dryRun ? '' : ` · promoted: ${result.promoted}`}
      </p>
      <p>Held back: {result.heldBack}</p>
      <p>Completed (end of program): {result.completedCandidates}</p>
      {result.skippedNoProgram > 0 ? <p>Skipped (no program): {result.skippedNoProgram}</p> : null}
      {result.errors.length > 0 ? (
        <p className="text-destructive">Errors: {result.errors.slice(0, 5).join('; ')}</p>
      ) : null}
      {result.samples.promote.length > 0 ? (
        <ul className="mt-2 text-muted-foreground list-disc pl-4 max-h-28 overflow-auto">
          {result.samples.promote.map((s) => (
            <li key={s.id}>
              {s.studentNumber}: {s.from} → {s.to}
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function ClassListSummary({ result }: { result: GenerateClassListsResult }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
      <p>
        Mode: <strong>{result.mode}</strong>
      </p>
      <p>Source classes / courses scanned: {result.sourceClassCount}</p>
      <p>
        {result.dryRun ? 'Would create' : 'Created'}: <strong>{result.created}</strong>
      </p>
      <p>Skipped (already exist): {result.skippedExisting}</p>
      {result.errors.length > 0 ? (
        <p className="text-destructive">Errors: {result.errors.slice(0, 5).join('; ')}</p>
      ) : null}
      {result.samples.length > 0 ? (
        <ul className="mt-2 text-muted-foreground list-disc pl-4 max-h-28 overflow-auto">
          {result.samples.map((s, i) => (
            <li key={`${s.courseId}-${i}`}>
              {s.name} ({s.action})
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function RegisterSummary({ result }: { result: RegisterStudentsResult }) {
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
      <p>
        Policy: <strong>{result.policy}</strong>
      </p>
      <p>Students considered: {result.studentsConsidered}</p>
      <p>
        {result.dryRun ? 'Would enroll seats' : 'Enrolled seats'}: <strong>{result.enrolled}</strong>
      </p>
      <p>Registration window opened: {result.registrationOpened ? 'yes' : 'no'}</p>
      {result.errors.length > 0 ? (
        <p className="text-destructive">Errors: {result.errors.slice(0, 5).join('; ')}</p>
      ) : null}
    </div>
  );
}

export function AcademicRolloverPanel() {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [holdbackRaw, setHoldbackRaw] = useState('');
  const [promotePreview, setPromotePreview] = useState<PromoteStudentsResult | null>(null);
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [classMode, setClassMode] = useState<'clone-from-term' | 'from-curriculum'>(
    'clone-from-term'
  );
  const [sourceTermId, setSourceTermId] = useState<string>('');
  const [classPreview, setClassPreview] = useState<GenerateClassListsResult | null>(null);
  const [classBusy, setClassBusy] = useState(false);
  const [regPolicy, setRegPolicy] = useState<'auto' | 'hybrid' | 'self'>('auto');
  const [regPreview, setRegPreview] = useState<RegisterStudentsResult | null>(null);
  const [regBusy, setRegBusy] = useState(false);

  useEffect(() => {
    academicService
      .getAcademicTerms()
      .then((rows) => {
        setTerms(rows);
        const closed = rows.find((t) => t.status === 'Closed');
        if (closed) setSourceTermId(closed.id);
      })
      .catch(() => setTerms([]));
  }, []);

  const closedTerms = terms.filter((t) => t.status === 'Closed');
  const hasActive = terms.some((t) => t.status === 'Active');

  const runPromotePreview = async () => {
    setPromoteBusy(true);
    try {
      const data = await academicService.previewPromoteStudents({
        holdbackStudentIds: parseHoldbackIds(holdbackRaw),
      });
      setPromotePreview(data);
      toast.success('Promote preview ready');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not preview promote'));
    } finally {
      setPromoteBusy(false);
    }
  };

  const runPromote = async () => {
    if (!promotePreview) {
      toast.error('Run preview first');
      return;
    }
    const ok = window.confirm(
      `Promote ${promotePreview.toPromote} student(s)?\n` +
        `${promotePreview.heldBack} held back · ${promotePreview.completedCandidates} marked Completed.\n` +
        `Year/semester only — use Register to seat students.`
    );
    if (!ok) return;

    setPromoteBusy(true);
    try {
      const data = await academicService.promoteStudents({
        holdbackStudentIds: parseHoldbackIds(holdbackRaw),
      });
      setPromotePreview(data);
      toast.success(`Promoted ${data.promoted} student(s)`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not promote students'));
    } finally {
      setPromoteBusy(false);
    }
  };

  const classPayload = () => ({
    mode: classMode,
    autoEnrollOnCreate: false,
    ...(classMode === 'clone-from-term' && sourceTermId ? { sourceTermId } : {}),
  });

  const runClassPreview = async () => {
    setClassBusy(true);
    try {
      const data = await academicService.previewClassLists(classPayload());
      setClassPreview(data);
      toast.success('Offerings preview ready');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not preview offerings'));
    } finally {
      setClassBusy(false);
    }
  };

  const runClassGenerate = async () => {
    if (!classPreview) {
      toast.error('Run preview first');
      return;
    }
    const ok = window.confirm(
      `Publish ${classPreview.created} class offering(s) on the Active term?\n` +
        `Existing matching offerings will be skipped. Students are not enrolled here.`
    );
    if (!ok) return;

    setClassBusy(true);
    try {
      const data = await academicService.generateClassLists(classPayload());
      setClassPreview(data);
      toast.success(`Published ${data.created} offering(s)`);
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not publish offerings'));
    } finally {
      setClassBusy(false);
    }
  };

  const runRegPreview = async () => {
    setRegBusy(true);
    try {
      const data = await academicService.previewRegisterStudents({
        policy: regPolicy,
        openRegistration: regPolicy === 'hybrid' || regPolicy === 'self',
      });
      setRegPreview(data);
      toast.success('Register preview ready');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not preview registration'));
    } finally {
      setRegBusy(false);
    }
  };

  const runRegister = async () => {
    if (!regPreview) {
      toast.error('Run preview first');
      return;
    }
    const ok = window.confirm(
      `Run registration (${regPolicy})?\n` +
        `Eligible students: ${regPreview.studentsConsidered}\n` +
        `Open self window: ${regPreview.registrationOpened ? 'yes' : 'no'}`
    );
    if (!ok) return;

    setRegBusy(true);
    try {
      const data = await academicService.registerStudents({
        policy: regPolicy,
        openRegistration: regPolicy === 'hybrid' || regPolicy === 'self',
        dropOutOfScope: true,
      });
      setRegPreview(data);
      toast.success(
        `Registered — ${data.enrolled} seat(s)` +
          (data.registrationOpened ? '; self-registration opened' : '')
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not register students'));
    } finally {
      setRegBusy(false);
    }
  };

  return (
    <div className="grid gap-6 lg:grid-cols-3">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Layers className="h-5 w-5" /> Publish offerings
          </CardTitle>
          <CardDescription>
            Create class offerings for the Active term. Does not enroll students — use Register.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActive ? (
            <p className="text-sm text-amber-700">Activate an academic term before publishing.</p>
          ) : null}
          <div>
            <Label>Mode</Label>
            <Select
              value={classMode}
              onValueChange={(v) => setClassMode(v as 'clone-from-term' | 'from-curriculum')}
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
          {classMode === 'clone-from-term' ? (
            <div>
              <Label>Source term</Label>
              <Select value={sourceTermId || undefined} onValueChange={setSourceTermId}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Latest closed (auto)" />
                </SelectTrigger>
                <SelectContent>
                  {closedTerms.map((t) => (
                    <SelectItem key={t.id} value={t.id}>
                      {t.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ) : null}
          {classPreview ? <ClassListSummary result={classPreview} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={classBusy || !hasActive} onClick={runClassPreview}>
              Preview
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014a22]"
              disabled={classBusy || !hasActive || !classPreview}
              onClick={runClassGenerate}
            >
              {classBusy ? 'Working…' : 'Publish'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ArrowUpRight className="h-5 w-5" /> Promote students
          </CardTitle>
          <CardDescription>
            Sem 1 → Sem 2, Sem 2 → next year Sem 1. Updates standing only; seating is Register.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActive ? (
            <p className="text-sm text-amber-700">Activate an academic term before promoting.</p>
          ) : null}
          <div>
            <Label htmlFor="holdbacks">Holdback student IDs (optional)</Label>
            <Textarea
              id="holdbacks"
              className="mt-1 font-mono text-xs"
              rows={3}
              placeholder="Paste student UUIDs, one per line"
              value={holdbackRaw}
              onChange={(e) => setHoldbackRaw(e.target.value)}
            />
          </div>
          {promotePreview ? <PromoteSummary result={promotePreview} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={promoteBusy || !hasActive} onClick={runPromotePreview}>
              Preview
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014a22]"
              disabled={promoteBusy || !hasActive || !promotePreview}
              onClick={runPromote}
            >
              {promoteBusy ? 'Working…' : 'Promote'}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UserCheck className="h-5 w-5" /> Register students
          </CardTitle>
          <CardDescription>
            Auto-enroll into Auto courses and/or open the self-registration window for Self courses.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActive ? (
            <p className="text-sm text-amber-700">Activate an academic term before registering.</p>
          ) : null}
          <div>
            <Label>Policy</Label>
            <Select
              value={regPolicy}
              onValueChange={(v) => setRegPolicy(v as 'auto' | 'hybrid' | 'self')}
            >
              <SelectTrigger className="mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="auto">Auto</SelectItem>
                <SelectItem value="hybrid">Hybrid</SelectItem>
                <SelectItem value="self">Self only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {regPreview ? <RegisterSummary result={regPreview} /> : null}
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" disabled={regBusy || !hasActive} onClick={runRegPreview}>
              Preview
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014a22]"
              disabled={regBusy || !hasActive || !regPreview}
              onClick={runRegister}
            >
              {regBusy ? 'Working…' : 'Register'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
