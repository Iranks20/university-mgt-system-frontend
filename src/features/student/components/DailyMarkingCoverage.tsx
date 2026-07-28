import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  Loader2,
  AlertCircle,
  Clock,
  Users,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { studentService } from '@/services';
import type {
  DailyBulkPrefill,
  DailyMarkingCoverage,
  DailyMarkingCoverageFilter,
  DailyMarkingCoverageItem,
  DailyMarkingCoverageStatus,
} from '@/types/student';
import { lectureCommentLabel } from '@/lib/lecture-outcome';
import { toast } from 'sonner';
import { PROGRAM_INTAKE_ALL, useProgramIntakeScope } from '@/hooks/useProgramIntakeScope';

const STATUS_FILTER_OPTIONS: Array<{ value: DailyMarkingCoverageFilter; label: string }> = [
  { value: 'all', label: 'All statuses' },
  { value: 'pending', label: 'Needs student mark' },
  { value: 'awaiting_lecture', label: 'Awaiting lecture mark' },
  { value: 'not_started', label: 'Ready to mark' },
  { value: 'partial', label: 'Partial' },
  { value: 'complete', label: 'Complete' },
  { value: 'sdl', label: 'SDL' },
  { value: 'assignment', label: 'Assignment' },
  { value: 'missed_by_lecturer', label: 'Missed by lecturer' },
  { value: 'missed_by_students', label: 'Missed by students' },
  { value: 'missed_other_programs_holidays', label: 'Missed (other/holidays)' },
];

const LECTURE_OUTCOME_STATUSES: DailyMarkingCoverageStatus[] = [
  'sdl',
  'assignment',
  'missed_by_lecturer',
  'missed_by_students',
  'missed_other_programs_holidays',
];

function formatTimeRange(start: string | null, end: string | null): string {
  const fmt = (value: string | null) => {
    if (!value) return '—';
    const match = value.match(/^(\d{1,2}):(\d{2})/);
    if (match) return `${match[1].padStart(2, '0')}:${match[2]}`;
    return value.slice(0, 5);
  };
  if (!start && !end) return '—';
  return `${fmt(start)} – ${fmt(end)}`;
}

function outcomeBadgeLabel(status: DailyMarkingCoverageStatus, lectureComment?: string | null): string {
  if (lectureComment) return lectureCommentLabel(lectureComment);
  switch (status) {
    case 'sdl':
      return 'SDL';
    case 'assignment':
      return 'ASSIGNMENT';
    case 'missed_by_lecturer':
      return 'MISSED BY LECTURER';
    case 'missed_by_students':
      return 'MISSED BY STUDENTS';
    case 'missed_other_programs_holidays':
      return 'MISSED DUE TO OTHER PROGRAMS & PUBLIC HOLIDAYS';
    default:
      return status;
  }
}

function statusBadge(item: Pick<DailyMarkingCoverageItem, 'status' | 'lectureComment'>) {
  const { status, lectureComment } = item;
  switch (status) {
    case 'complete':
      return (
        <Badge className="bg-green-100 text-green-800 hover:bg-green-100 border-green-200">
          Complete
        </Badge>
      );
    case 'partial':
      return (
        <Badge className="bg-amber-100 text-amber-800 hover:bg-amber-100 border-amber-200">
          Partial
        </Badge>
      );
    case 'awaiting_lecture':
      return (
        <Badge className="bg-slate-100 text-slate-800 hover:bg-slate-100 border-slate-200">
          Awaiting lecture mark
        </Badge>
      );
    case 'no_students':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          No students
        </Badge>
      );
    case 'not_started':
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
          Ready to mark
        </Badge>
      );
    default:
      if (LECTURE_OUTCOME_STATUSES.includes(status)) {
        return (
          <Badge className="bg-violet-100 text-violet-900 hover:bg-violet-100 border-violet-200">
            {outcomeBadgeLabel(status, lectureComment)}
          </Badge>
        );
      }
      return (
        <Badge className="bg-blue-100 text-blue-800 hover:bg-blue-100 border-blue-200">
          Ready to mark
        </Badge>
      );
  }
}

