import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Download, Filter, Loader2, RotateCcw } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { clinicalService, CLINICAL_QA_REPORT_TYPES } from '@/services/clinical.service';
import {
  ALL_FILTER,
  CLINICAL_REPORT_PAGE_SIZE,
  dateRangeFromPreset,
  defaultDateRangeForReportType,
  paginateRows,
  ReportPaginationBar,
  type DateRangePreset,
} from './clinical-report-utils';
import {
  ClinicalReportPreviewTable,
  getClinicalReportRows,
  IndividualStudentAttendanceTables,
} from './ClinicalReportPreviewTable';

type ReportsSectionProps = {
  reportType: string;
  onReportTypeChange: (type: string) => void;
  sites: Array<{ id: string; name: string }>;
  rotations: Array<{ id: string; name: string; clinicalSiteId: string }>;
  instructors: Array<{ id: string; fullName: string }>;
  students: Array<{ id: string; firstName: string; lastName: string; studentNumber: string }>;
  programs: Array<{ id: string; name: string; code?: string }>;
  filtersLoading?: boolean;
};

export function ReportsSection({
  reportType,
  onReportTypeChange,
  sites,
  rotations,
  instructors,
  students,
  programs,
  filtersLoading,
}: ReportsSectionProps) {
  const isSummariesTab = reportType === 'summaries';
  const isQaReport = CLINICAL_QA_REPORT_TYPES.some((r) => r.id === reportType);

  const initialRange = useMemo(() => defaultDateRangeForReportType(reportType), [reportType]);
  const [datePreset, setDatePreset] = useState<DateRangePreset>(initialRange.preset);
  const [dateFrom, setDateFrom] = useState(initialRange.dateFrom);
  const [dateTo, setDateTo] = useState(initialRange.dateTo);
  const [clinicalSiteId, setClinicalSiteId] = useState('');
  const [clinicalRotationId, setClinicalRotationId] = useState('');
  const [programId, setProgramId] = useState('');
  const [year, setYear] = useState('');
  const [semester, setSemester] = useState('');
  const [studentId, setStudentId] = useState('');
  const [clinicalInstructorId, setClinicalInstructorId] = useState('');
  const [topic, setTopic] = useState('');

  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [summaryPage, setSummaryPage] = useState(1);
  const [detailPage, setDetailPage] = useState(1);

  const [summaryDatePreset, setSummaryDatePreset] = useState<DateRangePreset>('last_30_days');
  const [siteSummary, setSiteSummary] = useState<any[]>([]);
  const [instructorFrequency, setInstructorFrequency] = useState<any[]>([]);
  const [summariesLoading, setSummariesLoading] = useState(false);
  const [siteSummaryPage, setSiteSummaryPage] = useState(1);
  const [instructorFreqPage, setInstructorFreqPage] = useState(1);

  const filterParams = useMemo(() => {
    const p: Record<string, string> = { dateFrom, dateTo };
    if (clinicalSiteId) p.clinicalSiteId = clinicalSiteId;
    if (clinicalRotationId) p.clinicalRotationId = clinicalRotationId;
    if (programId) p.programId = programId;
    if (year) p.year = year;
    if (semester) p.semester = semester;
    if (studentId) p.studentId = studentId;
    if (clinicalInstructorId) p.clinicalInstructorId = clinicalInstructorId;
    if (topic.trim()) p.topic = topic.trim();
    return p;
  }, [dateFrom, dateTo, clinicalSiteId, clinicalRotationId, programId, year, semester, studentId, clinicalInstructorId, topic]);

  const filteredRotations = useMemo(() => {
    if (!clinicalSiteId) return rotations;
    return rotations.filter((r) => r.clinicalSiteId === clinicalSiteId);
  }, [rotations, clinicalSiteId]);

  const allReportRows = useMemo(() => getClinicalReportRows(report, reportType), [report, reportType]);
  const paginated = useMemo(
    () => paginateRows(allReportRows, page, CLINICAL_REPORT_PAGE_SIZE),
    [allReportRows, page]
  );

  const siteSummaryPaginated = useMemo(
    () => paginateRows(siteSummary, siteSummaryPage, CLINICAL_REPORT_PAGE_SIZE),
    [siteSummary, siteSummaryPage]
  );
  const instructorFreqPaginated = useMemo(
    () => paginateRows(instructorFrequency, instructorFreqPage, CLINICAL_REPORT_PAGE_SIZE),
    [instructorFrequency, instructorFreqPage]
  );

  const generateReport = useCallback(
    async (overrideParams?: Record<string, string>) => {
      if (!isQaReport) return;
      const params = overrideParams ?? filterParams;
      if (!params.dateFrom || !params.dateTo) return;
      setLoading(true);
      setPage(1);
      setSummaryPage(1);
      setDetailPage(1);
      try {
        const data = await clinicalService.previewReport(reportType, params);
        setReport(data);
      } catch (e: any) {
        toast.error(e?.message || 'Failed to generate report');
        setReport(null);
      } finally {
        setLoading(false);
      }
    },
    [reportType, filterParams, isQaReport]
  );

  const autoloadedFor = useRef<string | null>(null);

  useEffect(() => {
    if (filtersLoading) return;
    if (!isQaReport) return;
    if (autoloadedFor.current === reportType) return;
    autoloadedFor.current = reportType;
    const def = defaultDateRangeForReportType(reportType);
    setDateFrom(def.dateFrom);
    setDateTo(def.dateTo);
    setDatePreset(def.preset);
    setReport(null);
    setPage(1);
    setSummaryPage(1);
    setDetailPage(1);
    clinicalService.previewReport(reportType, { dateFrom: def.dateFrom, dateTo: def.dateTo }).then((data) => {
      setReport(data);
    }).catch(() => {
      setReport(null);
    }).finally(() => {
      setLoading(false);
    });
    setLoading(true);
  }, [reportType, filtersLoading, isQaReport]);

  useEffect(() => {
    if (programId && !programs.some((p) => p.id === programId)) {
      setProgramId('');
    }
  }, [programs, programId]);

  const applyDatePreset = (preset: DateRangePreset) => {
    setDatePreset(preset);
    if (preset !== 'custom') {
      const range = dateRangeFromPreset(preset);
      setDateFrom(range.dateFrom);
      setDateTo(range.dateTo);
    }
  };

  const resetFilters = () => {
    const def = defaultDateRangeForReportType(reportType);
    setDatePreset(def.preset);
    setDateFrom(def.dateFrom);
    setDateTo(def.dateTo);
    setClinicalSiteId('');
    setClinicalRotationId('');
    setProgramId('');
    setYear('');
    setSemester('');
    setStudentId('');
    setClinicalInstructorId('');
    setTopic('');
    setReport(null);
    setPage(1);
    setSummaryPage(1);
    setDetailPage(1);
    generateReport({ dateFrom: def.dateFrom, dateTo: def.dateTo });
  };

  const handleExport = useCallback(async () => {
    if (!isQaReport) return;
    setExporting(true);
    try {
      await clinicalService.exportReport(reportType, filterParams);
      toast.success('Excel report downloaded');
    } catch (e: any) {
      toast.error(e?.message || 'Export failed');
    } finally {
      setExporting(false);
    }
  }, [reportType, filterParams, isQaReport]);

  const loadSummaries = useCallback(async () => {
    setSummariesLoading(true);
    try {
      const range = dateRangeFromPreset(summaryDatePreset);
      const [summary, frequency] = await Promise.all([
        clinicalService.getSiteSummary({ dateFrom: range.dateFrom, dateTo: range.dateTo }),
        clinicalService.getInstructorFrequency({ dateFrom: range.dateFrom, dateTo: range.dateTo }),
      ]);
      setSiteSummary(summary);
      setInstructorFrequency(frequency);
      setSiteSummaryPage(1);
      setInstructorFreqPage(1);
    } catch {
      setSiteSummary([]);
      setInstructorFrequency([]);
      toast.error('Failed to load summary reports');
    } finally {
      setSummariesLoading(false);
    }
  }, [summaryDatePreset]);

  useEffect(() => {
    if (isSummariesTab && !filtersLoading) {
      loadSummaries();
    }
  }, [isSummariesTab, filtersLoading, loadSummaries]);

  if (filtersLoading) {
    return (
      <div className="flex justify-center py-16">
        <Loader2 className="h-8 w-8 animate-spin text-[#015F2B]" />
      </div>
    );
  }

  const filterBar = (
    <div className="flex flex-wrap items-end gap-3 rounded-md border p-3 bg-muted/30">
      <Filter className="h-4 w-4 text-muted-foreground shrink-0 mb-2" />
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Period</label>
        <Select value={datePreset} onValueChange={(v) => applyDatePreset(v as DateRangePreset)}>
          <SelectTrigger className="w-[180px] h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All time</SelectItem>
            <SelectItem value="last_30_days">Last 30 days</SelectItem>
            <SelectItem value="this_term">Last 3 months</SelectItem>
            <SelectItem value="custom">Custom dates</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Date from</label>
        <Input
          type="date"
          className="w-[150px] h-9"
          value={dateFrom}
          onChange={(e) => { setDatePreset('custom'); setDateFrom(e.target.value); }}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Date to</label>
        <Input
          type="date"
          className="w-[150px] h-9"
          value={dateTo}
          onChange={(e) => { setDatePreset('custom'); setDateTo(e.target.value); }}
        />
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Clinical site</label>
        <Select
          value={clinicalSiteId || ALL_FILTER}
          onValueChange={(v) => { setClinicalSiteId(v === ALL_FILTER ? '' : v); setClinicalRotationId(''); }}
        >
          <SelectTrigger className="w-[180px] h-9"><SelectValue placeholder="All sites" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All sites</SelectItem>
            {sites.map((s) => <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Rotation</label>
        <Select
          value={clinicalRotationId || ALL_FILTER}
          onValueChange={(v) => setClinicalRotationId(v === ALL_FILTER ? '' : v)}
        >
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All rotations" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All rotations</SelectItem>
            {filteredRotations.map((rot) => <SelectItem key={rot.id} value={rot.id}>{rot.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Programme</label>
        <Select value={programId || ALL_FILTER} onValueChange={(v) => setProgramId(v === ALL_FILTER ? '' : v)}>
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All programmes" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All programmes</SelectItem>
            {programs.map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Year</label>
        <Select value={year || ALL_FILTER} onValueChange={(v) => setYear(v === ALL_FILTER ? '' : v)}>
          <SelectTrigger className="w-[100px] h-9"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All</SelectItem>
            {[1, 2, 3, 4, 5].map((y) => <SelectItem key={y} value={String(y)}>{y}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Semester</label>
        <Select value={semester || ALL_FILTER} onValueChange={(v) => setSemester(v === ALL_FILTER ? '' : v)}>
          <SelectTrigger className="w-[110px] h-9"><SelectValue placeholder="All" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All</SelectItem>
            <SelectItem value="1">Semester I</SelectItem>
            <SelectItem value="2">Semester II</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Instructor</label>
        <Select
          value={clinicalInstructorId || ALL_FILTER}
          onValueChange={(v) => setClinicalInstructorId(v === ALL_FILTER ? '' : v)}
        >
          <SelectTrigger className="w-[200px] h-9"><SelectValue placeholder="All instructors" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All instructors</SelectItem>
            {instructors.map((i) => <SelectItem key={i.id} value={i.id}>{i.fullName}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Student</label>
        <Select value={studentId || ALL_FILTER} onValueChange={(v) => setStudentId(v === ALL_FILTER ? '' : v)}>
          <SelectTrigger className="w-[220px] h-9"><SelectValue placeholder="All students" /></SelectTrigger>
          <SelectContent>
            <SelectItem value={ALL_FILTER}>All students</SelectItem>
            {students.map((s) => (
              <SelectItem key={s.id} value={s.id}>{s.firstName} {s.lastName} ({s.studentNumber})</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1">
        <label className="text-xs font-medium text-muted-foreground">Topic</label>
        <Input className="w-[200px] h-9" value={topic} onChange={(e) => setTopic(e.target.value)} placeholder="Filter by topic" />
      </div>
      <Button variant="outline" className="h-9" onClick={resetFilters}>
        <RotateCcw className="mr-2 h-4 w-4" />
        Reset
      </Button>
      <Button className="bg-[#015F2B] hover:bg-[#014022] h-9" onClick={() => generateReport()} disabled={loading}>
        {loading ? 'Loading…' : 'Generate report'}
      </Button>
      <Button variant="outline" className="h-9" onClick={handleExport} disabled={exporting}>
        <Download className="mr-2 h-4 w-4" />
        {exporting ? 'Exporting…' : 'Export Excel'}
      </Button>
    </div>
  );

  const reportTableBody = (currentReportType: string) => (
    <div className="rounded-md border overflow-x-auto max-h-[70vh]">
      {loading ? (
        <div className="flex items-center justify-center gap-3 py-16 text-muted-foreground">
          <Loader2 className="h-5 w-5 animate-spin" />
          Loading report…
        </div>
      ) : !report ? (
        <div className="py-16 text-center text-muted-foreground">No sessions recorded in this period.</div>
      ) : currentReportType === 'individual-student-attendance' ? (
        <div className="p-4">
          <IndividualStudentAttendanceTables
            preview={report}
            summaryPage={summaryPage}
            detailPage={detailPage}
            onSummaryPageChange={setSummaryPage}
            onDetailPageChange={setDetailPage}
            pageSize={CLINICAL_REPORT_PAGE_SIZE}
          />
        </div>
      ) : paginated.rows.length === 0 ? (
        <div className="py-16 text-center text-muted-foreground">No data in this scope.</div>
      ) : (
        <ClinicalReportPreviewTable reportType={currentReportType} preview={report} rows={paginated.rows} />
      )}
    </div>
  );

  return (
    <Tabs value={reportType} onValueChange={onReportTypeChange} className="min-w-0 w-full space-y-4">
      <TabsList className="bg-gray-100 h-auto w-full max-w-full flex flex-wrap items-center justify-start gap-1 p-1 [&_[data-slot=tabs-trigger]]:h-8 [&_[data-slot=tabs-trigger]]:shrink-0 [&_[data-slot=tabs-trigger]]:flex-none">
        {CLINICAL_QA_REPORT_TYPES.map((r) => (
          <TabsTrigger key={r.id} value={r.id} className="text-xs sm:text-sm">
            {r.label}
          </TabsTrigger>
        ))}
        <TabsTrigger value="summaries" className="text-xs sm:text-sm">
          Site & instructor summaries
        </TabsTrigger>
      </TabsList>

      {CLINICAL_QA_REPORT_TYPES.map((r) => (
        <TabsContent key={r.id} value={r.id} className="space-y-4 mt-0">
          <Card>
            <CardHeader>
              <CardTitle>{report?.title ?? r.label}</CardTitle>
              <CardDescription>
                {dateFrom === dateTo
                  ? `Showing data for ${dateFrom}`
                  : `Showing ${dateFrom} to ${dateTo}`}
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {filterBar}

              {report && (
                <p className="text-sm text-muted-foreground">
                  {paginated.total} row{paginated.total === 1 ? '' : 's'}
                  {report.filterNote ? ` · ${report.filterNote}` : ''}
                </p>
              )}

              {reportTableBody(r.id)}

              {report && r.id !== 'individual-student-attendance' && (
                <ReportPaginationBar
                  page={paginated.page}
                  totalPages={paginated.totalPages}
                  total={paginated.total}
                  rangeStart={paginated.rangeStart}
                  rangeEnd={paginated.rangeEnd}
                  onPageChange={setPage}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>
      ))}

      <TabsContent value="summaries" className="space-y-4 mt-0">
        <div className="flex flex-wrap items-center gap-3">
          <Select value={summaryDatePreset} onValueChange={(v) => setSummaryDatePreset(v as DateRangePreset)}>
            <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All time</SelectItem>
              <SelectItem value="last_30_days">Last 30 days</SelectItem>
              <SelectItem value="this_term">Last 3 months</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={loadSummaries} disabled={summariesLoading}>
            {summariesLoading ? 'Loading…' : 'Refresh summaries'}
          </Button>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Site activity summary</CardTitle>
              <CardDescription>Sessions recorded per clinical site.</CardDescription>
            </CardHeader>
            <CardContent>
              {summariesLoading ? (
                <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Site</TableHead>
                          <TableHead>Code</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {siteSummaryPaginated.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                              No session data for this period.
                            </TableCell>
                          </TableRow>
                        ) : (
                          siteSummaryPaginated.rows.map((row: any, i: number) => (
                            <TableRow key={`${row.clinicalSiteId}-${i}`}>
                              <TableCell className="font-medium">{row.clinicalSiteName}</TableCell>
                              <TableCell>{row.clinicalSiteCode}</TableCell>
                              <TableCell className="text-right">{row.totalSessions}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ReportPaginationBar
                    page={siteSummaryPaginated.page}
                    totalPages={siteSummaryPaginated.totalPages}
                    total={siteSummaryPaginated.total}
                    rangeStart={siteSummaryPaginated.rangeStart}
                    rangeEnd={siteSummaryPaginated.rangeEnd}
                    onPageChange={setSiteSummaryPage}
                  />
                </>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Instructor frequency</CardTitle>
              <CardDescription>Teaching sessions per registered clinical instructor.</CardDescription>
            </CardHeader>
            <CardContent>
              {summariesLoading ? (
                <div className="py-8 text-center text-muted-foreground flex items-center justify-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : (
                <>
                  <div className="rounded-md border overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Instructor</TableHead>
                          <TableHead>Cadre</TableHead>
                          <TableHead className="text-right">Sessions</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {instructorFreqPaginated.rows.length === 0 ? (
                          <TableRow>
                            <TableCell colSpan={3} className="py-8 text-center text-muted-foreground">
                              No instructor session data for this period.
                            </TableCell>
                          </TableRow>
                        ) : (
                          instructorFreqPaginated.rows.map((row: any, i: number) => (
                            <TableRow key={`${row.clinicalInstructorId}-${i}`}>
                              <TableCell className="font-medium">{row.fullName}</TableCell>
                              <TableCell>{row.cadre || '—'}</TableCell>
                              <TableCell className="text-right">{row.sessionsTaught}</TableCell>
                            </TableRow>
                          ))
                        )}
                      </TableBody>
                    </Table>
                  </div>
                  <ReportPaginationBar
                    page={instructorFreqPaginated.page}
                    totalPages={instructorFreqPaginated.totalPages}
                    total={instructorFreqPaginated.total}
                    rangeStart={instructorFreqPaginated.rangeStart}
                    rangeEnd={instructorFreqPaginated.rangeEnd}
                    onPageChange={setInstructorFreqPage}
                  />
                </>
              )}
            </CardContent>
          </Card>
        </div>
      </TabsContent>
    </Tabs>
  );
}
