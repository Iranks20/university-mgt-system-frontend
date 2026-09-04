import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Combobox } from '@/components/ui/combobox';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { qaService } from '@/services/qa.service';
import { academicService } from '@/services/academic.service';
import { exportCourseUnitSummaryReport } from '@/utils/excel';
import type { QACourseUnitSummary as QACourseUnitSummaryRow } from '@/types/qa';

type DateRangeKey = 'all' | 'last_30_days' | 'this_term';

const PAGE_SIZE = 20;
const ALL = 'All';
const PREVIEW_ITEM_COUNT = 1;

function splitCsvList(value: string): string[] {
  return value
    .split(',')
    .map((part) => part.trim())
    .filter((part) => part.length > 0 && part !== '—');
}

function formatPreviewList(value: string, maxItems = PREVIEW_ITEM_COUNT): {
  preview: string;
  total: number;
  hasMore: boolean;
} {
  const items = splitCsvList(value);
  if (items.length === 0) {
    return { preview: '—', total: 0, hasMore: false };
  }
  if (items.length <= maxItems) {
    return { preview: items.join(', '), total: items.length, hasMore: false };
  }
  const remaining = items.length - maxItems;
  return {
    preview: `${items.slice(0, maxItems).join(', ')}… +${remaining}`,
    total: items.length,
    hasMore: true,
  };
}

type QACourseUnitSummaryProps = {
  scopedDateRange?: { dateFrom: string; dateTo: string };
};

