import React, { useState, useEffect, useMemo } from 'react';
import { Send, CheckCircle, XCircle, Loader2, Plus, RefreshCw, Filter, UserCog } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Combobox } from '@/components/ui/combobox';
import { useRole } from '@/components/RoleProvider';
import { cancellationsService, timetableService, substitutionsService } from '@/services';
import type { CancellationRequest } from '@/services/cancellations.service';
import type {
  SubstitutionRequest,
  SubstituteCandidate,
} from '@/services/substitutions.service';
import { toast } from 'sonner';

function formatDate(d: string | Date) {
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric', year: 'numeric' });
}

function formatTime(t: string | Date) {
  const d = typeof t === 'string' ? new Date(t) : t;
  return d.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' });
}

function SessionCell({ r }: { r: CancellationRequest }) {
  return (
    <>
      {r.className ?? '—'}
      {(r.courseCode ?? r.courseName) && (
        <span className="text-muted-foreground"> ({r.courseCode ?? r.courseName})</span>
      )}
      {r.timetable?.startTime != null && r.timetable?.endTime != null && (
        <span className="text-muted-foreground block text-xs">
          {formatTime(r.timetable.startTime)}–{formatTime(r.timetable.endTime)}
        </span>
      )}
    </>
  );
}

export default function Cancellations() {
  const { role } = useRole();
  const isLecturer = role === 'Lecturer';
  const isQA = role === 'QA' || role === 'Admin' || role === 'Management';

  const [myRequests, setMyRequests] = useState<CancellationRequest[]>([]);
  const [pendingList, setPendingList] = useState<CancellationRequest[]>([]);
  const [historyList, setHistoryList] = useState<CancellationRequest[]>([]);
  const [sessions, setSessions] = useState<any[]>([]);
  const [loadingMine, setLoadingMine] = useState(false);
  const [loadingPending, setLoadingPending] = useState(false);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [loadingSessions, setLoadingSessions] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [approvingId, setApprovingId] = useState<string | null>(null);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState('');
  const [addModalOpen, setAddModalOpen] = useState(false);
  const [selectedTimetableId, setSelectedTimetableId] = useState<string>('');
  const [reason, setReason] = useState('');
  const [compensationDate, setCompensationDate] = useState('');
  const [compensationStartTime, setCompensationStartTime] = useState('');
  const [compensationEndTime, setCompensationEndTime] = useState('');
  const [compensationVenue, setCompensationVenue] = useState('');
  const [dateFrom, setDateFrom] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() - 7);
    return d.toISOString().slice(0, 10);
  });
  const [dateTo, setDateTo] = useState(() => {
    const d = new Date();
    d.setDate(d.getDate() + 90);
    return d.toISOString().slice(0, 10);
  });

  const [statusFilter, setStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [filterDateFrom, setFilterDateFrom] = useState<string>('');
  const [filterDateTo, setFilterDateTo] = useState<string>('');
  const [qaStatusFilter, setQaStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [qaPage, setQaPage] = useState(1);
  const [pendingTotal, setPendingTotal] = useState(0);
  const [historyTotal, setHistoryTotal] = useState(0);
  const pageSize = 20;
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<CancellationRequest | null>(null);

  const [activeTab, setActiveTab] = useState<'cancellations' | 'substitutions'>(() => {
    if (typeof window === 'undefined') return 'cancellations';
    const params = new URLSearchParams(window.location.search);
    return params.get('tab') === 'substitutions' ? 'substitutions' : 'cancellations';
  });

  const [substituteCandidates, setSubstituteCandidates] = useState<SubstituteCandidate[]>([]);
  const [mySubRequests, setMySubRequests] = useState<SubstitutionRequest[]>([]);
  const [pendingSubList, setPendingSubList] = useState<SubstitutionRequest[]>([]);
  const [historySubList, setHistorySubList] = useState<SubstitutionRequest[]>([]);
  const [loadingMineSub, setLoadingMineSub] = useState(false);
  const [loadingPendingSub, setLoadingPendingSub] = useState(false);
  const [loadingHistorySub, setLoadingHistorySub] = useState(false);
  const [submittingSub, setSubmittingSub] = useState(false);
  const [approvingSubId, setApprovingSubId] = useState<string | null>(null);
  const [rejectingSubId, setRejectingSubId] = useState<string | null>(null);
  const [subRejectReason, setSubRejectReason] = useState('');
  const [subAddModalOpen, setSubAddModalOpen] = useState(false);
  const [subSelectedTimetableId, setSubSelectedTimetableId] = useState('');
  const [subSelectedCandidateId, setSubSelectedCandidateId] = useState('');
  const [subSelectedCandidateName, setSubSelectedCandidateName] = useState('');
  const [subReason, setSubReason] = useState('');
  const [subStatusFilter, setSubStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [qaSubStatusFilter, setQaSubStatusFilter] = useState<'All' | 'Pending' | 'Approved' | 'Rejected'>('All');
  const [qaSubPage, setQaSubPage] = useState(1);
  const [pendingSubTotal, setPendingSubTotal] = useState(0);
  const [historySubTotal, setHistorySubTotal] = useState(0);
  const [subDetailsOpen, setSubDetailsOpen] = useState(false);
  const [selectedSubRequest, setSelectedSubRequest] = useState<SubstitutionRequest | null>(null);

  const loadMyRequests = async () => {
    if (!isLecturer) return;
    setLoadingMine(true);
    try {
      const res = await cancellationsService.listMine({ page: 1, limit: pageSize });
      setMyRequests(Array.isArray(res?.data) ? res.data : (res as any)?.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load requests');
      setMyRequests([]);
    } finally {
      setLoadingMine(false);
    }
  };

  const loadPending = async () => {
    if (!isQA) return;
    setLoadingPending(true);
    try {
      const res = await cancellationsService.listPending({ page: qaPage, limit: pageSize });
      setPendingList(Array.isArray(res?.data) ? res.data : (res as any)?.data ?? []);
      setPendingTotal((res as any)?.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load pending');
      setPendingList([]);
    } finally {
      setLoadingPending(false);
    }
  };

  const loadHistory = async () => {
    if (!isQA) return;
    setLoadingHistory(true);
    try {
      const res = await cancellationsService.listHistory({ page: qaPage, limit: pageSize });
      setHistoryList(Array.isArray(res?.data) ? res.data : (res as any)?.data ?? []);
      setHistoryTotal((res as any)?.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load history');
      setHistoryList([]);
    } finally {
      setLoadingHistory(false);
    }
  };

  const loadSessions = async () => {
    if (!isLecturer) return;
    setLoadingSessions(true);
    try {
      const res = await timetableService.getMyScheduledSessions({ dateFrom, dateTo, limit: 50 });
      setSessions(res?.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  const loadMySubRequests = async () => {
    if (!isLecturer) return;
    setLoadingMineSub(true);
    try {
      const res = await substitutionsService.listMine({ page: 1, limit: pageSize });
      setMySubRequests(Array.isArray(res?.data) ? res.data : (res as any)?.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load substitution requests');
      setMySubRequests([]);
    } finally {
      setLoadingMineSub(false);
    }
  };

  const loadPendingSub = async () => {
    if (!isQA) return;
    setLoadingPendingSub(true);
    try {
      const res = await substitutionsService.listPending({ page: qaSubPage, limit: pageSize });
      setPendingSubList(Array.isArray(res?.data) ? res.data : (res as any)?.data ?? []);
      setPendingSubTotal((res as any)?.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load pending substitutions');
      setPendingSubList([]);
    } finally {
      setLoadingPendingSub(false);
    }
  };

  const loadHistorySub = async () => {
    if (!isQA) return;
    setLoadingHistorySub(true);
    try {
      const res = await substitutionsService.listHistory({ page: qaSubPage, limit: pageSize });
      setHistorySubList(Array.isArray(res?.data) ? res.data : (res as any)?.data ?? []);
      setHistorySubTotal((res as any)?.total ?? 0);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load substitution history');
      setHistorySubList([]);
    } finally {
      setLoadingHistorySub(false);
    }
  };

  const loadCandidates = async () => {
    try {
      const candidates = await substitutionsService.listCandidates();
      setSubstituteCandidates(Array.isArray(candidates) ? candidates : []);
    } catch (e) {
      console.error('Failed to load substitute candidates', e);
      setSubstituteCandidates([]);
    }
  };

  useEffect(() => {
    loadMyRequests();
    if (isLecturer) {
      loadMySubRequests();
      loadCandidates();
    }
  }, [isLecturer]);

  useEffect(() => {
    if (isQA) {
      loadPending();
      loadHistory();
    }
  }, [isQA, qaPage]);

  useEffect(() => {
    if (isQA) {
      loadPendingSub();
      loadHistorySub();
      if (substituteCandidates.length === 0) loadCandidates();
    }
  }, [isQA, qaSubPage]);

  useEffect(() => {
    if (isLecturer && dateFrom && dateTo) loadSessions();
  }, [isLecturer, dateFrom, dateTo]);

  const handleSubmit = async () => {
    if (!selectedTimetableId || !reason.trim()) {
      toast.error('Select a session and enter a reason');
      return;
    }
    const hasComp = compensationDate && compensationStartTime && compensationEndTime;
    if (hasComp) {
      const d = new Date(compensationDate + 'T00:00:00');
      if (d.getTime() < Date.now() - 86400000) {
        toast.error('Compensation date must be today or in the future');
        return;
      }
    }
    setSubmitting(true);
    try {
      await cancellationsService.submit({
        timetableId: selectedTimetableId,
        reason: reason.trim(),
        ...(hasComp
          ? {
              compensationDate,
              compensationStartTime: compensationStartTime.trim(),
              compensationEndTime: compensationEndTime.trim(),
              compensationVenue: compensationVenue.trim() || undefined,
            }
          : {}),
      });
      toast.success('Cancellation request submitted');
      setReason('');
      setSelectedTimetableId('');
      setCompensationDate('');
      setCompensationStartTime('');
      setCompensationEndTime('');
      setCompensationVenue('');
      setAddModalOpen(false);
      loadMyRequests();
      loadSessions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmitting(false);
    }
  };

  const handleApprove = async (id: string) => {
    setApprovingId(id);
    try {
      await cancellationsService.approve(id);
      toast.success('Request approved');
      loadPending();
      loadHistory();
      if (isLecturer) loadMyRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setApprovingId(null);
    }
  };

  const openDetails = (request: CancellationRequest) => {
    setSelectedRequest(request);
    setDetailsOpen(true);
  };

  const handleReject = async (id: string) => {
    setRejectingId(id);
    try {
      await cancellationsService.reject(id, rejectReason.trim() || undefined);
      toast.success('Request rejected');
      setRejectReason('');
      setRejectingId(null);
      loadPending();
      loadHistory();
      if (isLecturer) loadMyRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setRejectingId(null);
    }
  };

  const handleSubmitSubstitution = async () => {
    if (!subSelectedTimetableId || !subSelectedCandidateId || !subReason.trim()) {
      toast.error('Pick a session, a substitute lecturer, and provide a reason.');
      return;
    }
    setSubmittingSub(true);
    try {
      await substitutionsService.submit({
        timetableId: subSelectedTimetableId,
        proposedSubstituteId: subSelectedCandidateId,
        reason: subReason.trim(),
      });
      toast.success('Substitute request submitted');
      setSubReason('');
      setSubSelectedTimetableId('');
      setSubSelectedCandidateId('');
      setSubSelectedCandidateName('');
      setSubAddModalOpen(false);
      loadMySubRequests();
      loadSessions();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Submit failed');
    } finally {
      setSubmittingSub(false);
    }
  };

  const handleApproveSub = async (id: string) => {
    setApprovingSubId(id);
    try {
      await substitutionsService.approve(id);
      toast.success('Substitution approved');
      loadPendingSub();
      loadHistorySub();
      if (isLecturer) loadMySubRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Approve failed');
    } finally {
      setApprovingSubId(null);
    }
  };

  const handleRejectSub = async (id: string) => {
    setRejectingSubId(id);
    try {
      await substitutionsService.reject(id, subRejectReason.trim() || undefined);
      toast.success('Substitution rejected');
      setSubRejectReason('');
      setRejectingSubId(null);
      loadPendingSub();
      loadHistorySub();
      if (isLecturer) loadMySubRequests();
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Reject failed');
    } finally {
      setRejectingSubId(null);
    }
  };

  const openSubDetails = (request: SubstitutionRequest) => {
    setSelectedSubRequest(request);
    setSubDetailsOpen(true);
  };

  const scheduledNotRequested = sessions.filter(
    (s) => s.status === 'Scheduled' && !myRequests.some((r) => r.timetableId === s.id)
  );

  const scheduledNotSubRequested = sessions.filter(
    (s) =>
      s.status === 'Scheduled' &&
      !mySubRequests.some((r) => r.timetableId === s.id && r.status !== 'Rejected')
  );

  const applyDateFilter = (list: CancellationRequest[], getDate: (r: CancellationRequest) => Date) => {
    if (!filterDateFrom && !filterDateTo) return list;
    const from = filterDateFrom ? new Date(filterDateFrom + 'T00:00:00') : null;
    const to = filterDateTo ? new Date(filterDateTo + 'T23:59:59') : null;
    return list.filter((r) => {
      const d = getDate(r);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };

  const filteredMyRequests = useMemo(() => {
    let list = myRequests;
    if (statusFilter !== 'All') list = list.filter((r) => r.status === statusFilter);
    return applyDateFilter(list, (r) => new Date(r.requestedAt));
  }, [myRequests, statusFilter, filterDateFrom, filterDateTo]);

  const qaCombinedList = useMemo(() => {
    const pending = pendingList.map((r) => ({ ...r, status: 'Pending' as const }));
    const history = historyList;
    const combined = [...pending, ...history].sort((a, b) => {
      const aPending = a.status === 'Pending' ? 1 : 0;
      const bPending = b.status === 'Pending' ? 1 : 0;
      if (bPending !== aPending) return bPending - aPending;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
    return combined;
  }, [pendingList, historyList]);

  const filteredQAList = useMemo(() => {
    let list = qaCombinedList;
    if (qaStatusFilter !== 'All') list = list.filter((r) => r.status === qaStatusFilter);
    return applyDateFilter(list, (r) => new Date(r.requestedAt));
  }, [qaCombinedList, qaStatusFilter, filterDateFrom, filterDateTo]);

  const applyDateFilterSub = (
    list: SubstitutionRequest[],
    getDate: (r: SubstitutionRequest) => Date
  ) => {
    if (!filterDateFrom && !filterDateTo) return list;
    const from = filterDateFrom ? new Date(filterDateFrom + 'T00:00:00') : null;
    const to = filterDateTo ? new Date(filterDateTo + 'T23:59:59') : null;
    return list.filter((r) => {
      const d = getDate(r);
      if (from && d < from) return false;
      if (to && d > to) return false;
      return true;
    });
  };

  const filteredMySubRequests = useMemo(() => {
    let list = mySubRequests;
    if (subStatusFilter !== 'All') list = list.filter((r) => r.status === subStatusFilter);
    return applyDateFilterSub(list, (r) => new Date(r.requestedAt));
  }, [mySubRequests, subStatusFilter, filterDateFrom, filterDateTo]);

  const qaSubCombinedList = useMemo(() => {
    const pending = pendingSubList.map((r) => ({ ...r, status: 'Pending' as const }));
    const history = historySubList;
    return [...pending, ...history].sort((a, b) => {
      const aPending = a.status === 'Pending' ? 1 : 0;
      const bPending = b.status === 'Pending' ? 1 : 0;
      if (bPending !== aPending) return bPending - aPending;
      return new Date(b.requestedAt).getTime() - new Date(a.requestedAt).getTime();
    });
  }, [pendingSubList, historySubList]);

  const filteredQASubList = useMemo(() => {
    let list = qaSubCombinedList;
    if (qaSubStatusFilter !== 'All') list = list.filter((r) => r.status === qaSubStatusFilter);
    return applyDateFilterSub(list, (r) => new Date(r.requestedAt));
  }, [qaSubCombinedList, qaSubStatusFilter, filterDateFrom, filterDateTo]);

  const openAddModal = () => {
    setReason('');
    setSelectedTimetableId('');
    setAddModalOpen(true);
  };

  const openSubAddModal = () => {
    setSubReason('');
    setSubSelectedTimetableId('');
    setSubSelectedCandidateId('');
    setSubSelectedCandidateName('');
    setSubAddModalOpen(true);
  };

  const handleRefresh = () => {
    if (isLecturer) loadMyRequests();
    if (isQA) {
      loadPending();
      loadHistory();
    }
  };

  const handleRefreshSub = () => {
    if (isLecturer) loadMySubRequests();
    if (isQA) {
      loadPendingSub();
      loadHistorySub();
    }
  };

  return (
    <div className="p-4 space-y-6 w-full max-w-[1600px] mx-auto">
      <div>
        <h1 className="text-2xl font-semibold">Planned absences</h1>
        <p className="text-muted-foreground">
          Manage cancellation and substitute lecturer requests. Cancellations remove a session from the timetable; substitutions keep the session but record a different lecturer.
        </p>
      </div>

      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as 'cancellations' | 'substitutions')}>
        <TabsList>
          <TabsTrigger value="cancellations">Cancellations</TabsTrigger>
          <TabsTrigger value="substitutions">Substitutions</TabsTrigger>
        </TabsList>

        <TabsContent value="cancellations" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isLecturer
                ? 'Request cancellation for a scheduled session. QA will review and approve or reject.'
                : 'Review and approve or reject lecturer cancellation requests.'}
            </p>
            {isLecturer && (
              <Button onClick={openAddModal}>
                <Plus className="h-4 w-4 mr-2" />
                Add cancellation
              </Button>
            )}
          </div>

      {isLecturer && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>My cancellation requests</CardTitle>
            <CardDescription>
              Your submitted requests. Filters are applied to the list below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 bg-muted/30">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Select value={statusFilter} onValueChange={(v: any) => setStatusFilter(v)}>
                <SelectTrigger className="w-[130px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Input type="date" className="w-[140px]" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
              <Input type="date" className="w-[140px]" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingMine}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingMine ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="rounded-md border bg-white overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMine ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredMyRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center py-12 text-muted-foreground">
                        {myRequests.length === 0 ? 'No requests yet. Click Add cancellation to submit one.' : 'No records match the filters.'}
                      </TableCell>
                    </TableRow>
                  ) : (
                    filteredMyRequests.map((r, idx) => (
                      <TableRow key={r.id}>
                        <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                        <TableCell>{formatDate(r.timetable.date)}</TableCell>
                        <TableCell>
                          <SessionCell r={r} />
                        </TableCell>
                        <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              r.status === 'Approved' ? 'default' : r.status === 'Rejected' ? 'destructive' : 'secondary'
                            }
                          >
                            {r.status}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {r.reviewedAt ? formatDate(r.reviewedAt) : '—'}
                          {r.rejectionReason && (
                            <span className="block text-sm text-muted-foreground">Rejection: {r.rejectionReason}</span>
                          )}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="outline" size="sm" onClick={() => openDetails(r)}>
                            View
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      )}

      {isQA && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle>Cancellation requests</CardTitle>
            <CardDescription>
              Review and approve or reject lecturer cancellation requests. Filters apply to the table below.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 bg-muted/30">
              <Filter className="h-4 w-4 text-muted-foreground" />
              <Input type="date" className="w-[140px]" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} placeholder="From" />
              <Input type="date" className="w-[140px]" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} placeholder="To" />
              <Select value={qaStatusFilter} onValueChange={(v: 'All' | 'Pending' | 'Approved' | 'Rejected') => setQaStatusFilter(v)}>
                <SelectTrigger className="w-[120px]">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="All">All</SelectItem>
                  <SelectItem value="Pending">Pending</SelectItem>
                  <SelectItem value="Approved">Approved</SelectItem>
                  <SelectItem value="Rejected">Rejected</SelectItem>
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={handleRefresh} disabled={loadingPending || loadingHistory}>
                <RefreshCw className={`h-4 w-4 mr-1 ${loadingPending || loadingHistory ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            </div>
            <div className="rounded-md border bg-white overflow-x-auto">
              <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-12">#</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Session</TableHead>
                  <TableHead>Lecturer</TableHead>
                  <TableHead>Reason</TableHead>
                  <TableHead>Requested</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Reviewed</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {loadingPending || loadingHistory ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                    </TableCell>
                  </TableRow>
                ) : filteredQAList.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center py-12 text-muted-foreground">
                      {pendingList.length === 0 && historyList.length === 0 ? 'No cancellation requests.' : 'No records match the filters.'}
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredQAList.map((r, idx) => (
                    <TableRow key={r.id}>
                      <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                      <TableCell>{formatDate(r.timetable.date)}</TableCell>
                      <TableCell>
                        <SessionCell r={r} />
                      </TableCell>
                      <TableCell>
                        {r.requestedBy.firstName} {r.requestedBy.lastName}
                      </TableCell>
                      <TableCell className="max-w-xs">{r.reason}</TableCell>
                      <TableCell>{formatDate(r.requestedAt)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            r.status === 'Approved' ? 'default' : r.status === 'Rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {r.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {r.reviewedAt ? formatDate(r.reviewedAt) : '—'}
                        {r.rejectionReason && (
                          <span className="block text-sm text-muted-foreground">Rejection: {r.rejectionReason}</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right space-x-2">
                        {r.status === 'Pending' ? (
                          <>
                            <Button
                              size="sm"
                              variant="default"
                              onClick={() => handleApprove(r.id)}
                              disabled={approvingId === r.id}
                            >
                              {approvingId === r.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4" />}
                              Approve
                            </Button>
                            <Button
                              size="sm"
                              variant="destructive"
                              onClick={() => setRejectingId(r.id)}
                              disabled={rejectingId === r.id}
                            >
                              <XCircle className="h-4 w-4" /> Reject
                            </Button>
                          </>
                        ) : null}
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => openDetails(r)}
                        >
                          View
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
            {(() => {
              const combinedTotal = pendingTotal + historyTotal;
              const combinedPageSize = 2 * pageSize;
              const totalPages = Math.max(1, Math.ceil(combinedTotal / combinedPageSize));
              if (combinedTotal === 0) return null;
              return (
                <div className="flex items-center justify-between border-t px-4 py-2">
                  <span className="text-sm text-muted-foreground">{combinedTotal} total</span>
                  <div className="flex items-center gap-2">
                    <Button variant="outline" size="sm" disabled={qaPage <= 1} onClick={() => setQaPage(p => p - 1)}>Previous</Button>
                    <span className="text-sm">Page {qaPage} of {totalPages}</span>
                    <Button variant="outline" size="sm" disabled={qaPage >= totalPages} onClick={() => setQaPage(p => p + 1)}>Next</Button>
                  </div>
                </div>
              );
            })()}
            </div>
          </CardContent>
        </Card>
      )}

        </TabsContent>

        <TabsContent value="substitutions" className="space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <p className="text-sm text-muted-foreground">
              {isLecturer
                ? 'Plan ahead by proposing a peer to substitute for your session. Once approved, QA can record the lecture against the approved substitute automatically.'
                : 'Approve or reject substitute lecturer requests from staff. Approved requests auto-prefill the QA recording form.'}
            </p>
            {isLecturer && (
              <Button onClick={openSubAddModal}>
                <UserCog className="h-4 w-4 mr-2" />
                Request substitute
              </Button>
            )}
          </div>

          {isLecturer && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>My substitution requests</CardTitle>
                <CardDescription>
                  Substitutes you have proposed, or where you have been proposed as the substitute.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 bg-muted/30">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Select value={subStatusFilter} onValueChange={(v: any) => setSubStatusFilter(v)}>
                    <SelectTrigger className="w-[130px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Input type="date" className="w-[140px]" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  <Input type="date" className="w-[140px]" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                  <Button variant="outline" size="sm" onClick={handleRefreshSub} disabled={loadingMineSub}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingMineSub ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <div className="rounded-md border bg-white overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Substitute</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Reviewed</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingMineSub ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredMySubRequests.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            {mySubRequests.length === 0
                              ? 'No substitution requests yet. Click Request substitute to submit one.'
                              : 'No records match the filters.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredMySubRequests.map((r, idx) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>{formatDate(r.timetable.date)}</TableCell>
                            <TableCell>
                              {r.className ?? '—'}
                              {(r.courseCode ?? r.courseName) && (
                                <span className="text-muted-foreground"> ({r.courseCode ?? r.courseName})</span>
                              )}
                              {r.timetable?.startTime != null && r.timetable?.endTime != null && (
                                <span className="text-muted-foreground block text-xs">
                                  {formatTime(r.timetable.startTime)}–{formatTime(r.timetable.endTime)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.proposedSubstitute.firstName} {r.proposedSubstitute.lastName}
                            </TableCell>
                            <TableCell className="max-w-xs truncate">{r.reason}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === 'Approved' ? 'default' : r.status === 'Rejected' ? 'destructive' : 'secondary'
                                }
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell>
                              {r.reviewedAt ? formatDate(r.reviewedAt) : '—'}
                              {r.rejectionReason && (
                                <span className="block text-sm text-muted-foreground">
                                  Rejection: {r.rejectionReason}
                                </span>
                              )}
                            </TableCell>
                            <TableCell className="text-right">
                              <Button variant="outline" size="sm" onClick={() => openSubDetails(r)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                </div>
              </CardContent>
            </Card>
          )}

          {isQA && (
            <Card>
              <CardHeader className="pb-3">
                <CardTitle>Substitution requests</CardTitle>
                <CardDescription>
                  Approve or reject lecturer substitution requests. Approved entries auto-prefill the QA recording form.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex flex-wrap items-center gap-3 rounded-md border p-3 bg-muted/30">
                  <Filter className="h-4 w-4 text-muted-foreground" />
                  <Input type="date" className="w-[140px]" value={filterDateFrom} onChange={(e) => setFilterDateFrom(e.target.value)} />
                  <Input type="date" className="w-[140px]" value={filterDateTo} onChange={(e) => setFilterDateTo(e.target.value)} />
                  <Select value={qaSubStatusFilter} onValueChange={(v: 'All' | 'Pending' | 'Approved' | 'Rejected') => setQaSubStatusFilter(v)}>
                    <SelectTrigger className="w-[120px]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="All">All</SelectItem>
                      <SelectItem value="Pending">Pending</SelectItem>
                      <SelectItem value="Approved">Approved</SelectItem>
                      <SelectItem value="Rejected">Rejected</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={handleRefreshSub} disabled={loadingPendingSub || loadingHistorySub}>
                    <RefreshCw className={`h-4 w-4 mr-1 ${loadingPendingSub || loadingHistorySub ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                </div>
                <div className="rounded-md border bg-white overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-12">#</TableHead>
                        <TableHead>Date</TableHead>
                        <TableHead>Session</TableHead>
                        <TableHead>Requested by</TableHead>
                        <TableHead>Proposed substitute</TableHead>
                        <TableHead>Reason</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {loadingPendingSub || loadingHistorySub ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                          </TableCell>
                        </TableRow>
                      ) : filteredQASubList.length === 0 ? (
                        <TableRow>
                          <TableCell colSpan={8} className="text-center py-12 text-muted-foreground">
                            {pendingSubList.length === 0 && historySubList.length === 0
                              ? 'No substitution requests.'
                              : 'No records match the filters.'}
                          </TableCell>
                        </TableRow>
                      ) : (
                        filteredQASubList.map((r, idx) => (
                          <TableRow key={r.id}>
                            <TableCell className="text-muted-foreground">{idx + 1}</TableCell>
                            <TableCell>{formatDate(r.timetable.date)}</TableCell>
                            <TableCell>
                              {r.className ?? '—'}
                              {(r.courseCode ?? r.courseName) && (
                                <span className="text-muted-foreground"> ({r.courseCode ?? r.courseName})</span>
                              )}
                              {r.timetable?.startTime != null && r.timetable?.endTime != null && (
                                <span className="text-muted-foreground block text-xs">
                                  {formatTime(r.timetable.startTime)}–{formatTime(r.timetable.endTime)}
                                </span>
                              )}
                            </TableCell>
                            <TableCell>
                              {r.requestedBy.firstName} {r.requestedBy.lastName}
                            </TableCell>
                            <TableCell>
                              {r.proposedSubstitute.firstName} {r.proposedSubstitute.lastName}
                            </TableCell>
                            <TableCell className="max-w-xs">{r.reason}</TableCell>
                            <TableCell>
                              <Badge
                                variant={
                                  r.status === 'Approved' ? 'default' : r.status === 'Rejected' ? 'destructive' : 'secondary'
                                }
                              >
                                {r.status}
                              </Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              {r.status === 'Pending' && role !== 'Management' ? (
                                <>
                                  <Button
                                    size="sm"
                                    variant="default"
                                    onClick={() => handleApproveSub(r.id)}
                                    disabled={approvingSubId === r.id}
                                  >
                                    {approvingSubId === r.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <CheckCircle className="h-4 w-4" />
                                    )}
                                    Approve
                                  </Button>
                                  <Button
                                    size="sm"
                                    variant="destructive"
                                    onClick={() => setRejectingSubId(r.id)}
                                    disabled={rejectingSubId === r.id}
                                  >
                                    <XCircle className="h-4 w-4" /> Reject
                                  </Button>
                                </>
                              ) : null}
                              <Button size="sm" variant="outline" onClick={() => openSubDetails(r)}>
                                View
                              </Button>
                            </TableCell>
                          </TableRow>
                        ))
                      )}
                    </TableBody>
                  </Table>
                  {(() => {
                    const combinedTotal = pendingSubTotal + historySubTotal;
                    const combinedPageSize = 2 * pageSize;
                    const totalPages = Math.max(1, Math.ceil(combinedTotal / combinedPageSize));
                    if (combinedTotal === 0) return null;
                    return (
                      <div className="flex items-center justify-between border-t px-4 py-2">
                        <span className="text-sm text-muted-foreground">{combinedTotal} total</span>
                        <div className="flex items-center gap-2">
                          <Button variant="outline" size="sm" disabled={qaSubPage <= 1} onClick={() => setQaSubPage((p) => p - 1)}>Previous</Button>
                          <span className="text-sm">Page {qaSubPage} of {totalPages}</span>
                          <Button variant="outline" size="sm" disabled={qaSubPage >= totalPages} onClick={() => setQaSubPage((p) => p + 1)}>Next</Button>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>Select a session, provide a reason, and optionally when you will compensate the lesson. QA will review your request.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date range (sessions)</Label>
              <div className="flex gap-2">
                <Input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                />
                <Input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Select
                value={selectedTimetableId}
                onValueChange={setSelectedTimetableId}
                disabled={loadingSessions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingSessions
                        ? 'Loading…'
                        : scheduledNotRequested.length === 0
                          ? (sessions.length === 0 ? 'No sessions in this date range' : 'No schedulable sessions left')
                          : 'Select session'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {scheduledNotRequested.map((s) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatDate(s.date)} {s.className ?? s.courseName} {s.venue} ({formatTime(s.startTime)}–{formatTime(s.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!loadingSessions && sessions.length === 0 && (
                <p className="text-xs text-muted-foreground">
                  Sessions are loaded from the timetable for the date range above. If your classes do not appear, the timetable may not have slots for this period yet.
                </p>
              )}
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Reason for cancellation"
                value={reason}
                onChange={(e) => setReason(e.target.value)}
                rows={3}
              />
            </div>
            <div className="border-t pt-4 space-y-3">
              <Label className="text-sm font-medium">Compensation (optional)</Label>
              <p className="text-xs text-muted-foreground">When you will make up this lesson. If provided, QA will schedule it on approval.</p>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date</Label>
                  <Input
                    type="date"
                    value={compensationDate}
                    onChange={(e) => setCompensationDate(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Start time</Label>
                  <Input
                    type="time"
                    value={compensationStartTime}
                    onChange={(e) => setCompensationStartTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">End time</Label>
                  <Input
                    type="time"
                    value={compensationEndTime}
                    onChange={(e) => setCompensationEndTime(e.target.value)}
                  />
                </div>
                <div className="space-y-1 col-span-2">
                  <Label className="text-xs">Venue (optional, default: same as cancelled)</Label>
                  <Input
                    placeholder="e.g. Room 101"
                    value={compensationVenue}
                    onChange={(e) => setCompensationVenue(e.target.value)}
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setAddModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleSubmit} disabled={submitting || !selectedTimetableId || !reason.trim()}>
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingId} onOpenChange={(open) => !open && setRejectingId(null)}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject request</DialogTitle>
            <DialogDescription>Optionally provide a reason to the lecturer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection reason (optional)</Label>
            <Textarea
              placeholder="Reason for rejection"
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingId(null)}>
              Cancel
            </Button>
            {rejectingId && (
              <Button variant="destructive" onClick={() => handleReject(rejectingId)}>
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={detailsOpen && !!selectedRequest} onOpenChange={setDetailsOpen}>
        <DialogContent className="w-[96vw] max-w-3xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Cancellation details</DialogTitle>
            <DialogDescription>Full information about this cancellation request and any compensation session.</DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Original session date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedRequest.timetable.date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Original time</Label>
                  <p className="text-sm font-medium">
                    {formatTime(selectedRequest.timetable.startTime)}–{formatTime(selectedRequest.timetable.endTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Class</Label>
                  <p className="text-sm font-medium">
                    {selectedRequest.className ?? '—'}
                    {(selectedRequest.courseCode ?? selectedRequest.courseName) && (
                      <span className="text-muted-foreground"> ({selectedRequest.courseCode ?? selectedRequest.courseName})</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Venue</Label>
                  <p className="text-sm font-medium">{selectedRequest.timetable.venue}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Requested by</Label>
                  <p className="text-sm font-medium">
                    {selectedRequest.requestedBy.firstName} {selectedRequest.requestedBy.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge
                    variant={
                      selectedRequest.status === 'Approved'
                        ? 'default'
                        : selectedRequest.status === 'Rejected'
                        ? 'destructive'
                        : 'secondary'
                    }
                  >
                    {selectedRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Requested at</Label>
                  <p className="text-sm font-medium">{formatDate(selectedRequest.requestedAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reviewed at</Label>
                  <p className="text-sm font-medium">
                    {selectedRequest.reviewedAt ? formatDate(selectedRequest.reviewedAt) : '—'}
                  </p>
                </div>
              </div>

              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="text-sm">{selectedRequest.reason}</p>
                {selectedRequest.rejectionReason && (
                  <>
                    <Label className="text-xs text-muted-foreground mt-2">Rejection reason</Label>
                    <p className="text-sm text-muted-foreground">{selectedRequest.rejectionReason}</p>
                  </>
                )}
              </div>

              <div className="border-t pt-4 space-y-2">
                <Label className="text-sm font-medium">Compensation details</Label>
                {selectedRequest.compensationDate && selectedRequest.compensationStartTime && selectedRequest.compensationEndTime ? (
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div>
                      <Label className="text-xs text-muted-foreground">Requested compensation date</Label>
                      <p className="font-medium">{formatDate(selectedRequest.compensationDate)}</p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Requested time</Label>
                      <p className="font-medium">
                        {selectedRequest.compensationStartTime}–{selectedRequest.compensationEndTime}
                      </p>
                    </div>
                    <div>
                      <Label className="text-xs text-muted-foreground">Requested venue</Label>
                      <p className="font-medium">
                        {selectedRequest.compensationVenue || 'Same as cancelled session'}
                      </p>
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground">No compensation date/time was provided on this request.</p>
                )}

                {selectedRequest.compensationTimetable && (
                  <div className="mt-3 rounded-md border p-3 bg-muted/30 text-sm">
                    <Label className="text-xs text-muted-foreground">Scheduled compensation slot</Label>
                    <p>
                      {formatDate(selectedRequest.compensationTimetable.date)}{' '}
                      {formatTime(selectedRequest.compensationTimetable.startTime)}–
                      {formatTime(selectedRequest.compensationTimetable.endTime)}{' '}
                      at {selectedRequest.compensationTimetable.venue}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      <Dialog open={subAddModalOpen} onOpenChange={setSubAddModalOpen}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Request substitute lecturer</DialogTitle>
            <DialogDescription>
              Choose the upcoming session, the peer lecturer who will cover it, and the reason. QA will review and approve.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Date range (sessions)</Label>
              <div className="flex gap-2">
                <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
                <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Session</Label>
              <Select
                value={subSelectedTimetableId}
                onValueChange={setSubSelectedTimetableId}
                disabled={loadingSessions}
              >
                <SelectTrigger className="w-full">
                  <SelectValue
                    placeholder={
                      loadingSessions
                        ? 'Loading…'
                        : scheduledNotSubRequested.length === 0
                          ? sessions.length === 0
                            ? 'No sessions in this date range'
                            : 'No schedulable sessions left'
                          : 'Select session'
                    }
                  />
                </SelectTrigger>
                <SelectContent>
                  {scheduledNotSubRequested.map((s: any) => (
                    <SelectItem key={s.id} value={s.id}>
                      {formatDate(s.date)} {s.className ?? s.courseName} {s.venue} ({formatTime(s.startTime)}–{formatTime(s.endTime)})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Proposed substitute lecturer *</Label>
              <Combobox
                options={substituteCandidates.map((c) => ({
                  value: c.id,
                  label: c.departmentName ? `${c.name} — ${c.departmentName}` : c.name,
                }))}
                value={subSelectedCandidateId}
                selectedLabel={subSelectedCandidateName || undefined}
                onValueChange={(id) => {
                  if (!id) {
                    setSubSelectedCandidateId('');
                    setSubSelectedCandidateName('');
                    return;
                  }
                  const candidate = substituteCandidates.find((c) => c.id === id);
                  setSubSelectedCandidateId(id);
                  setSubSelectedCandidateName(candidate?.name || '');
                }}
                placeholder="Select substitute lecturer"
                searchPlaceholder="Search lecturers by name or department..."
                emptyText="No lecturer found."
                initialDisplayCount={10}
              />
              <p className="text-xs text-muted-foreground">
                You cannot propose yourself. Only active lecturers are listed.
              </p>
            </div>
            <div className="space-y-2">
              <Label>Reason (required)</Label>
              <Textarea
                placeholder="Why is a substitute needed? (e.g. medical leave, conflicting meeting)"
                value={subReason}
                onChange={(e) => setSubReason(e.target.value)}
                rows={3}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setSubAddModalOpen(false)}>Cancel</Button>
            <Button
              onClick={handleSubmitSubstitution}
              disabled={submittingSub || !subSelectedTimetableId || !subSelectedCandidateId || !subReason.trim()}
            >
              {submittingSub ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
              Submit request
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!rejectingSubId} onOpenChange={(open) => !open && setRejectingSubId(null)}>
        <DialogContent className="w-[95vw] max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Reject substitution request</DialogTitle>
            <DialogDescription>Optionally provide a reason to the lecturer.</DialogDescription>
          </DialogHeader>
          <div className="space-y-2">
            <Label>Rejection reason (optional)</Label>
            <Textarea
              placeholder="Reason for rejection"
              value={subRejectReason}
              onChange={(e) => setSubRejectReason(e.target.value)}
              rows={3}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setRejectingSubId(null)}>Cancel</Button>
            {rejectingSubId && (
              <Button variant="destructive" onClick={() => handleRejectSub(rejectingSubId)}>
                Reject
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={subDetailsOpen && !!selectedSubRequest} onOpenChange={setSubDetailsOpen}>
        <DialogContent className="w-[96vw] max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Substitution request details</DialogTitle>
            <DialogDescription>Full information about this request.</DialogDescription>
          </DialogHeader>
          {selectedSubRequest && (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-xs text-muted-foreground">Session date</Label>
                  <p className="text-sm font-medium">{formatDate(selectedSubRequest.timetable.date)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Session time</Label>
                  <p className="text-sm font-medium">
                    {formatTime(selectedSubRequest.timetable.startTime)}–{formatTime(selectedSubRequest.timetable.endTime)}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Class</Label>
                  <p className="text-sm font-medium">
                    {selectedSubRequest.className ?? '—'}
                    {(selectedSubRequest.courseCode ?? selectedSubRequest.courseName) && (
                      <span className="text-muted-foreground"> ({selectedSubRequest.courseCode ?? selectedSubRequest.courseName})</span>
                    )}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Venue</Label>
                  <p className="text-sm font-medium">{selectedSubRequest.timetable.venue}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Requested by</Label>
                  <p className="text-sm font-medium">
                    {selectedSubRequest.requestedBy.firstName} {selectedSubRequest.requestedBy.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Proposed substitute</Label>
                  <p className="text-sm font-medium">
                    {selectedSubRequest.proposedSubstitute.firstName} {selectedSubRequest.proposedSubstitute.lastName}
                  </p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Status</Label>
                  <Badge
                    variant={
                      selectedSubRequest.status === 'Approved'
                        ? 'default'
                        : selectedSubRequest.status === 'Rejected'
                          ? 'destructive'
                          : 'secondary'
                    }
                  >
                    {selectedSubRequest.status}
                  </Badge>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Requested at</Label>
                  <p className="text-sm font-medium">{formatDate(selectedSubRequest.requestedAt)}</p>
                </div>
                <div>
                  <Label className="text-xs text-muted-foreground">Reviewed at</Label>
                  <p className="text-sm font-medium">
                    {selectedSubRequest.reviewedAt ? formatDate(selectedSubRequest.reviewedAt) : '—'}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <Label className="text-xs text-muted-foreground">Reason</Label>
                <p className="text-sm">{selectedSubRequest.reason}</p>
                {selectedSubRequest.rejectionReason && (
                  <>
                    <Label className="text-xs text-muted-foreground mt-2">Rejection reason</Label>
                    <p className="text-sm text-muted-foreground">{selectedSubRequest.rejectionReason}</p>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
