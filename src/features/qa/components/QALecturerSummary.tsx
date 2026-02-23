/**
 * QA Lecturer Summary Component
 * Matches 2.csv format: LECTURER'S NAME, CLASS, COURSE UNIT, NO. TAUGHT, NO. MISSED BY LECTURERS, COMMENT IF ANY
 */

import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Download } from 'lucide-react';
import { qaService } from '@/services/qa.service';
import { exportLecturerSummaryReport } from '@/utils/excel';
import type { QALecturerSummaryReport } from '@/types/qa';

type DateRangeKey = 'all' | 'last_30_days' | 'this_term';

export function QALecturerSummary() {
  const [reports, setReports] = useState<QALecturerSummaryReport[]>([]);
  const [selectedSchool, setSelectedSchool] = useState<string>('All');
  const [dateRangeKey, setDateRangeKey] = useState<DateRangeKey>('all');
  const [isLoading, setIsLoading] = useState(true);

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
    loadReports();
  }, [selectedSchool, dateRangeKey]);

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

  const filteredReports = selectedSchool === 'All' 
    ? reports 
    : reports.filter(r => r.school === selectedSchool);

  const uniqueSchools = Array.from(new Set(reports.map(r => r.school))).sort();

  const handleExport = (report: QALecturerSummaryReport) => {
    exportLecturerSummaryReport(report);
  };

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
              {uniqueSchools.map(school => (
                <SelectItem key={school} value={school}>{school}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {isLoading ? (
        <Card>
          <CardContent className="py-8 text-center">
            Loading lecturer summaries...
          </CardContent>
        </Card>
      ) : filteredReports.length === 0 ? (
        <Card>
          <CardContent className="py-8 text-center text-gray-500">
            No lecturer summary reports available.
          </CardContent>
        </Card>
      ) : (
        filteredReports.map((report, reportIndex) => (
          <Card key={reportIndex}>
            <CardHeader>
              <div className="flex justify-between items-center">
                <div>
                  <CardTitle>{report.school}</CardTitle>
                  <CardDescription>
                    {report.lecturers.length} lecturers
                  </CardDescription>
                </div>
                <Button variant="outline" size="sm" onClick={() => handleExport(report)}>
                  <Download className="mr-2 h-4 w-4" />
                  Export Excel
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>LECTURER'S NAME</TableHead>
                      <TableHead>CLASS</TableHead>
                      <TableHead>COURSE UNIT</TableHead>
                      <TableHead className="text-right">NO. TAUGHT</TableHead>
                      <TableHead className="text-right">NO. MISSED BY LECTURERS</TableHead>
                      <TableHead>COMMENT IF ANY</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {report.lecturers.map((lecturer, index) => (
                      <React.Fragment key={index}>
                        <TableRow>
                          <TableCell className="font-medium">{lecturer.lecturerName}</TableCell>
                          <TableCell>{lecturer.class}</TableCell>
                          <TableCell className="max-w-xs truncate">{lecturer.courseUnit}</TableCell>
                          <TableCell className="text-right">{lecturer.noTaught}</TableCell>
                          <TableCell className="text-right">{lecturer.noMissedByLecturers}</TableCell>
                          <TableCell>{lecturer.commentIfAny || ''}</TableCell>
                        </TableRow>
                        {/* Add blank row after each lecturer (except the last one) */}
                        {index < report.lecturers.length - 1 && (
                          <TableRow>
                            <TableCell colSpan={6} className="h-2"></TableCell>
                          </TableRow>
                        )}
                      </React.Fragment>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        ))
      )}
    </div>
  );
}
