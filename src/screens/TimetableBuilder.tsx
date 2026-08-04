import React, { useEffect, useMemo, useRef, useState } from 'react';
import { Copy, Loader2, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import { academicService } from '@/services/academic.service';
import { staffService } from '@/services/staff.service';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Combobox } from '@/components/ui/combobox';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useSearchParams } from 'react-router';

type IntakeType = 'Day' | 'Evening' | 'Weekend';
type DeliveryMode = 'InPerson' | 'Online' | 'Hybrid';

type ProgramLite = { id: string; name: string; code?: string; departmentId?: string };
type CourseLite = { id: string; code: string; name: string; source?: 'program' | 'combined' };
type VenueLite = { id: string; name: string };
type LecturerLite = { id: string; name: string };

type DraftRow = {
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

const INTAKES: { value: IntakeType; label: string }[] = [
  { value: 'Day', label: 'Day' },
  { value: 'Evening', label: 'Evening' },
  { value: 'Weekend', label: 'Weekend' },
];

const DELIVERY_MODES: { value: DeliveryMode; label: string }[] = [
  { value: 'InPerson', label: 'In-person' },
  { value: 'Online', label: 'Online' },
  { value: 'Hybrid', label: 'Hybrid' },
];

const DAYS: { value: string; label: string }[] = [
  { value: '1', label: 'Monday' },
  { value: '2', label: 'Tuesday' },
  { value: '3', label: 'Wednesday' },
  { value: '4', label: 'Thursday' },
  { value: '5', label: 'Friday' },
  { value: '6', label: 'Saturday' },
  { value: '0', label: 'Sunday' },
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

  const [drafts, setDrafts] = useState<Record<string, DraftRow>>({});
  const [creatingAll, setCreatingAll] = useState(false);
  const [activeTermLabel, setActiveTermLabel] = useState<string | null>(null);
  const [activeTermId, setActiveTermId] = useState<string | null>(null);
  const [hasActiveTerm, setHasActiveTerm] = useState(true);

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
        setActiveTermLabel(`${term.name} (Sem ${term.semester})`);
        const qSemester = searchParams.get('semester');
        if (!qSemester && (term.semester === 1 || term.semester === 2)) {
          setSemester(term.semester);
        }
      })
      .catch(() => {
        setHasActiveTerm(false);
        setActiveTermLabel(null);
        setActiveTermId(null);
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
        setDrafts({});
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
        setDrafts({});
        return;
      }

      const groupName =
        selectedProgram?.code
          ? `${selectedProgram.code} Y${year}S${semester} ${intakeType}`
          : `Y${year}S${semester} ${intakeType}`;

      const classesByCourseId = scope?.classesByCourseId ?? {};
      const nextDrafts: Record<string, DraftRow> = {};
      for (const c of mapped) {
        const existing = classesByCourseId[c.id];
        nextDrafts[c.id] = drafts[c.id] ?? {
          courseId: c.id,
          className: existing?.className ?? groupName,
          lecturerId: existing?.lecturerId ?? '',
          venueId: existing?.venueId ?? '',
          deliveryMode: (existing?.deliveryMode as DeliveryMode) ?? 'InPerson',
          meetingUrl: existing?.meetingUrl ?? '',
          dayOfWeek: existing?.dayOfWeek != null ? String(existing.dayOfWeek) : '',
          startTime: existing?.startTime ?? '',
          endTime: existing?.endTime ?? '',
          capacity: existing?.capacity != null ? String(existing.capacity) : '50',
          existingClassId: existing?.classId,
          isSharedSchedule: existing?.isSharedSchedule ?? false,
        };
      }
      setDrafts(nextDrafts);

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
      setDrafts({});
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
    while (true) {
      const res = await academicService.getClasses({
        programIntakeId: intakeId,
        page,
        limit: 50,
        classStatus: 'active',
        ...(activeTermId ? { academicTermId: activeTermId } : {}),
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

  const updateDraft = (courseId: string, patch: Partial<DraftRow>) => {
    setDrafts(prev => ({ ...prev, [courseId]: { ...prev[courseId], ...patch } }));
  };

  const createOne = async (courseId: string) => {
    const d = drafts[courseId];
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
          updateDraft(courseId, { existingClassId: created.id });
        }
        toast.success('Class saved');
      }
      window.dispatchEvent(new CustomEvent('class-updated'));
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save class');
    }
  };

  const createAll = async () => {
    if (!programIntakeId) {
      toast.error('Select scope and load courses first');
      return;
    }
    setCreatingAll(true);
    try {
      for (const c of courses) {
        const draft = drafts[c.id];
        if (draft?.isSharedSchedule) continue;
        await createOne(c.id);
      }
    } finally {
      setCreatingAll(false);
    }
  };

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Timetable Builder</h1>
        <p className="text-sm text-muted-foreground mt-1">
          {activeTermLabel
            ? `Scheduling for Active term: ${activeTermLabel}. New classes are stamped to this term.`
            : 'No Active academic term — create/activate one under Admin → Calendar before scheduling.'}
        </p>
        <p className="text-gray-500">
          Create and manage timetables using school data, with automatic conflict checks.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Timetable details</CardTitle>
          <CardDescription>Select the program, year, semester and intake you want to schedule.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4 grid-cols-1 sm:grid-cols-2 lg:grid-cols-5">
          <div className="sm:col-span-2 lg:col-span-2">
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
            <Button className="bg-[#015F2B] w-full sm:w-auto" onClick={ensureIntakeAndLoadCourses} disabled={coursesLoading || !programId || !hasActiveTerm}>
              {coursesLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              <span className="ml-2">Load courses</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={() => setIntakeUtilitiesOpen(true)} disabled={!programId || !hasActiveTerm}>
              <Copy className="h-4 w-4" />
              <span className="ml-2">Copy timetable</span>
            </Button>
            <Button variant="outline" className="w-full sm:w-auto" onClick={createAll} disabled={creatingAll || courses.length === 0 || refsLoading || !hasActiveTerm}>
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

      <Card>
        <CardHeader>
          <CardTitle>Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          {courses.length === 0 ? (
            <div className="text-sm text-muted-foreground py-6">
              {programId
                ? 'No courses found for this scope. Add courses under Admin Schools → Program → Year/Semester, then click "Load courses" again.'
                : 'Select your timetable details above, then load courses to begin.'}
            </div>
          ) : (
            <div className="rounded-md border bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Course</TableHead>
                    <TableHead>Class name</TableHead>
                    <TableHead>Mode</TableHead>
                    <TableHead>Lecturer</TableHead>
                    <TableHead>Venue</TableHead>
                    <TableHead>Day</TableHead>
                    <TableHead>Start</TableHead>
                    <TableHead>End</TableHead>
                    <TableHead>Cap.</TableHead>
                    <TableHead>Meeting URL</TableHead>
                    <TableHead className="text-right">Action</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {courses.map(c => {
                    const d = drafts[c.id];
                    const isShared = d?.isSharedSchedule === true;
                    return (
                      <TableRow key={c.id} className={isShared ? 'bg-violet-50/60' : undefined}>
                        <TableCell className="font-medium">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span>{c.code}</span>
                            {c.source === 'combined' ? (
                              <Badge variant="outline" className="text-violet-800 border-violet-300 bg-violet-50">
                                Combined cohort
                              </Badge>
                            ) : null}
                          </div>
                          <div className="text-xs text-muted-foreground">{c.name}</div>
                          {isShared ? (
                            <div className="text-xs text-violet-800 mt-1">
                              Scheduled via shared class — edit in Admin Classes
                            </div>
                          ) : null}
                        </TableCell>
                        <TableCell>
                          <Input value={d?.className ?? ''} disabled={isShared} onChange={e => updateDraft(c.id, { className: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Select value={d?.deliveryMode ?? 'InPerson'} disabled={isShared} onValueChange={v => updateDraft(c.id, { deliveryMode: v as DeliveryMode })}>
                            <SelectTrigger className="w-[140px]"><SelectValue /></SelectTrigger>
                            <SelectContent>
                              {DELIVERY_MODES.map(x => (
                                <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Combobox
                            options={lecturerOptions}
                            value={d?.lecturerId ? d.lecturerId : UNASSIGNED}
                            onValueChange={v => updateDraft(c.id, { lecturerId: v === UNASSIGNED ? '' : v })}
                            placeholder="Select lecturer"
                            searchPlaceholder="Search lecturer..."
                            emptyText="No lecturer found."
                            className="w-[220px]"
                            disabled={isShared}
                          />
                        </TableCell>
                        <TableCell>
                          <Select
                            value={d?.venueId ? d.venueId : UNASSIGNED}
                            onValueChange={v => updateDraft(c.id, { venueId: v === UNASSIGNED ? '' : v })}
                            disabled={isShared || (d?.deliveryMode ?? 'InPerson') === 'Online'}
                          >
                            <SelectTrigger className="w-[180px]"><SelectValue placeholder="Select" /></SelectTrigger>
                            <SelectContent>
                              <SelectItem value={UNASSIGNED}>Unassigned</SelectItem>
                              {venues.map(v => (
                                <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Select value={d?.dayOfWeek ?? ''} disabled={isShared} onValueChange={v => updateDraft(c.id, { dayOfWeek: v })}>
                            <SelectTrigger className="w-[140px]"><SelectValue placeholder="Day" /></SelectTrigger>
                            <SelectContent>
                              {DAYS.map(x => (
                                <SelectItem key={x.value} value={x.value}>{x.label}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell>
                          <Input className="w-[110px]" type="time" disabled={isShared} value={d?.startTime ?? ''} onChange={e => updateDraft(c.id, { startTime: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input className="w-[110px]" type="time" disabled={isShared} value={d?.endTime ?? ''} onChange={e => updateDraft(c.id, { endTime: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input className="w-[90px]" disabled={isShared} value={d?.capacity ?? ''} onChange={e => updateDraft(c.id, { capacity: e.target.value })} />
                        </TableCell>
                        <TableCell>
                          <Input
                            className="w-[220px]"
                            value={d?.meetingUrl ?? ''}
                            onChange={e => updateDraft(c.id, { meetingUrl: e.target.value })}
                            disabled={isShared || (d?.deliveryMode ?? 'InPerson') === 'InPerson'}
                            placeholder={(d?.deliveryMode ?? 'InPerson') === 'InPerson' ? '—' : 'https://...'}
                          />
                        </TableCell>
                        <TableCell className="text-right">
                          {isShared ? (
                            <Badge variant="secondary">Shared</Badge>
                          ) : (
                            <Button size="sm" className="bg-[#015F2B]" onClick={() => createOne(c.id)}>
                              Save
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

