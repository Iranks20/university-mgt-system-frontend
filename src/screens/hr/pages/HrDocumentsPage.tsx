import { useEffect, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { getHrAppraisalReviewById } from '@/features/hr/hr-appraisal-store';
import { hrAppraisalService } from '@/services/hr-appraisal.service';
import { TablePagination } from '@/components/ui/table-pagination';
import { emptyPage, type Paged } from '@/lib/pagination';
import { usePaging } from '@/hooks/usePaging';
import { useDebounced } from '@/hooks/useDebounced';
import { AppraisalPrintView } from '@/components/hr/AppraisalPrintView';
import type { HrAppraisalReview } from '@/features/hr/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

type DocumentRow = {
  id: string;
  employeeName: string;
  title: string;
  category: 'Appraisal Archive';
  uploadedAt: string;
  cycleName: string;
  appraisalReviewId: string;
  overallHrScore?: number | null;
};

function toDocumentRow(review: HrAppraisalReview): DocumentRow {
  return {
    id: `appraisal-${review.id}`,
    employeeName: review.employeeName,
    title: review.archivedDocumentTitle ?? `${review.cycleName} — ${review.formTemplateName}`,
    category: 'Appraisal Archive',
    uploadedAt: review.completedAt?.slice(0, 10) ?? review.dueDate,
    cycleName: review.cycleName,
    appraisalReviewId: review.id,
    overallHrScore: review.overallHrScore,
  };
}

export default function HrDocumentsPage() {
  const [docs, setDocs] = useState<Paged<DocumentRow>>(() => emptyPage());
  const [search, setSearch] = useState('');
  const [printReview, setPrintReview] = useState<HrAppraisalReview | null>(null);
  const [loading, setLoading] = useState(true);
  const debouncedSearch = useDebounced(search.trim());
  const paging = usePaging(debouncedSearch);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    hrAppraisalService
      .getArchives({
        page: paging.page,
        limit: paging.pageSize,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
      })
      .then((archives) => {
        if (!cancelled) setDocs({ ...archives, data: archives.data.map(toDocumentRow) });
      })
      .catch(() => {
        if (!cancelled) {
          setDocs(emptyPage(paging.pageSize));
          toast.error('Could not load appraisal archives');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [debouncedSearch, paging.page, paging.pageSize]);

  const openAppraisalArchive = async (reviewId: string) => {
    const review = await getHrAppraisalReviewById(reviewId);
    if (!review) {
      toast.error('Appraisal record not found');
      return;
    }
    setPrintReview(review);
  };

  return (
    <HrPageShell
      title="HR Documents"
      description="Completed appraisal filings"
    >
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Appraisal archives</CardTitle>
          <Input
            placeholder="Search employee, cycle, or title…"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md mt-2"
          />
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Cycle</TableHead>
                <TableHead>Filed</TableHead>
                <TableHead>HR score</TableHead>
                <TableHead>Action</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    Loading…
                  </TableCell>
                </TableRow>
              ) : docs.data.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    {debouncedSearch ? 'No archives match your search' : 'No completed appraisals filed yet'}
                  </TableCell>
                </TableRow>
              ) : (
                docs.data.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-medium">{d.employeeName}</TableCell>
                    <TableCell>{d.title}</TableCell>
                    <TableCell>{d.cycleName}</TableCell>
                    <TableCell>{d.uploadedAt}</TableCell>
                    <TableCell>{d.overallHrScore != null ? `${d.overallHrScore}%` : '—'}</TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAppraisalArchive(d.appraisalReviewId)}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1" /> View / Print
                      </Button>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
          <TablePagination
            page={paging.page}
            pageSize={paging.pageSize}
            total={docs.total}
            onPageChange={paging.setPage}
            onPageSizeChange={paging.setPageSize}
            disabled={loading}
          />
        </CardContent>
      </Card>

      <Dialog open={!!printReview} onOpenChange={() => setPrintReview(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto print:max-w-none">
          {printReview ? (
            <>
              <DialogHeader className="print:hidden">
                <DialogTitle>Archived appraisal</DialogTitle>
              </DialogHeader>
              <AppraisalPrintView review={printReview} />
              <DialogFooter className="print:hidden">
                <Button onClick={() => window.print()}>Print / Save as PDF</Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </HrPageShell>
  );
}
