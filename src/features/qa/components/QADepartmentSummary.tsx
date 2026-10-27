import React, { useEffect, useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Combobox } from '@/components/ui/combobox';
import { Input } from '@/components/ui/input';
import { Download } from 'lucide-react';
import { qaService } from '@/services/qa.service';
import { exportDepartmentSummaryReport } from '@/utils/excel';
import type { QADepartmentSummary } from '@/types/qa';
import { TimetableTotalsCells, TimetableTotalsFooterCells, TimetableTotalsHeaderCells } from './TimetableTotalsCells';

const ALL = 'All';

type QADepartmentSummaryProps = {
  scopedDateRange?: { dateFrom: string; dateTo: string };
};

export function QADepartmentSummary({ scopedDateRange }: QADepartmentSummaryProps) {
  const [summaries, setSummaries] = useState<QADepartmentSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [schoolOptions, setSchoolOptions] = useState<string[]>([]);
  const [selectedSchool, setSelectedSchool] = useState(ALL);

  const getDateParams = (): { dateFrom?: string; dateTo?: string } | undefined => {
    const from = dateFrom.trim() || undefined;
    const to = dateTo.trim() || undefined;
    if (!from && !to) return undefined;
    return { dateFrom: from, dateTo: to };
  };

  const getDateRangeLabel = () => {
    const from = dateFrom.trim();
    const to = dateTo.trim();
    if (from && to) return `${from} to ${to}`;
    if (from) return `From ${from}`;
    if (to) return `Until ${to}`;
    return 'All time';
  };

  useEffect(() => {
    qaService
      .getSchools()
      .then((schools) => setSchoolOptions(schools))
      .catch(() => setSchoolOptions([]));
  }, []);

  useEffect(() => {
    if (!scopedDateRange) return;
    setDateFrom(scopedDateRange.dateFrom);
    setDateTo(scopedDateRange.dateTo);
  }, [scopedDateRange?.dateFrom, scopedDateRange?.dateTo]);

  useEffect(() => {
    loadSummaries();
  }, [dateFrom, dateTo, scopedDateRange?.dateFrom, scopedDateRange?.dateTo, selectedSchool]);

  const loadSummaries = async () => {
    setIsLoading(true);
    try {
      const params = getDateParams();
      const data = await qaService.getDepartmentSummaryReport({
        ...params,
        ...(selectedSchool !== ALL ? { school: selectedSchool } : {}),
      });
      setSummaries(data);
    } catch (error) {
      console.error('Error loading department summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    exportDepartmentSummaryReport(summaries);
  };

  const sum = (pick: (s: QADepartmentSummary) => number) => summaries.reduce((acc, s) => acc + pick(s), 0);

  const schoolComboboxOptions = useMemo(
    () => [{ value: ALL, label: 'All Schools' }, ...schoolOptions.map((school) => ({ value: school, label: school }))],
    [schoolOptions]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Department Summary Report</h2>
          <p className="text-gray-500">
            Summary by department with untaught breakdown
            {dateFrom || dateTo ? ` · ${getDateRangeLabel()}` : ''}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date from</label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(e) => setDateFrom(e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <label className="text-xs font-medium text-muted-foreground">Date to</label>
            <Input
              type="date"
              className="w-[150px]"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(e) => setDateTo(e.target.value)}
            />
          </div>
          {dateFrom || dateTo ? (
            <Button
              variant="ghost"
              size="sm"
              className="mb-0.5"
              onClick={() => {
                setDateFrom('');
                setDateTo('');
              }}
            >
              Clear dates
            </Button>
          ) : null}
          <Combobox
            className="w-[240px]"
            options={schoolComboboxOptions}
            value={selectedSchool}
            onValueChange={(value) => setSelectedSchool(value || ALL)}
            placeholder="School"
            searchPlaceholder="Search schools..."
            emptyText="No school found."
            initialDisplayCount={50}
          />
          <Button
            variant="outline"
            className="gap-2 border-[#015F2B] bg-emerald-50 text-[#015F2B] hover:bg-[#015F2B] hover:text-white"
            onClick={handleExport}
          >
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Department Summary</CardTitle>
          <CardDescription>
            Total lectures taught vs untaught by department, with timetable expected sessions and hours
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">Loading department summaries...</div>
          ) : summaries.length === 0 ? (
            <div className="py-8 text-center text-gray-500">No department summary data for the selected filters.</div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SCHOOL</TableHead>
                    <TableHead>DEPARTMENT</TableHead>
                    <TimetableTotalsHeaderCells ttExpectedFirst />
                    <TableHead className="text-right whitespace-nowrap">NO. TAUGHT</TableHead>
                    <TableHead className="text-right whitespace-nowrap">PHYSICAL</TableHead>
                    <TableHead className="text-right whitespace-nowrap">ONLINE</TableHead>
                    <TableHead className="text-right whitespace-nowrap">SDL</TableHead>
                    <TableHead className="text-right whitespace-nowrap">ASSIGNMENT</TableHead>
                    <TableHead className="text-right whitespace-nowrap">MISS. LECT.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">MISS. STUD.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">MISS. OTHER</TableHead>
                    <TableHead className="text-right whitespace-nowrap">LEARNING ACT.</TableHead>
                    <TableHead className="text-right whitespace-nowrap">TOTAL UNTAUGHT</TableHead>
                    <TableHead className="text-right whitespace-nowrap">TOTAL MISSED</TableHead>
                    <TableHead className="text-right whitespace-nowrap">SUBSTITUTED</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summaries.map((summary, index) => (
                    <TableRow key={`${summary.school}-${summary.department}-${index}`}>
                      <TableCell className="font-medium">{summary.school}</TableCell>
                      <TableCell className="font-medium">{summary.department}</TableCell>
                      <TimetableTotalsCells
                        row={summary}
                        recordedExpected={summary.totalNoTaught + summary.noUntaught}
                        ttExpectedFirst
                      />
                      <TableCell className="text-right">{summary.totalNoTaught}</TableCell>
                      <TableCell className="text-right">{summary.physicalClasses ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.onlineLectures ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.noSdl ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.assignment ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.missedByLecturer ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.missedByStudents ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.missedOtherProgramsHolidays ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.totalLearningActivity ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.noUntaught}</TableCell>
                      <TableCell className="text-right">{summary.totalMissed ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.noSubstituted ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-gray-50">
                    <TableCell colSpan={2}>TOTAL</TableCell>
                    <TimetableTotalsFooterCells
                      rows={summaries}
                      recordedExpected={sum((s) => s.totalNoTaught + s.noUntaught)}
                      ttExpectedFirst
                    />
                    <TableCell className="text-right">{sum((s) => s.totalNoTaught)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.physicalClasses ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.onlineLectures ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.noSdl ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.assignment ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.missedByLecturer ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.missedByStudents ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.missedOtherProgramsHolidays ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.totalLearningActivity ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.noUntaught)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.totalMissed ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.noSubstituted ?? 0)}</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