function canMarkAttendance(item: DailyMarkingCoverageItem): boolean {
  return item.attendanceAllowed === true && item.status !== 'no_students';
}

function markDisabledTitle(item: DailyMarkingCoverageItem): string | undefined {
  if (canMarkAttendance(item)) return undefined;
  if (item.status === 'no_students') return 'No students enrolled for this class';
  if (LECTURE_OUTCOME_STATUSES.includes(item.status)) {
    return 'Student attendance is not recorded for this lecture outcome';
  }
  return 'Mark the lecture Taught / Substituted / Compensation on Lecture Records first';
}

interface DailyMarkingCoverageProps {
  schools: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; code: string; departmentId: string }>;
  programToSchoolMap: Map<string, string>;
  initialDate?: string;
  initialStatus?: DailyMarkingCoverageFilter;
  refreshToken?: number;
  onMarkClass?: (prefill: DailyBulkPrefill) => void;
  onCoverageLoaded?: (coverage: DailyMarkingCoverage) => void;
}

export default function DailyMarkingCoverage({
  schools,
  programs,
  programToSchoolMap,
  initialDate,
  initialStatus = 'all',
  refreshToken = 0,
  onMarkClass,
  onCoverageLoaded,
}: DailyMarkingCoverageProps) {
  const intakeScope = useProgramIntakeScope({
    intakeField: 'cohortList',
    allowAllSchool: true,
    allowAllProgram: true,
    allowAllYear: true,
    allowAllSemester: true,
    yearOptions: [1, 2, 3, 4, 5],
    semesterOptions: [1, 2],
    schools,
    programs,
    programToSchoolMap,
  });

  const [coverageDate, setCoverageDate] = useState(
    () => initialDate ?? new Date().toISOString().slice(0, 10)
  );
  const [statusFilter, setStatusFilter] = useState<DailyMarkingCoverageFilter>(initialStatus);
  const [coverage, setCoverage] = useState<DailyMarkingCoverage | null>(null);
  const [loading, setLoading] = useState(false);
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  const queryParams = useMemo(() => {
    const params: {
      date: string;
      status: DailyMarkingCoverageFilter;
      schoolId?: string;
      programId?: string;
      programIntakeId?: string;
    } = { date: coverageDate, status: statusFilter };
    if (intakeScope.schoolId && intakeScope.schoolId !== PROGRAM_INTAKE_ALL) {
      params.schoolId = intakeScope.schoolId;
    }
    if (intakeScope.programId && intakeScope.programId !== PROGRAM_INTAKE_ALL) {
      params.programId = intakeScope.programId;
    }
    if (intakeScope.programIntakeId && intakeScope.programIntakeId !== PROGRAM_INTAKE_ALL) {
      params.programIntakeId = intakeScope.programIntakeId;
    }
    return params;
  }, [
    coverageDate,
    statusFilter,
    intakeScope.schoolId,
    intakeScope.programId,
    intakeScope.programIntakeId,
  ]);

  const loadCoverage = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studentService.getDailyMarkingCoverage(queryParams);
      setCoverage(data);
      if (data) onCoverageLoaded?.(data);
      if (data && data.summary.totalSlots === 0) {
        toast.info(`No scheduled classes found for ${data.dayName} (${data.date}).`);
      }
    } catch {
      setCoverage(null);
      toast.error('Failed to load marking coverage. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [queryParams, onCoverageLoaded]);

  useEffect(() => {
    loadCoverage();
  }, [loadCoverage, refreshToken]);

  useEffect(() => {
    if (initialDate) setCoverageDate(initialDate);
  }, [initialDate]);

  useEffect(() => {
    if (initialStatus) setStatusFilter(initialStatus);
  }, [initialStatus]);

  useEffect(() => {
    setPage(1);
  }, [queryParams, pageSize]);

  const handleMark = (item: DailyMarkingCoverageItem) => {
    if (!onMarkClass) return;
    if (item.status === 'no_students') {
      toast.info('This class has no active students in the cohort.');
      return;
    }
    if (!canMarkAttendance(item)) {
      toast.info(markDisabledTitle(item) ?? 'Student attendance cannot be marked for this slot.');
      return;
    }
    onMarkClass({
      programIntakeId: item.programIntakeId,
      programId: item.programId,
      schoolId: item.schoolId,
      year: item.year,
      semester: item.semester,
      intakeType: item.intakeType,
      date: coverageDate,
      requestId: Date.now(),
    });
  };

  const summary = coverage?.summary;
  const items = coverage?.items ?? [];
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const pageStart = (safePage - 1) * pageSize;
  const pagedItems = items.slice(pageStart, pageStart + pageSize);

  return (
    <div className="space-y-4">
      <Card className="border-[#015F2B]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#015F2B]" />
            Marking coverage
          </CardTitle>
          <CardDescription>
            Class slots for the day with lecture outcome and student marking progress. SDL, Assignment,
            and missed outcomes show here with Mark disabled.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-3 items-end">
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input
                type="date"
                className="w-[160px] h-9"
                value={coverageDate}
                onChange={(e) => setCoverageDate(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">School</Label>
              <Select value={intakeScope.schoolId || PROGRAM_INTAKE_ALL} onValueChange={intakeScope.setSchoolId}>
                <SelectTrigger className="w-[180px] h-9">
                  <SelectValue placeholder="All schools" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROGRAM_INTAKE_ALL}>All schools</SelectItem>
                  {schools.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {s.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Programme</Label>
              <Select value={intakeScope.programId || PROGRAM_INTAKE_ALL} onValueChange={intakeScope.setProgramId}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="All programmes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROGRAM_INTAKE_ALL}>All programmes</SelectItem>
                  {intakeScope.filteredPrograms.map((p) => (
                    <SelectItem key={p.id} value={p.id}>
                      {p.code ? `${p.name} (${p.code})` : p.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Cohort</Label>
              <Select
                value={intakeScope.programIntakeId || PROGRAM_INTAKE_ALL}
                onValueChange={intakeScope.setProgramIntakeId}
                disabled={intakeScope.programId === PROGRAM_INTAKE_ALL || !intakeScope.programId}
              >
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="All cohorts" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value={PROGRAM_INTAKE_ALL}>All cohorts</SelectItem>
                  {intakeScope.intakes.map((i) => (
                    <SelectItem key={i.id} value={i.id}>
                      Y{i.year} S{i.semester} · {i.intakeType}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Status</Label>
              <Select
                value={statusFilter}
                onValueChange={(v) => setStatusFilter(v as DailyMarkingCoverageFilter)}
              >
                <SelectTrigger className="w-[160px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_FILTER_OPTIONS.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <Button
              className="bg-[#015F2B] hover:bg-[#014022] h-9"
              onClick={loadCoverage}
              disabled={loading}
            >
              {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Calendar className="mr-2 h-4 w-4" />}
              Refresh
            </Button>
          </div>

          <div className="flex flex-wrap gap-2">
            <Button
              type="button"
              size="sm"
              variant={coverageDate === new Date().toISOString().slice(0, 10) ? 'default' : 'outline'}
              className={coverageDate === new Date().toISOString().slice(0, 10) ? 'bg-[#015F2B] hover:bg-[#014022]' : ''}
              onClick={() => setCoverageDate(new Date().toISOString().slice(0, 10))}
            >
              Today
            </Button>
            <Button
              type="button"
              size="sm"
              variant="outline"
              onClick={() => {
                const d = new Date();
                d.setDate(d.getDate() - 1);
                setCoverageDate(d.toISOString().slice(0, 10));
              }}
            >
              Yesterday
            </Button>
          </div>

          {coverage && (
            <p className="text-sm text-muted-foreground">
              {coverage.dayName} ({coverage.date}) · {summary?.totalSlots ?? 0} class slots
            </p>
          )}
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Needs student mark</p>
              <h3 className="text-2xl font-bold text-amber-700">{loading ? '—' : summary?.pending ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-700">
              <AlertCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Awaiting lecture</p>
              <h3 className="text-2xl font-bold text-slate-700">
                {loading ? '—' : summary?.awaitingLecture ?? 0}
              </h3>
            </div>
            <div className="h-10 w-10 bg-slate-100 rounded-full flex items-center justify-center text-slate-700">
              <Clock size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Ready to mark</p>
              <h3 className="text-2xl font-bold text-blue-700">{loading ? '—' : summary?.notStarted ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-blue-50 rounded-full flex items-center justify-center text-blue-700">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Partial</p>
              <h3 className="text-2xl font-bold text-amber-600">{loading ? '—' : summary?.partial ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-amber-50 rounded-full flex items-center justify-center text-amber-600">
              <Users size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Complete</p>
              <h3 className="text-2xl font-bold text-green-700">{loading ? '—' : summary?.complete ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-700">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Lecture outcomes</p>
              <h3 className="text-2xl font-bold text-violet-800">
                {loading ? '—' : summary?.lectureOutcomes ?? 0}
              </h3>
            </div>
            <div className="h-10 w-10 bg-violet-50 rounded-full flex items-center justify-center text-violet-800">
              <ClipboardList size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <CardTitle>Class slots</CardTitle>
              <CardDescription>
                Showing {items.length === 0 ? 0 : pageStart + 1}–
                {Math.min(pageStart + pageSize, items.length)} of {items.length} row
                {items.length === 1 ? '' : 's'} for the selected filters.
              </CardDescription>
            </div>
            <div className="flex items-center gap-2">
              <Label className="text-xs text-muted-foreground whitespace-nowrap">Rows</Label>
              <Select
                value={String(pageSize)}
                onValueChange={(v) => setPageSize(Number(v))}
              >
                <SelectTrigger className="w-[88px] h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {[10, 20, 50, 100].map((size) => (
                    <SelectItem key={size} value={String(size)}>
                      {size}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0">
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Time</TableHead>
                  <TableHead>Cohort</TableHead>
                  <TableHead>Course</TableHead>
                  <TableHead>Class</TableHead>
                  <TableHead className="text-right">Marked</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loading ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" />
                      Loading coverage…
                    </TableCell>
                  </TableRow>
                ) : items.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-10 text-muted-foreground">
                      No class slots match your filters for this date.
                    </TableCell>
                  </TableRow>
                ) : (
                  pagedItems.map((item) => (
                    <TableRow key={`${item.programIntakeId}|${item.classId}`}>
                      <TableCell className="whitespace-nowrap">
                        {formatTimeRange(item.startTime, item.endTime)}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.cohortLabel}</div>
                        {item.schoolName ? (
                          <div className="text-xs text-muted-foreground">{item.schoolName}</div>
                        ) : null}
                      </TableCell>
                      <TableCell>
                        <div className="font-medium">{item.courseCode || item.courseName}</div>
                        <div className="text-xs text-muted-foreground">{item.courseName}</div>
                      </TableCell>
                      <TableCell>{item.className}</TableCell>
                      <TableCell className="text-right tabular-nums">
                        {item.markedStudents}/{item.expectedStudents}
                      </TableCell>
                      <TableCell>{statusBadge(item)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#015F2B] border-[#015F2B]/30"
                          disabled={!canMarkAttendance(item)}
                          title={markDisabledTitle(item)}
                          onClick={() => handleMark(item)}
                        >
                          Mark
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {items.length > 0 && (
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{items.length} total</span>
                <div className="flex items-center gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage <= 1}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {safePage} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={safePage >= totalPages}
                    onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
