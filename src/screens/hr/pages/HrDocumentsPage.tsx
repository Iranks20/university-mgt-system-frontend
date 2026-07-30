import { useEffect, useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import {
  getCompletedAppraisalArchives,
  getHrAppraisalReviewById,
} from '@/features/hr/hr-appraisal-store';
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

export default function HrDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [search, setSearch] = useState('');
  const [printReview, setPrintReview] = useState<HrAppraisalReview | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    getCompletedAppraisalArchives()
      .then((archives) => {
        if (cancelled) return;
        setDocs(
          archives.map((review) => ({
            id: `appraisal-${review.id}`,
            employeeName: review.employeeName,
            title: review.archivedDocumentTitle ?? `${review.cycleName} — ${review.formTemplateName}`,
            category: 'Appraisal Archive',
            uploadedAt: review.completedAt?.slice(0, 10) ?? review.dueDate,
            cycleName: review.cycleName,
            appraisalReviewId: review.id,
            overallHrScore: review.overallHrScore,
          }))
        );
      })
      .catch(() => {
        if (!cancelled) {
          setDocs([]);
          toast.error('Could not load appraisal archives');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase();
    return docs.filter(
      (d) =>
        !q ||
        d.employeeName.toLowerCase().includes(q) ||
        d.title.toLowerCase().includes(q) ||
        d.cycleName.toLowerCase().includes(q)
    );
  }, [docs, search]);

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
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-gray-500 py-8">
                    No completed appraisals filed yet
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((d) => (
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
