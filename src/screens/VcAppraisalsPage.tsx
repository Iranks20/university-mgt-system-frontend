import { useEffect, useRef, useState } from 'react';
import { useSearchParams } from 'react-router';
import { ArrowLeft, BarChart3, ClipboardCheck, Eye, Loader2, Search, Send } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { TablePagination } from '@/components/ui/table-pagination';
import { useAuth } from '@/contexts/AuthContext';
import { getApiErrorMessage } from '@/lib/api';
import { emptyPage, type Paged } from '@/lib/pagination';
import { usePaging } from '@/hooks/usePaging';
import { hrAppraisalService } from '@/services/hr-appraisal.service';
import type { HrAppraisalReview } from '@/features/hr/types';
import { formatPercent } from '@/features/hr/appraisal-form-utils';
import { appraisalStatusBadge } from '@/components/hr/HrBadges';
import { PrintAppraisalButton } from '@/components/hr/AppraisalPrintView';
import { AppraisalReport, ReportBlock } from '@/components/hr/appraisal/AppraisalReport';
import { SignatureCapture, type SignatureCaptureHandle } from '@/components/hr/appraisal/Signature';

function VcReviewDetail({ reviewId, onBack, onChanged }: { reviewId: string; onBack: () => void; onChanged: () => void }) {
  const { user } = useAuth();
  const [review, setReview] = useState<HrAppraisalReview | null>(null);
  const [comments, setComments] = useState('');
  const [busy, setBusy] = useState(false);
  const signatureRef = useRef<SignatureCaptureHandle>(null);
  const reportRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    hrAppraisalService
      .getReview(reviewId)
      .then(setReview)
      .catch((error) => toast.error(getApiErrorMessage(error, 'Could not load the appraisal')));
  }, [reviewId]);

  if (!review) {
    return (
      <div className="flex items-center justify-center py-16 text-gray-500">
        <Loader2 className="h-5 w-5 animate-spin mr-2" /> Loading appraisal…
      </div>
    );
  }

  const submit = async () => {
    if (!comments.trim()) {
      toast.error('Enter your final comment');
      return;
    }
    const sig = signatureRef.current?.read();
    if (!sig || 'error' in sig) {
      toast.error(sig && 'error' in sig ? sig.error : 'Please sign');
      return;
    }
    setBusy(true);
    try {
      const saved = await hrAppraisalService.vcSign(review.id, {
        vcComments: comments.trim(),
        signerName: user?.name,
        ...sig,
      });
      setReview(saved);
      onChanged();
      toast.success('VC comment submitted. The appraisal process is now complete.');
    } catch (error) {
      toast.error(getApiErrorMessage(error, 'Could not submit your comment'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Button variant="ghost" size="sm" onClick={onBack}>
            <ArrowLeft className="h-4 w-4 mr-1" /> Ratings Overview
          </Button>
          <h2 className="mt-2 text-xl font-bold">Final Review — {review.employeeName}</h2>
          <p className="text-sm text-gray-500">
            {review.cycleName} · {review.formTemplateName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {appraisalStatusBadge(review.status)}
          <PrintAppraisalButton targetRef={reportRef} review={review} />
        </div>
      </div>

      <div ref={reportRef}>
        <AppraisalReport review={review} showHeader />
      </div>

      {review.statusCode === 'VcReview' ? (
        <ReportBlock title="VC Final Comment">
          <div className="space-y-4">
            <div>
              <Label htmlFor="vc-comment">VC Comment</Label>
              <Textarea
                id="vc-comment"
                className="mt-1"
                rows={4}
                placeholder="Enter your final comments on this appraisal…"
                value={comments}
                onChange={(e) => setComments(e.target.value)}
                disabled={busy}
              />
            </div>
            <SignatureCapture ref={signatureRef} disabled={busy} />
            <div className="flex justify-end">
              <Button onClick={submit} disabled={busy}>
                <Send className="h-4 w-4 mr-2" /> Submit final comment
              </Button>
            </div>
          </div>
        </ReportBlock>
      ) : null}
    </div>
  );
}

/** Vice Chancellor: appraisals signed by HR, for final comment and signature. */
export default function VcAppraisalsPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const reviewId = searchParams.get('review');
  const paging = usePaging('vc');
  const [rows, setRows] = useState<Paged<HrAppraisalReview>>(() => emptyPage());
  const [search, setSearch] = useState('');
  const [debounced, setDebounced] = useState('');
  const [version, setVersion] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const t = setTimeout(() => setDebounced(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    hrAppraisalService
      .getVcReviews({ page: paging.page, limit: paging.pageSize, search: debounced || undefined })
      .then((r) => !cancelled && setRows(r))
      .catch((error) => {
        if (!cancelled) {
          setRows(emptyPage(paging.pageSize));
          toast.error(getApiErrorMessage(error, 'Could not load appraisals'));
        }
      })
      .finally(() => !cancelled && setLoading(false));
    return () => {
      cancelled = true;
    };
  }, [paging.page, paging.pageSize, debounced, version]);

  return (
    <div className="p-6 space-y-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
          <ClipboardCheck className="h-7 w-7 text-[#015F2B]" />
          Ratings Overview
        </h1>
        <p className="text-gray-500 mt-1">Appraisals verified by HR, for your final review</p>
      </div>

      {reviewId ? (
        <VcReviewDetail
          key={reviewId}
          reviewId={reviewId}
          onBack={() => setSearchParams({})}
          onChanged={() => setVersion((v) => v + 1)}
        />
      ) : (
        <Card>
          <CardHeader className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <CardTitle className="text-base">Appraisal Records for Final Review</CardTitle>
              <CardDescription>Open an appraisal to read it in full and give your final comment.</CardDescription>
            </div>
            <div className="relative w-full sm:w-72">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                className="pl-9"
                placeholder="Search staff"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  paging.setPage(1);
                }}
              />
            </div>
          </CardHeader>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Staff Name</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Form</TableHead>
                  <TableHead>Supervisor score</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Action</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.data.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={6} className="py-10 text-center text-gray-500">
                      {loading ? 'Loading…' : 'No appraisals received'}
                    </TableCell>
                  </TableRow>
                ) : null}
                {rows.data.map((r) => {
                  const signed = r.progress.vcSigned;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-semibold">{r.employeeName}</TableCell>
                      <TableCell className="text-sm text-gray-600">{r.employeeEmail}</TableCell>
                      <TableCell className="text-sm">{r.formTemplateName}</TableCell>
                      <TableCell>{formatPercent(r.overallSupervisorScore)}</TableCell>
                      <TableCell>
                        <span
                          className={`inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold ${
                            signed ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
                          }`}
                        >
                          {signed ? 'Signed & Verified by VC' : 'Awaiting VC Review'}
                        </span>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant={signed ? 'outline' : 'default'}
                          onClick={() => setSearchParams({ review: r.id })}
                        >
                          {signed ? (
                            <>
                              <BarChart3 className="h-4 w-4 mr-1" /> View Results
                            </>
                          ) : (
                            <>
                              <Eye className="h-4 w-4 mr-1" /> Review &amp; Comment
                            </>
                          )}
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
            <TablePagination
              page={paging.page}
              pageSize={paging.pageSize}
              total={rows.total}
              onPageChange={paging.setPage}
              onPageSizeChange={paging.setPageSize}
            />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
