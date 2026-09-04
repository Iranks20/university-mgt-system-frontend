import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line 
} from 'recharts';
import { 
  FileText, Download, Filter, Calendar, Users, Building, 
  TrendingUp, AlertCircle, CheckCircle, Search, RotateCcw,
  ArrowUp, ArrowDown, Loader2, ChevronLeft, ChevronRight,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { QASchoolSummary, QALecturerSummary, QACourseUnitSummary } from '@/features/qa';
import { analyticsService } from '@/services/analytics.service';
import { reportService } from '@/services/report.service';
import { qaService } from '@/services/qa.service';
import { academicService } from '@/services/academic.service';
import { timetableService } from '@/services/timetable.service';
import { studentService } from '@/services/student.service';
import {
  exportClassAttendanceSummaryReport,
  exportCourseWiseAttendanceSummaryReport,
  exportLecturerPerformanceTable,
  exportLecturerStatsDetailReport,
} from '@/utils/excel';
import { printLecturerStatsDetailReport } from '@/lib/lecturer-stats-print';
import WeeklyAttendanceMatrixPanel from '@/features/student/components/WeeklyAttendanceMatrixPanel';
import {
  formatWeightedAttendedCount,
  sortCourseWiseAttendanceRows,
  type CourseWiseRowSortDirection,
} from '@/lib/attendance-metrics';
import { UNIVERSITY_NAME } from '@/lib/institution';
import { lectureCommentLabel } from '@/lib/lecture-outcome';
import type { ClassAttendanceSummaryReport, CourseWiseAttendanceSummaryReport } from '@/types/student';
import { useAuth } from '@/contexts/AuthContext';
import type { School, Department, Level, Course, Class } from '@/types';
import { toast } from 'sonner';
import {
  AcademicTermFilter,
  TERM_FILTER_ACTIVE,
  resolveAcademicTermFilter,
  type AcademicTermFilterSelection,
} from '@/components/AcademicTermFilter';
import { termScopeQueryParam } from '@/lib/academic-term-scope';
import { resolveReportsScopedDates } from '@/lib/reports-term-scope';
import { useAcademicTermFilterState } from '@/hooks/useAcademicTermFilterState';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';

const REPORT_TABLE_PAGE_SIZE = 20;

function ReportTablePagination({
  total,
  page,
  onPageChange,
}: {
  total: number;
  page: number;
  onPageChange: (page: number) => void;
}) {
  if (total === 0) return null;
  const totalPages = Math.max(1, Math.ceil(total / REPORT_TABLE_PAGE_SIZE));
  return (
    <div className="flex items-center justify-between border-t px-4 py-2">
      <span className="text-sm text-muted-foreground">{total} total</span>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          <ChevronLeft className="h-4 w-4" /> Previous
        </Button>
        <span className="text-sm">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next <ChevronRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

export default function Reports() {
  const { user } = useAuth();
  const {
    termFilter,
    academicTermId,
    classStatusHint,
    termStartDate,
    termEndDate,
    onTermChange,
  } = useAcademicTermFilterState();
  const [reportType, setReportType] = useState('school');
  const [overviewStats, setOverviewStats] = useState<{ teachingRatePercent?: number; studentAttendancePercent?: number; recentQARecords?: number; untaughtLectures?: number; scheduledCountLast30?: number; teachingRateVsScheduledPercent?: number } | null>(null);
  const [attendanceTrends, setAttendanceTrends] = useState<{ day: string; present: number; absent: number }[]>([]);
  const [attendancePie, setAttendancePie] = useState<{ name: string; value: number; color: string }[]>([]);
  const [recentReports, setRecentReports] = useState<{ id: string; name: string; date: string; type: string }[]>([]);
  const [schoolPerformance, setSchoolPerformance] = useState<{ name: string; taught: number; untaught: number; rate: number; scheduled?: number; rateVsScheduled?: number }[]>([]);
  const [lecturerTableData, setLecturerTableData] = useState<{ id: string; name: string; school: string; department: string; taught: number; missed: number; rate: number }[]>([]);
  const [overviewLoading, setOverviewLoading] = useState(true);
  const [schoolsLoading, setSchoolsLoading] = useState(false);
  const [lecturersLoading, setLecturersLoading] = useState(false);
  const [studentsReport, setStudentsReport] = useState<{
    id: string;
    name: string;
    program?: string;
    registrationNumber?: string;
    attendanceRate?: number;
    missed?: number;
    expectedSessions?: number;
    attendedSessions?: number;
  }[]>([]);
  const [studentsLoading, setStudentsLoading] = useState(false);
  const [atRiskMeta, setAtRiskMeta] = useState<{ thresholdPercent: number; minSessions: number } | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [lecturerSearch, setLecturerSearch] = useState('');
  const [schoolFilter, setSchoolFilter] = useState<string>('all');
  const [lecturerDeptFilter, setLecturerDeptFilter] = useState<string>('all');
  const [lecturerRateFilter, setLecturerRateFilter] = useState<'all' | 'below_90' | '90_plus'>('all');
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState<{ id: string; name: string; school: string; department: string; taught: number; missed: number; rate: number } | null>(null);
  const [lecturerDetailLoading, setLecturerDetailLoading] = useState(false);
  const [lecturerDetail, setLecturerDetail] = useState<Awaited<ReturnType<typeof analyticsService.getLecturerStatsDetail>>>(null);
  const [reconciliationData, setReconciliationData] = useState<{ date: string; className: string; lecturerName: string; scheduled: boolean; outcome: string; substituteLecturerName?: string | null }[]>([]);
  const [reconciliationLoading, setReconciliationLoading] = useState(false);
  const [reconDateFrom, setReconDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [reconDateTo, setReconDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [reconSchoolId, setReconSchoolId] = useState<string>('');
  const [reconCourseId, setReconCourseId] = useState<string>('');
  const [schoolsList, setSchoolsList] = useState<{ id: string; name: string }[]>([]);
  const [schoolPerfDateRange, setSchoolPerfDateRange] = useState<'all' | 'last_30_days' | 'this_term'>('all');
  const [lecturerDateRange, setLecturerDateRange] = useState<'all' | 'last_30_days' | 'this_term'>('all');
  const [studentAttendDateRange, setStudentAttendDateRange] = useState<'all' | 'last_30_days' | 'this_term'>('all');
  const [studentAttendLimit, setStudentAttendLimit] = useState<number>(100);
  const ALL_VALUE = '__all__';
  const [attendSchools, setAttendSchools] = useState<School[]>([]);
  const [attendLevels, setAttendLevels] = useState<Level[]>([]);
  const [attendDepartments, setAttendDepartments] = useState<Department[]>([]);
  const [attendPrograms, setAttendPrograms] = useState<Array<{ id: string; name: string; code: string; departmentId: string }>>([]);
  const [attendCourses, setAttendCourses] = useState<Course[]>([]);
  const [attendClasses, setAttendClasses] = useState<Class[]>([]);
  const [attendSelectedSchool, setAttendSelectedSchool] = useState(ALL_VALUE);
  const [attendSelectedProgramId, setAttendSelectedProgramId] = useState(ALL_VALUE);
  const [attendSelectedCourseId, setAttendSelectedCourseId] = useState(ALL_VALUE);
  const [attendSelectedClassId, setAttendSelectedClassId] = useState(ALL_VALUE);
  const [attendSelectedYear, setAttendSelectedYear] = useState(ALL_VALUE);
  const [attendSelectedSemester, setAttendSelectedSemester] = useState(ALL_VALUE);
  const [attendDateFrom, setAttendDateFrom] = useState('');
  const [attendDateTo, setAttendDateTo] = useState('');
  const [activeTermLabel, setActiveTermLabel] = useState<string | null>(null);
  const reportsScopedDates = useMemo(
    () => resolveReportsScopedDates(termFilter, termStartDate, termEndDate),
    [termFilter, termStartDate, termEndDate]
  );
  const reportsTermScoped = reportsScopedDates != null;
  const [classAttendReport, setClassAttendReport] = useState<ClassAttendanceSummaryReport | null>(null);
  const [classAttendLoading, setClassAttendLoading] = useState(false);
  const [classAttendExporting, setClassAttendExporting] = useState(false);
  const [courseWiseReport, setCourseWiseReport] = useState<CourseWiseAttendanceSummaryReport | null>(null);
  const [courseWiseLoading, setCourseWiseLoading] = useState(false);
  const [courseWiseExporting, setCourseWiseExporting] = useState(false);
  const [lecturerExporting, setLecturerExporting] = useState(false);
  const [lecturerDetailExporting, setLecturerDetailExporting] = useState(false);
  const [lecturerDetailPdfExporting, setLecturerDetailPdfExporting] = useState(false);
  const [exportAllLoading, setExportAllLoading] = useState(false);
  const [newReportLoading, setNewReportLoading] = useState(false);
  const [courseWiseNameSort, setCourseWiseNameSort] = useState<CourseWiseRowSortDirection>('asc');
  const [lecturerPage, setLecturerPage] = useState(1);
  const [classAttendPage, setClassAttendPage] = useState(1);
  const [courseWisePage, setCourseWisePage] = useState(1);
  const [attendProgramIntakes, setAttendProgramIntakes] = useState<
    Array<{ id: string; year: number; semester: number; intakeType: string }>
  >([]);
  const [attendSelectedProgramIntakeId, setAttendSelectedProgramIntakeId] = useState(ALL_VALUE);
  const [compDateFrom, setCompDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().slice(0, 10);
  });
  const [compDateTo, setCompDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [compReport, setCompReport] = useState<{
    cancelledSessions: number;
    compensationSessions: number;
    uncompensatedCancellations: Array<{ id: string; requestId: string; date: string; className: string; courseUnit: string; lecturerName: string }>;
    compensatedCancellations: Array<{
      id: string; date: string; className: string; courseUnit: string; lecturerName: string;
      compensationSessions: Array<{ id: string; date: string; startTime: string; endTime: string; venue: string; className: string }>;
    }>;
  } | null>(null);
  const [compReportLoading, setCompReportLoading] = useState(false);

  const getSchoolPerfDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    if (reportsScopedDates) return reportsScopedDates;
    const now = new Date();
    if (schoolPerfDateRange === 'all') return undefined;
    if (schoolPerfDateRange === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (schoolPerfDateRange === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  const getLecturerDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    if (reportsScopedDates) return reportsScopedDates;
    const now = new Date();
    if (lecturerDateRange === 'all') return undefined;
    if (lecturerDateRange === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (lecturerDateRange === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  const getStudentAttendDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    if (reportsScopedDates) return reportsScopedDates;
    const now = new Date();
    if (studentAttendDateRange === 'all') return undefined;
    if (studentAttendDateRange === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (studentAttendDateRange === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  const handleReportsTermChange = useCallback(
    (sel: AcademicTermFilterSelection) => {
      onTermChange(sel);
      setActiveTermLabel(sel.term?.name ?? null);
      if (sel.dateFrom) {
        setAttendDateFrom(sel.dateFrom);
        setReconDateFrom(sel.dateFrom);
        setCompDateFrom(sel.dateFrom);
      }
      if (sel.dateTo) {
        setAttendDateTo(sel.dateTo);
        setReconDateTo(sel.dateTo);
        setCompDateTo(sel.dateTo);
      }
      setAttendSelectedClassId(ALL_VALUE);
    },
    [onTermChange]
  );

  useEffect(() => {
    let cancelled = false;
    academicService
      .getAcademicTerms()
      .then((terms) => {
        if (cancelled) return;
        handleReportsTermChange(resolveAcademicTermFilter(TERM_FILTER_ACTIVE, terms));
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [handleReportsTermChange]);

  useEffect(() => {
    const load = async () => {
      setOverviewLoading(true);
      try {
        const now = new Date();
        const scoped = reportsScopedDates;
        const last30To = scoped?.dateTo ?? now.toISOString().slice(0, 10);
        const last30From =
          scoped?.dateFrom ??
          (() => {
            const d = new Date(now);
            d.setDate(d.getDate() - 30);
            return d.toISOString().slice(0, 10);
          })();
        const [stats, trends, dist, reports, schoolSummaryLast30, scheduledBySchool] = await Promise.all([
          analyticsService.getDashboardStats(),
          analyticsService.getAttendanceTrends(7),
          analyticsService.getAttendanceDistribution(),
          reportService.getReports(),
          qaService.getSchoolSummaryReport({ dateFrom: last30From, dateTo: last30To }),
          timetableService.getScheduledCountBySchool(last30From, last30To).catch(() => []),
        ]);
        const baseStats = stats || {};
        let scheduledCountLast30: number | undefined;
        let teachingRateVsScheduledPercent: number | undefined;
        const arr = Array.isArray(schoolSummaryLast30) ? schoolSummaryLast30 : [];
        const totalTaught30 = arr.reduce((sum: number, s: any) => sum + (s.totalNoTaught ?? 0), 0);
        const totalScheduled30 = Array.isArray(scheduledBySchool) ? scheduledBySchool.reduce((sum: number, x: any) => sum + (x.scheduledCount ?? 0), 0) : 0;
        if (totalScheduled30 > 0) {
          scheduledCountLast30 = totalScheduled30;
          teachingRateVsScheduledPercent = Math.round((totalTaught30 / totalScheduled30) * 1000) / 10;
        }
        setOverviewStats({
          ...baseStats,
          scheduledCountLast30,
          teachingRateVsScheduledPercent,
        });
        setAttendanceTrends(Array.isArray(trends) && trends.length > 0 ? trends.map((t: any) => ({ day: t.day, present: t.present ?? 0, absent: t.absent ?? 0 })) : []);
        setAttendancePie(Array.isArray(dist) && dist.length > 0 ? (dist as { name: string; value: number; color: string }[]) : []);
        const reportList = Array.isArray(reports) ? reports : [];
        setRecentReports(reportList.map((r: any) => ({
          id: r.id,
          name: r.title || `${r.type || 'Report'}`,
          date: r.generatedAt ? new Date(r.generatedAt).toISOString().slice(0, 10) : '—',
          type: r.type || '—',
        })));
      } catch (e) {
        setAttendanceTrends([]);
        setAttendancePie([]);
      } finally {
        setOverviewLoading(false);
      }
    };
    load();
  }, [retryCount, reportsScopedDates]);

  useEffect(() => {
    setSchoolsLoading(true);
    const params = getSchoolPerfDateParams();
    const load = async () => {
      try {
        const list = await qaService.getSchoolSummaryReport(params);
      const arr = Array.isArray(list) ? list : [];
        let scheduledBySchool: { schoolName: string; scheduledCount: number }[] = [];
        if (params?.dateFrom && params?.dateTo) {
          try {
            scheduledBySchool = await timetableService.getScheduledCountBySchool(params.dateFrom, params.dateTo);
          } catch {
            scheduledBySchool = [];
          }
        }
        const scheduledMap = new Map(scheduledBySchool.map((x) => [x.schoolName, x.scheduledCount]));
      setSchoolPerformance(arr.map((s: any) => {
        const taught = s.totalNoTaught ?? 0;
        const untaught = s.noUntaught ?? 0;
        const total = taught + untaught;
          const scheduled = scheduledMap.get(s.school ?? '') ?? undefined;
          const rateVsScheduled = scheduled != null && scheduled > 0 ? Math.round((taught / scheduled) * 1000) / 10 : undefined;
        return {
          name: s.school ?? '—',
          taught,
          untaught,
          rate: total > 0 ? Math.round((taught / total) * 1000) / 10 : 0,
            scheduled,
            rateVsScheduled,
        };
      }));
      } finally {
      setSchoolsLoading(false);
      }
    };
    load();
  }, [schoolPerfDateRange, reportsScopedDates]);

  useEffect(() => {
    setLecturersLoading(true);
    const params = getLecturerDateParams();
    const school = schoolFilter === 'all' ? undefined : schoolFilter;
    analyticsService.getTopPerformingStaff(500, params?.dateFrom, params?.dateTo, school).then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setLecturerTableData(arr.map((s: any, idx: number) => {
        const rate = typeof s.attendance === 'number' ? s.attendance : (typeof s.attendance === 'string' ? parseFloat(s.attendance.replace('%', '')) : 0) || 0;
        return {
          id: s.id || String(idx),
          name: s.name ?? '—',
          school: s.school ?? '—',
          department: s.department ?? '—',
          taught: s.classes ?? 0,
          missed: s.missedClasses ?? s.missedCount ?? s.missed ?? 0,
          rate: Math.round(rate * 10) / 10,
        };
      }));
      setLecturersLoading(false);
    }).catch(() => setLecturersLoading(false));
  }, [lecturerDateRange, schoolFilter, reportsScopedDates]);

  useEffect(() => {
    setLecturerDeptFilter('all');
  }, [schoolFilter, lecturerDateRange]);

  useEffect(() => {
    academicService.getSchools().then((list) => {
      const arr = Array.isArray(list) ? list : [];
      setSchoolsList(arr.map((s: any) => ({ id: s.id, name: s.name ?? '—' })));
      setAttendSchools(arr as School[]);
    }).catch(() => setSchoolsList([]));
    academicService.getLevels().then((list) => setAttendLevels(list || [])).catch(() => setAttendLevels([]));
    academicService.getDepartments().then((list) => setAttendDepartments(list || [])).catch(() => setAttendDepartments([]));
    academicService.getPrograms().then((list) => setAttendPrograms((list as any[]) || [])).catch(() => setAttendPrograms([]));
  }, []);

  useEffect(() => {
    let cancelled = false;
    const params: {
      programId?: string;
      level?: number;
      semester?: number;
    } = {};
    if (attendSelectedProgramId !== ALL_VALUE) params.programId = attendSelectedProgramId;
    if (attendSelectedYear !== ALL_VALUE) params.level = Number(attendSelectedYear);
    if (attendSelectedSemester !== ALL_VALUE) params.semester = Number(attendSelectedSemester);

    academicService
      .getAllCourses(params)
      .then((courses) => {
        if (!cancelled) setAttendCourses(courses);
      })
      .catch(() => {
        if (!cancelled) setAttendCourses([]);
      });

    return () => {
      cancelled = true;
    };
  }, [attendSelectedProgramId, attendSelectedYear, attendSelectedSemester]);

  const attendProgramToSchoolMap = useMemo(() => {
    const levelToSchool = new Map(attendLevels.map((l) => [l.id, l.schoolId]));
    const deptToSchool = new Map(attendDepartments.map((d) => [d.id, levelToSchool.get(d.levelId) || '']));
    return new Map(attendPrograms.map((p) => [p.id, deptToSchool.get(p.departmentId) || '']));
  }, [attendPrograms, attendDepartments, attendLevels]);

  const attendFilteredPrograms = useMemo(() => {
    if (attendSelectedSchool === ALL_VALUE) return attendPrograms;
    return attendPrograms.filter((p) => attendProgramToSchoolMap.get(p.id) === attendSelectedSchool);
  }, [attendPrograms, attendSelectedSchool, attendProgramToSchoolMap]);

  const attendProgramIdsInScope = useMemo(
    () => new Set(attendFilteredPrograms.map((p) => p.id)),
    [attendFilteredPrograms]
  );

  const attendDeptIdsInScope = useMemo(() => {
    if (attendSelectedSchool === ALL_VALUE) return null;
    const schoolLevelIds = new Set(
      attendLevels.filter((l) => l.schoolId === attendSelectedSchool).map((l) => l.id)
    );
    return new Set(
      attendDepartments.filter((d) => schoolLevelIds.has(d.levelId)).map((d) => d.id)
    );
  }, [attendSelectedSchool, attendLevels, attendDepartments]);

  const attendFilteredCourses = useMemo(() => {
    let list = attendCourses;
    if (attendSelectedProgramId !== ALL_VALUE) {
      list = list.filter((c) => c.programId === attendSelectedProgramId);
    } else if (attendSelectedSchool !== ALL_VALUE && attendDeptIdsInScope) {
      list = list.filter(
        (c) =>
          attendDeptIdsInScope.has(c.departmentId) ||
          (c.programId != null && attendProgramIdsInScope.has(c.programId))
      );
    }
    if (attendSelectedYear !== ALL_VALUE) {
      list = list.filter((c) => c.level === Number(attendSelectedYear));
    }
    if (attendSelectedSemester !== ALL_VALUE) {
      list = list.filter((c) => c.semester === Number(attendSelectedSemester));
    }
    return list;
  }, [
    attendCourses,
    attendSelectedProgramId,
    attendSelectedSchool,
    attendSelectedYear,
    attendSelectedSemester,
    attendProgramIdsInScope,
    attendDeptIdsInScope,
  ]);

  useEffect(() => {
    if (
      attendSelectedCourseId !== ALL_VALUE &&
      !attendFilteredCourses.some((c) => c.id === attendSelectedCourseId)
    ) {
      setAttendSelectedCourseId(ALL_VALUE);
      setAttendSelectedClassId(ALL_VALUE);
    }
  }, [attendFilteredCourses, attendSelectedCourseId]);

  useEffect(() => {
    if (attendSelectedCourseId === ALL_VALUE) {
      setAttendClasses([]);
      return;
    }
    academicService
      .getClasses({
        courseId: attendSelectedCourseId,
        limit: 200,
        ...(academicTermId ? { academicTermId } : {}),
        classStatus: classStatusHint,
      })
      .then((r) => setAttendClasses(r.data || []))
      .catch(() => setAttendClasses([]));
  }, [attendSelectedCourseId, academicTermId, classStatusHint]);

  useEffect(() => {
    if (attendSelectedProgramId === ALL_VALUE) {
      setAttendProgramIntakes([]);
      setAttendSelectedProgramIntakeId(ALL_VALUE);
      return;
    }
    const year = attendSelectedYear !== ALL_VALUE ? Number(attendSelectedYear) : undefined;
    const semester = attendSelectedSemester !== ALL_VALUE ? Number(attendSelectedSemester) : undefined;
    academicService
      .getProgramIntakes({
        programId: attendSelectedProgramId,
        year,
        semester,
      })
      .then((list) => setAttendProgramIntakes(Array.isArray(list) ? list : []))
      .catch(() => setAttendProgramIntakes([]));
  }, [attendSelectedProgramId, attendSelectedYear, attendSelectedSemester]);

  const buildClassAttendReportParams = useCallback(() => {
    const params: Record<string, string | number> = {};
    if (attendSelectedSchool !== ALL_VALUE) params.schoolId = attendSelectedSchool;
    if (attendSelectedProgramId !== ALL_VALUE) params.programId = attendSelectedProgramId;
    if (attendSelectedProgramIntakeId !== ALL_VALUE) params.programIntakeId = attendSelectedProgramIntakeId;
    if (attendSelectedCourseId !== ALL_VALUE) params.courseId = attendSelectedCourseId;
    if (attendSelectedClassId !== ALL_VALUE) params.classId = attendSelectedClassId;
    if (attendSelectedYear !== ALL_VALUE) params.level = Number(attendSelectedYear);
    if (attendSelectedSemester !== ALL_VALUE) params.semester = Number(attendSelectedSemester);
    if (attendDateFrom) params.startDate = attendDateFrom;
    if (attendDateTo) params.endDate = attendDateTo;
    Object.assign(params, termScopeQueryParam(academicTermId));
    return params;
  }, [
    attendSelectedSchool,
    attendSelectedProgramId,
    attendSelectedProgramIntakeId,
    attendSelectedCourseId,
    attendSelectedClassId,
    attendSelectedYear,
    attendSelectedSemester,
    attendDateFrom,
    attendDateTo,
    academicTermId,
  ]);

  const canLoadClassAttendReport =
    attendSelectedSchool !== ALL_VALUE ||
    attendSelectedProgramId !== ALL_VALUE ||
    attendSelectedCourseId !== ALL_VALUE ||
    attendSelectedClassId !== ALL_VALUE;

  const courseWiseSortedRows = useMemo(() => {
    if (!courseWiseReport?.rows.length) return [];
    return sortCourseWiseAttendanceRows(courseWiseReport.rows, courseWiseNameSort);
  }, [courseWiseReport, courseWiseNameSort]);

  const filteredLecturers = useMemo(
    () =>
      lecturerTableData.filter((lecturer) => {
        const matchesSearch =
          lecturerSearch === '' || lecturer.name.toLowerCase().includes(lecturerSearch.toLowerCase());
        const matchesDept =
          lecturerDeptFilter === 'all' || lecturer.department === lecturerDeptFilter;
        const matchesRate =
          lecturerRateFilter === 'all' ||
          (lecturerRateFilter === 'below_90' && lecturer.rate < 90) ||
          (lecturerRateFilter === '90_plus' && lecturer.rate >= 90);
        return matchesSearch && matchesDept && matchesRate;
      }),
    [lecturerTableData, lecturerSearch, lecturerDeptFilter, lecturerRateFilter]
  );

  const lecturerSchoolOptions = useMemo(() => {
    const fromData = lecturerTableData.map((l) => l.school).filter((s) => s && s !== '—');
    const fromSchools = schoolsList.map((s) => s.name);
    return Array.from(new Set([...fromSchools, ...fromData])).sort();
  }, [lecturerTableData, schoolsList]);

  const lecturerDeptOptions = useMemo(() => {
    return Array.from(
      new Set(lecturerTableData.map((l) => l.department).filter((d) => d && d !== '—' && d !== 'N/A'))
    ).sort();
  }, [lecturerTableData]);

  const lecturerSchoolComboboxOptions = useMemo(
    () => [
      { value: 'all', label: 'All Schools' },
      ...lecturerSchoolOptions.map((name) => ({ value: name, label: name })),
    ],
    [lecturerSchoolOptions]
  );

  const lecturerDeptComboboxOptions = useMemo(
    () => [
      { value: 'all', label: 'All Departments' },
      ...lecturerDeptOptions.map((name) => ({ value: name, label: name })),
    ],
    [lecturerDeptOptions]
  );

  const attendSchoolComboboxOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All schools' },
      ...attendSchools.map((s) => ({ value: s.id, label: s.name || s.id })),
    ],
    [attendSchools]
  );

  const attendProgramComboboxOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All programs' },
      ...attendFilteredPrograms.map((p) => ({ value: p.id, label: p.name || p.code || p.id })),
    ],
    [attendFilteredPrograms]
  );

  const attendProgrammeComboboxOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All programmes' },
      ...attendFilteredPrograms.map((p) => ({ value: p.id, label: p.name || p.code || p.id })),
    ],
    [attendFilteredPrograms]
  );

  const attendCourseComboboxOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All courses' },
      ...attendFilteredCourses.map((c) => ({ value: c.id, label: c.name || c.code || c.id })),
    ],
    [attendFilteredCourses]
  );

  const attendClassComboboxOptions = useMemo(
    () => [
      { value: ALL_VALUE, label: 'All classes in course' },
      ...attendClasses.map((c) => ({ value: c.id, label: String(c.name || c.id) })),
    ],
    [attendClasses]
  );

  const paginatedLecturers = useMemo(() => {
    const start = (lecturerPage - 1) * REPORT_TABLE_PAGE_SIZE;
    return filteredLecturers.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [filteredLecturers, lecturerPage]);

  const paginatedCourseWiseRows = useMemo(() => {
    const start = (courseWisePage - 1) * REPORT_TABLE_PAGE_SIZE;
    return courseWiseSortedRows.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [courseWiseSortedRows, courseWisePage]);

  const paginatedClassAttendRows = useMemo(() => {
    const rows = classAttendReport?.students ?? [];
    const start = (classAttendPage - 1) * REPORT_TABLE_PAGE_SIZE;
    return rows.slice(start, start + REPORT_TABLE_PAGE_SIZE);
  }, [classAttendReport, classAttendPage]);

  const getLecturerDateRangeLabel = (): string => {
    if (reportsScopedDates?.dateFrom || reportsScopedDates?.dateTo) {
      const from = reportsScopedDates.dateFrom ?? '';
      const to = reportsScopedDates.dateTo ?? '';
      return from && to ? `${from} to ${to}` : from || to || 'Selected term';
    }
    if (lecturerDateRange === 'all') return 'All time';
    if (lecturerDateRange === 'last_30_days') return 'Last 30 days';
    return 'Last 3 months';
  };

  const handleExportLecturerPerformanceTable = () => {
    if (filteredLecturers.length === 0) {
      toast.warning('No lecturer data to export for the selected filters.');
      return;
    }
    setLecturerExporting(true);
    try {
      const params = getLecturerDateParams();
      exportLecturerPerformanceTable(filteredLecturers, {
        dateFrom: params?.dateFrom ?? null,
        dateTo: params?.dateTo ?? null,
        dateRangeLabel: getLecturerDateRangeLabel(),
        schoolFilter,
        departmentFilter: lecturerDeptFilter,
        rateFilter: lecturerRateFilter,
        searchQuery: lecturerSearch,
      });
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setLecturerExporting(false);
    }
  };

  const handleExportLecturerDetailExcel = () => {
    if (!lecturerDetail) {
      toast.warning('Lecturer details are still loading.');
      return;
    }
    setLecturerDetailExporting(true);
    try {
      exportLecturerStatsDetailReport(lecturerDetail, lectureCommentLabel);
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setLecturerDetailExporting(false);
    }
  };

  const handleExportLecturerDetailPdf = () => {
    if (!lecturerDetail) {
      toast.warning('Lecturer details are still loading.');
      return;
    }
    setLecturerDetailPdfExporting(true);
    try {
      printLecturerStatsDetailReport(lecturerDetail, lectureCommentLabel);
      toast.success('Print dialog opened — choose Save as PDF to download');
    } catch {
      toast.error('Could not open the print dialog. Please try again.');
    } finally {
      setLecturerDetailPdfExporting(false);
    }
  };

  const openLecturerDetails = async (lecturer: {
    id: string;
    name: string;
    school: string;
    department: string;
    taught: number;
    missed: number;
    rate: number;
  }) => {
    setSelectedLecturer(lecturer);
    setDetailsOpen(true);
    setLecturerDetail(null);
    setLecturerDetailLoading(true);
    try {
      const params = getLecturerDateParams();
      const detail = await analyticsService.getLecturerStatsDetail(
        lecturer.id,
        params?.dateFrom,
        params?.dateTo
      );
      setLecturerDetail(detail);
      if (!detail) {
        toast.error('Could not load lecturer lecture records for this period.');
      }
    } catch {
      toast.error('Could not load lecturer lecture records for this period.');
      setLecturerDetail(null);
    } finally {
      setLecturerDetailLoading(false);
    }
  };

  useEffect(() => {
    setLecturerPage(1);
  }, [lecturerSearch, schoolFilter, lecturerDeptFilter, lecturerRateFilter, lecturerDateRange, lecturerTableData]);

  useEffect(() => {
    setCourseWisePage(1);
  }, [courseWiseReport, courseWiseNameSort]);

  useEffect(() => {
    setClassAttendPage(1);
  }, [classAttendReport]);

  const toggleCourseWiseNameSort = () => {
    setCourseWiseNameSort((prev) => (prev === 'asc' ? 'desc' : 'asc'));
  };

  const loadClassAttendanceReport = async () => {
    if (!canLoadClassAttendReport) {
      toast.error('Select at least a school, program, or course to generate the report.');
      return;
    }
    setClassAttendLoading(true);
    try {
      const report = await studentService.getClassAttendanceSummaryReport(buildClassAttendReportParams());
      if (!report) {
        toast.warning('No report data returned.');
        setClassAttendReport(null);
        return;
      }
      setClassAttendReport(report);
      setClassAttendPage(1);
      if (report.students.length === 0) {
        toast.info('No enrolled students found for the selected scope.');
      }
    } catch (e: any) {
      setClassAttendReport(null);
      toast.error(e?.message || 'Failed to load attendance summary report');
    } finally {
      setClassAttendLoading(false);
    }
  };

  const handleExportClassAttendanceReport = () => {
    if (!classAttendReport || classAttendReport.students.length === 0) {
      toast.warning('Generate the report first.');
      return;
    }
    setClassAttendExporting(true);
    try {
      exportClassAttendanceSummaryReport(classAttendReport);
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setClassAttendExporting(false);
    }
  };

  const loadCourseWiseAttendanceReport = async () => {
    if (!canLoadClassAttendReport) {
      toast.error('Select at least a school, program, or course to generate the report.');
      return;
    }
    setCourseWiseLoading(true);
    try {
      const report = await studentService.getCourseWiseAttendanceSummaryReport(buildClassAttendReportParams());
      if (!report) {
        toast.warning('No report data returned.');
        setCourseWiseReport(null);
        return;
      }
      setCourseWiseReport(report);
      setCourseWiseNameSort('asc');
      setCourseWisePage(1);
      if (report.rows.length === 0) {
        toast.info('No enrolled course units found for the selected scope.');
      }
    } catch (e: any) {
      setCourseWiseReport(null);
      toast.error(e?.message || 'Failed to load course-wise attendance report');
    } finally {
      setCourseWiseLoading(false);
    }
  };

  const handleExportCourseWiseAttendanceReport = () => {
    if (!courseWiseReport || courseWiseReport.rows.length === 0) {
      toast.warning('Generate the report first.');
      return;
    }
    setCourseWiseExporting(true);
    try {
      const generatedBy = user?.name || user?.email || '—';
      exportCourseWiseAttendanceSummaryReport(
        { ...courseWiseReport, rows: courseWiseSortedRows },
        {
          generatedBy,
          poweredBy: 'KCU ERP System',
        }
      );
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setCourseWiseExporting(false);
    }
  };

  const resetClassAttendanceFilters = () => {
    setAttendSelectedSchool(ALL_VALUE);
    setAttendSelectedProgramId(ALL_VALUE);
    setAttendSelectedProgramIntakeId(ALL_VALUE);
    setAttendSelectedCourseId(ALL_VALUE);
    setAttendSelectedClassId(ALL_VALUE);
    setAttendSelectedYear(ALL_VALUE);
    setAttendSelectedSemester(ALL_VALUE);
    setAttendDateFrom('');
    setAttendDateTo('');
    setAttendClasses([]);
    setAttendProgramIntakes([]);
    setClassAttendReport(null);
    setCourseWiseReport(null);
    setCourseWiseNameSort('asc');
    setStudentsReport([]);
    setAtRiskMeta(null);
    setStudentAttendDateRange('all');
  };

  const buildAtRiskReportParams = useCallback(() => {
    const presetDates = getStudentAttendDateParams();
    const params: {
      limit: number;
      dateFrom?: string;
      dateTo?: string;
      schoolId?: string;
      programId?: string;
      courseId?: string;
      classId?: string;
      level?: number;
      semester?: number;
    } = { limit: studentAttendLimit };
    const dateFrom = attendDateFrom || presetDates?.dateFrom;
    const dateTo = attendDateTo || presetDates?.dateTo;
    if (dateFrom) params.dateFrom = dateFrom;
    if (dateTo) params.dateTo = dateTo;
    if (attendSelectedSchool !== ALL_VALUE) params.schoolId = attendSelectedSchool;
    if (attendSelectedProgramId !== ALL_VALUE) params.programId = attendSelectedProgramId;
    if (attendSelectedCourseId !== ALL_VALUE) params.courseId = attendSelectedCourseId;
    if (attendSelectedClassId !== ALL_VALUE) params.classId = attendSelectedClassId;
    if (attendSelectedYear !== ALL_VALUE) params.level = Number(attendSelectedYear);
    if (attendSelectedSemester !== ALL_VALUE) params.semester = Number(attendSelectedSemester);
    return params;
  }, [
    studentAttendLimit,
    attendDateFrom,
    attendDateTo,
    attendSelectedSchool,
    attendSelectedProgramId,
    attendSelectedCourseId,
    attendSelectedClassId,
    attendSelectedYear,
    attendSelectedSemester,
    studentAttendDateRange,
  ]);

  const loadAtRiskStudents = async () => {
    setStudentsLoading(true);
    try {
      const { students, thresholdPercent, minSessions } =
        await analyticsService.getWorstPerformingStudents(buildAtRiskReportParams());
      setAtRiskMeta({ thresholdPercent, minSessions });
      setStudentsReport(
        students.map((s: any) => ({
          id: s.studentId || s.id || '',
          name: s.studentName ?? s.name ?? '—',
          registrationNumber: s.registrationNumber ?? s.studentNumber ?? '—',
          program: s.programCode ?? s.program ?? '—',
        attendanceRate: s.attendanceRate ?? s.attendancePercent,
          missed: s.missedCount ?? s.missed ?? 0,
          expectedSessions: s.expectedSessions,
          attendedSessions: s.attendedSessions,
        }))
      );
      if (students.length === 0) {
        toast.info('No students below the attendance threshold for the selected filters.');
      }
    } catch (e: any) {
      setStudentsReport([]);
      setAtRiskMeta(null);
      toast.error(e?.message || 'Failed to load at-risk students');
    } finally {
      setStudentsLoading(false);
    }
  };

  const loadReconciliationReport = async () => {
    setReconciliationLoading(true);
    try {
      const data = await qaService.getReconciliationReport(reconDateFrom, reconDateTo, reconSchoolId || undefined, reconCourseId || undefined);
      setReconciliationData(data.map((r: any) => ({
        date: r.date,
        className: r.className ?? '—',
        lecturerName: r.lecturerName ?? '—',
        scheduled: r.scheduled !== false,
        outcome: r.outcome ?? 'no_record',
        substituteLecturerName: r.substituteLecturerName,
      })));
    } catch (e) {
      setReconciliationData([]);
      toast.error('Failed to load reconciliation report');
    } finally {
      setReconciliationLoading(false);
    }
  };

  const exportReconciliationCSV = () => {
    const headers = ['Date', 'Class', 'Lecturer', 'Scheduled', 'Outcome', 'Substitute Lecturer'];
    const rows = reconciliationData.map(r => [
      r.date,
      r.className,
      r.lecturerName,
      r.scheduled ? 'Y' : 'N',
      r.outcome,
      r.substituteLecturerName ?? '',
    ]);
    const csv = [headers.join(','), ...rows.map(row => row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `teaching-reconciliation-${reconDateFrom}-${reconDateTo}.csv`;
    link.click();
    URL.revokeObjectURL(link.href);
    toast.success('Export downloaded');
  };

  const headerReportActionBusy = exportAllLoading || newReportLoading;

  const handleExportAll = async () => {
    if (headerReportActionBusy) return;
    setExportAllLoading(true);
    try {
      const result = await reportService.exportReport('all', 'xlsx');
                if (result.downloadUrl) {
                  const link = document.createElement('a');
                  link.href = result.downloadUrl;
        link.download = result.filename.endsWith('.xlsx') ? result.filename : `${result.filename}.xlsx`;
                  document.body.appendChild(link);
                  link.click();
                  document.body.removeChild(link);
        toast.success('Excel report downloaded.');
                }
              } catch (error: any) {
                console.error('Error exporting reports:', error);
                toast.error(`Failed to export: ${error?.message || 'Unknown error'}`);
    } finally {
      setExportAllLoading(false);
    }
  };

  const handleNewReport = async () => {
    if (headerReportActionBusy) return;
    setNewReportLoading(true);
              try {
                const report = await reportService.generateReport('lecture-records', 'QA Lecture Records Report', {}, {});
      await reportService.downloadReport(report.id, 'xlsx');
      toast.success('Report saved and downloaded as Excel.');
                const reports = await reportService.getReports();
                const reportList = Array.isArray(reports) ? reports : [];
                setRecentReports(reportList.map((r: any) => ({
                  id: r.id,
                  name: r.title || `${r.type || 'Report'}`,
                  date: r.generatedAt ? new Date(r.generatedAt).toISOString().slice(0, 10) : '—',
                  type: r.type || '—',
                })));
              } catch (error: any) {
                console.error('Error generating report:', error);
                toast.error(`Failed to generate report: ${error?.message || 'Unknown error'}`);
    } finally {
      setNewReportLoading(false);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-500">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <h1 className="text-3xl font-bold tracking-tight text-gray-900">Reports & Analytics</h1>
            <p className="text-gray-500">Generate and view detailed attendance and performance reports.</p>
          </div>
          <div className="flex flex-wrap gap-2 items-center">
            <AcademicTermFilter
              value={termFilter}
              triggerClassName="w-[240px]"
              onChange={handleReportsTermChange}
            />
            <Button
              variant="outline"
              className="gap-2 min-w-[130px]"
              onClick={handleExportAll}
              disabled={headerReportActionBusy}
            >
              {exportAllLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Download size={16} />
              )}
              {exportAllLoading ? 'Exporting…' : 'Export All'}
            </Button>
            <Button
              className="bg-[#015F2B] hover:bg-[#014022] gap-2 min-w-[130px]"
              onClick={handleNewReport}
              disabled={headerReportActionBusy}
            >
              {newReportLoading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <FileText size={16} />
              )}
              {newReportLoading ? 'Generating…' : 'New Report'}
            </Button>
          </div>
        </div>

        <Tabs defaultValue="overview" className="min-w-0 w-full space-y-4">
          <TabsList className="bg-gray-100 h-auto w-full max-w-full flex flex-wrap items-center justify-start gap-1 p-1 [&_[data-slot=tabs-trigger]]:h-8 [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:flex-none">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="reconciliation">Teaching Reconciliation</TabsTrigger>
            <TabsTrigger value="school-summary">School Summary</TabsTrigger>
            <TabsTrigger value="lecturer-summary">Lecturer Summary</TabsTrigger>
            <TabsTrigger value="course-unit-summary">Course Unit Summary</TabsTrigger>
            <TabsTrigger value="schools">School Performance</TabsTrigger>
            <TabsTrigger value="lecturers">Lecturer Stats</TabsTrigger>
            <TabsTrigger value="students">Student Attendance</TabsTrigger>
            <TabsTrigger value="course-wise-attendance">Course-wise Attendance</TabsTrigger>
            <TabsTrigger value="weekly-matrix">Weekly Matrix</TabsTrigger>
            <TabsTrigger value="students-at-risk">Students at Risk</TabsTrigger>
            <TabsTrigger value="compensation">Compensation Tracking</TabsTrigger>
          </TabsList>

          <TabsContent value="reconciliation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Scheduled vs Delivered</CardTitle>
                <CardDescription>Teaching reconciliation: scheduled sessions and recorded outcome (Taught / Untaught / Cancelled / Substituted / No record).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Date from</label>
                    <Input type="date" value={reconDateFrom} onChange={(e) => setReconDateFrom(e.target.value)} className="w-[160px]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Date to</label>
                    <Input type="date" value={reconDateTo} onChange={(e) => setReconDateTo(e.target.value)} className="w-[160px]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">School</label>
                    <Combobox
                      className="w-[200px]"
                      options={[
                        { value: 'all', label: 'All schools' },
                        ...schoolsList.map((s) => ({ value: s.id, label: s.name })),
                      ]}
                      value={reconSchoolId || 'all'}
                      onValueChange={(v) => {
                        const next = v || 'all';
                        setReconSchoolId(next === 'all' ? '' : next);
                        setReconCourseId('');
                      }}
                      placeholder="All schools"
                      searchPlaceholder="Search schools..."
                      emptyText="No school found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <Button onClick={loadReconciliationReport} disabled={reconciliationLoading}>
                    {reconciliationLoading ? 'Loading...' : 'Apply'}
                  </Button>
                  <Button variant="outline" onClick={exportReconciliationCSV} disabled={reconciliationData.length === 0}>
                    <Download className="mr-2 h-4 w-4" /> Export CSV
                  </Button>
                </div>
                <div className="rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Date</TableHead>
                        <TableHead>Class</TableHead>
                        <TableHead>Lecturer</TableHead>
                        <TableHead>Scheduled</TableHead>
                        <TableHead>Outcome</TableHead>
                        <TableHead>Substitute</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {reconciliationLoading ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">Loading...</TableCell></TableRow>
                      ) : reconciliationData.length === 0 ? (
                        <TableRow><TableCell colSpan={6} className="text-center py-8 text-muted-foreground">No data. Set date range and click Apply.</TableCell></TableRow>
                      ) : (
                        reconciliationData.map((row, i) => (
                          <TableRow key={i}>
                            <TableCell className="font-medium">{row.date}</TableCell>
                            <TableCell>{row.className}</TableCell>
                            <TableCell>{row.lecturerName}</TableCell>
                            <TableCell>{row.scheduled ? 'Y' : 'N'}</TableCell>
                            <TableCell>
                              <Badge variant={row.outcome === 'taught' ? 'default' : row.outcome === 'no_record' ? 'secondary' : 'destructive'} className={
                                row.outcome === 'taught' ? 'bg-[#015F2B]' : row.outcome === 'no_record' ? '' : 'bg-amber-100 text-amber-800'
                              }>
                                {row.outcome === 'no_record' ? 'No record' : row.outcome.charAt(0).toUpperCase() + row.outcome.slice(1).toLowerCase().replace('_', ' ')}
                              </Badge>
                            </TableCell>
                            <TableCell>{row.substituteLecturerName ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHOOL SUMMARY TAB - Matches 1.csv format */}
          <TabsContent value="school-summary" className="space-y-4">
            <QASchoolSummary scopedDateRange={reportsScopedDates} />
          </TabsContent>

          {/* LECTURER SUMMARY TAB - Matches 2.csv format */}
          <TabsContent value="lecturer-summary" className="space-y-4">
            <QALecturerSummary scopedDateRange={reportsScopedDates} />
          </TabsContent>

          <TabsContent value="course-unit-summary" className="space-y-4">
            <QACourseUnitSummary scopedDateRange={reportsScopedDates} />
          </TabsContent>

          {/* OVERVIEW TAB */}
          <TabsContent value="overview" className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Teaching Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-[#015F2B]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.teachingRatePercent != null ? `${overviewStats.teachingRatePercent}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Overview</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Student Attendance</CardTitle>
                  <Users className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.studentAttendancePercent != null ? `${overviewStats.studentAttendancePercent}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Overview</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Classes Taught</CardTitle>
                  <BookOpen className="h-4 w-4 text-[#F6A000]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.recentQARecords != null ? overviewStats.recentQARecords : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Recent records</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Missed Classes</CardTitle>
                  <AlertCircle className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.untaughtLectures != null ? overviewStats.untaughtLectures : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Requires attention</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Scheduled (last 30 days)</CardTitle>
                  <Calendar className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.scheduledCountLast30 != null ? overviewStats.scheduledCountLast30 : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Timetable slots</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between pb-2 space-y-0">
                  <CardTitle className="text-sm font-medium">Teaching rate (vs scheduled)</CardTitle>
                  <TrendingUp className="h-4 w-4 text-[#015F2B]" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {overviewLoading ? '—' : overviewStats?.teachingRateVsScheduledPercent != null ? `${overviewStats.teachingRateVsScheduledPercent}%` : '—'}
                  </div>
                  <p className="text-xs text-muted-foreground">Last 30 days</p>
                </CardContent>
              </Card>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Card>
                <CardHeader>
                  <CardTitle>Attendance Trends</CardTitle>
                  <CardDescription>Daily student presence vs absence over the last week.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {attendanceTrends.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={attendanceTrends}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="day" />
                        <YAxis />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="present" name="Present" fill="#015F2B" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" name="Absent" fill="#E5E7EB" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                      <div>No attendance trend data available</div>
                      <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardHeader>
                  <CardTitle>Overall Status Distribution</CardTitle>
                  <CardDescription>Breakdown of all attendance records this semester.</CardDescription>
                </CardHeader>
                <CardContent className="h-[300px]">
                  {attendancePie.length > 0 ? (
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={attendancePie}
                          cx="50%"
                          cy="50%"
                          innerRadius={80}
                          outerRadius={110}
                          paddingAngle={5}
                          dataKey="value"
                        >
                          {attendancePie.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <Tooltip />
                        <Legend verticalAlign="bottom" height={36}/>
                      </PieChart>
                    </ResponsiveContainer>
                  ) : (
                    <div className="flex flex-col items-center justify-center h-full text-muted-foreground text-sm space-y-2">
                      <div>No attendance distribution data available</div>
                      <Button variant="outline" size="sm" onClick={() => setRetryCount(prev => prev + 1)}>
                        Retry
                      </Button>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Recent Generated Reports</CardTitle>
                <CardDescription>Download previously generated reports.</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Report Name</TableHead>
                      <TableHead>Date Generated</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Size</TableHead>
                      <TableHead className="text-right">Action</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {recentReports.length === 0 ? (
                      <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-4">No reports yet. Generate one from School Summary or Lecturer Summary.</TableCell></TableRow>
                    ) : (
                      recentReports.map((report) => (
                        <TableRow key={report.id}>
                          <TableCell className="font-medium flex items-center gap-2">
                            <FileText size={16} className="text-gray-500" /> {report.name}
                          </TableCell>
                          <TableCell>{report.date}</TableCell>
                          <TableCell>
                            <Badge variant="secondary" className="bg-gray-100 text-gray-700 hover:bg-gray-200">
                              {report.type}
                            </Badge>
                          </TableCell>
                          <TableCell>—</TableCell>
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-1">
                              <Button variant="ghost" size="sm" className="h-8 px-2 gap-1" title="Download CSV" onClick={async () => {
                              try {
                                  await reportService.downloadReport(report.id, 'csv');
                                  toast.success('CSV downloaded');
                              } catch (error: any) {
                                console.error('Error downloading report:', error);
                                toast.error(`Failed to download: ${error?.message || 'Unknown error'}`);
                              }
                            }}>
                                <Download size={14} /> CSV
                            </Button>
                              <Button variant="ghost" size="sm" className="h-8 px-2" title="Download Excel" onClick={async () => {
                                try {
                                  await reportService.downloadReport(report.id, 'xlsx');
                                  toast.success('Excel downloaded');
                                } catch (error: any) {
                                  console.error('Error downloading report:', error);
                                  toast.error(`Failed to download: ${error?.message || 'Unknown error'}`);
                                }
                              }}>
                                XLSX
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      ))
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* SCHOOLS TAB */}
          <TabsContent value="schools" className="space-y-4">
            {!reportsTermScoped ? (
              <div className="flex flex-wrap items-center gap-3">
                <Select value={schoolPerfDateRange} onValueChange={(v: 'all' | 'last_30_days' | 'this_term') => setSchoolPerfDateRange(v)}>
                  <SelectTrigger className="w-[180px]">
                    <SelectValue placeholder="Date range" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All time</SelectItem>
                    <SelectItem value="last_30_days">Last 30 days</SelectItem>
                    <SelectItem value="this_term">Last 3 months</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            ) : null}
            <Card>
              <CardHeader>
                <CardTitle>School Performance Comparison</CardTitle>
                <CardDescription>Teaching completion rates by school for the selected period.</CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                {schoolsLoading ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">Loading...</div>
                ) : schoolPerformance.length === 0 ? (
                  <div className="h-full flex items-center justify-center text-muted-foreground">No school data yet.</div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={schoolPerformance} layout="vertical" margin={{ top: 5, right: 30, left: 40, bottom: 5 }}>
                      <CartesianGrid strokeDasharray="3 3" horizontal={true} vertical={false} />
                      <XAxis type="number" domain={[0, 100]} />
                      <YAxis type="category" dataKey="name" width={100} />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="rate" name="Teaching Rate %" fill="#015F2B" radius={[0, 4, 4, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Detailed School Statistics</CardTitle>
                <CardDescription>
                  {schoolPerfDateRange !== 'all' ? 'Scheduled = timetable slots in period. Rate (vs scheduled) = taught ÷ scheduled.' : 'Select a date range to see scheduled counts and rate vs scheduled.'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>School Name</TableHead>
                      {schoolPerformance.some((s) => s.scheduled != null) && (
                        <>
                          <TableHead className="text-right">Scheduled</TableHead>
                          <TableHead className="text-right">Rate (vs scheduled)</TableHead>
                        </>
                      )}
                      <TableHead className="text-right">Sessions Recorded</TableHead>
                      <TableHead className="text-right">Classes Taught</TableHead>
                      <TableHead className="text-right">Classes Missed</TableHead>
                      <TableHead className="text-right">Performance</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {schoolPerformance.map((school) => (
                      <TableRow key={school.name}>
                        <TableCell className="font-medium">{school.name}</TableCell>
                        {schoolPerformance.some((s) => s.scheduled != null) && (
                          <>
                            <TableCell className="text-right">{school.scheduled ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              {school.rateVsScheduled != null ? `${school.rateVsScheduled}%` : '—'}
                            </TableCell>
                          </>
                        )}
                        <TableCell className="text-right">{school.taught + school.untaught}</TableCell>
                        <TableCell className="text-right text-[#015F2B] font-medium">{school.taught}</TableCell>
                        <TableCell className="text-right text-red-600 font-medium">{school.untaught}</TableCell>
                        <TableCell className="text-right">
                          <Badge className={`${school.rate >= 95 ? 'bg-[#015F2B]' : school.rate >= 90 ? 'bg-yellow-500' : 'bg-red-500'} hover:opacity-90`}>
                            {school.rate}%
                          </Badge>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>

          {/* LECTURERS TAB */}
          <TabsContent value="lecturers" className="space-y-4">
             <Card>
               <CardHeader className="pb-3">
                  <CardTitle>Lecturer Performance</CardTitle>
                  <CardDescription>Top performing staff teaching records and attendance rates.</CardDescription>
               </CardHeader>
               <CardContent>
                 <div className="flex flex-wrap gap-2 items-center mb-6">
                   {!reportsTermScoped ? (
                   <Select value={lecturerDateRange} onValueChange={(v: 'all' | 'last_30_days' | 'this_term') => setLecturerDateRange(v)}>
                     <SelectTrigger className="w-[180px]">
                       <SelectValue placeholder="Date range" />
                     </SelectTrigger>
                     <SelectContent>
                       <SelectItem value="all">All time</SelectItem>
                       <SelectItem value="last_30_days">Last 30 days</SelectItem>
                       <SelectItem value="this_term">Last 3 months</SelectItem>
                     </SelectContent>
                   </Select>
                   ) : null}
                   <Combobox
                      className="w-[200px]"
                      options={lecturerSchoolComboboxOptions}
                      value={schoolFilter}
                      onValueChange={(v) => setSchoolFilter(v || 'all')}
                      placeholder="Filter School"
                      searchPlaceholder="Search schools..."
                      emptyText="No school found."
                      initialDisplayCount={50}
                   />
                   <Combobox
                      className="w-[200px]"
                      options={lecturerDeptComboboxOptions}
                      value={lecturerDeptFilter}
                      onValueChange={(v) => setLecturerDeptFilter(v || 'all')}
                      placeholder="Department"
                      searchPlaceholder="Search departments..."
                      emptyText="No department found."
                      initialDisplayCount={50}
                   />
                   <Select value={lecturerRateFilter} onValueChange={(v: 'all' | 'below_90' | '90_plus') => setLecturerRateFilter(v)}>
                      <SelectTrigger className="w-[180px]">
                        <SelectValue placeholder="Teaching rate" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All rates</SelectItem>
                        <SelectItem value="90_plus">90% and above</SelectItem>
                        <SelectItem value="below_90">Below 90%</SelectItem>
                      </SelectContent>
                   </Select>
                   <div className="relative flex-1 min-w-[200px] max-w-sm">
                      <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                      <Input placeholder="Search lecturer..." className="pl-8" value={lecturerSearch} onChange={(e) => setLecturerSearch(e.target.value)} />
                   </div>
                   {(schoolFilter !== 'all' || lecturerDeptFilter !== 'all' || lecturerRateFilter !== 'all' || lecturerSearch) && (
                     <Button
                       variant="ghost"
                       size="sm"
                       onClick={() => {
                         setSchoolFilter('all');
                         setLecturerDeptFilter('all');
                         setLecturerRateFilter('all');
                         setLecturerSearch('');
                       }}
                     >
                       Clear filters
                     </Button>
                   )}
                   <Button
                     variant="outline"
                     onClick={handleExportLecturerPerformanceTable}
                     disabled={lecturerExporting || lecturersLoading || filteredLecturers.length === 0}
                   >
                     <Download className="mr-2 h-4 w-4" />
                     {lecturerExporting ? 'Exporting…' : 'Export Excel'}
                   </Button>
                 </div>
                 <div className="rounded-md border">
                 <Table>
                   <TableHeader>
                     <TableRow>
                       <TableHead>Lecturer Name</TableHead>
                       <TableHead>School</TableHead>
                       <TableHead>Department</TableHead>
                       <TableHead className="text-right">Taught</TableHead>
                       <TableHead className="text-right">Missed</TableHead>
                       <TableHead className="text-right">Rate</TableHead>
                       <TableHead className="text-right">Actions</TableHead>
                     </TableRow>
                   </TableHeader>
                   <TableBody>
                     {lecturersLoading ? (
                       <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">Loading...</TableCell></TableRow>
                     ) : filteredLecturers.length === 0 ? (
                       <TableRow><TableCell colSpan={7} className="text-center py-4 text-muted-foreground">No lecturer data for the selected filters.</TableCell></TableRow>
                     ) : (
                       paginatedLecturers.map((lecturer) => (
                         <TableRow key={lecturer.id}>
                           <TableCell className="font-medium">{lecturer.name}</TableCell>
                           <TableCell>{lecturer.school}</TableCell>
                           <TableCell>{lecturer.department}</TableCell>
                           <TableCell className="text-right">{lecturer.taught}</TableCell>
                           <TableCell className="text-right text-red-600">{lecturer.missed}</TableCell>
                           <TableCell className="text-right">
                              <span className={`font-bold ${lecturer.rate < 90 ? 'text-red-600' : 'text-[#015F2B]'}`}>
                                {lecturer.rate}%
                              </span>
                           </TableCell>
                           <TableCell className="text-right">
                             <Button 
                               variant="ghost" 
                               size="sm" 
                               className="text-[#015F2B]"
                               onClick={() => openLecturerDetails(lecturer)}
                             >
                               View Details
                             </Button>
                           </TableCell>
                         </TableRow>
                       ))
                     )}
                   </TableBody>
                 </Table>
                 <ReportTablePagination
                   total={filteredLecturers.length}
                   page={lecturerPage}
                   onPageChange={setLecturerPage}
                 />
                 </div>
               </CardContent>
             </Card>
          </TabsContent>

           <TabsContent value="students" className="space-y-4">
              <Card>
                <CardHeader>
                  <CardTitle>{classAttendReport?.title ?? 'Class / course attendance summary'}</CardTitle>
                  {classAttendReport ? (
                    <CardDescription>{classAttendReport.universityName || UNIVERSITY_NAME}</CardDescription>
                  ) : null}
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="flex flex-wrap items-end gap-3 rounded-md border p-3 bg-muted/30">
                    <Filter className="h-4 w-4 text-muted-foreground shrink-0 mb-2" />
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">School</label>
                      <Combobox
                        className="w-[180px]"
                        options={attendSchoolComboboxOptions}
                        value={attendSelectedSchool}
                        onValueChange={(v) => {
                          const next = v || ALL_VALUE;
                          setAttendSelectedSchool(next);
                          setAttendSelectedProgramId(ALL_VALUE);
                          setAttendSelectedCourseId(ALL_VALUE);
                          setAttendSelectedClassId(ALL_VALUE);
                        }}
                        placeholder="School"
                        searchPlaceholder="Search schools..."
                        emptyText="No school found."
                        initialDisplayCount={50}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Program</label>
                      <Combobox
                        className="w-[200px]"
                        options={attendProgramComboboxOptions}
                        value={attendSelectedProgramId}
                        onValueChange={(v) => {
                          const next = v || ALL_VALUE;
                          setAttendSelectedProgramId(next);
                          setAttendSelectedCourseId(ALL_VALUE);
                          setAttendSelectedClassId(ALL_VALUE);
                        }}
                        placeholder="Program"
                        searchPlaceholder="Search programs..."
                        emptyText="No program found."
                        initialDisplayCount={50}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Course</label>
                      <Combobox
                        className="w-[220px]"
                        options={attendCourseComboboxOptions}
                        value={attendSelectedCourseId}
                        onValueChange={(v) => {
                          const next = v || ALL_VALUE;
                          setAttendSelectedCourseId(next);
                          setAttendSelectedClassId(ALL_VALUE);
                        }}
                        placeholder="Course"
                        searchPlaceholder="Search courses..."
                        emptyText="No course found."
                        initialDisplayCount={50}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Class</label>
                      <Combobox
                        className="w-[200px]"
                        options={attendClassComboboxOptions}
                        value={attendSelectedClassId}
                        onValueChange={(v) => setAttendSelectedClassId(v || ALL_VALUE)}
                        disabled={attendSelectedCourseId === ALL_VALUE}
                        placeholder={attendSelectedCourseId === ALL_VALUE ? 'Select course first' : 'Class'}
                        searchPlaceholder="Search classes..."
                        emptyText="No class found."
                        initialDisplayCount={50}
                      />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Year</label>
                      <Select value={attendSelectedYear} onValueChange={setAttendSelectedYear}>
                        <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>All</SelectItem>
                          {[1, 2, 3, 4, 5].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Semester</label>
                      <Select value={attendSelectedSemester} onValueChange={setAttendSelectedSemester}>
                        <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>All</SelectItem>
                          <SelectItem value="1">1</SelectItem>
                          <SelectItem value="2">2</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Cohort / intake</label>
                      <Select
                        value={attendSelectedProgramIntakeId}
                        onValueChange={setAttendSelectedProgramIntakeId}
                        disabled={attendSelectedProgramId === ALL_VALUE}
                      >
                        <SelectTrigger className="w-[220px]">
                          <SelectValue placeholder={attendSelectedProgramId === ALL_VALUE ? 'Select program first' : 'Cohort'} />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={ALL_VALUE}>All cohorts</SelectItem>
                          {attendProgramIntakes.map((intake) => (
                            <SelectItem key={intake.id} value={intake.id}>
                              {intake.year} · Sem {intake.semester} · {intake.intakeType}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">Date from</label>
                      <Input type="date" className="w-[150px]" value={attendDateFrom} onChange={(e) => setAttendDateFrom(e.target.value)} />
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs font-medium text-muted-foreground">
                        Date to{activeTermLabel ? ` · ${activeTermLabel}` : ''}
                      </label>
                      <Input type="date" className="w-[150px]" value={attendDateTo} onChange={(e) => setAttendDateTo(e.target.value)} />
                    </div>
                    <Button variant="outline" onClick={resetClassAttendanceFilters}>
                      <RotateCcw className="mr-2 h-4 w-4" />
                      Reset filters
                    </Button>
                    <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={loadClassAttendanceReport} disabled={classAttendLoading || !canLoadClassAttendReport}>
                      {classAttendLoading ? 'Loading…' : 'Generate report'}
                    </Button>
                    <Button variant="outline" onClick={handleExportClassAttendanceReport} disabled={classAttendExporting || !classAttendReport?.students.length}>
                      <Download className="mr-2 h-4 w-4" />
                      {classAttendExporting ? 'Exporting…' : 'Export Excel'}
                    </Button>
                  </div>

                  {classAttendReport && (
                    <p className="text-sm text-muted-foreground">
                      {classAttendReport.totals.studentCount} students ·{' '}
                      {formatWeightedAttendedCount(classAttendReport.totals.totalAttendedClasses)} attended ·{' '}
                      {classAttendReport.totals.totalLateClasses ?? 0} late · {classAttendReport.totals.totalMissedClasses} missed ·{' '}
                      {classAttendReport.totals.expectedAttendance} expected sessions
                    </p>
                  )}

                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead className="w-12">No.</TableHead>
                          <TableHead>Student&apos;s Name</TableHead>
                          <TableHead>Registration No.</TableHead>
                          <TableHead className="text-right">Total Attended</TableHead>
                          <TableHead className="text-right">Total Late</TableHead>
                          <TableHead className="text-right">Total Missed</TableHead>
                          <TableHead className="text-right">Expected</TableHead>
                          <TableHead className="text-right">Percentage</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {classAttendLoading ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">Loading report…</TableCell>
                          </TableRow>
                        ) : !classAttendReport ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              Choose filters and click Generate report.
                            </TableCell>
                          </TableRow>
                        ) : classAttendReport.students.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={8} className="text-center py-8 text-muted-foreground">
                              No enrolled students in this scope.
                            </TableCell>
                          </TableRow>
                        ) : (
                          paginatedClassAttendRows.map((row, idx) => (
                            <TableRow key={row.studentId}>
                              <TableCell className="text-muted-foreground">
                                {(classAttendPage - 1) * REPORT_TABLE_PAGE_SIZE + idx + 1}
                              </TableCell>
                              <TableCell className="font-medium">{row.studentName}</TableCell>
                              <TableCell>{row.registrationNumber}</TableCell>
                              <TableCell className="text-right">
                                {formatWeightedAttendedCount(row.totalAttendedClasses)}
                              </TableCell>
                              <TableCell className="text-right">{row.totalLateClasses ?? 0}</TableCell>
                              <TableCell className="text-right">{row.totalMissedClasses}</TableCell>
                              <TableCell className="text-right">{row.expectedAttendance}</TableCell>
                              <TableCell className="text-right">
                                <span className={row.percentage < 75 ? 'text-red-600 font-medium' : ''}>
                                  {row.percentage.toFixed(2)}%
                                </span>
                              </TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                    <ReportTablePagination
                      total={classAttendReport?.students.length ?? 0}
                      page={classAttendPage}
                      onPageChange={setClassAttendPage}
                    />
                  </div>
                </CardContent>
              </Card>
          </TabsContent>

          <TabsContent value="course-wise-attendance" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>{courseWiseReport?.title ?? 'Course-wise student attendance summary'}</CardTitle>
                {courseWiseReport ? (
                  <CardDescription>{courseWiseReport.universityName || UNIVERSITY_NAME}</CardDescription>
                ) : null}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3 rounded-md border p-3 bg-muted/30">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0 mb-2" />
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">School</label>
                    <Combobox
                      className="w-[180px]"
                      options={attendSchoolComboboxOptions}
                      value={attendSelectedSchool}
                      onValueChange={(v) => {
                        const next = v || ALL_VALUE;
                        setAttendSelectedSchool(next);
                        setAttendSelectedProgramId(ALL_VALUE);
                        setAttendSelectedCourseId(ALL_VALUE);
                        setAttendSelectedClassId(ALL_VALUE);
                        setAttendSelectedProgramIntakeId(ALL_VALUE);
                      }}
                      placeholder="School"
                      searchPlaceholder="Search schools..."
                      emptyText="No school found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Programme</label>
                    <Combobox
                      className="w-[200px]"
                      options={attendProgrammeComboboxOptions}
                      value={attendSelectedProgramId}
                      onValueChange={(v) => {
                        const next = v || ALL_VALUE;
                        setAttendSelectedProgramId(next);
                        setAttendSelectedCourseId(ALL_VALUE);
                        setAttendSelectedClassId(ALL_VALUE);
                        setAttendSelectedProgramIntakeId(ALL_VALUE);
                      }}
                      placeholder="Programme"
                      searchPlaceholder="Search programmes..."
                      emptyText="No programme found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Class / year</label>
                    <Select value={attendSelectedYear} onValueChange={setAttendSelectedYear}>
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All</SelectItem>
                        {[1, 2, 3, 4, 5].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Semester / term</label>
                    <Select value={attendSelectedSemester} onValueChange={setAttendSelectedSemester}>
                      <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All</SelectItem>
                        <SelectItem value="1">Semester I</SelectItem>
                        <SelectItem value="2">Semester II</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Cohort / intake</label>
                    <Select
                      value={attendSelectedProgramIntakeId}
                      onValueChange={setAttendSelectedProgramIntakeId}
                      disabled={attendSelectedProgramId === ALL_VALUE}
                    >
                      <SelectTrigger className="w-[220px]">
                        <SelectValue placeholder={attendSelectedProgramId === ALL_VALUE ? 'Select programme first' : 'Cohort'} />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All cohorts</SelectItem>
                        {attendProgramIntakes.map((intake) => (
                          <SelectItem key={intake.id} value={intake.id}>
                            {intake.year} · Sem {intake.semester} · {intake.intakeType}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Course</label>
                    <Combobox
                      className="w-[220px]"
                      options={attendCourseComboboxOptions}
                      value={attendSelectedCourseId}
                      onValueChange={(v) => {
                        const next = v || ALL_VALUE;
                        setAttendSelectedCourseId(next);
                        setAttendSelectedClassId(ALL_VALUE);
                      }}
                      placeholder="Course"
                      searchPlaceholder="Search courses..."
                      emptyText="No course found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Class</label>
                    <Combobox
                      className="w-[200px]"
                      options={attendClassComboboxOptions}
                      value={attendSelectedClassId}
                      onValueChange={(v) => setAttendSelectedClassId(v || ALL_VALUE)}
                      disabled={attendSelectedCourseId === ALL_VALUE}
                      placeholder={attendSelectedCourseId === ALL_VALUE ? 'Select course first' : 'Class'}
                      searchPlaceholder="Search classes..."
                      emptyText="No class found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date from</label>
                    <Input type="date" className="w-[150px]" value={attendDateFrom} onChange={(e) => setAttendDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date to</label>
                    <Input type="date" className="w-[150px]" value={attendDateTo} onChange={(e) => setAttendDateTo(e.target.value)} />
                  </div>
                  <Button variant="outline" onClick={resetClassAttendanceFilters}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset filters
                  </Button>
                  <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={loadCourseWiseAttendanceReport} disabled={courseWiseLoading || !canLoadClassAttendReport}>
                    {courseWiseLoading ? 'Loading…' : 'Generate report'}
                  </Button>
                  <Button variant="outline" onClick={handleExportCourseWiseAttendanceReport} disabled={courseWiseExporting || !courseWiseReport?.rows.length}>
                    <Download className="mr-2 h-4 w-4" />
                    {courseWiseExporting ? 'Exporting…' : 'Export Excel'}
                  </Button>
                </div>

                {courseWiseReport && (
                  <p className="text-sm text-muted-foreground">
                    {courseWiseReport.totals.studentCount} students · {courseWiseReport.totals.rowCount} course rows ·{' '}
                    {courseWiseReport.totals.totalPresents} presents · {courseWiseReport.totals.totalAbsents} absents ·{' '}
                    {courseWiseReport.totals.totalSessions} sessions
                    {courseWiseReport.rows.length > 0 && (
                      <> · Sorted by student name ({courseWiseNameSort === 'asc' ? 'A–Z' : 'Z–A'})</>
                    )}
                  </p>
                )}

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">Serial No.</TableHead>
                        <TableHead>Registration No.</TableHead>
                        <TableHead>
                          <button
                            type="button"
                            onClick={toggleCourseWiseNameSort}
                            disabled={!courseWiseReport?.rows.length}
                            className="inline-flex items-center gap-1 font-medium hover:text-[#015F2B] disabled:opacity-50 disabled:pointer-events-none -ml-1 px-1 py-0.5 rounded"
                          >
                            Student Name
                            {courseWiseNameSort === 'asc' ? (
                              <ArrowUp className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                            ) : (
                              <ArrowDown className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                            )}
                            <span className="sr-only">
                              Sorted {courseWiseNameSort === 'asc' ? 'A to Z' : 'Z to A'}. Click to reverse.
                            </span>
                          </button>
                        </TableHead>
                        <TableHead>Course</TableHead>
                        <TableHead className="text-right">Total Sessions</TableHead>
                        <TableHead className="text-right">Total Presents</TableHead>
                        <TableHead className="text-right">Total Absents</TableHead>
                        <TableHead className="text-right">Present %</TableHead>
                        <TableHead className="text-right">Absent %</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {courseWiseLoading ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">Loading report…</TableCell>
                        </TableRow>
                      ) : !courseWiseReport ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            Choose filters and click Generate report.
                          </TableCell>
                        </TableRow>
                      ) : courseWiseReport.rows.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={9} className="text-center py-8 text-muted-foreground">
                            No enrolled course units in this scope.
                          </TableCell>
                        </TableRow>
                      ) : (
                        paginatedCourseWiseRows.map((row) => (
                          <TableRow key={`${row.registrationNumber}-${row.courseId}-${row.serialNo}`}>
                            <TableCell className="text-muted-foreground">{row.serialNo}</TableCell>
                            <TableCell>{row.registrationNumber}</TableCell>
                            <TableCell className="font-medium">{row.studentName}</TableCell>
                            <TableCell>{row.course}</TableCell>
                            <TableCell className="text-right">{row.totalSessions}</TableCell>
                            <TableCell className="text-right">{row.totalPresents}</TableCell>
                            <TableCell className="text-right">{row.totalAbsents}</TableCell>
                            <TableCell className="text-right">
                              <span className={row.presentPercentage < 75 ? 'text-red-600 font-medium' : ''}>
                                {row.presentPercentage.toFixed(2)}%
                              </span>
                            </TableCell>
                            <TableCell className="text-right">{row.absentPercentage.toFixed(2)}%</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  <ReportTablePagination
                    total={courseWiseSortedRows.length}
                    page={courseWisePage}
                    onPageChange={setCourseWisePage}
                  />
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="weekly-matrix" className="space-y-4">
            <WeeklyAttendanceMatrixPanel
              schools={attendSchools.map((s) => ({ id: s.id, name: s.name }))}
              programs={attendPrograms}
              programToSchoolMap={attendProgramToSchoolMap}
              generatedBy={user?.name || user?.email}
              dateFrom={attendDateFrom || undefined}
              dateTo={attendDateTo || undefined}
            />
          </TabsContent>

          <TabsContent value="students-at-risk" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Students at risk (low attendance)</CardTitle>
                {atRiskMeta && (
                  <CardDescription>
                    Students below {atRiskMeta.thresholdPercent}% attendance with at least {atRiskMeta.minSessions} counted sessions in the selected scope.
                  </CardDescription>
                )}
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap items-end gap-3 rounded-md border p-3 bg-muted/30">
                  <Filter className="h-4 w-4 text-muted-foreground shrink-0 mb-2" />
                  {!reportsTermScoped ? (
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Period</label>
                    <Select value={studentAttendDateRange} onValueChange={(v: 'all' | 'last_30_days' | 'this_term') => setStudentAttendDateRange(v)}>
                      <SelectTrigger className="w-[180px]"><SelectValue placeholder="Date range" /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="all">All time</SelectItem>
                        <SelectItem value="last_30_days">Last 30 days</SelectItem>
                        <SelectItem value="this_term">Last 3 months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  ) : null}
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">School</label>
                    <Combobox
                      className="w-[180px]"
                      options={attendSchoolComboboxOptions}
                      value={attendSelectedSchool}
                      onValueChange={(v) => {
                        const next = v || ALL_VALUE;
                        setAttendSelectedSchool(next);
                        setAttendSelectedProgramId(ALL_VALUE);
                        setAttendSelectedCourseId(ALL_VALUE);
                        setAttendSelectedClassId(ALL_VALUE);
                      }}
                      placeholder="School"
                      searchPlaceholder="Search schools..."
                      emptyText="No school found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Program</label>
                    <Combobox
                      className="w-[200px]"
                      options={attendProgramComboboxOptions}
                      value={attendSelectedProgramId}
                      onValueChange={(v) => {
                        const next = v || ALL_VALUE;
                        setAttendSelectedProgramId(next);
                        setAttendSelectedCourseId(ALL_VALUE);
                        setAttendSelectedClassId(ALL_VALUE);
                      }}
                      placeholder="Program"
                      searchPlaceholder="Search programs..."
                      emptyText="No program found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Course</label>
                    <Combobox
                      className="w-[220px]"
                      options={attendCourseComboboxOptions}
                      value={attendSelectedCourseId}
                      onValueChange={(v) => {
                        const next = v || ALL_VALUE;
                        setAttendSelectedCourseId(next);
                        setAttendSelectedClassId(ALL_VALUE);
                      }}
                      placeholder="Course"
                      searchPlaceholder="Search courses..."
                      emptyText="No course found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Class</label>
                    <Combobox
                      className="w-[200px]"
                      options={attendClassComboboxOptions}
                      value={attendSelectedClassId}
                      onValueChange={(v) => setAttendSelectedClassId(v || ALL_VALUE)}
                      disabled={attendSelectedCourseId === ALL_VALUE}
                      placeholder={attendSelectedCourseId === ALL_VALUE ? 'Select course first' : 'Class'}
                      searchPlaceholder="Search classes..."
                      emptyText="No class found."
                      initialDisplayCount={50}
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Year</label>
                    <Select value={attendSelectedYear} onValueChange={setAttendSelectedYear}>
                      <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All</SelectItem>
                        {[1, 2, 3, 4, 5].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Semester</label>
                    <Select value={attendSelectedSemester} onValueChange={setAttendSelectedSemester}>
                      <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value={ALL_VALUE}>All</SelectItem>
                        <SelectItem value="1">1</SelectItem>
                        <SelectItem value="2">2</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date from</label>
                    <Input type="date" className="w-[150px]" value={attendDateFrom} onChange={(e) => setAttendDateFrom(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Date to</label>
                    <Input type="date" className="w-[150px]" value={attendDateTo} onChange={(e) => setAttendDateTo(e.target.value)} />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs font-medium text-muted-foreground">Max results</label>
                    <Select value={String(studentAttendLimit)} onValueChange={(v) => setStudentAttendLimit(Number(v))}>
                      <SelectTrigger className="w-[120px]"><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="50">50</SelectItem>
                        <SelectItem value="100">100</SelectItem>
                        <SelectItem value="200">200</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <Button variant="outline" onClick={resetClassAttendanceFilters}>
                    <RotateCcw className="mr-2 h-4 w-4" />
                    Reset filters
                  </Button>
                  <Button className="bg-[#015F2B] hover:bg-[#014022]" onClick={loadAtRiskStudents} disabled={studentsLoading}>
                    {studentsLoading ? 'Loading…' : 'Load report'}
                  </Button>
                </div>

                <div className="rounded-md border overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Student</TableHead>
                        <TableHead>Registration No.</TableHead>
                        <TableHead>Program</TableHead>
                        <TableHead className="text-right">Attendance %</TableHead>
                        <TableHead className="text-right">Attended</TableHead>
                        <TableHead className="text-right">Expected</TableHead>
                        <TableHead className="text-right">Missed</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {studentsLoading ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">Loading…</TableCell>
                        </TableRow>
                      ) : studentsReport.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                            Click Load report to see students below the attendance threshold.
                          </TableCell>
                        </TableRow>
                      ) : (
                        studentsReport.map((s) => (
                          <TableRow key={s.id}>
                            <TableCell className="font-medium">{s.name}</TableCell>
                            <TableCell>{s.registrationNumber ?? '—'}</TableCell>
                            <TableCell>{s.program ?? '—'}</TableCell>
                            <TableCell className="text-right">
                              <span
                                className={
                                  atRiskMeta && s.attendanceRate != null && s.attendanceRate < atRiskMeta.thresholdPercent
                                    ? 'text-red-600 font-medium'
                                    : ''
                                }
                              >
                                {s.attendanceRate != null ? `${Number(s.attendanceRate).toFixed(2)}%` : '—'}
                              </span>
                            </TableCell>
                            <TableCell className="text-right">
                              {s.attendedSessions != null ? formatWeightedAttendedCount(s.attendedSessions) : '—'}
                            </TableCell>
                            <TableCell className="text-right">{s.expectedSessions ?? '—'}</TableCell>
                            <TableCell className="text-right">{s.missed ?? '—'}</TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="compensation" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Compensation Tracking Report</CardTitle>
                <CardDescription>Approved cancellations and their scheduled compensation sessions (from lecturer-submitted compensation date/time on cancellation request).</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="flex flex-wrap gap-4 items-end">
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Date from (cancelled session date)</label>
                    <Input type="date" value={compDateFrom} onChange={(e) => setCompDateFrom(e.target.value)} className="w-[160px]" />
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-700 block mb-1">Date to</label>
                    <Input type="date" value={compDateTo} onChange={(e) => setCompDateTo(e.target.value)} className="w-[160px]" />
                  </div>
                  <Button
                    className="bg-[#015F2B]"
                    onClick={async () => {
                      setCompReportLoading(true);
                      try {
                        const data = await qaService.getCompensationTrackingReport(compDateFrom, compDateTo);
                        setCompReport(data);
                      } catch (e: any) {
                        toast.error(e?.message || 'Failed to load report');
                        setCompReport(null);
                      } finally {
                        setCompReportLoading(false);
                      }
                    }}
                    disabled={compReportLoading}
                  >
                    {compReportLoading ? 'Loading…' : 'Load report'}
                  </Button>
                </div>
                {compReport && (
                  <>
                    <div className="flex gap-4 text-sm">
                      <span><strong>{compReport.cancelledSessions}</strong> approved cancellations</span>
                      <span><strong>{compReport.compensationSessions}</strong> compensation sessions scheduled</span>
                      <span className="text-amber-600"><strong>{compReport.uncompensatedCancellations.length}</strong> without compensation</span>
                    </div>
                    {compReport.uncompensatedCancellations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Cancellations without compensation</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Date</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Lecturer</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {compReport.uncompensatedCancellations.map((u) => (
                                <TableRow key={u.id}>
                                  <TableCell>{u.date}</TableCell>
                                  <TableCell>{u.className}</TableCell>
                                  <TableCell>{u.courseUnit}</TableCell>
                                  <TableCell>{u.lecturerName}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    {compReport.compensatedCancellations.length > 0 && (
                      <div>
                        <h4 className="font-medium mb-2">Cancellations with compensation scheduled</h4>
                        <div className="rounded-md border">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Cancelled date</TableHead>
                                <TableHead>Class</TableHead>
                                <TableHead>Course</TableHead>
                                <TableHead>Lecturer</TableHead>
                                <TableHead>Compensation</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {compReport.compensatedCancellations.map((c) => (
                                <TableRow key={c.id}>
                                  <TableCell>{c.date}</TableCell>
                                  <TableCell>{c.className}</TableCell>
                                  <TableCell>{c.courseUnit}</TableCell>
                                  <TableCell>{c.lecturerName}</TableCell>
                                  <TableCell>
                                    {c.compensationSessions.map((s) => (
                                      <div key={s.id} className="text-sm">
                                        {s.date} {s.startTime}–{s.endTime} @ {s.venue}
                                      </div>
                                    ))}
                                  </TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}
                    {compReport.cancelledSessions === 0 && (
                      <p className="text-muted-foreground text-sm">No approved cancellations in this date range.</p>
                    )}
                  </>
                )}
                </CardContent>
              </Card>
          </TabsContent>
        </Tabs>

        {/* Lecturer Details Dialog */}
        <Dialog
          open={detailsOpen}
          onOpenChange={(open) => {
            setDetailsOpen(open);
            if (!open) {
              setLecturerDetail(null);
              setLecturerDetailLoading(false);
            }
          }}
        >
          <DialogContent className="w-[96vw] max-w-5xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:pr-8">
                <div>
                  <DialogTitle>Lecturer Performance Details</DialogTitle>
                  <DialogDescription>
                    Full lecture evidence for {selectedLecturer?.name}
                    {lecturerDetail?.dateFrom && lecturerDetail?.dateTo
                      ? ` · ${lecturerDetail.dateFrom} to ${lecturerDetail.dateTo}`
                      : lecturerDateRange === 'all'
                        ? ' · all time'
                        : ''}
                  </DialogDescription>
                </div>
                <div className="flex flex-wrap gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportLecturerDetailExcel}
                    disabled={lecturerDetailLoading || lecturerDetailExporting || !lecturerDetail}
                  >
                    <Download className="mr-2 h-4 w-4" />
                    {lecturerDetailExporting ? 'Exporting…' : 'Export Excel'}
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={handleExportLecturerDetailPdf}
                    disabled={lecturerDetailLoading || lecturerDetailPdfExporting || !lecturerDetail}
                  >
                    <FileText className="mr-2 h-4 w-4" />
                    {lecturerDetailPdfExporting ? 'Opening…' : 'Save as PDF'}
                  </Button>
                </div>
              </div>
            </DialogHeader>
            {selectedLecturer && (
              <div className="space-y-6 py-2">
                {lecturerDetailLoading ? (
                  <div className="flex items-center justify-center gap-2 py-12 text-muted-foreground">
                    <Loader2 className="h-5 w-5 animate-spin" />
                    Loading lecture records…
                  </div>
                ) : (
                  <>
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                      <div>
                        <p className="text-sm font-medium text-gray-500">Name</p>
                        <p className="text-sm font-medium">{lecturerDetail?.lecturer.name || selectedLecturer.name}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Staff number</p>
                        <p className="text-sm font-medium">{lecturerDetail?.lecturer.staffNumber || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Email</p>
                        <p className="text-sm font-medium">{lecturerDetail?.lecturer.email || '—'}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">School</p>
                        <p className="text-sm font-medium">{lecturerDetail?.lecturer.school || selectedLecturer.school}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Department</p>
                        <p className="text-sm font-medium">{lecturerDetail?.lecturer.department || selectedLecturer.department}</p>
                      </div>
                      <div>
                        <p className="text-sm font-medium text-gray-500">Teaching rate</p>
                        <p className={`text-sm font-bold ${(lecturerDetail?.summary.rate ?? selectedLecturer.rate) >= 90 ? 'text-green-600' : (lecturerDetail?.summary.rate ?? selectedLecturer.rate) >= 80 ? 'text-orange-600' : 'text-red-600'}`}>
                          {(lecturerDetail?.summary.rate ?? selectedLecturer.rate).toFixed(1)}%
                        </p>
                      </div>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Total records</p>
                          <p className="text-xl font-bold">{lecturerDetail?.summary.totalRecords ?? '—'}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Taught</p>
                          <p className="text-xl font-bold text-[#015F2B]">{lecturerDetail?.summary.taught ?? selectedLecturer.taught}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Missed by lecturer</p>
                          <p className="text-xl font-bold text-red-600">{lecturerDetail?.summary.missedByLecturer ?? selectedLecturer.missed}</p>
                        </CardContent>
                      </Card>
                      <Card>
                        <CardContent className="pt-4">
                          <p className="text-xs text-muted-foreground">Other outcomes</p>
                          <p className="text-xl font-bold">{lecturerDetail?.summary.otherOutcomes ?? '—'}</p>
                        </CardContent>
                      </Card>
                    </div>

                    {lecturerDetail?.summary.rateBasis && (
                      <p className="text-xs text-muted-foreground">
                        Rate calculation: {lecturerDetail.summary.rateBasis}. Other outcomes (SDL, assignment, pending, etc.) are listed below but excluded from the rate denominator.
                      </p>
                    )}

                    {lecturerDetail && Object.keys(lecturerDetail.summary.byComment).length > 0 && (
                      <div className="flex flex-wrap gap-2">
                        {Object.entries(lecturerDetail.summary.byComment)
                          .sort((a, b) => b[1] - a[1])
                          .map(([comment, count]) => (
                            <Badge key={comment} variant="secondary">
                              {lectureCommentLabel(comment)}: {count}
                            </Badge>
                          ))}
                      </div>
                    )}

                    {lecturerDetail && lecturerDetail.byClass.length > 0 && (
                      <div className="space-y-2">
                        <h4 className="text-sm font-semibold">By class / course unit</h4>
                        <div className="rounded-md border overflow-x-auto">
                          <Table>
                            <TableHeader>
                              <TableRow>
                                <TableHead>Class</TableHead>
                                <TableHead>Course unit</TableHead>
                                <TableHead className="text-right">Taught</TableHead>
                                <TableHead className="text-right">Missed</TableHead>
                                <TableHead className="text-right">Total</TableHead>
                              </TableRow>
                            </TableHeader>
                            <TableBody>
                              {lecturerDetail.byClass.map((row) => (
                                <TableRow key={`${row.className}-${row.courseUnit}`}>
                                  <TableCell>{row.className}</TableCell>
                                  <TableCell>{row.courseUnit}</TableCell>
                                  <TableCell className="text-right">{row.taught}</TableCell>
                                  <TableCell className="text-right text-red-600">{row.missedByLecturer}</TableCell>
                                  <TableCell className="text-right">{row.total}</TableCell>
                                </TableRow>
                              ))}
                            </TableBody>
                          </Table>
                        </div>
                      </div>
                    )}

                    <div className="space-y-2">
                      <h4 className="text-sm font-semibold">Lecture records</h4>
                      <div className="rounded-md border overflow-x-auto max-h-[360px] overflow-y-auto">
                        <Table>
                          <TableHeader>
                            <TableRow>
                              <TableHead>Date</TableHead>
                              <TableHead>Class</TableHead>
                              <TableHead>Course unit</TableHead>
                              <TableHead>Outcome</TableHead>
                              <TableHead>Status</TableHead>
                              <TableHead>Scheduled</TableHead>
                              <TableHead>Check-in</TableHead>
                              <TableHead>Check-out</TableHead>
                              <TableHead>Substitute</TableHead>
                            </TableRow>
                          </TableHeader>
                          <TableBody>
                            {!lecturerDetail || lecturerDetail.records.length === 0 ? (
                              <TableRow>
                                <TableCell colSpan={9} className="text-center py-6 text-muted-foreground">
                                  No lecture records found for this lecturer in the selected period.
                                </TableCell>
                              </TableRow>
                            ) : (
                              lecturerDetail.records.map((row) => (
                                <TableRow key={row.id}>
                                  <TableCell className="whitespace-nowrap">{row.date || '—'}</TableCell>
                                  <TableCell>{row.className}</TableCell>
                                  <TableCell className="max-w-[180px] truncate">{row.courseUnit}</TableCell>
                                  <TableCell>
                                    <Badge variant="outline">{lectureCommentLabel(row.comment)}</Badge>
                                  </TableCell>
                                  <TableCell>{row.status || '—'}</TableCell>
                                  <TableCell className="whitespace-nowrap">
                                    {[row.timeForStarting, row.timeOutForEnding].filter(Boolean).join(' – ') || '—'}
                                  </TableCell>
                                  <TableCell>{row.checkInTime || '—'}</TableCell>
                                  <TableCell>{row.checkOutTime || '—'}</TableCell>
                                  <TableCell>{row.substituteLecturerName || '—'}</TableCell>
                                </TableRow>
                              ))
                            )}
                          </TableBody>
                        </Table>
                      </div>
                    </div>
                  </>
                )}
              </div>
            )}
          </DialogContent>
        </Dialog>
      </div>
    );
  }

// Icon helper
function BookOpen(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
      <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
    </svg>
  );
}
