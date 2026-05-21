import React, { useEffect, useMemo, useState } from 'react';
import { Download, Filter, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { academicService, studentService } from '@/services';
import { exportWeeklyAttendanceMatrixReport } from '@/utils/excel';
import type { WeeklyAttendanceMatrixReport } from '@/types/student';
import { toast } from 'sonner';

const ALL_VALUE = '__all__';
const YEAR_OPTIONS = [1, 2, 3, 4, 5] as const;
const SEMESTER_OPTIONS = [1, 2] as const;

const DAY_HEADER_CLASS: Record<number, string> = {
  0: 'bg-gray-100',
  1: 'bg-blue-100 text-blue-900',
  2: 'bg-orange-100 text-orange-900',
  3: 'bg-green-100 text-green-900',
  4: 'bg-yellow-100 text-yellow-900',
  5: 'bg-pink-100 text-pink-900',
  6: 'bg-sky-100 text-sky-900',
};

const DAY_CELL_CLASS: Record<number, string> = {
  0: 'bg-gray-50',
  1: 'bg-blue-50/80',
  2: 'bg-orange-50/80',
  3: 'bg-green-50/80',
  4: 'bg-yellow-50/80',
  5: 'bg-pink-50/80',
  6: 'bg-sky-50/80',
};

interface WeeklyAttendanceMatrixPanelProps {
  schools: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; code: string; departmentId: string }>;
  programToSchoolMap: Map<string, string>;
  generatedBy?: string;
}

