import React, { useState, useEffect, useMemo } from 'react';
import { Send, CheckCircle, XCircle, Loader2, Plus, RefreshCw, Filter } from 'lucide-react';
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
import { useRole } from '@/components/RoleProvider';
import { cancellationsService, timetableService } from '@/services';
import type { CancellationRequest } from '@/services/cancellations.service';
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
      const res = await timetableService.getMyScheduledSessions({ dateFrom, dateTo, limit: 100 });
      setSessions(res?.data ?? []);
    } catch (e) {
      toast.error(e instanceof Error ? e.message : 'Failed to load sessions');
      setSessions([]);
    } finally {
      setLoadingSessions(false);
    }
  };

  useEffect(() => {
    loadMyRequests();
  }, [isLecturer]);

  useEffect(() => {
    if (isQA) {
      loadPending();
      loadHistory();
    }
  }, [isQA, qaPage]);

  useEffect(() => {
    if (isLecturer && dateFrom && dateTo) loadSessions();
  }, [isLecturer, dateFrom, dateTo]);

  const handleSubmit = async () => {
    if (!selectedTimetableId || !reason.trim()) {
      toast.error('Select a session and enter a reason');
      return;
    }
    setSubmitting(true);
    try {
      await cancellationsService.submit({ timetableId: selectedTimetableId, reason: reason.trim() });
      toast.success('Cancellation request submitted');
      setReason('');
      setSelectedTimetableId('');
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

  const scheduledNotRequested = sessions.filter(
    (s) => s.status === 'Scheduled' && !myRequests.some((r) => r.timetableId === s.id)
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

  const openAddModal = () => {
    setReason('');
    setSelectedTimetableId('');
    setAddModalOpen(true);
  };

  const handleRefresh = () => {
    if (isLecturer) loadMyRequests();
    if (isQA) {
      loadPending();
      loadHistory();
    }
  };

  return (
    <div className="p-4 space-y-6 max-w-6xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Cancellation Requests</h1>
          <p className="text-muted-foreground">
            {isLecturer
              ? 'Request cancellation for a scheduled session. QA will review and approve or reject.'
              : 'Review and approve or reject lecturer cancellation requests.'}
          </p>
        </div>
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
            <div className="rounded-md border">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-12">#</TableHead>
                    <TableHead>Date</TableHead>
                    <TableHead>Session</TableHead>
                    <TableHead>Reason</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Reviewed</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {loadingMine ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
                        <Loader2 className="h-5 w-5 animate-spin inline mr-2" /> Loading…
                      </TableCell>
                    </TableRow>
                  ) : filteredMyRequests.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-12 text-muted-foreground">
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
            <div className="rounded-md border">
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

      <Dialog open={addModalOpen} onOpenChange={setAddModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Request cancellation</DialogTitle>
            <DialogDescription>Select a session and provide a reason. QA will review your request.</DialogDescription>
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
                <SelectTrigger>
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
        <DialogContent>
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
    </div>
  );
}
