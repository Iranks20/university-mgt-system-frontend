import React, { useEffect, useMemo, useState } from 'react';
import { ArrowDown, ArrowUp } from 'lucide-react';
import { toast } from 'sonner';
import { AttendanceStatusSelect } from '@/components/AttendanceStatusSelect';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { academicService, enrollmentService, studentService } from '@/services';

export type SessionAttendanceTarget = {
  classId: string;
  date: string;
  className: string;
};

type EnrollmentRow = {
  studentId: string;
  student?: {
    firstName?: string;
    lastName?: string;
    studentNumber?: string;
    programIntakeId?: string | null;
  };
};

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  target: SessionAttendanceTarget | null;
  onSaved?: () => void;
};

function studentName(enr: EnrollmentRow) {
  const student = enr.student;
  return student
    ? `${student.firstName || ''} ${student.lastName || ''}`.trim() || '—'
    : '—';
}

function studentNumber(enr: EnrollmentRow) {
  return enr.student?.studentNumber?.trim() || '—';
}

export function SessionAttendanceDialog({ open, onOpenChange, target, onSaved }: Props) {
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [classOptions, setClassOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selectedClassIds, setSelectedClassIds] = useState<string[]>([]);
  const [cohortOptions, setCohortOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [selectedCohortIds, setSelectedCohortIds] = useState<string[]>([]);
  const [enrollmentsAll, setEnrollmentsAll] = useState<EnrollmentRow[]>([]);
  const [enrollments, setEnrollments] = useState<EnrollmentRow[]>([]);
  const [statusMap, setStatusMap] = useState<Record<string, string>>({});
  const [sortKey, setSortKey] = useState<'name' | 'studentNumber'>('name');
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  useEffect(() => {
    if (!open || !target?.classId) return;

    let cancelled = false;
    const bootstrap = async () => {
      setLoading(true);
      try {
        let options = [{ id: target.classId, name: target.className }];
        let classIds = [target.classId];
        let cohorts: Array<{ id: string; label: string }> = [];
        try {
          const scope = await academicService.getClassesRelatedForAttendance(target.classId);
          if (scope.classes.length > 0) {
            options = scope.classes.map((r) => ({
              id: r.id,
              name: r.label?.trim() || r.name || target.className,
            }));
            classIds = options.map((o) => o.id);
          }
          cohorts = scope.cohortIntakes || [];
        } catch {
          options = [{ id: target.classId, name: target.className }];
          classIds = [target.classId];
          cohorts = [];
        }
        if (cancelled) return;
        setClassOptions(options);
        setSelectedClassIds(classIds);
        setCohortOptions(cohorts);
        setSelectedCohortIds(cohorts.map((c) => c.id));
        setStatusMap({});
        setSortKey('name');
        setSortDirection('asc');
      } finally {
        if (!cancelled) setLoading(false);
      }
    };
    bootstrap();
    return () => {
      cancelled = true;
    };
  }, [open, target?.classId, target?.className, target?.date]);

  useEffect(() => {
    if (!open || !target || selectedClassIds.length === 0) return;
    let cancelled = false;
    setLoading(true);
    Promise.all(
      selectedClassIds.map((classId) =>
        Promise.all([
          enrollmentService.getClassEnrollments(classId, { roster: true }),
          studentService.getSessionAttendance(classId, target.date),
        ])
      )
    )
      .then((results) => {
        if (cancelled) return;
        const rosterMap = new Map<string, EnrollmentRow>();
        const map: Record<string, string> = {};
        results.forEach(([list, existing]) => {
          ((list as EnrollmentRow[]) || []).forEach((enr) => {
            if (enr?.studentId && !rosterMap.has(enr.studentId)) {
              rosterMap.set(enr.studentId, enr);
            }
          });
          (existing || []).forEach((a: any) => {
            if (a?.studentId && a?.status && !map[a.studentId]) {
              map[a.studentId] = a.status;
            }
          });
        });
        setEnrollmentsAll([...rosterMap.values()]);
        setStatusMap(map);
      })
      .catch(() => {
        if (cancelled) return;
        toast.error("Couldn't load the class list. Please try again.");
        setEnrollmentsAll([]);
        setStatusMap({});
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [open, target, selectedClassIds]);

  useEffect(() => {
    if (!open) return;
    if (cohortOptions.length <= 1) {
      setEnrollments(enrollmentsAll);
      return;
    }
    const allowed = new Set(
      selectedCohortIds.length > 0 ? selectedCohortIds : cohortOptions.map((c) => c.id)
    );
    setEnrollments(
      enrollmentsAll.filter((enr) => {
        const intakeId = enr.student?.programIntakeId;
        if (!intakeId) return false;
        return allowed.has(intakeId);
      })
    );
  }, [open, enrollmentsAll, cohortOptions, selectedCohortIds]);

  const sortedEnrollments = useMemo(() => {
    return [...enrollments].sort((a, b) => {
      const cmp =
        sortKey === 'studentNumber'
          ? studentNumber(a).localeCompare(studentNumber(b), undefined, {
              sensitivity: 'base',
              numeric: true,
            })
          : studentName(a).localeCompare(studentName(b), undefined, { sensitivity: 'base' });
      return sortDirection === 'asc' ? cmp : -cmp;
    });
  }, [enrollments, sortDirection, sortKey]);

  const onSort = (key: 'name' | 'studentNumber') => {
    if (sortKey === key) {
      setSortDirection((d) => (d === 'asc' ? 'desc' : 'asc'));
      return;
    }
    setSortKey(key);
    setSortDirection('asc');
  };

  const setAllStatus = (status: string) => {
    if (enrollments.length === 0) return;
    const next: Record<string, string> = {};
    enrollments.forEach((enr) => {
      if (enr?.studentId) next[enr.studentId] = status;
    });
    setStatusMap(next);
  };

  const handleClose = (nextOpen: boolean) => {
    onOpenChange(nextOpen);
    if (!nextOpen) {
      setClassOptions([]);
      setSelectedClassIds([]);
      setCohortOptions([]);
      setSelectedCohortIds([]);
      setEnrollmentsAll([]);
      setEnrollments([]);
      setStatusMap({});
    }
  };

  const handleSubmit = async () => {
    if (!target || enrollments.length === 0) return;
    const payload = enrollments
      .filter((e) => Boolean(statusMap[e.studentId]))
      .map((e) => ({
        studentId: e.studentId,
        status: statusMap[e.studentId],
      }));
    if (payload.length === 0) {
      toast.warning('Mark at least one student before saving. Unmarked students are not saved as Absent.');
      return;
    }
    setSaving(true);
    try {
      const result = await studentService.createSessionAttendance({
        classId: target.classId,
        classIds: selectedClassIds,
        date: target.date,
        records: payload,
      });
      const saved = result?.count ?? 0;
      const skipped = Math.max(0, payload.length - saved);
      if (skipped > 0) {
        toast.success('Attendance saved.', {
          description: `${saved} student${saved === 1 ? '' : 's'} recorded · ${skipped} not in this class.`,
        });
      } else {
        toast.success('Attendance saved.', {
          description: `${saved} student${saved === 1 ? '' : 's'} recorded.`,
        });
      }
      handleClose(false);
      onSaved?.();
    } catch (err: any) {
      toast.error(err?.message || "Couldn't save attendance. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="w-[96vw] max-w-6xl max-h-[92vh] flex flex-col p-0 gap-0">
        <DialogHeader className="px-6 pt-6 pb-3 border-b">
          <DialogTitle>Record student attendance</DialogTitle>
          <DialogDescription>
            {target ? `${target.className} — ${target.date}` : ''}
            {' · '}Only explicitly marked students are saved. Unmarked students are not recorded as Absent.
          </DialogDescription>
        </DialogHeader>
        {loading ? (
          <div className="py-10 text-center text-muted-foreground">Loading students…</div>
        ) : (
          <>
            {(cohortOptions.length > 1 || classOptions.length > 1) && (
              <div className="px-6 py-3 border-b bg-muted/30 space-y-3">
                {cohortOptions.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Combined cohort intakes (select programs to include)
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-auto">
                      {cohortOptions.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedCohortIds.includes(opt.id)}
                            onCheckedChange={(v: boolean | 'indeterminate') => {
                              setSelectedCohortIds((prev) => {
                                const next = new Set(prev);
                                if (v === true) next.add(opt.id);
                                else next.delete(opt.id);
                                if (next.size === 0) return cohortOptions.map((c) => c.id);
                                return [...next];
                              });
                            }}
                          />
                          <span>{opt.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
                {classOptions.length > 1 && (
                  <div className="space-y-2">
                    <p className="text-xs font-medium text-muted-foreground">
                      Include related classes for combined attendance
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-36 overflow-auto">
                      {classOptions.map((opt) => (
                        <label key={opt.id} className="flex items-center gap-2 text-sm">
                          <Checkbox
                            checked={selectedClassIds.includes(opt.id)}
                            onCheckedChange={(v: boolean | 'indeterminate') => {
                              setSelectedClassIds((prev) => {
                                const next = new Set(prev);
                                if (v === true) next.add(opt.id);
                                else next.delete(opt.id);
                                if (next.size === 0) next.add(target?.classId || opt.id);
                                return [...next];
                              });
                            }}
                          />
                          <span>{opt.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
            {enrollments.length > 0 && (
              <div className="flex flex-wrap items-center justify-between gap-3 border-b bg-muted/30 px-6 py-3 text-sm">
                <span className="text-muted-foreground">
                  {enrollments.length} student{enrollments.length === 1 ? '' : 's'} in selected{' '}
                  {cohortOptions.length > 1 ? 'cohort' : 'class'} scope
                  {Object.keys(statusMap).length > 0 && (
                    <>
                      {' '}
                      · <span className="text-foreground font-medium">{Object.keys(statusMap).length}</span>{' '}
                      already marked
                    </>
                  )}
                </span>
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-muted-foreground">Mark all:</span>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-green-600 text-green-700 hover:bg-green-50"
                    onClick={() => setAllStatus('Present')}
                  >
                    Present
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-red-600 text-red-700 hover:bg-red-50"
                    onClick={() => setAllStatus('Absent')}
                  >
                    Absent
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-amber-600 text-amber-700 hover:bg-amber-50"
                    onClick={() => setAllStatus('Late')}
                  >
                    Late
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    className="h-7 border-blue-600 text-blue-700 hover:bg-blue-50"
                    onClick={() => setAllStatus('Excused')}
                  >
                    Excused
                  </Button>
                </div>
              </div>
            )}
            <div className="overflow-auto flex-1 min-h-0">
              <Table>
                <TableHeader className="sticky top-0 bg-background z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center">#</TableHead>
                    <TableHead>
                      <button
                        type="button"
                        onClick={() => onSort('name')}
                        disabled={enrollments.length === 0}
                        className="inline-flex items-center gap-1 font-medium hover:text-[#015F2B] disabled:opacity-50 -ml-1 px-1 py-0.5 rounded"
                      >
                        Student
                        {enrollments.length > 0 && sortKey === 'name' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                    <TableHead className="w-40">
                      <button
                        type="button"
                        onClick={() => onSort('studentNumber')}
                        disabled={enrollments.length === 0}
                        className="inline-flex items-center gap-1 font-medium hover:text-[#015F2B] disabled:opacity-50 -ml-1 px-1 py-0.5 rounded"
                      >
                        Student number
                        {enrollments.length > 0 && sortKey === 'studentNumber' ? (
                          sortDirection === 'asc' ? (
                            <ArrowUp className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          ) : (
                            <ArrowDown className="h-3.5 w-3.5 text-[#015F2B]" aria-hidden />
                          )
                        ) : null}
                      </button>
                    </TableHead>
                    <TableHead className="w-44">Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {enrollments.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="text-center py-8 text-muted-foreground">
                        No students in this class yet.
                      </TableCell>
                    </TableRow>
                  ) : (
                    sortedEnrollments.map((enr, idx) => {
                      const rawStatus = statusMap[enr.studentId];
                      const status: 'Present' | 'Absent' | 'Late' | 'Excused' | null =
                        rawStatus === 'Present' ||
                        rawStatus === 'Absent' ||
                        rawStatus === 'Late' ||
                        rawStatus === 'Excused'
                          ? rawStatus
                          : null;
                      return (
                        <TableRow key={enr.studentId}>
                          <TableCell className="text-center text-xs text-muted-foreground">{idx + 1}</TableCell>
                          <TableCell className="font-medium">{studentName(enr)}</TableCell>
                          <TableCell className="text-muted-foreground">{studentNumber(enr)}</TableCell>
                          <TableCell>
                            <AttendanceStatusSelect
                              value={status}
                              allowUnset
                              includeExcused
                              onValueChange={(v) =>
                                setStatusMap((prev) => ({ ...prev, [enr.studentId]: v }))
                              }
                              triggerClassName="w-full"
                            />
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>
            </div>
            <DialogFooter className="px-6 py-3 border-t">
              <Button type="button" variant="outline" onClick={() => handleClose(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSubmit}
                disabled={saving || enrollments.length === 0}
                className="bg-[#015F2B] hover:bg-[#014022]"
              >
                {saving ? 'Saving…' : 'Save attendance'}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