export function QACourseUnitSummary({ scopedDateRange }: QACourseUnitSummaryProps) {
  const [rows, setRows] = useState<QACourseUnitSummaryRow[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [schoolRecords, setSchoolRecords] = useState<Array<{ id: string; name: string }>>([]);
  const [departmentOptions, setDepartmentOptions] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>(ALL);
  const [selectedDepartment, setSelectedDepartment] = useState<string>(ALL);
  const [selectedClass, setSelectedClass] = useState<string>(ALL);
  const [selectedCourseUnit, setSelectedCourseUnit] = useState<string>(ALL);
  const [selectedLecturer, setSelectedLecturer] = useState<string>(ALL);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isExporting, setIsExporting] = useState(false);
  const [page, setPage] = useState(1);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [detailRow, setDetailRow] = useState<QACourseUnitSummaryRow | null>(null);
  const [optionCatalog, setOptionCatalog] = useState<{
    classes: string[];
    courseUnits: string[];
    lecturers: string[];
  }>({ classes: [], courseUnits: [], lecturers: [] });

  const openDetails = (row: QACourseUnitSummaryRow) => {
    setDetailRow(row);
    setDetailsOpen(true);
  };

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

  const buildReportParams = () => {
    const dateParams = getDateParams();
    return {
      ...dateParams,
      className: selectedClass === ALL ? undefined : selectedClass,
      courseUnit: selectedCourseUnit === ALL ? undefined : selectedCourseUnit,
      lecturerName: selectedLecturer === ALL ? undefined : selectedLecturer,
      department: selectedDepartment === ALL ? undefined : selectedDepartment,
    };
  };

  useEffect(() => {
    academicService.getSchools().then((schools) => {
      setSchoolRecords(schools.map((school) => ({ id: school.id, name: school.name })));
      setSchoolOptions(schools.map((school) => school.name));
    });
  }, []);

  useEffect(() => {
    const loadDepartments = async () => {
      try {
        const schoolId =
          selectedSchool === ALL
            ? undefined
            : schoolRecords.find((school) => school.name === selectedSchool)?.id;
        const departments = await academicService.getDepartments(schoolId);
        setDepartmentOptions(Array.from(new Set(departments.map((dept) => dept.name))).sort());
      } catch {
        setDepartmentOptions([]);
      }
    };
    loadDepartments();
  }, [selectedSchool, schoolRecords]);

  useEffect(() => {
    loadReports();
  }, [
    selectedSchool,
    selectedDepartment,
    dateRangeKey,
    selectedClass,
    selectedCourseUnit,
    selectedLecturer,
    scopedDateRange?.dateFrom,
    scopedDateRange?.dateTo,
  ]);

  useEffect(() => {
    setSelectedDepartment(ALL);
    setSelectedClass(ALL);
    setSelectedCourseUnit(ALL);
    setSelectedLecturer(ALL);
  }, [selectedSchool, dateRangeKey, scopedDateRange?.dateFrom, scopedDateRange?.dateTo]);

  useEffect(() => {
    setSelectedClass(ALL);
    setSelectedCourseUnit(ALL);
    setSelectedLecturer(ALL);
  }, [selectedDepartment]);

  useEffect(() => {
    setPage(1);
  }, [
    selectedSchool,
    selectedDepartment,
    dateRangeKey,
    selectedClass,
    selectedCourseUnit,
    selectedLecturer,
    rows,
  ]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const school = selectedSchool === ALL ? undefined : selectedSchool;
      const data = await qaService.getCourseUnitSummaryReport(school, buildReportParams());
      setRows(data);
    } catch (error) {
      console.error('Error loading course unit summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    const loadOptions = async () => {
      try {
        const school = selectedSchool === ALL ? undefined : selectedSchool;
        const dateParams = getDateParams();
        const data = await qaService.getCourseUnitSummaryReport(school, {
          ...dateParams,
          department: selectedDepartment === ALL ? undefined : selectedDepartment,
        });
        const classSet = new Set<string>();
        const courseUnitSet = new Set<string>();
        const lecturerSet = new Set<string>();
        for (const row of data) {
          if (row.courseUnit) courseUnitSet.add(row.courseUnit);
          row.class
            .split(',')
            .map((v) => v.trim())
            .filter(Boolean)
            .forEach((v) => classSet.add(v));
          row.lecturerName
            .split(',')
            .map((v) => v.trim())
            .filter((v) => v && v !== '—')
            .forEach((v) => lecturerSet.add(v));
        }
        setOptionCatalog({
          classes: Array.from(classSet).sort(),
          courseUnits: Array.from(courseUnitSet).sort(),
          lecturers: Array.from(lecturerSet).sort(),
        });
      } catch {
        setOptionCatalog({ classes: [], courseUnits: [], lecturers: [] });
      }
    };
    loadOptions();
  }, [
    selectedSchool,
    selectedDepartment,
    dateRangeKey,
    scopedDateRange?.dateFrom,
    scopedDateRange?.dateTo,
  ]);

  const schoolComboboxOptions = useMemo(
    () => [{ value: ALL, label: 'All Schools' }, ...schoolOptions.map((school) => ({ value: school, label: school }))],
    [schoolOptions]
  );
  const departmentComboboxOptions = useMemo(
    () => [
      { value: ALL, label: 'All Departments' },
      ...departmentOptions.map((dept) => ({ value: dept, label: dept })),
    ],
    [departmentOptions]
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

  const totalPages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const paginatedRows = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return rows.slice(start, start + PAGE_SIZE);
  }, [rows, page]);

  const getDateRangeLabel = (): string => {
    if (scopedDateRange?.dateFrom && scopedDateRange?.dateTo) {
      return `${scopedDateRange.dateFrom} to ${scopedDateRange.dateTo}`;
    }
    if (dateRangeKey === 'all') return 'All time';
    if (dateRangeKey === 'last_30_days') return 'Last 30 days';
    return 'Last 3 months';
  };

  const handleExport = async () => {
    if (rows.length === 0) return;
    setIsExporting(true);
    try {
      const school = selectedSchool === ALL ? undefined : selectedSchool;
      const data = await qaService.getCourseUnitSummaryReport(school, buildReportParams());
      setRows(data);
      if (data.length === 0) return;
      const dateParams = getDateParams();
      exportCourseUnitSummaryReport(data, {
        schoolFilter: selectedSchool,
        departmentFilter: selectedDepartment,
        classFilter: selectedClass,
        courseUnitFilter: selectedCourseUnit,
        lecturerFilter: selectedLecturer,
        dateFrom: dateParams?.dateFrom ?? null,
        dateTo: dateParams?.dateTo ?? null,
        dateRangeLabel: getDateRangeLabel(),
      });
    } catch (error) {
      console.error('Error exporting course unit summary:', error);
    } finally {
      setIsExporting(false);
    }
  };

  const activeFilterCount = [selectedDepartment, selectedClass, selectedCourseUnit, selectedLecturer].filter(
    (v) => v !== ALL
  ).length;

  const clearDetailFilters = () => {
    setSelectedDepartment(ALL);
    setSelectedClass(ALL);
    setSelectedCourseUnit(ALL);
    setSelectedLecturer(ALL);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle>Course Unit Summary</CardTitle>
        <CardDescription>
          Teaching outcomes rolled up by course unit
          {selectedSchool !== ALL ? ` · ${selectedSchool}` : ''}
          {selectedDepartment !== ALL ? ` · ${selectedDepartment}` : ''}
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
            className="w-[220px]"
            options={departmentComboboxOptions}
            value={selectedDepartment}
            onValueChange={(v) => setSelectedDepartment(v || ALL)}
            placeholder="Department"
            searchPlaceholder="Search departments..."
            emptyText="No department found."
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
              Clear filters
            </Button>
          )}
          <Button
            variant="outline"
            onClick={handleExport}
            disabled={isExporting || isLoading || rows.length === 0}
          >
            <Download className="mr-2 h-4 w-4" />
            {isExporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        </div>

        {isLoading ? (
          <div className="py-8 text-center text-gray-500">Loading course unit summaries...</div>
        ) : rows.length === 0 ? (
          <div className="py-8 text-center text-gray-500">
            No course unit summary data for the selected filters.
          </div>
        ) : (
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="min-w-[160px]">LECTURER&apos;S NAME</TableHead>
                  <TableHead className="min-w-[140px]">CLASS</TableHead>
                  <TableHead className="min-w-[160px]">COURSE UNIT</TableHead>
                  <TableHead className="text-right whitespace-nowrap">EXPECTED</TableHead>
                  <TableHead className="text-right whitespace-nowrap">TAUGHT</TableHead>
                  <TableHead className="text-right whitespace-nowrap">PHYSICAL</TableHead>
                  <TableHead className="text-right whitespace-nowrap">ONLINE</TableHead>
                  <TableHead className="text-right whitespace-nowrap">SDL</TableHead>
                  <TableHead className="text-right whitespace-nowrap">ASSIGNMENT</TableHead>
                  <TableHead className="text-right whitespace-nowrap">MISS. LECT.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">MISS. STUD.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">MISS. OTHER</TableHead>
                  <TableHead className="text-right whitespace-nowrap">LEARNING ACT.</TableHead>
                  <TableHead className="text-right whitespace-nowrap">UNTAUGHT</TableHead>
                  <TableHead className="text-right whitespace-nowrap">MISSED</TableHead>
                  <TableHead className="text-right whitespace-nowrap">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {paginatedRows.map((row) => {
                  const lecturers = formatPreviewList(row.lecturerName);
                  const classes = formatPreviewList(row.class);
                  return (
                    <TableRow key={row.courseUnit}>
                      <TableCell className="align-top">
                        <div className="max-w-[180px]">
                          <p className="font-medium truncate" title={row.lecturerName}>
                            {lecturers.preview}
                          </p>
                          {lecturers.hasMore ? (
                            <p className="text-xs text-muted-foreground">{lecturers.total} lecturers</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="align-top">
                        <div className="max-w-[160px]">
                          <p className="truncate" title={row.class}>
                            {classes.preview}
                          </p>
                          {classes.hasMore ? (
                            <p className="text-xs text-muted-foreground">{classes.total} classes</p>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="font-medium align-top max-w-[180px]">
                        <span className="line-clamp-2" title={row.courseUnit}>
                          {row.courseUnit}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">{row.expectedLectures}</TableCell>
                      <TableCell className="text-right">{row.noTaught}</TableCell>
                      <TableCell className="text-right">{row.physicalClasses}</TableCell>
                      <TableCell className="text-right">{row.onlineLectures}</TableCell>
                      <TableCell className="text-right">{row.noSdl}</TableCell>
                      <TableCell className="text-right">{row.assignment}</TableCell>
                      <TableCell className="text-right">{row.missedByLecturer}</TableCell>
                      <TableCell className="text-right">{row.missedByStudents}</TableCell>
                      <TableCell className="text-right">{row.missedOtherProgramsHolidays}</TableCell>
                      <TableCell className="text-right">{row.totalLearningActivity}</TableCell>
                      <TableCell className="text-right">{row.totalUntaught}</TableCell>
                      <TableCell className="text-right">{row.totalMissed}</TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-[#015F2B]"
                          onClick={() => openDetails(row)}
                        >
                          Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <div className="flex items-center justify-between border-t px-4 py-2">
              <span className="text-sm text-muted-foreground">{rows.length} total</span>
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

      <Dialog
        open={detailsOpen}
        onOpenChange={(open) => {
          setDetailsOpen(open);
          if (!open) setDetailRow(null);
        }}
      >
        <DialogContent className="w-[96vw] max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detailRow?.courseUnit ?? 'Course unit details'}</DialogTitle>
            <DialogDescription>
              Full lecturer and class lists for this course unit, with teaching totals.
            </DialogDescription>
          </DialogHeader>
          {detailRow ? (
            <div className="space-y-5">
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Expected</p>
                  <p className="text-lg font-semibold">{detailRow.expectedLectures}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Taught</p>
                  <p className="text-lg font-semibold text-[#015F2B]">{detailRow.noTaught}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Learning activity</p>
                  <p className="text-lg font-semibold">{detailRow.totalLearningActivity}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Physical / Online</p>
                  <p className="text-lg font-semibold">
                    {detailRow.physicalClasses} / {detailRow.onlineLectures}
                  </p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Untaught</p>
                  <p className="text-lg font-semibold">{detailRow.totalUntaught}</p>
                </div>
                <div className="rounded-md border p-3">
                  <p className="text-xs text-muted-foreground">Missed</p>
                  <p className="text-lg font-semibold text-red-600">{detailRow.totalMissed}</p>
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Lecturers ({splitCsvList(detailRow.lecturerName).length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {splitCsvList(detailRow.lecturerName).length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    splitCsvList(detailRow.lecturerName).map((name) => (
                      <Badge key={name} variant="secondary">
                        {name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <h4 className="text-sm font-semibold">
                  Classes ({splitCsvList(detailRow.class).length})
                </h4>
                <div className="flex flex-wrap gap-2">
                  {splitCsvList(detailRow.class).length === 0 ? (
                    <span className="text-sm text-muted-foreground">—</span>
                  ) : (
                    splitCsvList(detailRow.class).map((name) => (
                      <Badge key={name} variant="outline">
                        {name}
                      </Badge>
                    ))
                  )}
                </div>
              </div>

              <div className="rounded-md border overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Metric</TableHead>
                      <TableHead className="text-right">Count</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    <TableRow>
                      <TableCell>SDL</TableCell>
                      <TableCell className="text-right">{detailRow.noSdl}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Assignment in lecture time</TableCell>
                      <TableCell className="text-right">{detailRow.assignment}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Missed by lecturer</TableCell>
                      <TableCell className="text-right">{detailRow.missedByLecturer}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Missed by students</TableCell>
                      <TableCell className="text-right">{detailRow.missedByStudents}</TableCell>
                    </TableRow>
                    <TableRow>
                      <TableCell>Missed due to other programs & holidays</TableCell>
                      <TableCell className="text-right">{detailRow.missedOtherProgramsHolidays}</TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </div>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </Card>
  );
}
