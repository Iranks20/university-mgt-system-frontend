import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  Calendar,
  CheckCircle,
  ClipboardList,
  Loader2,
  AlertCircle,
  Clock,
  Users,
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
import { toast } from 'sonner';
import { PROGRAM_INTAKE_ALL, useProgramIntakeScope } from '@/hooks/useProgramIntakeScope';

const STATUS_FILTER_OPTIONS: Array<{ value: DailyMarkingCoverageFilter; label: string }> = [
  { value: 'pending', label: 'Pending only' },
  { value: 'all', label: 'All statuses' },
  { value: 'not_started', label: 'Not started' },
  { value: 'partial', label: 'Partial' },
  { value: 'complete', label: 'Complete' },
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

function statusBadge(status: DailyMarkingCoverageStatus) {
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
    case 'no_students':
      return (
        <Badge variant="secondary" className="text-muted-foreground">
          No students
        </Badge>
      );
    default:
      return (
        <Badge className="bg-red-100 text-red-800 hover:bg-red-100 border-red-200">
          Not started
        </Badge>
      );
  }
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
  initialStatus = 'pending',
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

  const handleMark = (item: DailyMarkingCoverageItem) => {
    if (!onMarkClass) return;
    if (item.status === 'no_students') {
      toast.info('This class has no active students in the cohort.');
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

  return (
    <div className="space-y-4">
      <Card className="border-[#015F2B]/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <ClipboardList className="h-5 w-5 text-[#015F2B]" />
            Marking coverage
          </CardTitle>
          <CardDescription>
            See which classes have student attendance marked for a day. Open pending rows in the daily bulk grid.
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

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Pending</p>
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
              <p className="text-sm font-medium text-muted-foreground">Not started</p>
              <h3 className="text-2xl font-bold text-red-600">{loading ? '—' : summary?.notStarted ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-red-50 rounded-full flex items-center justify-center text-red-600">
              <Clock size={20} />
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
              <h3 className="text-2xl font-bold text-green-600">{loading ? '—' : summary?.complete ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-green-50 rounded-full flex items-center justify-center text-green-600">
              <CheckCircle size={20} />
            </div>
          </CardContent>
        </Card>
        <Card className="bg-white">
          <CardContent className="p-4 flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-muted-foreground">Total slots</p>
              <h3 className="text-2xl font-bold text-gray-900">{loading ? '—' : summary?.totalSlots ?? 0}</h3>
            </div>
            <div className="h-10 w-10 bg-gray-100 rounded-full flex items-center justify-center text-gray-600">
              <ClipboardList size={20} />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Class slots</CardTitle>
          <CardDescription>
            Showing {items.length} row{items.length === 1 ? '' : 's'} for the selected filters.
          </CardDescription>
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
                  items.map((item) => (
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
                      <TableCell>{statusBadge(item.status)}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="text-[#015F2B] border-[#015F2B]/30"
                          disabled={item.status === 'no_students'}
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
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
