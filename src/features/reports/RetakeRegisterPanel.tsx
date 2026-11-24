import { useCallback, useEffect, useMemo, useState } from 'react';
import { AlertCircle, FileSpreadsheet, Loader2, RefreshCw, Search, Settings2 } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Combobox } from '@/components/ui/combobox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { usePermissions } from '@/contexts/AuthContext';
import { academicService } from '@/services/academic.service';
import {
  enrollmentService,
  type EnrollmentType,
  type RetakeRegister,
  type RetakeRegisterRow,
  type RetakeRules,
} from '@/services/enrollment.service';
import { exportFilteredTableReport } from '@/utils/excel';

const ALL = '__all__';

/**
 * Reports → Retakers: every retake (and optionally extra) enrollment of the term with the student's
 * attendance in that class, so QA and the registrar can see who is retaking what and follow them up.
 */
export default function RetakeRegisterPanel({ academicTermId }: { academicTermId?: string }) {
  const { can } = usePermissions();
  const canEdit = can('enrollment.write');
  const canApprove = can('enrollment.retake_approve');
  const canFees = can('enrollment.retake_fees');
  const [rowNote, setRowNote] = useState<Record<string, string>>({});
  const [closing, setClosing] = useState(false);
  const [closePreview, setClosePreview] = useState<{ closed: number; byTerm: Array<{ term: string; count: number }> } | null>(null);
  const [programs, setPrograms] = useState<Array<{ id: string; code: string; name: string }>>([]);
  const [programId, setProgramId] = useState(ALL);
  const [type, setType] = useState<'Retake' | 'Extra' | 'all'>('Retake');
  const [statusView, setStatusView] = useState<'Active' | 'Pending' | 'all'>('Active');
  const [search, setSearch] = useState('');
  const [onlyBelow, setOnlyBelow] = useState(false);
  const [data, setData] = useState<RetakeRegister | null>(null);
  const [loading, setLoading] = useState(false);
  const [rulesOpen, setRulesOpen] = useState(false);
  const [rulesDraft, setRulesDraft] = useState<RetakeRules>({ maxActiveRetakes: 5, maxAttempts: 3, requireApproval: true, feePerCourseUnit: 0 });
  const [savingRules, setSavingRules] = useState(false);
  const [changingId, setChangingId] = useState<string | null>(null);

  useEffect(() => {
    academicService
      .getPrograms()
      .then((rows: any) => setPrograms(((rows as any[]) ?? []).map((p) => ({ id: p.id, code: p.code, name: p.name }))))
      .catch(() => setPrograms([]));
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await enrollmentService.getRetakeRegister({
        ...(academicTermId ? { academicTermId } : {}),
        ...(programId !== ALL ? { programId } : {}),
        type,
        status: statusView,
        ...(search.trim() ? { search: search.trim() } : {}),
      });
      setData(res);
      if (res?.rules) setRulesDraft(res.rules);
    } catch (e: any) {
      setData(null);
      toast.error(e?.message || 'Failed to load retakers.');
    } finally {
      setLoading(false);
    }
  }, [academicTermId, programId, type, statusView, search]);

  // Reload when filters change (search is debounced).
  useEffect(() => {
    const t = setTimeout(() => void load(), search ? 300 : 0);
    return () => clearTimeout(t);
  }, [load, search]);

  const rows = useMemo(
    () => (data?.rows ?? []).filter((r) => !onlyBelow || r.belowThreshold),
    [data, onlyBelow]
  );
  const threshold = data?.thresholdPercent ?? 75;

  const changeType = async (row: RetakeRegisterRow, next: EnrollmentType) => {
    if (next === row.enrollmentType) return;
    setChangingId(row.enrollmentId);
    try {
      await enrollmentService.updateEnrollmentType(row.enrollmentId, { enrollmentType: next });
      toast.success(`${row.studentName} — ${row.courseCode ?? row.className} is now ${next}.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not change the enrollment type.');
    } finally {
      setChangingId(null);
    }
  };

  const approve = async (row: RetakeRegisterRow) => {
    setChangingId(row.enrollmentId);
    try {
      await enrollmentService.approveRetake(row.enrollmentId, rowNote[row.enrollmentId] || null);
      toast.success(`Retake approved: ${row.studentName} — ${row.courseCode ?? row.className}. Now on the class list.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not approve the retake.');
    } finally {
      setChangingId(null);
    }
  };

  const reject = async (row: RetakeRegisterRow) => {
    const note = (rowNote[row.enrollmentId] ?? '').trim();
    if (!note) {
      toast.error('Type a reason in the note box before rejecting.');
      return;
    }
    setChangingId(row.enrollmentId);
    try {
      await enrollmentService.rejectRetake(row.enrollmentId, note);
      toast.success(`Retake rejected: ${row.studentName} — ${row.courseCode ?? row.className}.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not reject the retake.');
    } finally {
      setChangingId(null);
    }
  };

  const setFee = async (row: RetakeRegisterRow, feeStatus: 'Unpaid' | 'Paid' | 'Waived') => {
    const feeReference = (rowNote[row.enrollmentId] ?? '').trim() || null;
    setChangingId(row.enrollmentId);
    try {
      await enrollmentService.updateRetakeFee(row.enrollmentId, { feeStatus, feeReference });
      toast.success(`Fee marked ${feeStatus} for ${row.studentName} — ${row.courseCode ?? row.className}.`);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not update the fee.');
    } finally {
      setChangingId(null);
    }
  };

  const previewClosePastTerms = async () => {
    setClosing(true);
    try {
      const res = await enrollmentService.closePastTermEnrollments(true);
      setClosePreview(res);
      if (res.closed === 0) toast.info('No active enrollments are left over from ended terms.');
    } catch (e: any) {
      toast.error(e?.message || 'Could not check past-term enrollments.');
    } finally {
      setClosing(false);
    }
  };

  const applyClosePastTerms = async () => {
    setClosing(true);
    try {
      const res = await enrollmentService.closePastTermEnrollments(false);
      toast.success(`${res.closed} enrollment(s) from ended terms closed as Completed.`);
      setClosePreview(null);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not close past-term enrollments.');
    } finally {
      setClosing(false);
    }
  };

  const saveRules = async () => {
    setSavingRules(true);
    try {
      const saved = await enrollmentService.updateRetakeRules(rulesDraft);
      setRulesDraft(saved);
      toast.success('Retake rules saved.');
      setRulesOpen(false);
      await load();
    } catch (e: any) {
      toast.error(e?.message || 'Could not save the retake rules.');
    } finally {
      setSavingRules(false);
    }
  };

  const handleExport = () => {
    if (rows.length === 0) {
      toast.warning('No retakers to export.');
      return;
    }
    const program = programs.find((p) => p.id === programId);
    exportFilteredTableReport({
      title: type === 'Extra' ? 'Extra Enrollments' : type === 'all' ? 'Retake & Extra Enrollments' : 'Retake Register',
      filters: [
        data?.term ? `Term: ${data.term.name}` : null,
        program ? `Program: ${program.code}` : 'Program: All',
        search.trim() ? `Search: "${search.trim()}"` : null,
        statusView === 'all' ? 'Including completed' : statusView === 'Pending' ? 'Pending approval only' : 'Current (active + pending)',
        onlyBelow ? `Below ${threshold}% only` : null,
      ],
      headers: [
        'Student', 'Reg. No.', 'Student cohort', 'Course code', 'Course unit', 'Class', 'Class cohort', 'Lecturer',
        'Type', 'Attempt', 'Status', 'Approval', 'Approved by', 'Fee (UGX)', 'Fee status', 'Receipt',
        'Attended', 'Late', 'Absent', 'Excused', 'Not marked', 'Expected', '%', 'Added by', 'Reason',
      ],
      rows: rows.map((r) => [
        r.studentName, r.registrationNumber, r.studentCohort ?? '', r.courseCode ?? '', r.courseName ?? '', r.className,
        r.classCohort ?? '', r.lecturer ?? '', r.enrollmentType, r.attemptNumber, r.status, r.approvalStatus,
        r.approvedBy ?? '', r.feeAmount ?? '', r.feeStatus, r.feeReference ?? '', r.attendance.attended, r.attendance.late,
        r.attendance.absent, r.attendance.excused, r.attendance.notMarked, r.attendance.expected, r.attendance.percentage,
        r.addedBy ?? '', r.reason ?? '',
      ]),
      sheetName: 'Retakers',
      footerNote: `Attended = Present + Late. Expected = sessions the class was marked. Below ${threshold}% is flagged.`,
      filename: `retake_register_${new Date().toISOString().slice(0, 10)}.xlsx`,
    });
    toast.success(`Exported ${rows.length} row(s).`);
  };

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <CardTitle>Retakers</CardTitle>
            <CardDescription>
              Students retaking course units this term, the class they attend and their attendance there.
              {data?.rules
                ? ` Rules: at most ${data.rules.maxActiveRetakes} retake course unit(s) per term and ${data.rules.maxAttempts} attempts per course unit.`
                : ''}
            </CardDescription>
          </div>
          <div className="flex gap-2">
            {canEdit ? (
              <Button variant="outline" size="sm" onClick={() => setRulesOpen((v) => !v)}>
                <Settings2 className="mr-1 h-4 w-4" /> Retake rules
              </Button>
            ) : null}
            <Button variant="outline" size="sm" onClick={() => void load()} disabled={loading}>
              <RefreshCw className={`mr-1 h-4 w-4 ${loading ? 'animate-spin' : ''}`} /> Refresh
            </Button>
            <Button variant="outline" size="sm" onClick={handleExport} disabled={loading || rows.length === 0}>
              <FileSpreadsheet className="mr-1 h-4 w-4" /> Export Excel ({rows.length})
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {rulesOpen && canEdit ? (
          <div className="flex flex-wrap items-end gap-3 rounded-md border bg-muted/30 p-3">
            <div className="space-y-1">
              <Label className="text-xs">Max retake course units per term</Label>
              <Input
                type="number"
                min={1}
                max={20}
                className="h-9 w-[120px] bg-white"
                value={rulesDraft.maxActiveRetakes}
                onChange={(e) => setRulesDraft((r) => ({ ...r, maxActiveRetakes: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Max attempts per course unit</Label>
              <Input
                type="number"
                min={1}
                max={20}
                className="h-9 w-[120px] bg-white"
                value={rulesDraft.maxAttempts}
                onChange={(e) => setRulesDraft((r) => ({ ...r, maxAttempts: parseInt(e.target.value, 10) || 1 }))}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Fee per retake course unit (UGX)</Label>
              <Input
                type="number"
                min={0}
                className="h-9 w-[150px] bg-white"
                value={rulesDraft.feePerCourseUnit}
                onChange={(e) => setRulesDraft((r) => ({ ...r, feePerCourseUnit: Math.max(0, parseInt(e.target.value, 10) || 0) }))}
              />
            </div>
            <label className="flex items-center gap-2 pb-2 text-sm">
              <input
                type="checkbox"
                checked={rulesDraft.requireApproval}
                onChange={(e) => setRulesDraft((r) => ({ ...r, requireApproval: e.target.checked }))}
              />
              Retakes need approval
            </label>
            <Button size="sm" className="h-9 bg-[#015F2B] hover:bg-[#014022]" onClick={saveRules} disabled={savingRules}>
              {savingRules ? <Loader2 className="mr-1 h-4 w-4 animate-spin" /> : null} Save rules
            </Button>
            <p className="w-full text-xs text-muted-foreground">
              Checked whenever a retake is registered; a registrar can override the limits with a reason. With
              approval on, a retake added by someone without approval rights waits as Pending and is not on class
              lists until approved. A fee above 0 marks each new retake Unpaid until recorded as Paid or Waived.
            </p>
            <div className="flex w-full flex-wrap items-center gap-2 border-t pt-3">
              <span className="text-xs text-muted-foreground">Term close-out:</span>
              <Button size="sm" variant="outline" className="h-8" onClick={previewClosePastTerms} disabled={closing}>
                Check enrollments left from ended terms
              </Button>
              {closePreview && closePreview.closed > 0 ? (
                <>
                  <span className="text-xs">
                    {closePreview.closed} active enrollment(s):{' '}
                    {closePreview.byTerm.map((t) => `${t.term} (${t.count})`).join(', ')}
                  </span>
                  <Button size="sm" className="h-8 bg-[#015F2B] hover:bg-[#014022]" onClick={applyClosePastTerms} disabled={closing}>
                    Close them as Completed
                  </Button>
                </>
              ) : null}
            </div>
          </div>
        ) : null}

        <div className="flex flex-wrap items-end gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search student name or reg. number"
              className="pl-8"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <Combobox
            className="w-[240px]"
            options={[{ value: ALL, label: 'All programs' }, ...programs.map((p) => ({ value: p.id, label: `${p.code} — ${p.name}` }))]}
            value={programId}
            onValueChange={(v) => setProgramId(v || ALL)}
            placeholder="Program"
            searchPlaceholder="Search programs..."
            emptyText="No program found."
            initialDisplayCount={50}
          />
          <Select value={type} onValueChange={(v) => setType(v as 'Retake' | 'Extra' | 'all')}>
            <SelectTrigger className="w-[170px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Retake">Retakes</SelectItem>
              <SelectItem value="Extra">Extra enrollments</SelectItem>
              <SelectItem value="all">Retakes + extra</SelectItem>
            </SelectContent>
          </Select>
          <Select value={statusView} onValueChange={(v) => setStatusView(v as 'Active' | 'Pending' | 'all')}>
            <SelectTrigger className="w-[190px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Active">Current (active + pending)</SelectItem>
              <SelectItem value="Pending">Waiting for approval</SelectItem>
              <SelectItem value="all">Include completed</SelectItem>
            </SelectContent>
          </Select>
          <label className="flex items-center gap-2 text-sm">
            <input type="checkbox" checked={onlyBelow} onChange={(e) => setOnlyBelow(e.target.checked)} />
            Below {threshold}% only
          </label>
        </div>

        <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Students</p>
            <p className="text-2xl font-bold">{data?.totals.students ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Retake course units</p>
            <p className="text-2xl font-bold">{data?.totals.enrollments ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Below {threshold}% attendance</p>
            <p className="text-2xl font-bold text-red-600">{data?.totals.belowThreshold ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Waiting for approval</p>
            <p className="text-2xl font-bold text-amber-700">{data?.totals.pendingApproval ?? 0}</p>
          </div>
          <div className="rounded-md border p-3">
            <p className="text-xs text-muted-foreground">Fees unpaid</p>
            <p className="text-2xl font-bold">{data?.totals.feesUnpaid ?? 0}</p>
          </div>
        </div>

        <div className="overflow-x-auto rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Course unit</TableHead>
                <TableHead>Class attended</TableHead>
                <TableHead>Type</TableHead>
                <TableHead className="text-right">Attended / expected</TableHead>
                <TableHead className="text-right">%</TableHead>
                <TableHead>Added</TableHead>
                <TableHead>Approval & fee</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin text-muted-foreground" />
                  </TableCell>
                </TableRow>
              ) : rows.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                    No {type === 'Extra' ? 'extra enrollments' : 'retakers'} match these filters.
                  </TableCell>
                </TableRow>
              ) : (
                rows.map((r) => (
                  <TableRow key={r.enrollmentId}>
                    <TableCell>
                      <div className="font-medium">{r.studentName}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.registrationNumber}
                        {r.studentCohort ? ` · ${r.studentCohort}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="font-medium">{r.courseCode ?? '—'}</div>
                      <div className="text-xs text-muted-foreground">{r.courseName ?? ''}</div>
                    </TableCell>
                    <TableCell>
                      <div className="text-sm">{r.className}</div>
                      <div className="text-xs text-muted-foreground">
                        {r.classCohort ? `With ${r.classCohort}` : ''}
                        {r.lecturer ? ` · ${r.lecturer}` : ''}
                      </div>
                    </TableCell>
                    <TableCell>
                      {canEdit ? (
                        <Select
                          value={r.enrollmentType}
                          onValueChange={(v) => void changeType(r, v as EnrollmentType)}
                          disabled={changingId === r.enrollmentId}
                        >
                          <SelectTrigger className="h-8 w-[120px] text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="Retake">Retake</SelectItem>
                            <SelectItem value="Extra">Extra</SelectItem>
                            <SelectItem value="Regular">Regular</SelectItem>
                          </SelectContent>
                        </Select>
                      ) : (
                        <span className="text-sm">{r.enrollmentType}</span>
                      )}
                      {r.enrollmentType === 'Retake' ? (
                        <div className="mt-0.5 text-xs text-muted-foreground">Attempt {r.attemptNumber}</div>
                      ) : null}
                      {r.status !== 'Active' ? <div className="text-xs text-muted-foreground">{r.status}</div> : null}
                    </TableCell>
                    <TableCell className="text-right text-sm">
                      {r.attendance.attended} / {r.attendance.expected}
                      <div className="text-xs text-muted-foreground">
                        {r.attendance.absent} absent · {r.attendance.notMarked} not marked
                      </div>
                    </TableCell>
                    <TableCell className={`text-right font-medium ${r.belowThreshold ? 'text-red-600' : ''}`}>
                      {r.attendance.expected > 0 ? `${r.attendance.percentage.toFixed(1)}%` : '—'}
                      {r.belowThreshold ? <AlertCircle className="ml-1 inline h-3.5 w-3.5" /> : null}
                    </TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {new Date(r.enrolledAt).toISOString().slice(0, 10)}
                      {r.addedBy ? <div>{r.addedBy}</div> : null}
                      {r.reason ? <div className="italic">{r.reason}</div> : null}
                    </TableCell>
                    <TableCell className="min-w-[230px] text-xs">
                      <div className="mb-1">
                        {r.status === 'Pending' ? (
                          <span className="rounded bg-amber-100 px-1.5 py-0.5 font-medium text-amber-800">Waiting for approval</span>
                        ) : r.approvalStatus === 'Approved' ? (
                          <span className="text-green-700">Approved{r.approvedBy ? ` by ${r.approvedBy}` : ''}</span>
                        ) : r.approvalStatus === 'Rejected' ? (
                          <span className="text-red-600">Rejected</span>
                        ) : (
                          <span className="text-muted-foreground">No approval needed</span>
                        )}
                        {r.approvalNote ? <div className="italic text-muted-foreground">{r.approvalNote}</div> : null}
                      </div>
                      {r.feeStatus !== 'NotRequired' ? (
                        <div className="mb-1">
                          Fee {r.feeAmount != null ? `UGX ${r.feeAmount.toLocaleString()}` : ''}:{' '}
                          <span
                            className={
                              r.feeStatus === 'Unpaid' ? 'font-medium text-red-600' : r.feeStatus === 'Paid' ? 'text-green-700' : ''
                            }
                          >
                            {r.feeStatus}
                          </span>
                          {r.feeReference ? <span className="text-muted-foreground"> · {r.feeReference}</span> : null}
                        </div>
                      ) : null}
                      {(canApprove && r.status === 'Pending') || (canFees && r.feeStatus !== 'NotRequired') ? (
                        <div className="space-y-1">
                          <Input
                            className="h-7 text-xs"
                            placeholder={r.status === 'Pending' ? 'Note / reason' : 'Receipt no.'}
                            value={rowNote[r.enrollmentId] ?? ''}
                            onChange={(e) => setRowNote((m) => ({ ...m, [r.enrollmentId]: e.target.value }))}
                          />
                          <div className="flex flex-wrap gap-1">
                            {canApprove && r.status === 'Pending' ? (
                              <>
                                <Button size="sm" className="h-7 bg-[#015F2B] px-2 text-xs hover:bg-[#014022]" disabled={changingId === r.enrollmentId} onClick={() => void approve(r)}>
                                  Approve
                                </Button>
                                <Button size="sm" variant="outline" className="h-7 px-2 text-xs text-red-700" disabled={changingId === r.enrollmentId} onClick={() => void reject(r)}>
                                  Reject
                                </Button>
                              </>
                            ) : null}
                            {canFees && r.feeStatus !== 'NotRequired' ? (
                              <>
                                {r.feeStatus !== 'Paid' ? (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={changingId === r.enrollmentId} onClick={() => void setFee(r, 'Paid')}>
                                    Mark paid
                                  </Button>
                                ) : null}
                                {r.feeStatus !== 'Waived' ? (
                                  <Button size="sm" variant="outline" className="h-7 px-2 text-xs" disabled={changingId === r.enrollmentId} onClick={() => void setFee(r, 'Waived')}>
                                    Waive
                                  </Button>
                                ) : null}
                              </>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </TableCell>
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
