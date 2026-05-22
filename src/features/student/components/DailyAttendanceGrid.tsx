import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp, Calendar, Loader2, Save } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import {
  AttendanceStatusSelect,
  parseAttendanceStatus,
} from '@/components/AttendanceStatusSelect';
import { studentService } from '@/services';
import type { AttendanceStatus } from '@/lib/attendance-metrics';
import {
  sortDailyGridStudents,
  type StudentSortDirection,
  type StudentSortField,
} from '@/lib/attendance-metrics';
import type { DailyMarkingGrid } from '@/types/student';
import { toast } from 'sonner';
import { ProgramIntakeScopeFilter } from '@/components/ProgramIntakeScopeFilter';
import { useProgramIntakeScope } from '@/hooks/useProgramIntakeScope';

const BULK_STATUSES: AttendanceStatus[] = ['Present', 'Absent', 'Late'];

interface DailyAttendanceGridProps {
  schools: Array<{ id: string; name: string }>;
  programs: Array<{ id: string; name: string; code: string; departmentId: string }>;
  programToSchoolMap: Map<string, string>;
  onSaved?: () => void;
}

export default function DailyAttendanceGrid({
  schools,
  programs,
  programToSchoolMap,
  onSaved,
}: DailyAttendanceGridProps) {
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
  const [markDate, setMarkDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [grid, setGrid] = useState<DailyMarkingGrid | null>(null);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [cellMap, setCellMap] = useState<Record<string, AttendanceStatus>>({});
  const [studentSortField, setStudentSortField] = useState<StudentSortField>('studentName');
  const [studentSortDirection, setStudentSortDirection] = useState<StudentSortDirection>('asc');

  const cellKey = (studentId: string, classId: string) => `${studentId}|${classId}`;

  const loadGrid = useCallback(async () => {
    if (!intakeScope.isComplete) {
      toast.error('Select a class cohort (program intake) first.');
      return;
    }
    setLoading(true);
    try {
      const data = await studentService.getDailyMarkingGrid({
        programIntakeId: intakeScope.programIntakeId,
        date: markDate,
      });
      if (!data) {
        setGrid(null);
        setCellMap({});
        toast.warning('No data returned.');
        return;
      }
      setGrid(data);
      setStudentSortField('studentName');
      setStudentSortDirection('asc');
      const next: Record<string, AttendanceStatus> = {};
      for (const student of data.students) {
        for (const slot of data.slots) {
          const key = cellKey(student.studentId, slot.classId);
          next[key] = parseAttendanceStatus(student.attendance[slot.classId]);
        }
      }
      setCellMap(next);
      if (data.slots.length === 0) {
        toast.info(`No course units scheduled for ${data.dayName} in this cohort.`);
      }
    } catch (e: any) {
      setGrid(null);
      setCellMap({});
      toast.error(e?.message || 'Failed to load daily attendance grid.');
    } finally {
      setLoading(false);
    }
  }, [intakeScope.programIntakeId, intakeScope.isComplete, markDate]);

  const setCell = (studentId: string, classId: string, value: AttendanceStatus) => {
    setCellMap((prev) => ({ ...prev, [cellKey(studentId, classId)]: value }));
  };

  const setRowAll = (studentId: string, value: AttendanceStatus) => {
    if (!grid) return;
    setCellMap((prev) => {
      const next = { ...prev };
      for (const slot of grid.slots) {
        next[cellKey(studentId, slot.classId)] = value;
      }
      return next;
    });
  };

  const setColumnAll = (classId: string, value: AttendanceStatus) => {
    if (!grid) return;
    setCellMap((prev) => {
      const next = { ...prev };
      for (const student of grid.students) {
        next[cellKey(student.studentId, classId)] = value;
      }
      return next;
    });
  };

  const handleSave = async () => {
    if (!grid || !intakeScope.isComplete) return;
    const records: Array<{ studentId: string; classId: string; status: string }> = [];
    for (const student of grid.students) {
      for (const slot of grid.slots) {
        const value = cellMap[cellKey(student.studentId, slot.classId)] ?? 'Absent';
        records.push({
          studentId: student.studentId,
          classId: slot.classId,
          status: value,
        });
      }
    }
    if (records.length === 0) {
      toast.warning('Nothing to save.');
      return;
    }
    setSaving(true);
    try {
      const result = await studentService.saveDailyMarkingGrid({
        programIntakeId: intakeScope.programIntakeId,
        date: markDate,
        records,
      });
      toast.success(`Attendance saved for ${result.count} entries.`);
      onSaved?.();
      await loadGrid();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to save attendance.');
    } finally {
      setSaving(false);
    }
  };

  const resetFilters = () => {
    setMarkDate(new Date().toISOString().slice(0, 10));
    setGrid(null);
    setCellMap({});
    setStudentSortField('studentName');
    setStudentSortDirection('asc');
  };

  const sortedStudents = useMemo(() => {
    if (!grid) return [];
    return sortDailyGridStudents(grid.students, studentSortField, studentSortDirection);
  }, [grid, studentSortField, studentSortDirection]);

  const toggleStudentSort = (field: StudentSortField) => {
    if (studentSortField === field) {
      setStudentSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setStudentSortField(field);
      setStudentSortDirection('asc');
    }
  };

  const sortLabel =
    studentSortField === 'studentName'
      ? `Student name (${studentSortDirection === 'asc' ? 'A–Z' : 'Z–A'})`
      : `Reg. no. (${studentSortDirection === 'asc' ? 'A–Z' : 'Z–A'})`;

  return (
    <Card className="border-[#015F2B]/20">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Calendar className="h-5 w-5 text-[#015F2B]" />
          Daily bulk attendance
        </CardTitle>
        <CardDescription>
          Mark all students for every course unit on the selected day. Use Present, Absent, or Late for each cell.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <ProgramIntakeScopeFilter
          scope={intakeScope}
          intakeField="cohortList"
          programLabel="Programme"
          cohortLabel="Class / cohort"
          showReset
          onReset={resetFilters}
          trailing={
            <div className="space-y-1">
              <Label className="text-xs text-muted-foreground">Date</Label>
              <Input type="date" className="w-[150px] h-9" value={markDate} onChange={(e) => setMarkDate(e.target.value)} />
            </div>
          }
          actionButton={{
            label: 'Load grid',
            onClick: loadGrid,
            loading,
            disabled: !intakeScope.isComplete,
          }}
        />

        {grid && (
          <>
            <p className="text-sm text-muted-foreground">
              <span className="font-medium text-gray-900">{grid.programIntakeLabel}</span>
              {' · '}
              {grid.dayName} ({grid.date})
              {' · '}
              {grid.students.length} students · {grid.slots.length} course units · {sortLabel}
            </p>
            <div className="flex flex-wrap gap-2">
              <Button
                size="sm"
                variant="outline"
                className="text-[#015F2B] border-[#015F2B]/30"
                onClick={handleSave}
                disabled={saving || grid.slots.length === 0}
              >
                {saving ? (
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                ) : (
                  <Save className="mr-2 h-4 w-4" />
                )}
                Save all
              </Button>
            </div>
            <div className="rounded-md border overflow-x-auto max-h-[70vh]">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 z-20 bg-background w-12">No.</TableHead>
                    <TableHead className="sticky left-12 z-20 bg-background min-w-[180px]">
                      <button
                        type="button"
                        onClick={() => toggleStudentSort('studentName')}
                        disabled={!grid.students.length}
                        className="inline-flex items-center gap-1 font-medium hover:text-[#015F2B] disabled:opacity-50 -ml-1 px-1 py-0.5 rounded"
                      >
                        Student Name
                        {studentSortField === 'studentName' ? (
                          studentSortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                    <TableHead className="sticky left-[228px] z-20 bg-background min-w-[140px]">
                      <button
                        type="button"
                        onClick={() => toggleStudentSort('registrationNumber')}
                        disabled={!grid.students.length}
                        className="inline-flex items-center gap-1 font-medium hover:text-[#015F2B] disabled:opacity-50 -ml-1 px-1 py-0.5 rounded"
                      >
                        Reg. No.
                        {studentSortField === 'registrationNumber' ? (
                          studentSortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                    {grid.slots.map((slot) => (
                      <TableHead key={slot.classId} className="text-center min-w-[128px] align-bottom p-2">
                        <div className="space-y-1.5">
                          <span className="text-[10px] uppercase text-muted-foreground block">{slot.dayShort}</span>
                          <span className="text-xs font-medium leading-tight block">{slot.courseName}</span>
                          <Select onValueChange={(v) => setColumnAll(slot.classId, v as AttendanceStatus)}>
                            <SelectTrigger className="h-7 w-full text-[10px] mx-auto">
                              <SelectValue placeholder="Set all" />
                            </SelectTrigger>
                            <SelectContent>
                              {BULK_STATUSES.map((s) => (
                                <SelectItem key={s} value={s}>All {s}</SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </TableHead>
                    ))}
                    <TableHead className="text-center min-w-[120px] align-bottom">Set row</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {sortedStudents.map((student) => (
                    <TableRow key={student.studentId}>
                      <TableCell className="sticky left-0 z-10 bg-background font-medium text-muted-foreground">
                        {student.serialNo}
                      </TableCell>
                      <TableCell className="sticky left-12 z-10 bg-background font-medium whitespace-nowrap">
                        {student.studentName}
                      </TableCell>
                      <TableCell className="sticky left-[228px] z-10 bg-background text-sm whitespace-nowrap">
                        {student.registrationNumber}
                      </TableCell>
                      {grid.slots.map((slot) => (
                        <TableCell key={slot.classId} className="text-center p-1.5">
                          <AttendanceStatusSelect
                            value={cellMap[cellKey(student.studentId, slot.classId)] ?? 'Absent'}
                            onValueChange={(v) => setCell(student.studentId, slot.classId, v)}
                          />
                        </TableCell>
                      ))}
                      <TableCell className="text-center p-1.5">
                        <Select onValueChange={(v) => setRowAll(student.studentId, v as AttendanceStatus)}>
                          <SelectTrigger className="h-8 w-[112px] text-xs">
                            <SelectValue placeholder="Set all" />
                          </SelectTrigger>
                          <SelectContent>
                            {BULK_STATUSES.map((s) => (
                              <SelectItem key={s} value={s}>All {s}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
