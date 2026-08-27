import { useEffect, useMemo, useState } from 'react';
import { toast } from 'sonner';
import {
  academicService,
  type AcademicTerm,
  type CohortStandingStudent,
  type GenerateClassListsResult,
  type PromoteStudentsResult,
  type ReassignCohortStandingResult,
  type RegisterStudentsResult,
} from '@/services/academic.service';
import { getApiErrorMessage } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  RadioGroup,
  RadioGroupItem,
} from '@/components/ui/radio-group';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { AcademicRolloverPromoteForm } from '@/components/admin/AcademicRolloverPromoteForm';
import {
  DEFAULT_CLASS_LIST_MODE,
  DEFAULT_PANEL_REGISTRATION_POLICY,
  SELECT_UNSET,
  fromOptionalSelectValue,
  hasOptionalSelectValue,
  toOptionalSelectValue,
} from '@/lib/academic-rollover-defaults';
import { useAcademicRolloverPromoteState, PROMOTE_ALL } from '@/lib/academic-rollover-promote';
import { ResetFiltersButton } from '@/components/ui/reset-filters-button';

type RolloverSection = 'offerings' | 'promote' | 'register' | 'repair';
type RepairScopeMode = 'selected' | 'cohort';

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
      {result.skippedAlreadyPromoted > 0 ? (
        <p className="text-amber-800">
          Already promoted this term: <strong>{result.skippedAlreadyPromoted}</strong>
        </p>
      ) : null}
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

