import { useEffect, useState } from 'react';
import { toast } from 'sonner';
import {
  academicService,
  type AcademicTerm,
  type GenerateClassListsResult,
  type HoldbackGroupPayload,
  type PromoteStudentsResult,
  type RegisterStudentsResult,
} from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type RolloverSection = 'offerings' | 'promote' | 'register';

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
  const scopeParts = [
    result.scope?.programId ? 'selected program' : 'all programs',
    result.scope?.year != null ? `Y${result.scope.year}` : null,
    result.scope?.semester != null ? `S${result.scope.semester}` : null,
  ].filter(Boolean);
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
      <p>
        Scope: <strong>{scopeParts.join(' · ')}</strong>
      </p>
      <p>
        Active students in scope: <strong>{result.totalActiveStudents}</strong>
      </p>
      <p>
        To promote: <strong>{result.toPromote}</strong>
        {result.dryRun ? '' : ` · promoted: ${result.promoted}`}
      </p>
      <p>
        Held back: {result.heldBack}
        {result.heldBackByGroup != null || result.heldBackExisting != null ? (
          <span className="text-muted-foreground">
            {' '}
            (group {result.heldBackByGroup ?? 0} · existing {result.heldBackExisting ?? 0} ·
            individual {result.heldBackIndividual ?? 0})
          </span>
        ) : null}
      </p>
      <p>Completed (end of program): {result.completedCandidates}</p>
      {result.skippedNoProgram > 0 ? <p>Skipped (no program): {result.skippedNoProgram}</p> : null}
      {result.samples.holdback.length > 0 ? (
        <ul className="mt-2 text-amber-900/80 list-disc pl-4 max-h-28 overflow-auto">
          {result.samples.holdback.map((s) => (
            <li key={s.id}>
              {s.studentNumber} @ {s.at}
              {s.reason ? ` — ${s.reason}` : ''}
            </li>
          ))}
        </ul>
      ) : null}
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

