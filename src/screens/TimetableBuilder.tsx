import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, AlertCircle, Loader2, Plus, Save, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { academicService } from '@/services/academic.service';
import { staffService } from '@/services/staff.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { TimeInput12h } from '@/components/ui/time-input-12h';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Link } from 'react-router';
import { useSearchParams } from 'react-router';
import {
  AcademicTermFilter,
  TERM_FILTER_ACTIVE,
  TERM_FILTER_ALL,
} from '@/components/AcademicTermFilter';
import { useAcademicTermFilterState } from '@/hooks/useAcademicTermFilterState';

type IntakeType = 'Day' | 'Evening' | 'Weekend';
type DeliveryMode = 'InPerson' | 'Online' | 'Hybrid';

type ProgramLite = { id: string; name: string; code?: string; departmentId?: string };
type CourseLite = { id: string; code: string; name: string; source?: 'program' | 'combined' };
type VenueLite = { id: string; name: string };
type LecturerLite = { id: string; name: string };

type ClassScopeEntry = {
  classId: string;
  className: string;
  lecturerId: string | null;
  venueId: string | null;
  deliveryMode: string;
  meetingUrl: string | null;
  dayOfWeek: number | null;
  startTime: string | null;
  endTime: string | null;
  capacity: number;
  isSharedSchedule: boolean;
  cohortProgramIntakeIds: string[];
};

type DraftRow = {
  localId: string;
  courseId: string;
  className: string;
  lecturerId: string;
  venueId: string;
  deliveryMode: DeliveryMode;
  meetingUrl: string;
  dayOfWeek: string;
  startTime: string;
  endTime: string;
  capacity: string;
  existingClassId?: string;
  isSharedSchedule?: boolean;
};

function normalizeClassesByCourse(
  raw: Record<string, ClassScopeEntry | ClassScopeEntry[] | undefined>
): Record<string, ClassScopeEntry[]> {
  const out: Record<string, ClassScopeEntry[]> = {};
  for (const [courseId, value] of Object.entries(raw)) {
    if (!value) continue;
    out[courseId] = Array.isArray(value) ? value : [value];
  }
  return out;
}

function scopeEntryToDraft(courseId: string, existing: ClassScopeEntry, groupName: string): DraftRow {
  return {
    localId: existing.classId,
    courseId,
    className: existing.className ?? groupName,
    lecturerId: existing.lecturerId ?? '',
    venueId: existing.venueId ?? '',
    deliveryMode: (existing.deliveryMode as DeliveryMode) ?? 'InPerson',
    meetingUrl: existing.meetingUrl ?? '',
    dayOfWeek: existing.dayOfWeek != null ? String(existing.dayOfWeek) : '',
    startTime: existing.startTime ?? '',
    endTime: existing.endTime ?? '',
    capacity: existing.capacity != null ? String(existing.capacity) : '50',
    existingClassId: existing.classId,
    isSharedSchedule: existing.isSharedSchedule ?? false,
  };
}

function emptyDraft(courseId: string, groupName: string): DraftRow {
  return {
    localId: `new-${courseId}-${Math.random().toString(36).slice(2, 9)}`,
    courseId,
    className: groupName,
    lecturerId: '',
    venueId: '',
    deliveryMode: 'InPerson',
    meetingUrl: '',
    dayOfWeek: '',
    startTime: '',
    endTime: '',
    capacity: '50',
  };
}

function classListItemToScopeEntry(cls: any): ClassScopeEntry {
  return {
    classId: cls.id,
    className: cls.name,
    lecturerId: cls.lecturerId ?? null,
    venueId: cls.venueId ?? null,
    deliveryMode: cls.deliveryMode ?? 'InPerson',
    meetingUrl: cls.meetingUrl ?? null,
    dayOfWeek: cls.dayOfWeek ?? null,
    startTime: cls.startTime ?? null,
    endTime: cls.endTime ?? null,
    capacity: cls.capacity ?? 50,
    isSharedSchedule: Array.isArray(cls.cohortProgramIntakeIds) && cls.cohortProgramIntakeIds.length > 1,
    cohortProgramIntakeIds: cls.cohortProgramIntakeIds ?? [],
  };
}