export default function WeeklyAttendanceMatrixPanel({
  schools,
  programs,
  programToSchoolMap,
  generatedBy,
}: WeeklyAttendanceMatrixPanelProps) {
  const [selectedSchool, setSelectedSchool] = useState(ALL_VALUE);
  const [selectedProgramId, setSelectedProgramId] = useState(ALL_VALUE);
  const [selectedYear, setSelectedYear] = useState(ALL_VALUE);
  const [selectedSemester, setSelectedSemester] = useState(ALL_VALUE);
  const [selectedIntakeId, setSelectedIntakeId] = useState(ALL_VALUE);
  const [intakes, setIntakes] = useState<
    Array<{ id: string; year: number; semester: number; intakeType: string }>
  >([]);
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 6);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => new Date().toISOString().slice(0, 10));
  const [report, setReport] = useState<WeeklyAttendanceMatrixReport | null>(null);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);

  const filteredPrograms = useMemo(() => {
    if (selectedSchool === ALL_VALUE) return programs;
    return programs.filter((p) => programToSchoolMap.get(p.id) === selectedSchool);
  }, [programs, selectedSchool, programToSchoolMap]);

  useEffect(() => {
    if (selectedProgramId === ALL_VALUE) {
      setIntakes([]);
      setSelectedIntakeId(ALL_VALUE);
      return;
    }
    const year = selectedYear !== ALL_VALUE ? Number(selectedYear) : undefined;
    const semester = selectedSemester !== ALL_VALUE ? Number(selectedSemester) : undefined;
    academicService
      .getProgramIntakes({ programId: selectedProgramId, year, semester })
      .then((list) => setIntakes(Array.isArray(list) ? list : []))
      .catch(() => setIntakes([]));
  }, [selectedProgramId, selectedYear, selectedSemester]);

  const loadReport = async () => {
    if (selectedIntakeId === ALL_VALUE) {
      toast.error('Select a class cohort first.');
      return;
    }
    if (!dateFrom || !dateTo) {
      toast.error('Select a week date range.');
      return;
    }
    setLoading(true);
    try {
      const data = await studentService.getWeeklyAttendanceMatrixReport({
        programIntakeId: selectedIntakeId,
        startDate: dateFrom,
        endDate: dateTo,
      });
      setReport(data);
      if (!data?.students.length) {
        toast.info('No students in this cohort for the selected period.');
      }
    } catch (e: any) {
      setReport(null);
      toast.error(e?.message || 'Failed to load weekly matrix report.');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = () => {
    if (!report?.students.length) {
      toast.warning('Generate the report first.');
      return;
    }
    setExporting(true);
    try {
      exportWeeklyAttendanceMatrixReport(report, {
        generatedBy,
        poweredBy: 'KCU ERP System',
      });
      toast.success('Excel report downloaded');
    } catch {
      toast.error('Export failed');
    } finally {
      setExporting(false);
    }
  };

  const slotDayMap = useMemo(() => {
    const map = new Map<string, number>();
    if (report) {
      for (const slot of report.slots) {
        map.set(slot.classId, slot.dayOfWeek);
      }
    }
    return map;
  }, [report]);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{report?.title ?? 'Weekly attendance matrix (Excel style)'}</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-wrap items-end gap-3 rounded-md border p-3 bg-muted/30">
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 mb-2" />
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">School</Label>
            <Select
              value={selectedSchool}
              onValueChange={(v) => {
                setSelectedSchool(v);
                setSelectedProgramId(ALL_VALUE);
                setSelectedIntakeId(ALL_VALUE);
              }}
            >
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All schools</SelectItem>
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Programme</Label>
            <Select
              value={selectedProgramId}
              onValueChange={(v) => {
                setSelectedProgramId(v);
                setSelectedIntakeId(ALL_VALUE);
              }}
            >
              <SelectTrigger className="w-[200px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Select programme</SelectItem>
                {filteredPrograms.map((p) => (
                  <SelectItem key={p.id} value={p.id}>{p.name || p.code}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Year</Label>
            <Select value={selectedYear} onValueChange={setSelectedYear}>
              <SelectTrigger className="w-[90px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All</SelectItem>
                {YEAR_OPTIONS.map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Semester</Label>
            <Select value={selectedSemester} onValueChange={setSelectedSemester}>
              <SelectTrigger className="w-[100px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>All</SelectItem>
                {SEMESTER_OPTIONS.map((s) => (
                  <SelectItem key={s} value={String(s)}>{s}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Cohort</Label>
            <Select
              value={selectedIntakeId}
              onValueChange={setSelectedIntakeId}
              disabled={selectedProgramId === ALL_VALUE}
            >
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value={ALL_VALUE}>Select cohort</SelectItem>
                {intakes.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.year}.{i.semester} · {i.intakeType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Week from</Label>
            <Input type="date" className="w-[150px]" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">Week to</Label>
            <Input type="date" className="w-[150px]" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
          <Button variant="outline" onClick={() => {
            setSelectedSchool(ALL_VALUE);
            setSelectedProgramId(ALL_VALUE);
            setSelectedYear(ALL_VALUE);
            setSelectedSemester(ALL_VALUE);
            setSelectedIntakeId(ALL_VALUE);
            setReport(null);
          }}>
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
          <Button
            className="bg-[#015F2B] hover:bg-[#014022]"
            onClick={loadReport}
            disabled={loading || selectedIntakeId === ALL_VALUE}
          >
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Loading…
              </>
            ) : (
              'Generate report'
            )}
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={exporting || !report?.students.length}>
            <Download className="mr-2 h-4 w-4" />
            {exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        </div>

        {report && (
          <p className="text-sm text-muted-foreground">
            {report.weekRangeLabel} · {report.totals.studentCount} students · {report.totals.slotCount} course columns
            · 1 = present/late, 0 = absent/none
          </p>
        )}

        <div className="rounded-md border overflow-x-auto max-h-[70vh]">
          <Table>
            <TableHeader>
              {report && report.dayGroups.length > 0 && (
                <TableRow>
                  <TableHead colSpan={3} className="sticky left-0 z-20 bg-background" />
                  {report.dayGroups.map((group) => (
                    <TableHead
                      key={group.dayOfWeek}
                      colSpan={group.slots.length}
                      className={`text-center text-xs font-bold uppercase ${DAY_HEADER_CLASS[group.dayOfWeek] ?? 'bg-gray-100'}`}
                    >
                      {group.dayLabel}
                    </TableHead>
                  ))}
                  <TableHead colSpan={2} className="text-center bg-gray-100 font-bold">
                    Summary
                  </TableHead>
                </TableRow>
              )}
              <TableRow>
                <TableHead className="sticky left-0 z-20 bg-background w-12">No.</TableHead>
                <TableHead className="sticky left-12 z-20 bg-background min-w-[160px]">Student Name</TableHead>
                <TableHead className="sticky left-[172px] z-20 bg-background min-w-[130px]">Reg. No.</TableHead>
                {report?.slots.map((slot) => (
                  <TableHead
                    key={slot.classId}
                    className={`text-center text-[10px] min-w-[72px] align-bottom ${DAY_CELL_CLASS[slot.dayOfWeek] ?? ''}`}
                  >
                    <span className="block font-medium leading-tight">{slot.courseName}</span>
                    <span className="text-muted-foreground">{slot.dayShort}</span>
                  </TableHead>
                ))}
                <TableHead className="text-center bg-gray-50 font-bold">TOTALS</TableHead>
                <TableHead className="text-center bg-gray-50 font-bold">EXPECTED</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {!report ? (
                <TableRow>
                  <TableCell colSpan={20} className="text-center py-8 text-muted-foreground">
                    Select cohort and week range, then generate the report.
                  </TableCell>
                </TableRow>
              ) : report.students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={3 + report.slots.length + 2} className="text-center py-8 text-muted-foreground">
                    No students in cohort.
                  </TableCell>
                </TableRow>
              ) : (
                report.students.map((row) => (
                  <TableRow key={row.studentId}>
                    <TableCell className="sticky left-0 z-10 bg-background text-muted-foreground">{row.serialNo}</TableCell>
                    <TableCell className="sticky left-12 z-10 bg-background font-medium whitespace-nowrap">{row.studentName}</TableCell>
                    <TableCell className="sticky left-[172px] z-10 bg-background text-sm whitespace-nowrap">{row.registrationNumber}</TableCell>
                    {report.slots.map((slot) => {
                      const value = row.cells[slot.classId]?.value ?? 0;
                      const dow = slotDayMap.get(slot.classId) ?? 0;
                      return (
                        <TableCell
                          key={slot.classId}
                          className={`text-center font-bold ${DAY_CELL_CLASS[dow] ?? ''} ${value === 1 ? 'text-[#015F2B]' : 'text-red-700'}`}
                        >
                          {value}
                        </TableCell>
                      );
                    })}
                    <TableCell className="text-center font-bold bg-gray-50">{row.totalAttended}</TableCell>
                    <TableCell className="text-center font-bold bg-gray-50">{row.expected}</TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  );
}
