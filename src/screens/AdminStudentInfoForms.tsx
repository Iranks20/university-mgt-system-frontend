import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Check, Copy, Download, Loader2, QrCode, Search, X } from 'lucide-react';
import { ResetFiltersButton } from '@/components/ui/reset-filters-button';
import { QRCodeCanvas } from 'qrcode.react';
import { saveAs } from 'file-saver';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
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
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import {
  studentInfoFormService,
  type StudentInfoFormSubmission,
  type StudentInfoSourceType,
  type StudentInfoSponsorType,
  type StudentInfoStatus,
} from '@/services/student-info-form.service';
import { toast } from 'sonner';

export default function AdminStudentInfoForms() {
  const [rows, setRows] = useState<StudentInfoFormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [sourceType, setSourceType] = useState<StudentInfoSourceType | '__all__'>('__all__');
  const [status, setStatus] = useState<StudentInfoStatus | '__all__'>('Pending');
  const [sponsorType, setSponsorType] = useState<StudentInfoSponsorType | '__all__'>('__all__');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<StudentInfoFormSubmission | null>(null);
  const [reviewNote, setReviewNote] = useState('');
  const [acting, setActing] = useState(false);
  const [qrOpen, setQrOpen] = useState(false);
  const qrCanvasRef = useRef<HTMLCanvasElement>(null);

  const resetFilters = () => {
    setSearch('');
    setSourceType('__all__');
    setStatus('Pending');
    setSponsorType('__all__');
    setPage(1);
  };

  const hasFiltersApplied =
    search.trim() !== '' ||
    sourceType !== '__all__' ||
    status !== 'Pending' ||
    sponsorType !== '__all__';

  const publicFormUrl = useMemo(
    () => `${window.location.origin}/student-info-correction`,
    [],
  );

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentInfoFormService.list({
        search: search.trim() || undefined,
        sourceType: sourceType === '__all__' ? '' : sourceType,
        status: status === '__all__' ? '' : status,
        sponsorType: sponsorType === '__all__' ? '' : sponsorType,
        page,
        limit: 20,
      });
      setRows(res.data || []);
      setTotalPages(res.totalPages || 1);
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to load submissions');
    } finally {
      setLoading(false);
    }
  }, [search, sourceType, status, sponsorType, page]);

  useEffect(() => {
    load();
  }, [load]);

  const openReview = (row: StudentInfoFormSubmission) => {
    setSelected(row);
    setReviewNote('');
  };

  const handleApprove = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await studentInfoFormService.approve(selected.id, reviewNote.trim() || undefined);
      toast.success('Approved and applied to student records');
      setSelected(null);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Approve failed');
    } finally {
      setActing(false);
    }
  };

  const handleReject = async () => {
    if (!selected) return;
    setActing(true);
    try {
      await studentInfoFormService.reject(selected.id, reviewNote.trim() || undefined);
      toast.success('Submission rejected');
      setSelected(null);
      await load();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Reject failed');
    } finally {
      setActing(false);
    }
  };

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicFormUrl);
      toast.success('Link copied to clipboard');
    } catch {
      toast.error('Could not copy link');
    }
  };

  const handleDownloadQr = () => {
    const canvas = qrCanvasRef.current;
    if (!canvas) return;
    canvas.toBlob((blob) => {
      if (!blob) {
        toast.error('Could not generate QR code image');
        return;
      }
      saveAs(blob, 'student-info-correction-qr.png');
    });
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold">Student info form submissions</h1>
          <p className="text-sm text-muted-foreground">
            Review public form submissions. Existing = matched a current student; New = not in the system.
            Public link: <code className="text-xs">/student-info-correction</code>
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={() => setQrOpen(true)}>
          <QrCode className="h-4 w-4" />
          <span className="ml-2">Share QR code</span>
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
          <CardDescription>Search and filter by source, status, and sponsor.</CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap gap-3">
          <div className="relative min-w-[220px] flex-1">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-8"
              placeholder="Search name, reg no, email…"
              value={search}
              onChange={(e) => {
                setPage(1);
                setSearch(e.target.value);
              }}
            />
          </div>
          <Select
            value={sourceType}
            onValueChange={(v) => {
              setPage(1);
              setSourceType(v as typeof sourceType);
            }}
          >
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Source" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sources</SelectItem>
              <SelectItem value="Existing">Existing</SelectItem>
              <SelectItem value="New">New</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={status}
            onValueChange={(v) => {
              setPage(1);
              setStatus(v as typeof status);
            }}
          >
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Status" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All statuses</SelectItem>
              <SelectItem value="Pending">Pending</SelectItem>
              <SelectItem value="Approved">Approved</SelectItem>
              <SelectItem value="Rejected">Rejected</SelectItem>
            </SelectContent>
          </Select>
          <Select
            value={sponsorType}
            onValueChange={(v) => {
              setPage(1);
              setSponsorType(v as typeof sponsorType);
            }}
          >
            <SelectTrigger className="w-[160px]"><SelectValue placeholder="Sponsor" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="__all__">All sponsors</SelectItem>
              <SelectItem value="KCDK">KCDK</SelectItem>
              <SelectItem value="Other">Other sponsored</SelectItem>
              <SelectItem value="Private">Private</SelectItem>
            </SelectContent>
          </Select>
          <ResetFiltersButton onClick={resetFilters} disabled={!hasFiltersApplied} />
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Submitted</TableHead>
                    <TableHead>Source</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Sponsor</TableHead>
                    <TableHead>Reg No</TableHead>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Program</TableHead>
                    <TableHead></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rows.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="text-center text-muted-foreground">
                        No submissions found
                      </TableCell>
                    </TableRow>
                  ) : (
                    rows.map((row) => (
                      <TableRow key={row.id}>
                        <TableCell className="whitespace-nowrap text-xs">
                          {new Date(row.submittedAt).toLocaleString()}
                        </TableCell>
                        <TableCell>
                          <Badge variant={row.sourceType === 'Existing' ? 'secondary' : 'default'}>
                            {row.sourceType}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          <Badge
                            variant={
                              row.status === 'Approved'
                                ? 'default'
                                : row.status === 'Rejected'
                                  ? 'destructive'
                                  : 'outline'
                            }
                          >
                            {row.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="text-xs">
                          {row.sponsorType === 'Other'
                            ? row.sponsorName || 'Other'
                            : row.sponsorType}
                        </TableCell>
                        <TableCell className="font-mono text-xs">{row.studentNumber}</TableCell>
                        <TableCell>{row.fullName}</TableCell>
                        <TableCell className="text-xs">{row.email}</TableCell>
                        <TableCell className="text-xs">
                          {row.programName || '—'} · Y{row.year}S{row.semester}
                        </TableCell>
                        <TableCell>
                          <Button size="sm" variant="outline" onClick={() => openReview(row)}>
                            Review
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
              <div className="mt-4 flex items-center justify-end gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page <= 1}
                  onClick={() => setPage((p) => p - 1)}
                >
                  Previous
                </Button>
                <span className="text-sm text-muted-foreground">
                  Page {page} of {totalPages}
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  disabled={page >= totalPages}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={Boolean(selected)} onOpenChange={(open) => !open && setSelected(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Review submission</DialogTitle>
            <DialogDescription>
              {selected?.sourceType === 'Existing'
                ? 'Approving will update the matched student and class enrollments.'
                : 'Approving will create a new student record and enroll selected classes.'}
            </DialogDescription>
          </DialogHeader>
          {selected && (
            <div className="space-y-3 text-sm">
              <div className="grid gap-2 sm:grid-cols-2">
                <div><span className="text-muted-foreground">Source:</span> {selected.sourceType}</div>
                <div><span className="text-muted-foreground">Status:</span> {selected.status}</div>
                <div><span className="text-muted-foreground">Reg No:</span> {selected.studentNumber}</div>
                <div><span className="text-muted-foreground">Name:</span> {selected.fullName}</div>
                <div><span className="text-muted-foreground">Email:</span> {selected.email}</div>
                <div><span className="text-muted-foreground">Phone:</span> {selected.phone}</div>
                <div><span className="text-muted-foreground">Gender:</span> {selected.gender}</div>
                <div><span className="text-muted-foreground">DOB:</span> {selected.dateOfBirth}</div>
                <div><span className="text-muted-foreground">Nationality:</span> {selected.nationality}</div>
                <div><span className="text-muted-foreground">NIN / Passport:</span> {selected.nin || '—'}</div>
                <div><span className="text-muted-foreground">Marital:</span> {selected.maritalStatus}</div>
                <div>
                  <span className="text-muted-foreground">Sponsor:</span>{' '}
                  {selected.sponsorType}
                  {selected.sponsorName ? ` (${selected.sponsorName})` : ''}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">O Level:</span> {selected.oLevelSchool}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">A Level:</span> {selected.aLevelSchool || '—'}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Address format:</span>{' '}
                  {selected.permanentAddressFormat}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Address:</span> {selected.physicalAddress}
                </div>
                {selected.permanentAddressFormat === 'Uganda' ? (
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    {[selected.country, selected.region, selected.district, selected.county, selected.subcounty, selected.parish, selected.village]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                ) : (
                  <div className="sm:col-span-2 text-xs text-muted-foreground">
                    {[selected.intlCountry, selected.intlStateProvince, selected.intlCity, selected.intlStreetAddress]
                      .filter(Boolean)
                      .join(' · ')}
                  </div>
                )}
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Heard about us:</span> {selected.howHeardAboutUs}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Disability:</span>{' '}
                  {selected.hasDisability ? selected.disabilityDetails || 'Yes' : 'No'}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Program:</span>{' '}
                  {selected.programName} · Year {selected.year} · Sem {selected.semester} ·{' '}
                  {selected.intakeType}
                </div>
                <div className="sm:col-span-2">
                  <span className="text-muted-foreground">Classes selected:</span>{' '}
                  {selected.classIds.length}
                </div>
              </div>
              {selected.status === 'Pending' && (
                <div className="space-y-2">
                  <Label>Review note (optional)</Label>
                  <Textarea value={reviewNote} onChange={(e) => setReviewNote(e.target.value)} />
                </div>
              )}
            </div>
          )}
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setSelected(null)}>
              Close
            </Button>
            {selected?.status === 'Pending' && (
              <>
                <Button variant="destructive" disabled={acting} onClick={handleReject}>
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <X className="h-4 w-4" />}
                  <span className="ml-2">Reject</span>
                </Button>
                <Button disabled={acting} onClick={handleApprove}>
                  {acting ? <Loader2 className="h-4 w-4 animate-spin" /> : <Check className="h-4 w-4" />}
                  <span className="ml-2">Approve</span>
                </Button>
              </>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={qrOpen} onOpenChange={setQrOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Public form QR code</DialogTitle>
            <DialogDescription>
              Scan with a phone camera to open the student info correction form, or share the link
              below.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col items-center gap-4 py-2">
            <div className="rounded-lg border bg-white p-4">
              <QRCodeCanvas ref={qrCanvasRef} value={publicFormUrl} size={200} marginSize={2} />
            </div>
            <div className="flex w-full items-center gap-2">
              <Input readOnly value={publicFormUrl} className="text-xs" />
              <Button type="button" size="icon" variant="outline" onClick={handleCopyLink}>
                <Copy className="h-4 w-4" />
              </Button>
            </div>
          </div>
          <DialogFooter className="gap-2">
            <Button variant="outline" onClick={() => setQrOpen(false)}>
              Close
            </Button>
            <Button onClick={handleDownloadQr}>
              <Download className="h-4 w-4" />
              <span className="ml-2">Download PNG</span>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