const INTAKES: { value: IntakeType; label: string }[] = [
  { value: 'Day', label: 'Day' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Weekend', label: 'Weekend' },
];

const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
  { value: 'InPerson', label: 'Campus' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const DAYS: { value: string; label: string }[] = [
  { value: '1', label: 'Mon' },
  { value: '2', label: 'Tue' },
  { value: '3', label: 'Wed' },
  { value: '4', label: 'Thu' },
  { value: '5', label: 'Fri' },
  { value: '6', label: 'Sat' },
  { value: '0', label: 'Sun' },
];

const UNASSIGNED = '__unassigned__';

export default function TimetableBuilder() {
  const [searchParams] = useSearchParams();
  const autoLoadedRef = useRef(false);
  const [programs, setPrograms] = useState<ProgramLite[]>([]);
  const [programsLoading, setProgramsLoading] = useState(true);
  const [programId, setProgramId] = useState('');
  const [year, setYear] = useState(1);
  const [semester, setSemester] = useState(1);
  const [intakeType, setIntakeType] = useState<IntakeType>('Day');
  const [programIntakeId, setProgramIntakeId] = useState<string>('');
  const [intakeUtilitiesOpen, setIntakeUtilitiesOpen] = useState(false);
  const [intakeUtilitiesBusy, setIntakeUtilitiesBusy] = useState(false);
  const [duplicateTargetIntake, setDuplicateTargetIntake] = useState<IntakeType>('Evening');

  const [courses, setCourses] = useState<CourseLite[]>([]);
  const [coursesLoading, setCoursesLoading] = useState(false);
  const [venues, setVenues] = useState<VenueLite[]>([]);
  const [lecturers, setLecturers] = useState<LecturerLite[]>([]);
  const [refsLoading, setRefsLoading] = useState(true);

  const [draftsByCourse, setDraftsByCourse] = useState<Record<string, DraftRow[]>>({});
  const [creatingAll, setCreatingAll] = useState(false);
  const [activeTermLabel, setActiveTermLabel] = useState<string | null>(null);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [hasActiveTerm, setHasActiveTerm] = useState(false);
  const [activeTermLoading, setActiveTermLoading] = useState(true);
  const [activeTermLoadFailed, setActiveTermLoadFailed] = useState(false);
  const { termFilter, academicTermId, classStatusHint, onTermChange } = useAcademicTermFilterState();
  const canWriteSchedule =
    !activeTermLoading &&
    !activeTermLoadFailed &&
    termFilter === TERM_FILTER_ACTIVE &&
    hasActiveTerm;

  const scheduleWriteBlockReason = useMemo(() => {
    if (activeTermLoading) return null;
    if (activeTermLoadFailed) {
      return 'Could not load the active academic term from the server. Refresh the page or sign in again.';
    }
    if (!hasActiveTerm) {
      return 'No academic term is set to Active in this environment. An admin must activate one under Admin → Calendar before schedules can be saved.';
    }
    if (termFilter === TERM_FILTER_ALL) {
      return 'The Academic term filter is set to All terms. Switch it to Active term (default) to save schedules.';
    }
    if (termFilter !== TERM_FILTER_ACTIVE) {
      return 'You are viewing a closed/archived term. Switch the Academic term filter to Active term (default) to save schedules.';
    }
    return null;
  }, [activeTermLoadFailed, activeTermLoading, hasActiveTerm, termFilter]);

  const selectedProgram = useMemo(() => programs.find(p => p.id === programId) || null, [programId, programs]);
  const lecturerOptions = useMemo(
    () => [{ value: UNASSIGNED, label: 'Unassigned' }, ...lecturers.map(l => ({ value: l.id, label: l.name }))],
    [lecturers]
  );

  useEffect(() => {
    const qProgramId = String(searchParams.get('programId') || '').trim();
    const qYear = parseInt(String(searchParams.get('year') || ''), 10);
    const qSemester = parseInt(String(searchParams.get('semester') || ''), 10);
    const qIntake = String(searchParams.get('intakeType') || '').trim() as IntakeType;

    if (qProgramId) setProgramId(qProgramId);
    if (Number.isFinite(qYear) && qYear > 0) setYear(qYear);
    if (Number.isFinite(qSemester) && (qSemester === 1 || qSemester === 2)) setSemester(qSemester);
    if (qIntake && (qIntake === 'Day' || qIntake === 'Evening' || qIntake === 'Weekend')) setIntakeType(qIntake);
  }, []);

  useEffect(() => {
    setActiveTermLoading(true);
    setActiveTermLoadFailed(false);
    academicService
      .getActiveAcademicTerm()
      .then((term) => {
        if (!term) {
          setHasActiveTerm(false);
          setActiveTermLabel(null);
          setActiveTermId(null);
          return;
        }
        setHasActiveTerm(true);
        setActiveTermId(term.id);
        setActiveTermLabel(
          term.semester === 0 ? term.name : `${term.name} (Sem ${term.semester})`
        );
        const qSemester = searchParams.get('semester');
        if (!qSemester && (term.semester === 1 || term.semester === 2)) {
          setSemester(term.semester);
        }
      })
      .catch(() => {
        setHasActiveTerm(false);
        setActiveTermLabel(null);
        setActiveTermId(null);
        setActiveTermLoadFailed(true);
      })
      .finally(() => {
        setActiveTermLoading(false);
      });
  }, [searchParams]);

  // If we were deep-linked with programId, auto-load courses once refs/programs are ready
  useEffect(() => {
    const hasDeepLink = !!searchParams.get('programId');
    if (!hasDeepLink) return;
    if (autoLoadedRef.current) return;
    if (programsLoading) return;
    if (!programId) return;
    if (refsLoading) return;
    autoLoadedRef.current = true;
    ensureIntakeAndLoadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [programsLoading, refsLoading, programId]);

  useEffect(() => {
    if (!programIntakeId) return;
    void ensureIntakeAndLoadCourses();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [termFilter, academicTermId, classStatusHint]);

  useEffect(() => {
    const loadPrograms = async () => {
      setProgramsLoading(true);
      try {
        const res = await academicService.getPrograms();
        const arr = Array.isArray(res) ? res : (res as any)?.data ?? [];
        setPrograms(arr.map((p: any) => ({ id: p.id, name: p.name, code: p.code, departmentId: p.departmentId })));
      } catch {
        setPrograms([]);
      } finally {
        setProgramsLoading(false);
      }
    };
    loadPrograms();
  }, []);

  useEffect(() => {
    const loadRefs = async () => {
      setRefsLoading(true);
      try {
        const [venuesRes, firstLecturersPage] = await Promise.all([
          academicService.getVenues({ page: 1, limit: 50 }),
          staffService.getLecturers({ page: 1, limit: 50 }),
        ]);
        const allLecturers = [...(firstLecturersPage?.data ?? [])];
        const totalLecturers = firstLecturersPage?.total ?? allLecturers.length;
        let lecturerPage = firstLecturersPage?.page ?? 1;
        while (allLecturers.length < totalLecturers) {
          lecturerPage += 1;
          const next = await staffService.getLecturers({ page: lecturerPage, limit: 50 });
          const arr = next?.data ?? [];
          if (arr.length === 0) break;
          allLecturers.push(...arr);
        }
        setVenues((venuesRes?.data ?? []).map((v: any) => ({ id: v.id, name: v.name })));
        setLecturers(allLecturers.map((l: any) => ({ id: l.id, name: `${l.firstName} ${l.lastName}` })));
      } catch {
        setVenues([]);
        setLecturers([]);
      } finally {
        setRefsLoading(false);
      }
    };
    loadRefs();
  }, []);

  const defaultGroupName = useMemo(() => {
    if (selectedProgram?.code) {
      return `${selectedProgram.code} Y${year}S${semester} ${intakeType}`;
    }
    return `Y${year}S${semester} ${intakeType}`;
  }, [selectedProgram?.code, year, semester, intakeType]);

  const ensureIntakeAndLoadCourses = async () => {
    if (!programId) {
      toast.error('Select a program first');
      return;
    }
    setCoursesLoading(true);
    try {
      const intake = await academicService.ensureProgramIntake({ programId, year, semester, intakeType });
      const intakeId = intake?.id || '';
      setProgramIntakeId(intakeId);

      if (!intakeId) {
        setCourses([]);
        setDraftsByCourse({});
        return;
      }

      const scope = await academicService.getTimetableBuilderScope(intakeId);
      const mapped: CourseLite[] = (scope?.courses ?? []).map((c) => ({
        id: c.id,
        code: c.code,
        name: c.name,
        source: c.source,
      }));
      setCourses(mapped);
      if (mapped.length === 0) {
        toast.info('No courses found for this program/year/semester. Add courses first in Admin Schools.');
        setDraftsByCourse({});
        return;
      }

      const groupName = defaultGroupName;

      let classesByCourseId = normalizeClassesByCourse(scope?.classesByCourseId ?? {});
      if (termFilter !== TERM_FILTER_ACTIVE) {
        const classList = await fetchAllClassesForIntake(intakeId);
        const fromClasses: Record<string, ClassScopeEntry[]> = {};
        for (const cls of classList) {
          const courseId = cls.courseId || cls.course?.id;
          if (!courseId) continue;
          if (!fromClasses[courseId]) fromClasses[courseId] = [];
          fromClasses[courseId].push(classListItemToScopeEntry(cls));
        }
        classesByCourseId = fromClasses;
      }

      const nextDrafts: Record<string, DraftRow[]> = {};
      for (const c of mapped) {
        const existingList = classesByCourseId[c.id] ?? [];
        if (
          termFilter === TERM_FILTER_ACTIVE &&
          (draftsByCourse[c.id]?.length ?? 0) > 0 &&
          existingList.length === 0
        ) {
          nextDrafts[c.id] = draftsByCourse[c.id];
        } else if (existingList.length > 0) {
          nextDrafts[c.id] = existingList.map(ex => scopeEntryToDraft(c.id, ex, groupName));
        } else {
          nextDrafts[c.id] = [emptyDraft(c.id, groupName)];
        }
      }
      setDraftsByCourse(nextDrafts);

      const combinedCount = mapped.filter((c) => c.source === 'combined').length;
      if (combinedCount > 0) {
        toast.info(
          `${combinedCount} course${combinedCount === 1 ? '' : 's'} linked via combined cohort class${combinedCount === 1 ? '' : 'es'} — schedule shown from the shared class.`
        );
      }
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load scope');
      setProgramIntakeId('');
      setCourses([]);
      setDraftsByCourse({});
    } finally {
      setCoursesLoading(false);
    }
  };

  const ensureProgramIntakeId = async (targetIntake: IntakeType): Promise<string> => {
    const intake = await academicService.ensureProgramIntake({
      programId,
      year,
      semester,
      intakeType: targetIntake,
    });
    if (!intake?.id) {
      throw new Error('Failed to create or fetch intake');
    }
    return intake.id as string;
  };

  const fetchAllClassesForIntake = async (intakeId: string) => {
    const all: any[] = [];
    let page = 1;
    const termParams =
      termFilter === TERM_FILTER_ACTIVE
        ? {
            classStatus: 'active' as const,
            ...(activeTermId ? { academicTermId: activeTermId } : {}),
          }
        : {
            classStatus: classStatusHint,
            ...(academicTermId ? { academicTermId } : {}),
          };
    while (true) {
      const res = await academicService.getClasses({
        programIntakeId: intakeId,
        page,
        limit: 50,
        ...termParams,
      } as any);
      const arr = res?.data ?? [];
      all.push(...arr);
      const total = res?.total ?? all.length;
      if (all.length >= total || arr.length === 0) break;
      page += 1;
    }
    return all;
  };

  const handleDuplicateDayToTarget = async () => {
    if (!canWriteSchedule) {
      toast.error('Schedule writes are only allowed for the Active term.');
      return;
    }
    if (!programId) {
      toast.error('Select a program first');
      return;
    }
    if (duplicateTargetIntake === 'Day') {
      toast.error('Select Evening or Weekend as the target intake');
      return;
    }
    setIntakeUtilitiesBusy(true);
    try {
      const dayIntakeId = await ensureProgramIntakeId('Day');
      const targetIntakeId = await ensureProgramIntakeId(duplicateTargetIntake);

      const sourceClasses = await fetchAllClassesForIntake(dayIntakeId);
      if (sourceClasses.length === 0) {
        toast.error('No Day timetable classes found for this scope');
        return;
      }

      let created = 0;
      let failed = 0;
      const errors: string[] = [];

      for (const cls of sourceClasses) {
        try {
          const cohortIds = Array.isArray(cls.cohortProgramIntakeIds)
            ? cls.cohortProgramIntakeIds
            : cls.programIntakeId
              ? [cls.programIntakeId]
              : [];
          const programIntakeIds = [...new Set([targetIntakeId, ...cohortIds.filter((id: string) => id !== dayIntakeId)])];
          await academicService.createClass({
            name: cls.name,
            courseId: cls.courseId,
            programIntakeId: targetIntakeId,
            programIntakeIds,
            lecturerId: cls.lecturerId,
            venueId: cls.deliveryMode === 'Online' ? null : cls.venueId,
            dayOfWeek: cls.dayOfWeek,
            startTime: cls.startTime,
            endTime: cls.endTime,
            capacity: cls.capacity ?? 50,
            deliveryMode: cls.deliveryMode ?? 'InPerson',
            meetingUrl: cls.meetingUrl ?? null,
          } as any);
          created += 1;
        } catch (e: any) {
          failed += 1;
          errors.push(e?.message || 'Failed to copy a class');
        }
      }

      toast.success(`Duplicate completed: ${created} copied${failed ? `, ${failed} failed` : ''}`);
      if (errors.length > 0) {
        toast.warning(`Some items were not copied: ${errors.slice(0, 2).join(' · ')}${errors.length > 2 ? ' …' : ''}`);
      }
      if (created > 0) {
        window.dispatchEvent(new CustomEvent('class-updated'));
      }

      if (intakeType === duplicateTargetIntake) {
        setProgramIntakeId(targetIntakeId);
      }
    } finally {
      setIntakeUtilitiesBusy(false);
      setIntakeUtilitiesOpen(false);
    }
  };

  const updateDraft = (courseId: string, sessionIndex: number, patch: Partial<DraftRow>) => {
    setDraftsByCourse(prev => {
      const rows = [...(prev[courseId] ?? [])];
      if (!rows[sessionIndex]) return prev;
      rows[sessionIndex] = { ...rows[sessionIndex], ...patch };
      return { ...prev, [courseId]: rows };
    });
  };

  const addSession = (courseId: string) => {
    const template = draftsByCourse[courseId]?.[0];
    setDraftsByCourse(prev => ({
      ...prev,
      [courseId]: [
        ...(prev[courseId] ?? []),
        {
          ...emptyDraft(courseId, template?.className ?? defaultGroupName),
          className: template?.className ?? defaultGroupName,
          lecturerId: template?.lecturerId ?? '',
          venueId: template?.venueId ?? '',
          deliveryMode: template?.deliveryMode ?? 'InPerson',
          capacity: template?.capacity ?? '50',
        },
      ],
    }));
  };

  const removeSession = async (courseId: string, sessionIndex: number) => {
    const rows = draftsByCourse[courseId] ?? [];
    const row = rows[sessionIndex];
    if (!row) return;
    if (row.isSharedSchedule) {
      toast.info('This course uses a shared combined-cohort class. Edit it under Admin Classes.');
      return;
    }
    if (row.existingClassId) {
      if (!canWriteSchedule) {
        toast.error('Schedule writes are only allowed for the Active term.');
        return;
      }
      try {
        await academicService.updateClass(row.existingClassId, { isActive: false } as any);
        window.dispatchEvent(new CustomEvent('class-updated'));
        toast.success('Session removed');
      } catch (e: any) {
        toast.error(e?.message || 'Failed to remove session');
        return;
      }
    }
    setDraftsByCourse(prev => {
      const nextRows = (prev[courseId] ?? []).filter((_, i) => i !== sessionIndex);
      return {
        ...prev,
        [courseId]: nextRows.length > 0 ? nextRows : [emptyDraft(courseId, defaultGroupName)],
      };
    });
  };

  const createOne = async (courseId: string, sessionIndex: number) => {
    if (!canWriteSchedule) {
      toast.error('Schedule writes are only allowed for the Active term.');
      return;
    }
    const d = draftsByCourse[courseId]?.[sessionIndex];
    if (!d) return;
    if (d.isSharedSchedule && d.existingClassId) {
      toast.info('This course uses a shared combined-cohort class. Edit it under Admin Classes.');
      return;
    }
    if (!programIntakeId) {
      toast.error('Select scope and load courses first');
      return;
    }
    if (!d.className.trim()) {
      toast.error('Class name is required');
      return;
    }
    if (!d.dayOfWeek || !d.startTime || !d.endTime) {
      toast.error('Day, start time and end time are required');
      return;
    }
    const payload = {
      name: d.className.trim(),
      courseId: d.courseId,
      programIntakeId,
      lecturerId: d.lecturerId || null,
      venueId: d.deliveryMode === 'Online' ? null : (d.venueId || null),
      dayOfWeek: parseInt(d.dayOfWeek, 10),
      startTime: d.startTime,
      endTime: d.endTime,
      capacity: parseInt(d.capacity, 10) || 50,
      deliveryMode: d.deliveryMode,
      meetingUrl: d.meetingUrl?.trim() ? d.meetingUrl.trim() : null,
    };
    try {
      if (d.existingClassId) {
        await academicService.updateClass(d.existingClassId, payload as any);
        toast.success('Class updated');
      } else {
        const created = await academicService.createClass(payload as any);
        if (created?.id) {
          updateDraft(courseId, sessionIndex, { existingClassId: created.id, localId: created.id });
        }
        toast.success('Class saved');
      }
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save class');
    }
  };

  const createAll = async () => {
    if (!canWriteSchedule) {
      toast.error('Schedule writes are only allowed for the Active term.');
      return;
    }
    if (!programIntakeId) {
      toast.error('Select scope and load courses first');
      return;
    }
    setCreatingAll(true);
    try {
      for (const c of courses) {
        const sessions = draftsByCourse[c.id] ?? [];
        for (let i = 0; i < sessions.length; i++) {
          const draft = sessions[i];
          if (draft?.isSharedSchedule) continue;
          await createOne(c.id, i);
        }
      }
    } finally {
      setCreatingAll(false);
    }
  };

  return (
    <div className="space-y-4 min-w-0">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-gray-900">Timetable Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTermLabel
            ? `Scheduling for Active term: ${activeTermLabel}. New classes are stamped to this term.`
            : 'No Active academic term — create/activate one under Admin → Calendar before scheduling.'}
          {termFilter !== TERM_FILTER_ACTIVE
            ? ' Browsing a non-active term — create/schedule writes are disabled.'
            : ''}
        </p>
        <p className="text-gray-500">
          Create and manage timetables using school data, with automatic conflict checks.
        </p>
      </div>

      {activeTermLoading ? (
        <Alert className="border-blue-200 bg-blue-50/60">
          <Loader2 className="h-4 w-4 animate-spin text-blue-700" />
          <AlertTitle className="text-blue-900">Checking active academic term…</AlertTitle>
          <AlertDescription className="text-blue-800">
            Save stays disabled until the server confirms which term is active.
          </AlertDescription>
        </Alert>
      ) : scheduleWriteBlockReason ? (
        <Alert variant="destructive" className="border-amber-300 bg-amber-50 text-amber-950 [&>svg]:text-amber-700">
          <AlertCircle />
          <AlertTitle>Saving is disabled</AlertTitle>
          <AlertDescription className="text-amber-900">
            <p>{scheduleWriteBlockReason}</p>
            {!hasActiveTerm && !activeTermLoadFailed ? (
              <p className="mt-2">
                <Link to="/admin-calendar" className="font-medium underline underline-offset-2">
                  Open Admin → Calendar
                </Link>
                {' '}to create or activate a term.
              </p>
            ) : null}
            {termFilter !== TERM_FILTER_ACTIVE && hasActiveTerm ? (
              <p className="mt-2">
                Current filter:{' '}
                <span className="font-medium">
                  {termFilter === TERM_FILTER_ALL ? 'All terms' : activeTermLabel ?? 'Closed term'}
                </span>
                . Use the Academic term dropdown above and choose Active term (default).
              </p>
            ) : null}
          </AlertDescription>
        </Alert>
      ) : null}

      <Card>
        <CardHeader>
          <CardTitle>Timetable details</CardTitle>
          <CardDescription>Select the program, year, semester and intake you want to schedule.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
            <AcademicTermFilter
              value={termFilter}
              onChange={onTermChange}
              triggerClassName="w-full"
            />
          </div>
          <div className="sm:col-span-2 lg:col-span-3">
            <Label>Program</Label>
            <Select value={programId} onValueChange={setProgramId} disabled={programsLoading}>
              <SelectTrigger>
                <SelectValue placeholder={programsLoading ? 'Loading...' : 'Select program'} />
              </SelectTrigger>
              <SelectContent>
                {programs.map(p => (
                  <SelectItem key={p.id} value={p.id}>
                    {p.code ? `${p.code} — ${p.name}` : p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label>Year</Label>
            <Select value={String(year)} onValueChange={v => setYear(parseInt(v, 10) || 1)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Array.from({ length: 10 }).map((_, i) => (
                  <SelectItem key={i + 1} value={String(i + 1)}>{`Year ${i + 1}`}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label>Semester</Label>
            <Select value={String(semester)} onValueChange={v => setSemester(parseInt(v, 10) || 1)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="1">Semester 1</SelectItem>
                <SelectItem value="2">Semester 2</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-1">
            <Label>Intake</Label>
            <Select value={intakeType} onValueChange={v => setIntakeType(v as IntakeType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {INTAKES.map(x => (
                  <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="lg:col-span-5 flex flex-col sm:flex-row sm:items-center gap-2">
            <Button className="bg-[#015F2B] w-full sm:w-auto" onClick={ensureIntakeAndLoadCourses} disabled={coursesLoading || !programId}>
              {coursesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Load courses</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIntakeUtilitiesOpen(true)} disabled={!programId || !canWriteSchedule}>
              <Copy className="h-4 w-4" />
              <span className="ml-2">Copy timetable</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={createAll} disabled={creatingAll || courses.length === 0 || refsLoading || !canWriteSchedule}>
              {creatingAll ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              <span className="ml-2">Save timetable</span>
            </Button>
            {refsLoading && (
              <span className="text-sm text-muted-foreground flex items-center gap-2 sm:ml-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Loading lecturers/venues…
              </span>
            )}
          </div>
        </CardContent>
      </Card>

      <Dialog open={intakeUtilitiesOpen} onOpenChange={setIntakeUtilitiesOpen}>
        <DialogContent className="w-[95vw] max-w-lg max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Intake utilities</DialogTitle>
            <DialogDescription>
              Create Evening/Weekend intakes and optionally duplicate the Day timetable into another intake for the same Program, Year and Semester.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="grid gap-3">
              <div className="grid gap-2">
                <Label>Target intake</Label>
                <Select value={duplicateTargetIntake} onValueChange={v => setDuplicateTargetIntake(v as IntakeType)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Evening">Evening</SelectItem>
                    <SelectItem value="Weekend">Weekend</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => setIntakeUtilitiesOpen(false)} disabled={intakeUtilitiesBusy}>
              Close
            </Button>
            <Button
              type="button"
              className="bg-[#015F2B]"
              onClick={async () => {
                if (!programId) return;
                setIntakeUtilitiesBusy(true);
                try {
                  await ensureProgramIntakeId(duplicateTargetIntake);
                  toast.success(`${duplicateTargetIntake} intake is ready`);
                } catch (e: any) {
                  toast.error(e?.message || 'Failed to create intake');
                } finally {
                  setIntakeUtilitiesBusy(false);
                }
              }}
              disabled={intakeUtilitiesBusy || !programId}
            >
              {intakeUtilitiesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Create intake'}
            </Button>
            <Button
              type="button"
              className="bg-[#015F2B]"
              onClick={handleDuplicateDayToTarget}
              disabled={intakeUtilitiesBusy || !programId}
            >
              {intakeUtilitiesBusy ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Duplicate Day → target'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Card className="min-w-0">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Schedule</CardTitle>
        </CardHeader>
        <CardContent className="p-2 sm:p-3 pt-0">
          {courses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6 px-2">
              {programId
                ? 'No courses found for this scope. Add courses under Admin Schools → Program → Year/Semester, then click "Load courses" again.'
                : 'Select your timetable details above, then load courses to begin.'}
            </div>
          ) : (
            <Table className="w-full text-xs">
              <TableHeader>
                <TableRow className="hover:bg-transparent">
                  <TableHead className="px-1.5 h-8 min-w-[120px]">Course</TableHead>
                  <TableHead className="px-1.5 h-8 min-w-[88px]">Class</TableHead>
                  <TableHead className="px-1.5 h-8 w-[72px]">Mode</TableHead>
                  <TableHead className="px-1.5 h-8 min-w-[100px]">Lecturer</TableHead>
                  <TableHead className="px-1.5 h-8 min-w-[88px]">Venue</TableHead>
                  <TableHead className="px-1.5 h-8 w-[56px]">Day</TableHead>
                  <TableHead className="px-1.5 h-8 min-w-[168px]">Time</TableHead>
                  <TableHead className="px-1.5 h-8 w-[52px]">Cap</TableHead>
                  <TableHead className="px-1.5 h-8 w-[1%] whitespace-nowrap">URL</TableHead>
                  <TableHead className="px-1 h-8 w-[1%] whitespace-nowrap text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {courses.flatMap(c => {
                  const sessions = draftsByCourse[c.id] ?? [emptyDraft(c.id, defaultGroupName)];
                  const isShared = sessions.some(s => s.isSharedSchedule);
                  return sessions.map((d, sessionIndex) => (
                    <TableRow
                      key={`${c.id}-${d.localId}`}
                      className={d.isSharedSchedule ? 'bg-violet-50/60' : undefined}
                    >
                      {sessionIndex === 0 ? (
                        <TableCell className="font-medium align-top whitespace-normal break-words px-1.5 py-1.5" rowSpan={sessions.length}>
                          <div className="flex items-center gap-1 flex-wrap">
                            <span className="font-semibold">{c.code}</span>
                            {c.source === 'combined' ? (
                              <Badge variant="outline" className="text-[10px] px-1 py-0 text-violet-800 border-violet-300 bg-violet-50">
                                Combined
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-[11px] text-muted-foreground line-clamp-2 leading-snug mt-0.5">{c.name}</div>
                          {isShared ? (
                            <div className="text-[10px] text-violet-800 mt-1 leading-snug">
                              Shared class — edit in Admin Classes
                            </div>
                          ) : sessions.length > 1 ? (
                            <div className="text-[10px] text-muted-foreground mt-1">
                              {sessions.length} sessions/week
                            </div>
                          ) : null}
                          {!d.isSharedSchedule && canWriteSchedule ? (
                            <Button
                              type="button"
                              variant="outline"
                              size="sm"
                              className="mt-1.5 h-6 text-[10px] px-2"
                              onClick={() => addSession(c.id)}
                            >
                              <Plus className="h-3 w-3 mr-0.5" />
                              Session
                            </Button>
                          ) : null}
                        </TableCell>
                      ) : null}
                      <TableCell className="px-1.5 py-1.5 whitespace-normal">
                        <Input
                          className="h-8 text-xs min-w-0 w-full"
                          value={d.className}
                          disabled={d.isSharedSchedule}
                          onChange={e => updateDraft(c.id, sessionIndex, { className: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <Select
                          value={d.deliveryMode}
                          disabled={d.isSharedSchedule}
                          onValueChange={v => updateDraft(c.id, sessionIndex, { deliveryMode: v as DeliveryMode })}
                        >
                          <SelectTrigger className="h-8 w-[72px] text-xs px-2"><SelectValue /></SelectTrigger>
                          <SelectContent>
                            {DELIVERY_MODES.map(x => (
                              <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 whitespace-normal">
                        <Combobox
                          options={lecturerOptions}
                          value={d.lecturerId ? d.lecturerId : UNASSIGNED}
                          onValueChange={v => updateDraft(c.id, sessionIndex, { lecturerId: v === UNASSIGNED ? '' : v })}
                          placeholder="Lecturer"
                          searchPlaceholder="Search…"
                          emptyText="None found."
                          className="w-full min-w-0 [&_button]:h-8 [&_button]:text-xs [&_button]:px-2"
                          disabled={d.isSharedSchedule}
                        />
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <Select
                          value={d.venueId ? d.venueId : UNASSIGNED}
                          onValueChange={v => updateDraft(c.id, sessionIndex, { venueId: v === UNASSIGNED ? '' : v })}
                          disabled={d.isSharedSchedule || d.deliveryMode === 'Online'}
                        >
                          <SelectTrigger className="h-8 w-full min-w-0 text-xs px-2"><SelectValue placeholder="Venue" /></SelectTrigger>
                          <SelectContent>
                            <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                            {venues.map(v => (
                              <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5">
                        <Select
                          value={d.dayOfWeek}
                          disabled={d.isSharedSchedule}
                          onValueChange={v => updateDraft(c.id, sessionIndex, { dayOfWeek: v })}
                        >
                          <SelectTrigger className="h-8 w-[56px] text-xs px-1.5"><SelectValue placeholder="Day" /></SelectTrigger>
                          <SelectContent>
                            {DAYS.map(x => (
                              <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 whitespace-normal align-top min-w-[168px]">
                        <div className="flex flex-col gap-1.5">
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] uppercase text-muted-foreground w-8 shrink-0">Start</span>
                            <TimeInput12h
                              compact
                              disabled={d.isSharedSchedule}
                              value={d.startTime}
                              onChange={v => updateDraft(c.id, sessionIndex, { startTime: v })}
                            />
                          </div>
                          <div className="flex items-center gap-1.5 min-w-0">
                            <span className="text-[10px] uppercase text-muted-foreground w-8 shrink-0">End</span>
                            <TimeInput12h
                              compact
                              disabled={d.isSharedSchedule}
                              value={d.endTime}
                              onChange={v => updateDraft(c.id, sessionIndex, { endTime: v })}
                            />
                          </div>
                        </div>
                      </TableCell>
                      <TableCell className="px-1.5 py-1.5 w-[52px]">
                        <Input
                          className="h-8 w-[52px] text-xs px-1.5 text-center"
                          disabled={d.isSharedSchedule}
                          value={d.capacity}
                          onChange={e => updateDraft(c.id, sessionIndex, { capacity: e.target.value })}
                        />
                      </TableCell>
                      <TableCell className="px-1 py-1.5 w-[1%] whitespace-nowrap">
                        {d.deliveryMode === 'InPerson' || d.isSharedSchedule ? (
                          <span className="text-muted-foreground px-1">—</span>
                        ) : (
                          <Input
                            className="h-8 w-[88px] text-xs px-2"
                            value={d.meetingUrl}
                            onChange={e => updateDraft(c.id, sessionIndex, { meetingUrl: e.target.value })}
                            placeholder="URL"
                          />
                        )}
                      </TableCell>
                      <TableCell className="px-1 py-1.5 w-[1%] whitespace-nowrap">
                        {d.isSharedSchedule ? (
                          <Badge variant="secondary" className="text-[10px]">Shared</Badge>
                        ) : (
                          <div className="inline-flex items-center gap-0.5">
                            {sessions.length > 1 ? (
                              <Button
                                type="button"
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                                onClick={() => removeSession(c.id, sessionIndex)}
                                disabled={!canWriteSchedule}
                                title="Remove session"
                              >
                                <Trash2 className="h-3.5 w-3.5" />
                              </Button>
                            ) : null}
                            <Button
                              size="sm"
                              className="bg-[#015F2B] h-7 px-2 text-xs"
                              onClick={() => createOne(c.id, sessionIndex)}
                              disabled={!canWriteSchedule}
                            >
                              Save
                            </Button>
                          </div>
                        )}
                      </TableCell>
                    </TableRow>
                  ));
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

