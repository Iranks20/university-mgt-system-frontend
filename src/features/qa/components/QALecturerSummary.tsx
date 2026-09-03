import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { qaService } from '@/services/qa.service';
import { exportLecturerSummaryReports } from '@/utils/excel';
import type { QALecturerSummary, QALecturerSummaryReport } from '@/types/qa';

type DateRangeKey = 'all' | 'last_30_days' | 'this_term';

type LecturerTableRow = QALecturerSummary & { school: string };

const PAGE_SIZE = 20;
const ALL = 'All';

type QALecturerSummaryProps = {
  scopedDateRange?: { dateFrom: string; dateTo: string };
};

export function QALecturerSummary({ scopedDateRange }: QALecturerSummaryProps) {
  const [reports, setReports] = useState<QALecturerSummaryReport[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>(ALL);
  const [selectedClass, setSelectedClass] = useState<string>(ALL);
  const [selectedCourseUnit, setSelectedCourseUnit] = useState<string>(ALL);
  const [selectedLecturer, setSelectedLecturer] = useState<string>(ALL);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const getDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    if (scopedDateRange) return scopedDateRange;
    const now = new Date();
    if (dateRangeKey === 'all') return undefined;
    if (dateRangeKey === 'last_30_days') {
      const from = new Date(now);
      from.setDate(from.getDate() - 30);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    if (dateRangeKey === 'this_term') {
      const from = new Date(now);
      from.setMonth(from.getMonth() - 3);
      return { dateFrom: from.toISOString().slice(0, 10), dateTo: now.toISOString().slice(0, 10) };
    }
    return undefined;
  };

  useEffect(() => {
    qaService.getSchools().then((schools) => setSchoolOptions(schools));
  }, []);

  useEffect(() => {
    loadReports();
  }, [selectedSchool, dateRangeKey, selectedClass, selectedCourseUnit, selectedLecturer, scopedDateRange?.dateFrom, scopedDateRange?.dateTo]);

  useEffect(() => {
    setSelectedClass(ALL);
    setSelectedCourseUnit(ALL);
    setSelectedLecturer(ALL);
  }, [selectedSchool, dateRangeKey, scopedDateRange?.dateFrom, scopedDateRange?.dateTo]);

  useEffect(() => {
    setPage(1);
  }, [selectedSchool, dateRangeKey, selectedClass, selectedCourseUnit, selectedLecturer, reports]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const school = selectedSchool === ALL ? undefined : selectedSchool;
      const dateParams = getDateParams();
      const data = await qaService.getLecturerSummaryReport(school, {
        ...dateParams,
        className: selectedClass === ALL ? undefined : selectedClass,
        courseUnit: selectedCourseUnit === ALL ? undefined : selectedCourseUnit,
        lecturerName: selectedLecturer === ALL ? undefined : selectedLecturer,
      });
      setReports(data);
    } catch (error) {
      console.error('Error loading lecturer summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const [optionCatalog, setOptionCatalog] = useState<{
    classes: string[];
    courseUnits: string[];
    lecturers: string[];
  }>({ classes: [], courseUnits: [], lecturers: [] });

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const school = selectedSchool === ALL ? undefined : selectedSchool;
        const dateParams = getDateParams();
        const data = await qaService.getLecturerSummaryReport(school, dateParams);
        const rows = data.flatMap((report) => report.lecturers);
        setOptionCatalog({
          classes: Array.from(new Set(rows.map((r) => r.class).filter(Boolean))).sort(),
          courseUnits: Array.from(new Set(rows.map((r) => r.courseUnit).filter(Boolean))).sort(),
          lecturers: Array.from(new Set(rows.map((r) => r.lecturerName).filter(Boolean))).sort(),
        });
      } catch {
        setOptionCatalog({ classes: [], courseUnits: [], lecturers: [] });
      }
    };
    loadOptions();
  }, [selectedSchool, dateRangeKey, scopedDateRange?.dateFrom, scopedDateRange?.dateTo]);

  const schoolFilterOptions = useMemo(() => {
    const fromReports = reports.map((report) => report.school);
    return Array.from(new Set([...schoolOptions, ...fromReports])).sort();
  }, [schoolOptions, reports]);

  const schoolComboboxOptions = useMemo(
    () => [{ value: ALL, label: 'All Schools' }, ...schoolFilterOptions.map((school) => ({ value: school, label: school }))],
    [schoolFilterOptions]
  );
  const classComboboxOptions = useMemo(
    () => [{ value: ALL, label: 'All Classes' }, ...optionCatalog.classes.map((cls) => ({ value: cls, label: cls }))],
    [optionCatalog.classes]
  );
  const courseUnitComboboxOptions = useMemo(
    () => [
      { value: ALL, label: 'All Course Units' },
      ...optionCatalog.courseUnits.map((unit) => ({ value: unit, label: unit })),
    ],
    [optionCatalog.courseUnits]
  );
  const lecturerComboboxOptions = useMemo(
    () => [
      { value: ALL, label: 'All Lecturers' },
      ...optionCatalog.lecturers.map((name) => ({ value: name, label: name })),
    ],
    [optionCatalog.lecturers]
  );

  const tableRows: LecturerTableRow[] = useMemo(
    () =>
      reports.flatMap((report) =>
        report.lecturers.map((lecturer) => ({ ...lecturer, school: report.school }))
      ),
    [reports]
  );

  const totalPages = Math.max(1, Math.ceil(tableRows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return tableRows.slice(start, start + PAGE_SIZE);
  }, [tableRows, page]);

  const handleExport = () => {
    exportLecturerSummaryReports(reports);
  };

  const showSchoolColumn = selectedSchool === ALL;
  const activeFilterCount = [selectedClass, selectedCourseUnit, selectedLecturer].filter((v) => v !== ALL).length;

  const clearDetailFilters = () => {
    setSelectedClass(ALL);
    setSelectedCourseUnit(ALL);
    setSelectedLecturer(ALL);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lecturer Summary Reports</h2>
          <p className="text-gray-500">Summary by lecturer, class, and course unit (matching 2.csv format)</p>
        </div>
        <Button variant="outline" onClick={handleExport} disabled={tableRows.length === 0}>
          <Download className="mr-2 h-4 w-4" />
          Export Excel
        </Button>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle>Lecturer Summary</CardTitle>
          <CardDescription>
            {selectedSchool === ALL
              ? 'Lecturer teaching summary across all schools'
              : `Lecturer teaching summary for ${selectedSchool}`}
            {activeFilterCount > 0
              ? ` · ${activeFilterCount} detail filter${activeFilterCount === 1 ? '' : 's'} applied`
              : ''}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 items-center mb-6">
            {!scopedDateRange ? (
            <Select value={dateRangeKey} onValueChange={(v) => setDateRangeKey(v as DateRangeKey)}>
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
              className="w-[220px]"
              options={schoolComboboxOptions}
              value={selectedSchool}
              onValueChange={(v) => setSelectedSchool(v || ALL)}
              placeholder="Filter by School"
              searchPlaceholder="Search schools..."
              emptyText="No school found."
              initialDisplayCount={50}
            />
            <Combobox
              className="w-[200px]"
              options={classComboboxOptions}
              value={selectedClass}
              onValueChange={(v) => setSelectedClass(v || ALL)}
              placeholder="Class"
              searchPlaceholder="Search classes..."
              emptyText="No class found."
              initialDisplayCount={50}
            />
            <Combobox
              className="w-[240px]"
              options={courseUnitComboboxOptions}
              value={selectedCourseUnit}
              onValueChange={(v) => setSelectedCourseUnit(v || ALL)}
              placeholder="Course unit"
              searchPlaceholder="Search course units..."
              emptyText="No course unit found."
              initialDisplayCount={50}
            />
            <Combobox
              className="w-[220px]"
              options={lecturerComboboxOptions}
              value={selectedLecturer}
              onValueChange={(v) => setSelectedLecturer(v || ALL)}
              placeholder="Lecturer"
              searchPlaceholder="Search lecturers..."
              emptyText="No lecturer found."
              initialDisplayCount={50}
            />
            {activeFilterCount > 0 && (
              <Button variant="ghost" size="sm" onClick={clearDetailFilters}>
                Clear class / course / lecturer
              </Button>
            )}
          </div>

          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading lecturer summaries...</div>
          ) : tableRows.length === 0 ? (
            <div className="py-8 text-center text-gray-500">
              No lecturer summary reports available for the selected filters.
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showSchoolColumn && <TableHead>SCHOOL</TableHead>}
                    <TableHead>LECTURER&apos;S NAME</TableHead>
                    <TableHead>CLASS</TableHead>
                    <TableHead>COURSE UNIT</TableHead>
                    <TableHead className="text-right">NO. TAUGHT</TableHead>
                    <TableHead className="text-right">NO. UNTAIGHT</TableHead>
                    <TableHead className="text-right">MISSED BY LECTURER</TableHead>
                    <TableHead className="text-right">MISSED BY STUDENTS</TableHead>
                    <TableHead className="text-right">OTHER PROG. & HOLIDAYS</TableHead>
                    <TableHead className="text-right">ASSIGNMENT</TableHead>
                    <TableHead className="text-right">SDL</TableHead>
                    <TableHead className="text-right">SUBSTITUTED</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {paginatedRows.map((row, index) => (
                    <TableRow key={`${row.school}-${row.lecturerName}-${row.class}-${row.courseUnit}-${index}`}>
                      {showSchoolColumn && <TableCell className="font-medium">{row.school}</TableCell>}
                      <TableCell className="font-medium">{row.lecturerName}</TableCell>
                      <TableCell>{row.class}</TableCell>
                      <TableCell className="max-w-xs truncate">{row.courseUnit}</TableCell>
                      <TableCell className="text-right">{row.noTaught}</TableCell>
                      <TableCell className="text-right">{row.noUntaught ?? 0}</TableCell>
                      <TableCell className="text-right">{row.missedByLecturer ?? row.noMissedByLecturers}</TableCell>
                      <TableCell className="text-right">{row.missedByStudents ?? 0}</TableCell>
                      <TableCell className="text-right">{row.missedOtherProgramsHolidays ?? 0}</TableCell>
                      <TableCell className="text-right">{row.assignment ?? 0}</TableCell>
                      <TableCell className="text-right">{row.noSdl ?? 0}</TableCell>
                      <TableCell className="text-right">{row.noSubstituted ?? 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              <div className="flex items-center justify-between border-t px-4 py-2">
                <span className="text-sm text-muted-foreground">{tableRows.length} total</span>
                <div className="flex items-center gap-2">
                  <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>
                    <ChevronLeft className="h-4 w-4" /> Previous
                  </Button>
                  <span className="text-sm">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