function RepairCohortSummary({ result }: { result: ReassignCohortStandingResult }) {
  const programLabel = result.program.code || result.program.name;
  return (
    <div className="rounded-md border bg-muted/30 p-3 text-sm space-y-1">
      <p>
        Program: <strong>{programLabel}</strong>
      </p>
      <p>
        Scope:{' '}
        <strong>
          {result.selectionMode === 'selected'
            ? `${result.selectedCount ?? result.toReassign} selected student(s)`
            : 'Entire source cohort'}
        </strong>
      </p>
      <p>
        {result.mode === 'reactivate' ? (
          <>
            Reactivate at <strong>Y{result.source.year} S{result.source.semester}</strong> (same
            cohort — status only)
          </>
        ) : (
          <>
            Move:{' '}
            <strong>
              Y{result.source.year} S{result.source.semester}
            </strong>{' '}
            →{' '}
            <strong>
              Y{result.target.year} S{result.target.semester}
            </strong>
          </>
        )}
      </p>
      <p>
        Active in source cohort: <strong>{result.activeInSourceCohort}</strong>
        {' · '}
        Completed in source cohort: <strong>{result.completedInSourceCohort}</strong>
      </p>
      <p>
        Included in this run: <strong>{result.totalInSourceCohort}</strong>
        {!result.includeCompleted && result.completedInSourceCohort > 0 ? (
          <span className="text-amber-800"> — enable Include Completed to restore them</span>
        ) : null}
      </p>
      <p>
        {result.dryRun
          ? result.mode === 'reactivate'
            ? 'Would reactivate'
            : 'Would reassign'
          : result.mode === 'reactivate'
            ? 'Reactivated'
            : 'Reassigned'}
        :{' '}
        <strong>{result.dryRun ? result.toReassign : result.reassigned}</strong>
        {!result.dryRun && result.reactivated > 0 ? (
          <span className="text-muted-foreground"> · reactivated from Completed: {result.reactivated}</span>
        ) : null}
      </p>
      {!result.dryRun && result.reEnroll ? (
        <p>
          Enrolled: {result.enrolled} · dropped from wrong classes: {result.dropped}
        </p>
      ) : null}
      {result.samples.length > 0 ? (
        <ul className="mt-2 max-h-40 overflow-y-auto text-xs space-y-0.5">
          {result.samples.map((s) => (
            <li key={s.id}>
              {s.studentNumber}: {s.from} → {s.to}
              {s.priorStatus !== 'Active' ? ` (${s.priorStatus})` : ''}
            </li>
          ))}
        </ul>
      ) : null}
      {result.errors.length > 0 ? (
        <p className="text-destructive">Errors: {result.errors.slice(0, 5).join('; ')}</p>
      ) : null}
      {result.totalInSourceCohort === 0 && result.completedCohortsInProgram.length > 0 ? (
        <div className="rounded-md border border-amber-300 bg-amber-50/80 p-2 text-amber-950">
          <p className="font-medium">Completed students in this program (by standing):</p>
          <ul className="mt-1 list-disc pl-4">
            {result.completedCohortsInProgram.map((row) => (
              <li key={`${row.year}-${row.semester}`}>
                Y{row.year} S{row.semester}: {row.count} student(s)
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs">
            Use one of these as the source cohort if they were wrongly marked Completed.
          </p>
        </div>
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
  const showRepair = sections.includes('repair');
  const multi = sections.length > 1;
  const [terms, setTerms] = useState<AcademicTerm[]>([]);
  const [programs, setPrograms] = useState<Array<{ id: string; name: string; code?: string }>>([]);
  const promote = useAcademicRolloverPromoteState();
  const [promotePreview, setPromotePreview] = useState<PromoteStudentsResult | null>(null);
  const [promoteBusy, setPromoteBusy] = useState(false);
  const [classMode, setClassMode] = useState(DEFAULT_CLASS_LIST_MODE);
  const [sourceTermId, setSourceTermId] = useState<string>('');
  const [classPreview, setClassPreview] = useState<GenerateClassListsResult | null>(null);
  const [classBusy, setClassBusy] = useState(false);
  const [regPolicy, setRegPolicy] = useState(DEFAULT_PANEL_REGISTRATION_POLICY);
  const [regPreview, setRegPreview] = useState<RegisterStudentsResult | null>(null);
  const [regBusy, setRegBusy] = useState(false);
  const [repairProgramId, setRepairProgramId] = useState('');
  const [repairSourceYear, setRepairSourceYear] = useState('');
  const [repairSourceSemester, setRepairSourceSemester] = useState('');
  const [repairTargetYear, setRepairTargetYear] = useState('');
  const [repairTargetSemester, setRepairTargetSemester] = useState('');
  const [repairPreview, setRepairPreview] = useState<ReassignCohortStandingResult | null>(null);
  const [repairBusy, setRepairBusy] = useState(false);
  const [repairIncludeCompleted, setRepairIncludeCompleted] = useState(true);
  const [repairScopeMode, setRepairScopeMode] = useState<RepairScopeMode>('selected');
  const [repairStudents, setRepairStudents] = useState<CohortStandingStudent[]>([]);
  const [repairStudentsLoading, setRepairStudentsLoading] = useState(false);
  const [repairSelectedIds, setRepairSelectedIds] = useState<Set<string>>(new Set());
  const [repairStudentSearch, setRepairStudentSearch] = useState('');

  useEffect(() => {
    academicService
      .getAcademicTerms()
      .then((rows) => {
        setTerms(rows);
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

  useEffect(() => {
    if (
      repairScopeMode !== 'selected' ||
      !repairProgramId ||
      !repairSourceYear ||
      !repairSourceSemester
    ) {
      setRepairStudents([]);
      setRepairSelectedIds(new Set());
      return;
    }
    let cancelled = false;
    setRepairStudentsLoading(true);
    academicService
      .listCohortStandingStudents({
        programId: repairProgramId,
        year: Number(repairSourceYear),
        semester: Number(repairSourceSemester),
        includeCompleted: repairIncludeCompleted,
      })
      .then((res) => {
        if (cancelled) return;
        setRepairStudents(res.students ?? []);
        setRepairSelectedIds(new Set());
        setRepairPreview(null);
      })
      .catch((error) => {
        if (cancelled) return;
        setRepairStudents([]);
        toast.error(getApiErrorMessage(error, 'Could not load cohort students'));
      })
      .finally(() => {
        if (!cancelled) setRepairStudentsLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [
    repairScopeMode,
    repairProgramId,
    repairSourceYear,
    repairSourceSemester,
    repairIncludeCompleted,
  ]);

  const filteredRepairStudents = useMemo(() => {
    const term = repairStudentSearch.trim().toLowerCase();
    if (!term) return repairStudents;
    return repairStudents.filter((s) => {
      const hay = `${s.studentNumber} ${s.firstName} ${s.lastName} ${s.email}`.toLowerCase();
      return hay.includes(term);
    });
  }, [repairStudents, repairStudentSearch]);

  const closedTerms = terms.filter((t) => t.status === 'Closed');
  const hasActive = terms.some((t) => t.status === 'Active');

  const promotePayload = () => promote.buildPayload();

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
      promote.promoteProgramId !== PROMOTE_ALL
        ? programs.find((p) => p.id === promote.promoteProgramId)?.code ||
          programs.find((p) => p.id === promote.promoteProgramId)?.name ||
          'program'
        : 'all programs',
      promote.promoteYear !== PROMOTE_ALL ? `Y${promote.promoteYear}` : null,
      promote.promoteSemester !== PROMOTE_ALL ? `S${promote.promoteSemester}` : null,
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

  const repairPayload = () => ({
    programId: repairProgramId,
    sourceYear: Number(repairSourceYear),
    sourceSemester: Number(repairSourceSemester),
    targetYear: Number(repairTargetYear),
    targetSemester: Number(repairTargetSemester),
    reEnroll: true,
    includeCompleted: repairIncludeCompleted,
    ...(repairScopeMode === 'selected' ? { studentIds: [...repairSelectedIds] } : {}),
  });

  const toggleRepairStudent = (id: string, checked: boolean) => {
    setRepairSelectedIds((prev) => {
      const next = new Set(prev);
      if (checked) {
        if (next.size >= 200 && !next.has(id)) {
          toast.error('You can select at most 200 students');
          return prev;
        }
        next.add(id);
      } else {
        next.delete(id);
      }
      return next;
    });
    setRepairPreview(null);
  };

  const selectAllFilteredRepairStudents = () => {
    setRepairSelectedIds((prev) => {
      const next = new Set(prev);
      for (const s of filteredRepairStudents) {
        if (next.size >= 200) break;
        next.add(s.id);
      }
      if (filteredRepairStudents.some((s) => !prev.has(s.id)) && next.size >= 200) {
        toast.message('Selection capped at 200 students');
      }
      return next;
    });
    setRepairPreview(null);
  };

  const clearRepairSelection = () => {
    setRepairSelectedIds(new Set());
    setRepairPreview(null);
  };

  const runRepairPreview = async () => {
    if (!repairProgramId) {
      toast.error('Select a program');
      return;
    }
    if (!repairSourceYear || !repairSourceSemester || !repairTargetYear || !repairTargetSemester) {
      toast.error('Select source and target year and semester');
      return;
    }
    if (repairScopeMode === 'selected' && repairSelectedIds.size === 0) {
      toast.error('Select at least one student, or switch to Entire cohort');
      return;
    }
    setRepairBusy(true);
    try {
      const data = await academicService.previewReassignCohortStanding(repairPayload());
      setRepairPreview(data);
      toast.success('Repair preview ready');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not preview cohort repair'));
    } finally {
      setRepairBusy(false);
    }
  };

  const runRepair = async () => {
    if (!repairPreview) {
      toast.error('Run preview first');
      return;
    }
    if (repairScopeMode === 'selected' && repairSelectedIds.size === 0) {
      toast.error('Select at least one student, or switch to Entire cohort');
      return;
    }
    const prog = programs.find((p) => p.id === repairProgramId);
    const label = prog?.code || prog?.name || 'program';
    const sameCohort =
      repairSourceYear === repairTargetYear && repairSourceSemester === repairTargetSemester;
    const scopeNote =
      repairScopeMode === 'selected'
        ? `Only the ${repairPreview.toReassign} selected student(s) will change; others in this cohort stay where they are.\n\n`
        : `This affects the entire source cohort (${repairPreview.toReassign} student(s)).\n\n`;
    const ok = window.confirm(
      sameCohort
        ? `Reactivate ${repairPreview.toReassign} Completed student(s) in ${label} at Y${repairSourceYear} S${repairSourceSemester}?\n\n` +
            scopeNote +
            `Standing stays the same. Status becomes Active and students are re-enrolled on Active-term classes.\n\n` +
            `Back up the database first if you have not already.`
        : `Move ${repairPreview.toReassign} student(s) in ${label} from Y${repairSourceYear} S${repairSourceSemester} to Y${repairTargetYear} S${repairTargetSemester}?\n\n` +
            scopeNote +
            `This sets standing directly (not promote). Wrong class enrollments will be dropped and students re-enrolled on Active-term classes for the target cohort.\n\n` +
            `Back up the database first if you have not already.`
    );
    if (!ok) return;

    setRepairBusy(true);
    try {
      const data = await academicService.reassignCohortStanding(repairPayload());
      setRepairPreview(data);
      toast.success(
        data.mode === 'reactivate'
          ? `Reactivated ${data.reactivated} student(s)`
          : `Reassigned ${data.reassigned} student(s)`
      );
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not reassign cohort'));
    } finally {
      setRepairBusy(false);
    }
  };

  const resetRepairForm = () => {
    setRepairProgramId('');
    setRepairSourceYear('');
    setRepairSourceSemester('');
    setRepairTargetYear('');
    setRepairTargetSemester('');
    setRepairIncludeCompleted(true);
    setRepairScopeMode('selected');
    setRepairStudents([]);
    setRepairSelectedIds(new Set());
    setRepairStudentSearch('');
    setRepairPreview(null);
  };

  const resetPromoteScope = () => {
    promote.setPromoteProgramId(PROMOTE_ALL);
    promote.setPromoteYear(PROMOTE_ALL);
    promote.setPromoteSemester(PROMOTE_ALL);
    promote.setHoldbackRaw('');
    setPromotePreview(null);
  };

  return (
    <div className="space-y-6">
      <div
        className={
          [showOfferings, showPromote, showRegister].filter(Boolean).length > 1
            ? 'grid gap-6 lg:grid-cols-3'
            : multi
              ? 'grid gap-6'
              : 'max-w-xl'
        }
      >
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
              <Select
                value={toOptionalSelectValue(sourceTermId)}
                onValueChange={(v) => {
                  setSourceTermId(fromOptionalSelectValue(v));
                  setClassPreview(null);
                }}
              >
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Latest closed (auto)" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={SELECT_UNSET}>Latest closed (auto)</SelectItem>
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
          <AcademicRolloverPromoteForm
            programs={programs}
            promoteProgramId={promote.promoteProgramId}
            onPromoteProgramIdChange={promote.setPromoteProgramId}
            promoteYear={promote.promoteYear}
            onPromoteYearChange={promote.setPromoteYear}
            promoteSemester={promote.promoteSemester}
            onPromoteSemesterChange={promote.setPromoteSemester}
            holdbackGroups={promote.holdbackGroups}
            onRemoveHoldbackGroup={(g) => promote.removeHoldbackGroup(g, () => setPromotePreview(null))}
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
            onAddHoldbackGroup={() => promote.addHoldbackGroup(programs, () => setPromotePreview(null))}
            onResetHoldbackDraft={promote.resetHoldbackGroupDraft}
            holdbackTextareaId="holdbacks"
            onScopeChange={() => setPromotePreview(null)}
          />
          {promotePreview ? <PromoteSummary result={promotePreview} /> : null}
          <div className="flex flex-wrap gap-2">
            <ResetFiltersButton
              label="Reset scope"
              className="h-9"
              disabled={
                promote.promoteProgramId === PROMOTE_ALL &&
                promote.promoteYear === PROMOTE_ALL &&
                promote.promoteSemester === PROMOTE_ALL &&
                !promote.holdbackRaw.trim()
              }
              onClick={resetPromoteScope}
            />
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

      {showRepair ? (
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Repair cohort standing</CardTitle>
          <CardDescription>
            Move wrongly placed students to a specific year/semester — selected students only, or
            the entire cohort. This is not Promote (which only advances one step).
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {!hasActive ? (
            <p className="text-sm text-amber-700">
              Activate an academic term before re-enrolling students onto classes.
            </p>
          ) : null}
          <div className="grid gap-6 xl:grid-cols-[minmax(0,22rem)_minmax(0,1fr)]">
            <div className="space-y-4">
              <div>
                <LabelWithInfo info="Required. Students must belong to this program at the source year and semester.">
                  Program
                </LabelWithInfo>
                <Select
                  value={toOptionalSelectValue(repairProgramId)}
                  onValueChange={(v) => {
                    setRepairProgramId(fromOptionalSelectValue(v));
                    setRepairPreview(null);
                  }}
                >
                  <SelectTrigger className="mt-1">
                    <SelectValue placeholder="Select program" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={SELECT_UNSET}>Select program</SelectItem>
                    {programs.map((p) => (
                      <SelectItem key={p.id} value={p.id}>
                        {p.code ? `${p.name} (${p.code})` : p.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="rounded-md border p-4 space-y-3">
                <p className="text-sm font-medium">Source cohort (current wrong standing)</p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Year</Label>
                    <Select
                      value={toOptionalSelectValue(repairSourceYear)}
                      onValueChange={(v) => {
                        setRepairSourceYear(fromOptionalSelectValue(v));
                        setRepairPreview(null);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SELECT_UNSET}>Select year</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            Year {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Semester</Label>
                    <Select
                      value={toOptionalSelectValue(repairSourceSemester)}
                      onValueChange={(v) => {
                        setRepairSourceSemester(fromOptionalSelectValue(v));
                        setRepairPreview(null);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SELECT_UNSET}>Select semester</SelectItem>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="rounded-md border border-[#015F2B]/30 bg-[#015F2B]/5 p-4 space-y-3">
                <p className="text-sm font-medium">Target standing (correct cohort)</p>
                <p className="text-xs text-muted-foreground">
                  Same year/semester as source reactivates Completed students only (status → Active).
                </p>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <Label>Year</Label>
                    <Select
                      value={toOptionalSelectValue(repairTargetYear)}
                      onValueChange={(v) => {
                        setRepairTargetYear(fromOptionalSelectValue(v));
                        setRepairPreview(null);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select year" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SELECT_UNSET}>Select year</SelectItem>
                        {[1, 2, 3, 4, 5, 6].map((y) => (
                          <SelectItem key={y} value={String(y)}>
                            Year {y}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label>Semester</Label>
                    <Select
                      value={toOptionalSelectValue(repairTargetSemester)}
                      onValueChange={(v) => {
                        setRepairTargetSemester(fromOptionalSelectValue(v));
                        setRepairPreview(null);
                      }}
                    >
                      <SelectTrigger className="mt-1">
                        <SelectValue placeholder="Select semester" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={SELECT_UNSET}>Select semester</SelectItem>
                        <SelectItem value="1">Semester 1</SelectItem>
                        <SelectItem value="2">Semester 2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
              <div className="flex items-start gap-2 rounded-md border p-3">
                <Checkbox
                  id="repair-include-completed"
                  checked={repairIncludeCompleted}
                  onCheckedChange={(checked) => {
                    setRepairIncludeCompleted(checked === true);
                    setRepairPreview(null);
                  }}
                />
                <LabelWithInfo
                  htmlFor="repair-include-completed"
                  info="Promote marks final-year Sem 2 students as Completed. Over-promotion can do this too early. Keep this on to restore those students to Active and move them to the target cohort."
                >
                  Include Completed students (reactivate)
                </LabelWithInfo>
              </div>
            </div>

            <div className="rounded-md border p-4 space-y-3 min-w-0">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <LabelWithInfo info="Selected students: only checked students move; others in the cohort stay. Entire cohort: everyone in the source standing is moved.">
                  Who to repair
                </LabelWithInfo>
                <RadioGroup
                  value={repairScopeMode}
                  onValueChange={(v) => {
                    setRepairScopeMode(v as RepairScopeMode);
                    setRepairPreview(null);
                  }}
                  className="flex flex-row flex-wrap gap-4"
                >
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="selected" id="repair-scope-selected" />
                    <Label htmlFor="repair-scope-selected" className="font-normal">
                      Selected students
                    </Label>
                  </div>
                  <div className="flex items-center gap-2">
                    <RadioGroupItem value="cohort" id="repair-scope-cohort" />
                    <Label htmlFor="repair-scope-cohort" className="font-normal">
                      Entire cohort
                    </Label>
                  </div>
                </RadioGroup>
              </div>
              {repairScopeMode === 'selected' ? (
                <div className="space-y-3">
                  {!repairProgramId || !repairSourceYear || !repairSourceSemester ? (
                    <p className="text-sm text-muted-foreground">
                      Choose program and source year/semester to load students.
                    </p>
                  ) : repairStudentsLoading ? (
                    <p className="text-sm text-muted-foreground">Loading cohort students…</p>
                  ) : (
                    <>
                      <div className="flex flex-wrap items-center gap-2">
                        <Input
                          value={repairStudentSearch}
                          onChange={(e) => setRepairStudentSearch(e.target.value)}
                          placeholder="Search name, number, email"
                          className="h-9 min-w-[14rem] flex-1"
                        />
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9"
                          disabled={filteredRepairStudents.length === 0}
                          onClick={selectAllFilteredRepairStudents}
                        >
                          Select visible
                        </Button>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9"
                          disabled={repairSelectedIds.size === 0}
                          onClick={clearRepairSelection}
                        >
                          Clear
                        </Button>
                        <Badge variant="secondary" className="h-9 px-3 text-sm font-normal">
                          {repairSelectedIds.size} selected
                          {repairStudents.length > 0 ? ` / ${repairStudents.length}` : ''}
                        </Badge>
                      </div>
                      {repairStudents.length === 0 ? (
                        <p className="text-sm text-amber-800">
                          No Active{repairIncludeCompleted ? '/Completed' : ''} students in this
                          source cohort.
                        </p>
                      ) : (
                        <div className="max-h-[28rem] overflow-y-auto rounded-md border divide-y">
                          {filteredRepairStudents.map((s) => {
                            const checked = repairSelectedIds.has(s.id);
                            return (
                              <label
                                key={s.id}
                                className="flex cursor-pointer items-start gap-3 px-4 py-2.5 text-sm hover:bg-muted/40"
                              >
                                <Checkbox
                                  checked={checked}
                                  onCheckedChange={(v) => toggleRepairStudent(s.id, v === true)}
                                  className="mt-0.5"
                                />
                                <span className="min-w-0 flex-1 leading-snug">
                                  <span className="font-medium">
                                    {s.lastName}, {s.firstName}
                                  </span>
                                  <span className="text-muted-foreground"> · {s.studentNumber}</span>
                                  {s.status === 'Completed' ? (
                                    <Badge variant="outline" className="ml-2 align-middle text-[10px]">
                                      Completed
                                    </Badge>
                                  ) : null}
                                </span>
                              </label>
                            );
                          })}
                          {filteredRepairStudents.length === 0 ? (
                            <p className="px-4 py-3 text-sm text-muted-foreground">
                              No students match this search.
                            </p>
                          ) : null}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground">
                        Cap 200 students per repair. Unselected students stay in the source cohort.
                      </p>
                    </>
                  )}
                </div>
              ) : (
                <p className="text-sm text-muted-foreground">
                  Every Active{repairIncludeCompleted ? '/Completed' : ''} student at the source
                  year/semester will be moved (or reactivated).
                </p>
              )}
            </div>
          </div>

          {repairPreview ? <RepairCohortSummary result={repairPreview} /> : null}
          <div className="flex flex-wrap gap-2 border-t pt-4">
            <ResetFiltersButton
              label="Reset form"
              className="h-9"
              disabled={
                !hasOptionalSelectValue(repairProgramId) &&
                !hasOptionalSelectValue(repairSourceYear) &&
                !hasOptionalSelectValue(repairSourceSemester) &&
                !hasOptionalSelectValue(repairTargetYear) &&
                !hasOptionalSelectValue(repairTargetSemester) &&
                repairIncludeCompleted &&
                repairScopeMode === 'selected' &&
                repairSelectedIds.size === 0 &&
                !repairStudentSearch
              }
              onClick={resetRepairForm}
            />
            <Button
              variant="outline"
              disabled={repairBusy || !repairProgramId}
              onClick={runRepairPreview}
            >
              Preview
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014a22]"
              disabled={repairBusy || !hasActive || !repairPreview || repairPreview.toReassign === 0}
              onClick={runRepair}
            >
              {repairBusy ? 'Working…' : repairPreview?.mode === 'reactivate' ? 'Reactivate' : 'Apply repair'}
            </Button>
          </div>
        </CardContent>
      </Card>
      ) : null}
    </div>
  );
}
