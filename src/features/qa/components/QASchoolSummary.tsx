/**
 * QA School Summary Component
 * Matches 1.csv format: SCHOOL, TOTAL NO. TAUGHT, NO. UNTAIGHT (preserving typo)
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { qaService } from '@/services/qa.service';
import { exportSchoolSummaryReport } from '@/utils/excel';
import type { QASchoolSummary } from '@/types/qa';

type DateRangeKey = 'all' | 'last_30_days' | 'this_term';

export function QASchoolSummary() {
  const [summaries, setSummaries] = useState<QASchoolSummary[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('all');

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
    loadSummaries();
  }, [dateRangeKey]);

  const loadSummaries = async () => {
    setIsLoading(true);
    try {
      const params = getDateParams();
      const data = await qaService.getSchoolSummaryReport(params);
      setSummaries(data);
    } catch (error) {
      console.error('Error loading school summaries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleExport = () => {
    exportSchoolSummaryReport(summaries);
  };

  const sum = (pick: (s: QASchoolSummary) => number) => summaries.reduce((acc, s) => acc + pick(s), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">School Summary Report</h2>
          <p className="text-gray-500">Summary by school with untaught breakdown</p>
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
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Export Excel
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>School Summary</CardTitle>
          <CardDescription>
            Total lectures taught vs untaught (rollup) by school, with reason breakdown
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-8 text-center text-gray-500">
              Loading school summaries...
            </div>
          ) : (
            <div className="rounded-md border overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>SCHOOL</TableHead>
                    <TableHead className="text-right">TOTAL NO. TAUGHT</TableHead>
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
                  {summaries.map((summary, index) => (
                    <TableRow key={index}>
                      <TableCell className="font-medium">{summary.school}</TableCell>
                      <TableCell className="text-right">{summary.totalNoTaught}</TableCell>
                      <TableCell className="text-right">{summary.noUntaught}</TableCell>
                      <TableCell className="text-right">{summary.missedByLecturer ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.missedByStudents ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.missedOtherProgramsHolidays ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.assignment ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.noSdl ?? 0}</TableCell>
                      <TableCell className="text-right">{summary.noSubstituted ?? 0}</TableCell>
                    </TableRow>
                  ))}
                  <TableRow className="font-bold bg-gray-50">
                    <TableCell>TOTAL</TableCell>
                    <TableCell className="text-right">{sum((s) => s.totalNoTaught)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.noUntaught)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.missedByLecturer ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.missedByStudents ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.missedOtherProgramsHolidays ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.assignment ?? 0)}</TableCell>
                    <TableCell className="text-right">{sum((s) => s.noSdl ?? 0)}</TableCell>
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
