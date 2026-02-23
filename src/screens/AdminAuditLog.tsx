import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { Shield, Search, Filter, Loader2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { adminService, type AuditLogEntry } from '@/services/admin.service';

const PAGE_SIZE = 20;
const ACTIONS = ['CREATE', 'UPDATE', 'DELETE', 'LOGIN', 'LOGOUT', 'EXPORT', 'IMPORT', 'VIEW'];

export default function AdminAuditLog() {
  const navigate = useNavigate();
  const [entries, setEntries] = useState<AuditLogEntry[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [actionFilter, setActionFilter] = useState<string>('');
  const [entityFilter, setEntityFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const loadLog = async () => {
    setLoading(true);
    try {
      const res = await adminService.getAuditLog({
        page,
        limit: PAGE_SIZE,
        action: actionFilter || undefined,
        entity: entityFilter || undefined,
        startDate: startDate || undefined,
        endDate: endDate || undefined,
      });
      setEntries(Array.isArray(res.data) ? res.data : (res as any).data ?? []);
      setTotal((res as any).total ?? 0);
    } catch {
      setEntries([]);
      setTotal(0);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadLog();
  }, [page, actionFilter, entityFilter, startDate, endDate]);

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-gray-900 flex items-center gap-2">
            <Shield className="h-8 w-8 text-[#015F2B]" />
            Audit Log
          </h1>
          <p className="text-gray-500">System activity and security events.</p>
        </div>
        <Button variant="outline" onClick={() => navigate(-1)}>
          Back
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Filter by action, entity, or date range.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-4">
          <div className="space-y-2">
            <Label>Action</Label>
            <Select value={actionFilter || 'all'} onValueChange={(v) => setActionFilter(v === 'all' ? '' : v)}>
              <SelectTrigger className="w-[140px]">
                <SelectValue placeholder="All" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All</SelectItem>
                {ACTIONS.map((a) => (
                  <SelectItem key={a} value={a}>{a}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Entity</Label>
            <Input
              placeholder="e.g. User, Auth"
              value={entityFilter}
              onChange={(e) => setEntityFilter(e.target.value)}
              className="w-[140px]"
            />
          </div>
          <div className="space-y-2">
            <Label>From date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="space-y-2">
            <Label>To date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              className="w-[160px]"
            />
          </div>
          <div className="flex items-end">
            <Button variant="secondary" onClick={loadLog}>
              <Filter className="h-4 w-4 mr-2" />
              Apply
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Log entries</CardTitle>
          <CardDescription>Page {page} of {totalPages} ({total} total)</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Time</TableHead>
                    <TableHead>User</TableHead>
                    <TableHead>Action</TableHead>
                    <TableHead>Entity</TableHead>
                    <TableHead>Details</TableHead>
                    <TableHead>IP</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {entries.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                        No audit log entries found.
                      </TableCell>
                    </TableRow>
                  ) : (
                    entries.map((entry) => (
                      <TableRow key={entry.id}>
                        <TableCell className="whitespace-nowrap text-sm text-gray-600">
                          {entry.createdAt ? new Date(entry.createdAt).toLocaleString() : '—'}
                        </TableCell>
                        <TableCell>
                          <div className="text-sm font-medium">{entry.userName ?? entry.userEmail ?? '—'}</div>
                          {entry.userEmail && entry.userName !== entry.userEmail && (
                            <div className="text-xs text-gray-500">{entry.userEmail}</div>
                          )}
                        </TableCell>
                        <TableCell>
                          <span className="inline-flex items-center rounded-md bg-gray-100 px-2 py-0.5 text-xs font-medium text-gray-800">
                            {entry.action}
                          </span>
                        </TableCell>
                        <TableCell className="text-sm">{entry.entity}{entry.entityId ? ` #${entry.entityId.slice(0, 8)}` : ''}</TableCell>
                        <TableCell className="max-w-[200px] truncate text-sm text-gray-600" title={entry.details ?? ''}>
                          {entry.details ?? '—'}
                        </TableCell>
                        <TableCell className="text-xs text-gray-500">{entry.ipAddress ?? '—'}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              {totalPages > 1 && (
                <div className="flex items-center justify-between mt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page <= 1}
                    onClick={() => setPage((p) => p - 1)}
                  >
                    <ChevronLeft className="h-4 w-4" />
                    Previous
                  </Button>
                  <span className="text-sm text-gray-600">
                    Page {page} of {totalPages}
                  </span>
                  <Button
                    variant="outline"
                    size="sm"
                    disabled={page >= totalPages}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
