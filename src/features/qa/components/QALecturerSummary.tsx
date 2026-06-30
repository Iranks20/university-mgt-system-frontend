import React, { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { qaService } from '@/services/qa.service';
import { exportLecturerSummaryReports } from '@/utils/excel';
import type { QALecturerSummary, QALecturerSummaryReport } from '@/types/qa';

type DateRangeKey = 'all' | 'last_30_days' | 'this_term';

type LecturerTableRow = QALecturerSummary & { school: string };

const PAGE_SIZE = 20;

export function QALecturerSummary() {
  const [reports, setReports] = useState<QALecturerSummaryReport[]>([]);
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('All');
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [page, setPage] = useState(1);

  const getDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
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
  }, [selectedSchool, dateRangeKey]);

  useEffect(() => {
    setPage(1);
  }, [selectedSchool, dateRangeKey, reports]);

  const loadReports = async () => {
    setIsLoading(true);
    try {
      const school = selectedSchool === 'All' ? undefined : selectedSchool;
      const dateParams = getDateParams();
      const data = await qaService.getLecturerSummaryReport(school, dateParams);
      setReports(data);
    } catch (error) {
      console.error('Error loading lecturer summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const schoolFilterOptions = useMemo(() => {
    const fromReports = reports.map((report) => report.school);
    return Array.from(new Set([...schoolOptions, ...fromReports])).sort();
  }, [schoolOptions, reports]);

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

  const showSchoolColumn = selectedSchool === 'All';

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Lecturer Summary Reports</h2>
          <p className="text-gray-500">Summary by lecturer, class, and course unit (matching 2.csv format)</p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
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
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-[250px]">
              <SelectValue placeholder="Filter by School" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Schools</SelectItem>
              {schoolFilterOptions.map((school) => (
                <SelectItem key={school} value={school}>
                  {school}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={handleExport} disabled={tableRows.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Lecturer Summary</CardTitle>
          <CardDescription>
            {selectedSchool === 'All'
              ? 'Lecturer teaching summary across all schools'
              : `Lecturer teaching summary for ${selectedSchool}`}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading lecturer summaries...</div>
          ) : tableRows.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No lecturer summary reports available.</div>
          ) : (
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    {showSchoolColumn && <TableHead>SCHOOL</TableHead>}
                    <TableHead>LECTURER&apos;S NAME</TableHead>
                    <TableHead>CLASS</TableHead>
                    <TableHead>COURSE UNIT</TableHead>
                    <TableHead className="text-right">NO. TAUGHT</TableHead>
                    <TableHead className="text-right">NO. MISSED BY LECTURERS</TableHead>
                    <TableHead>COMMENT IF ANY</TableHead>
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
                      <TableCell className="text-right">{row.noMissedByLecturers}</TableCell>
                      <TableCell>{row.commentIfAny || ''}</TableCell>
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
