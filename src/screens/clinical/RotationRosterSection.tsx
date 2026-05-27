import { useCallback, useEffect, useMemo, useState } from 'react';
import { Copy, UserPlus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { clinicalService } from '@/services/clinical.service';
import { ClinicalTableCard } from './ClinicalTableCard';

type RotationRow = {
  id: string;
  name: string;
  programId?: string | null;
  programIntakeId?: string | null;
  year?: number | null;
  semester?: number | null;
  intakeType?: string | null;
  cohort?: string | null;
};

type IntakeOption = {
  id: string;
  label: string;
  programId: string;
  year: number;
  semester: number;
  intakeType: string;
};

type ClassOption = {
  id: string;
  name: string;
  enrolledCount?: number;
  activeEnrolledCount?: number;
};

const COHORT_SCOPE = '__cohort__';

type RotationRosterSectionProps = {
  rotation: RotationRow | null;
  allRotations: RotationRow[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  canManage: boolean;
};

export function RotationRosterSection({ rotation, allRotations, open, onOpenChange, canManage }: RotationRosterSectionProps) {
  const [roster, setRoster] = useState<any[]>([]);
  const [intakes, setIntakes] = useState<IntakeOption[]>([]);
  const [classes, setClasses] = useState<ClassOption[]>([]);
  const [candidates, setCandidates] = useState<any[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [programIntakeId, setProgramIntakeId] = useState('');
  const [classId, setClassId] = useState(COHORT_SCOPE);
  const [cohortStudentCount, setCohortStudentCount] = useState(0);
  const [candidateSummary, setCandidateSummary] = useState<{
    total: number;
    canEnroll: number;
    onRotation: number;
    blocked: number;
  } | null>(null);
  const [loading, setLoading] = useState(false);
  const [enrollOpen, setEnrollOpen] = useState(false);
  const [copyOpen, setCopyOpen] = useState(false);
  const [copyTargetId, setCopyTargetId] = useState('');
  const [saving, setSaving] = useState(false);
  const [loadingCandidates, setLoadingCandidates] = useState(false);

  const copyTargets = allRotations.filter((r) => r.id !== rotation?.id);

  const rotationIntakeLabel = useMemo(() => {
    if (!rotation) return '';
    const parts = [
      rotation.cohort,
      rotation.year != null && rotation.semester != null ? `Y${rotation.year} · S${rotation.semester}` : null,
      rotation.intakeType,
    ].filter(Boolean);
    return parts.join(' · ') || 'Set program, year, and semester on the rotation';
  }, [rotation]);

  const loadRoster = useCallback(async () => {
    if (!rotation?.id) return;
    setLoading(true);
    try {
      const data = await clinicalService.getRotationRoster(rotation.id);
      setRoster(data);
    } catch (e: any) {
      toast.error(e?.message || 'Failed to load roster');
      setRoster([]);
    } finally {
      setLoading(false);
    }
  }, [rotation?.id]);

  const loadIntakes = useCallback(async () => {
    if (!rotation?.programId) {
      setIntakes([]);
      return;
    }
    try {
      const data = await clinicalService.getClinicalProgramIntakes({
        programId: rotation.programId,
        year: rotation.year ?? undefined,
        semester: rotation.semester ?? undefined,
        intakeType: (rotation.intakeType as 'Day' | 'Evening' | 'Weekend') ?? undefined,
      });
      setIntakes(data);
      if (rotation.programIntakeId && data.some((i) => i.id === rotation.programIntakeId)) {
        setProgramIntakeId(rotation.programIntakeId);
      } else if (data.length >= 1) {
        const match = data.find(
          (i) =>
            i.programId === rotation.programId &&
            i.year === rotation.year &&
            i.semester === rotation.semester &&
            i.intakeType === rotation.intakeType
        );
        setProgramIntakeId(match?.id ?? data[0].id);
      }
    } catch {
      setIntakes([]);
    }
  }, [rotation]);

  const loadClasses = useCallback(async (intakeId: string) => {
    if (!intakeId) {
      setClasses([]);
      setCohortStudentCount(0);
      return;
    }
    try {
      const res = await clinicalService.getClinicalClasses({ programIntakeId: intakeId, limit: 200 });
      setClasses(res.data);
      setCohortStudentCount(res.meta?.cohortStudentCount ?? 0);
    } catch {
      setClasses([]);
      setCohortStudentCount(0);
    }
  }, []);

  const loadCandidates = useCallback(async () => {
    if (!rotation?.id || !programIntakeId) {
      setCandidates([]);
      setCandidateSummary(null);
      return;
    }
    setLoadingCandidates(true);
    try {
      const res = await clinicalService.getEligibleStudents({
        page: 1,
        limit: 500,
        search: search.trim() || undefined,
        classId: classId !== COHORT_SCOPE ? classId : undefined,
        programIntakeId,
        clinicalRotationId: rotation.id,
        includeIneligible: true,
      });
      setCandidates(res.data);
      setCandidateSummary(res.meta?.summary ?? null);
    } catch {
      setCandidates([]);
      setCandidateSummary(null);
    } finally {
      setLoadingCandidates(false);
    }
  }, [rotation?.id, classId, programIntakeId, search]);

  const enrollableCandidates = useMemo(() => candidates.filter((s) => s.canEnroll), [candidates]);

  useEffect(() => {
    if (open && rotation) {
      loadRoster();
      setSelected(new Set());
    }
  }, [open, rotation, loadRoster]);

  useEffect(() => {
    if (enrollOpen && rotation) {
      setSearch('');
      setClassId(COHORT_SCOPE);
      setProgramIntakeId(rotation.programIntakeId || '');
      setCandidateSummary(null);
      loadIntakes();
    }
  }, [enrollOpen, rotation, loadIntakes]);

  useEffect(() => {
    if (enrollOpen && programIntakeId) {
      loadClasses(programIntakeId);
    }
  }, [enrollOpen, programIntakeId, loadClasses]);

  useEffect(() => {
    if (enrollOpen && programIntakeId) {
      loadCandidates();
    }
  }, [enrollOpen, programIntakeId, classId, loadCandidates]);

  const addSelected = async () => {
    if (!rotation || selected.size === 0) return;
    const ids = [...selected].filter((id) => enrollableCandidates.some((s) => s.id === id));
    if (!ids.length) return;
    setSaving(true);
    try {
      await clinicalService.addRotationStudents(rotation.id, { studentIds: ids });
      toast.success(`Added ${ids.length} student(s) to roster`);
      setEnrollOpen(false);
      setSelected(new Set());
      await loadRoster();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to add students');
    } finally {
      setSaving(false);
    }
  };

  const enrollAll = async () => {
    if (!rotation || !programIntakeId) {
      toast.error('Select a cohort first');
      return;
    }
    setSaving(true);
    try {
      const result = await clinicalService.bulkEnrollRotation(rotation.id, {
        classId: classId !== COHORT_SCOPE ? classId : undefined,
        programIntakeId,
      });
      const scope = classId !== COHORT_SCOPE ? 'class' : 'cohort';
      toast.success(
        result.enrolled > 0
          ? `Enrolled ${result.enrolled} student(s) from ${scope}`
          : `No new eligible students to enroll from this ${scope}`
      );
      setEnrollOpen(false);
      setSelected(new Set());
      await loadRoster();
    } catch (e: any) {
      toast.error(e?.message || 'Bulk enroll failed');
    } finally {
      setSaving(false);
    }
  };

  const copyRoster = async () => {
    if (!rotation || !copyTargetId) {
      toast.error('Select a target rotation');
      return;
    }
    setSaving(true);
    try {
      const result = await clinicalService.copyRotationRoster(rotation.id, { targetRotationId: copyTargetId });
      const ineligible = result.ineligible ?? 0;
      toast.success(
        `Copied ${result.copied} student(s)${result.skipped ? `, ${result.skipped} already on target` : ''}${ineligible ? `, ${ineligible} ineligible (skipped)` : ''}`
      );
      setCopyOpen(false);
      setCopyTargetId('');
    } catch (e: any) {
      toast.error(e?.message || 'Failed to copy roster');
    } finally {
      setSaving(false);
    }
  };

  const removeStudent = async (studentId: string) => {
    if (!rotation) return;
    try {
      await clinicalService.removeRotationStudent(rotation.id, studentId);
      toast.success('Removed from roster');
      await loadRoster();
    } catch (e: any) {
      toast.error(e?.message || 'Failed to remove student');
    }
  };

  const toggleAll = (checked: boolean) => {
    if (checked) {
      setSelected(new Set(enrollableCandidates.map((s) => s.id)));
    } else {
      setSelected(new Set());
    }
  };

  if (!rotation) return null;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="w-[98vw] max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Rotation roster — {rotation.name}</DialogTitle>
          <DialogDescription>
            Students on this clinical placement. Attendance and reports use this roster only.
          </DialogDescription>
        </DialogHeader>

        <ClinicalTableCard
          title="Enrolled students"
          total={roster.length}
          loading={loading}
          action={
            canManage ? (
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEnrollOpen(true)} disabled={!rotation.programId}>
                  <UserPlus className="mr-2 h-4 w-4" />
                  Enroll students
                </Button>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setCopyOpen(true)}
                  disabled={!roster.length || copyTargets.length === 0}
                >
                  <Copy className="mr-2 h-4 w-4" />
                  Copy to rotation
                </Button>
              </div>
            ) : undefined
          }
        >
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Reg. no.</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Year · Sem</TableHead>
                <TableHead>Program</TableHead>
                <TableHead>Status</TableHead>
                {canManage && <TableHead className="text-right">Action</TableHead>}
              </TableRow>
            </TableHeader>
            <TableBody>
              {roster.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={canManage ? 6 : 5} className="py-10 text-center text-muted-foreground">
                    No students on this rotation. Open Enroll students to add the cohort or a class.
                  </TableCell>
                </TableRow>
              ) : (
                roster.map((row) => {
                  const s = row.student || row;
                  return (
                    <TableRow key={row.studentId || s.id}>
                      <TableCell>{s.studentNumber || '—'}</TableCell>
                      <TableCell className="font-medium">
                        {`${s.firstName || ''} ${s.lastName || ''}`.trim() || '—'}
                      </TableCell>
                      <TableCell>
                        Y{s.year ?? '—'} · S{s.semester ?? '—'}
                      </TableCell>
                      <TableCell>{s.programRef?.name || s.program?.name || '—'}</TableCell>
                      <TableCell>{row.status || 'Active'}</TableCell>
                      {canManage && (
                        <TableCell className="text-right">
                          <Button variant="ghost" size="sm" onClick={() => removeStudent(row.studentId || s.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </TableCell>
                      )}
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </ClinicalTableCard>

        <Dialog open={copyOpen} onOpenChange={setCopyOpen}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Copy roster to another rotation</DialogTitle>
              <DialogDescription>
                Semester rollover: copy active students from this rotation to a new rotation block.
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-2">
              <Label>Target rotation</Label>
              <Select value={copyTargetId} onValueChange={setCopyTargetId}>
                <SelectTrigger>
                  <SelectValue placeholder="Select rotation" />
                </SelectTrigger>
                <SelectContent>
                  {copyTargets.map((r) => (
                    <SelectItem key={r.id} value={r.id}>
                      {r.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setCopyOpen(false)}>
                Cancel
              </Button>
              <Button className="bg-[#015F2B] hover:bg-[#014022]" disabled={saving || !copyTargetId} onClick={copyRoster}>
                {saving ? 'Copying…' : 'Copy roster'}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        <Dialog open={enrollOpen} onOpenChange={setEnrollOpen}>
          <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Enroll students</DialogTitle>
              <DialogDescription>
                Cohort = student group for {rotationIntakeLabel}. Class is optional — only use it when timetable
                enrollments exist. With no classes linked, all students in the cohort are listed below.
              </DialogDescription>
            </DialogHeader>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cohort</Label>
                <Select
                  value={programIntakeId || undefined}
                  onValueChange={(v) => {
                    setProgramIntakeId(v);
                    setClassId(COHORT_SCOPE);
                    setSelected(new Set());
                  }}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={intakes.length ? 'Select cohort' : 'No cohort for this rotation'} />
                  </SelectTrigger>
                  <SelectContent>
                    {intakes.map((i) => (
                      <SelectItem key={i.id} value={i.id}>
                        {i.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {cohortStudentCount > 0 && (
                  <p className="text-xs text-muted-foreground">{cohortStudentCount} active students in this cohort</p>
                )}
              </div>
              <div className="space-y-2">
                <Label>Class filter (optional)</Label>
                <Select
                  value={classId || COHORT_SCOPE}
                  onValueChange={(v) => {
                    setClassId(v);
                    setSelected(new Set());
                  }}
                  disabled={!programIntakeId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={programIntakeId ? 'All cohort students' : 'Select cohort first'} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={COHORT_SCOPE}>All students in cohort</SelectItem>
                    {classes.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                        {(c.activeEnrolledCount ?? c.enrolledCount) != null
                          ? ` (${c.activeEnrolledCount ?? c.enrolledCount} enrolled)`
                          : ''}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {programIntakeId && classes.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No timetable classes linked to this cohort — showing all cohort students.
                  </p>
                )}
              </div>
            </div>

            {candidateSummary && (
              <p className="text-sm text-muted-foreground">
                {candidateSummary.canEnroll} can enroll · {candidateSummary.onRotation} already on roster
                {candidateSummary.blocked > 0 ? ` · ${candidateSummary.blocked} blocked` : ''}
              </p>
            )}

            <div className="space-y-2">
              <Label>Search</Label>
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Name or reg. number"
                disabled={!programIntakeId}
              />
            </div>

            <div className="max-h-[40vh] overflow-auto rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-10">
                      <Checkbox
                        checked={enrollableCandidates.length > 0 && selected.size === enrollableCandidates.length}
                        onCheckedChange={(checked) => toggleAll(checked === true)}
                        disabled={!enrollableCandidates.length}
                      />
                    </TableHead>
                    <TableHead>Student</TableHead>
                    <TableHead>Year · Sem</TableHead>
                    <TableHead>Status</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {!programIntakeId ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Select a cohort to load students.
                      </TableCell>
                    </TableRow>
                  ) : loadingCandidates ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        Loading students…
                      </TableCell>
                    </TableRow>
                  ) : candidates.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={4} className="py-8 text-center text-muted-foreground">
                        No students found for this selection.
                      </TableCell>
                    </TableRow>
                  ) : (
                    candidates.map((s) => (
                      <TableRow key={s.id} className={!s.canEnroll ? 'opacity-60' : undefined}>
                        <TableCell>
                          <Checkbox
                            checked={selected.has(s.id)}
                            disabled={!s.canEnroll}
                            onCheckedChange={(checked) => {
                              if (!s.canEnroll) return;
                              setSelected((prev) => {
                                const next = new Set(prev);
                                if (checked) next.add(s.id);
                                else next.delete(s.id);
                                return next;
                              });
                            }}
                          />
                        </TableCell>
                        <TableCell>
                          {s.studentNumber} — {s.firstName} {s.lastName}
                        </TableCell>
                        <TableCell>
                          Y{s.year} · S{s.semester}
                        </TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {s.canEnroll ? 'Ready' : s.blockReason || 'Cannot enroll'}
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>

            <DialogFooter className="flex-col sm:flex-row gap-2">
              <Button type="button" variant="outline" onClick={() => setEnrollOpen(false)}>
                Cancel
              </Button>
              <Button variant="outline" disabled={saving || !programIntakeId} onClick={enrollAll}>
                {saving
                  ? 'Enrolling…'
                  : classId !== COHORT_SCOPE
                    ? 'Enroll entire class'
                    : 'Enroll entire cohort'}
              </Button>
              <Button
                className="bg-[#015F2B] hover:bg-[#014022]"
                disabled={saving || selected.size === 0}
                onClick={addSelected}
              >
                {saving ? 'Adding…' : `Add selected (${selected.size})`}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </DialogContent>
    </Dialog>
  );
}