export function AcademicRolloverPanel({
  sections = ['offerings', 'promote', 'register'],
}: {
  sections?: RolloverSection[];
}) {
  const showOfferings = sections.includes('offerings');
  const showPromote = sections.includes('promote');
  const showRegister = sections.includes('register');
  const multi = sections.length > 1;
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const [promoteProgramId, setPromoteProgramId] = useState<string>('__all__');
  const [promoteYear, setPromoteYear] = useState<string>('__all__');
  const [promoteSemester, setPromoteSemester] = useState<string>('__all__');
  const [holdbackRaw, setHoldbackRaw] = useState('');
  const [holdbackGroups, setHoldbackGroups] = useState<HoldbackGroupPayload[]>([]);
  const [groupProgramId, setGroupProgramId] = useState<string>('');
  const [groupYear, setGroupYear] = useState<string>('2');
  const [groupSemester, setGroupSemester] = useState<string>('1');
  const [groupReason, setGroupReason] = useState('');
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

  const closedTerms = terms.filter((t) => t.status === 'Closed');
  const hasActive = terms.some((t) => t.status === 'Active');

  const promotePayload = () => ({
    holdbackStudentIds: parseHoldbackIds(holdbackRaw),
    holdbackGroups,
    ...(promoteProgramId !== '__all__' ? { programId: promoteProgramId } : {}),
    ...(promoteYear !== '__all__' ? { year: Number(promoteYear) } : {}),
    ...(promoteSemester !== '__all__' ? { semester: Number(promoteSemester) } : {}),
  });

  const addHoldbackGroup = () => {
    if (!groupProgramId) {
      toast.error('Select a program for the holdback group');
      return;
    }
    const reason = groupReason.trim();
    if (reason.length < 3) {
      toast.error('Enter a holdback reason (at least 3 characters)');
      return;
    }
    const year = Number(groupYear);
    const semester = Number(groupSemester);
    const exists = holdbackGroups.some(
      (g) => g.programId === groupProgramId && g.year === year && g.semester === semester
    );
    if (exists) {
      toast.error('That program / year / semester is already in the holdback list');
      return;
    }
    setHoldbackGroups((prev) => [
      ...prev,
      { programId: groupProgramId, year, semester, reason },
    ]);
    setGroupReason('');
    setPromotePreview(null);
  };

  const runPromotePreview = async () => {
    setPromoteBusy(true);
    try {
      const data = await academicService.previewPromoteStudents(promotePayload());
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
    const scopeLabel = [
      promoteProgramId !== '__all__'
        ? programs.find((p) => p.id === promoteProgramId)?.code ||
          programs.find((p) => p.id === promoteProgramId)?.name ||
          'program'
        : 'all programs',
      promoteYear !== '__all__' ? `Y${promoteYear}` : null,
      promoteSemester !== '__all__' ? `S${promoteSemester}` : null,
    ]
      .filter(Boolean)
      .join(' · ');
    const ok = window.confirm(
      `Promote ${promotePreview.toPromote} student(s) in scope (${scopeLabel})?\n` +
        `${promotePreview.heldBack} held back · ${promotePreview.completedCandidates} marked Completed.\n` +
        `Year/semester only — use Register to seat students.`
    );
    if (!ok) return;

    setPromoteBusy(true);
    try {
      const data = await academicService.promoteStudents(promotePayload());
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
    <div className={multi ? 'grid gap-6 lg:grid-cols-3' : 'max-w-xl'}>
      {showOfferings ? (
      <Card>
        <CardHeader>
          <CardTitle>Publish offerings</CardTitle>
          <CardDescription>Create class offerings for the Active term.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActive ? (
            <p className="text-sm text-amber-700">Activate an academic term before publishing.</p>
          ) : null}
          <div>
            <LabelWithInfo info="Clone copies offerings from a closed term. Curriculum builds offerings from program intakes for the Active term. Students are not enrolled here — use Register.">
              Mode
            </LabelWithInfo>
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
      ) : null}

      {showPromote ? (
      <Card>
        <CardHeader>
          <CardTitle>Promote students</CardTitle>
          <CardDescription>Advance student year/semester standing.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActive ? (
            <p className="text-sm text-amber-700">Activate an academic term before promoting.</p>
          ) : null}
          <div>
            <LabelWithInfo info="Leave All to promote every Active student, or pick a program to limit the run.">
              Program
            </LabelWithInfo>
            <Select
              value={promoteProgramId}
              onValueChange={(v) => {
                setPromoteProgramId(v);
                setPromotePreview(null);
              }}
            >
              <SelectTrigger className="mt-1">
                <SelectValue placeholder="All programs" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__all__">All programs</SelectItem>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.name} (${p.code})` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <LabelWithInfo info="Optional filter. With semester, promotes one cohort group (e.g. Year 2 Sem 1).">
                Year
              </LabelWithInfo>
              <Select
                value={promoteYear}
                onValueChange={(v) => {
                  setPromoteYear(v);
                  setPromotePreview(null);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All years" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All years</SelectItem>
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <LabelWithInfo info="Optional filter. Sem 1 students move to Sem 2; Sem 2 students move to next year Sem 1.">
                Semester
              </LabelWithInfo>
              <Select
                value={promoteSemester}
                onValueChange={(v) => {
                  setPromoteSemester(v);
                  setPromotePreview(null);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="All semesters" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__all__">All semesters</SelectItem>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="rounded-md border p-3 space-y-2">
            <LabelWithInfo info="Hold an entire cohort (e.g. BCFCI Year 2 Sem 1 on internship) while other students promote. Status stays Active; reason is stored on each student as Held back standing.">
              Hold back cohort
            </LabelWithInfo>
            <Select value={groupProgramId || undefined} onValueChange={setGroupProgramId}>
              <SelectTrigger>
                <SelectValue placeholder="Program" />
              </SelectTrigger>
              <SelectContent>
                {programs.map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.name} (${p.code})` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="grid grid-cols-2 gap-2">
              <Select value={groupYear} onValueChange={setGroupYear}>
                <SelectTrigger>
                  <SelectValue placeholder="Year" />
                </SelectTrigger>
                <SelectContent>
                  {[1, 2, 3, 4, 5, 6].map((y) => (
                    <SelectItem key={y} value={String(y)}>
                      Year {y}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Select value={groupSemester} onValueChange={setGroupSemester}>
                <SelectTrigger>
                  <SelectValue placeholder="Semester" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="1">Semester 1</SelectItem>
                  <SelectItem value="2">Semester 2</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Input
              placeholder="Reason (e.g. Clinical internship)"
              value={groupReason}
              onChange={(e) => setGroupReason(e.target.value)}
            />
            <Button type="button" variant="outline" size="sm" onClick={addHoldbackGroup}>
              Add cohort holdback
            </Button>
            {holdbackGroups.length > 0 ? (
              <ul className="space-y-1 text-xs">
                {holdbackGroups.map((g) => {
                  const prog = programs.find((p) => p.id === g.programId);
                  const label = prog?.code || prog?.name || g.programId.slice(0, 8);
                  return (
                    <li
                      key={`${g.programId}-${g.year}-${g.semester}`}
                      className="flex items-start justify-between gap-2 rounded border bg-amber-50/50 px-2 py-1"
                    >
                      <span>
                        {label} Y{g.year}.S{g.semester} — {g.reason}
                      </span>
                      <button
                        type="button"
                        className="text-destructive shrink-0"
                        onClick={() => {
                          setHoldbackGroups((prev) =>
                            prev.filter(
                              (x) =>
                                !(
                                  x.programId === g.programId &&
                                  x.year === g.year &&
                                  x.semester === g.semester
                                )
                            )
                          );
                          setPromotePreview(null);
                        }}
                      >
                        Remove
                      </button>
                    </li>
                  );
                })}
              </ul>
            ) : null}
          </div>
          <div>
            <LabelWithInfo
              htmlFor="holdbacks"
              info="Optional individual holdbacks by student UUID. Cohort holdbacks above are preferred for whole year/sem groups."
            >
              Individual holdbacks
            </LabelWithInfo>
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
      ) : null}

      {showRegister ? (
      <Card>
        <CardHeader>
          <CardTitle>Register students</CardTitle>
          <CardDescription>Enroll students into Active-term offerings.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {!hasActive ? (
            <p className="text-sm text-amber-700">Activate an academic term before registering.</p>
          ) : null}
          <div>
            <LabelWithInfo info="Auto enrolls required courses. Hybrid also opens self-registration for elective/Self courses. Self opens the registration window only.">
              Policy
            </LabelWithInfo>
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
      ) : null}
    </div>
  );
}
