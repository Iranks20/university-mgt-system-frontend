import { useEffect, useMemo, useState } from 'react';
import { HrPageShell } from '@/components/hr/HrPageShell';
import { getHrDocuments } from '@/features/hr/hr-demo-store';
import {
  getCompletedAppraisalArchives,
  getHrAppraisalReviewById,
} from '@/features/hr/hr-appraisal-store';
import { AppraisalPrintView } from '@/components/hr/AppraisalPrintView';
import type { HrAppraisalReview, HrDocument } from '@/features/hr/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { FileText, Upload, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { toast } from 'sonner';

type DocumentRow = {
  id: string;
  employeeName: string;
  title: string;
  category: HrDocument['category'] | 'Appraisal Archive';
  uploadedAt: string;
  expiresAt: string | null;
  fileName: string;
  appraisalReviewId?: string;
};

export default function HrDocumentsPage() {
  const [docs, setDocs] = useState<DocumentRow[]>([]);
  const [search, setSearch] = useState('');
  const [printReview, setPrintReview] = useState<HrAppraisalReview | null>(null);
  const [loadingArchive, setLoadingArchive] = useState(false);

  useEffect(() => {
    const mockDocs: DocumentRow[] = getHrDocuments().map((doc) => ({ ...doc }));
    setDocs(mockDocs);

    setLoadingArchive(true);
    getCompletedAppraisalArchives()
      .then((archives) => {
        const archiveRows: DocumentRow[] = archives.map((review) => ({
          id: `appraisal-${review.id}`,
          employeeName: review.employeeName,
          title: review.archivedDocumentTitle ?? `${review.cycleName} — ${review.formTemplateName}`,
          category: 'Appraisal Archive',
          uploadedAt: review.completedAt?.slice(0, 10) ?? review.dueDate,
          expiresAt: null,
          fileName: 'View appraisal',
          appraisalReviewId: review.id,
        }));
        setDocs([...archiveRows, ...mockDocs]);
      })
      .catch(() => undefined)
      .finally(() => setLoadingArchive(false));
  }, []);

  const expiringSoon = useMemo(
    () =>
      docs.filter((d) => d.expiresAt && new Date(d.expiresAt) <= new Date('2026-12-31')),
    [docs]
  );

  const filtered = docs.filter((d) => {
    const q = search.toLowerCase();
    return (
      !q ||
      d.employeeName.toLowerCase().includes(q) ||
      d.title.toLowerCase().includes(q) ||
      d.category.toLowerCase().includes(q)
    );
  });

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
      description="Contracts, appointment letters, certificates, and filed performance appraisals."
      actions={
        <Button onClick={() => toast.info('Document upload will connect to backend')}>
          <Upload className="h-4 w-4 mr-2" /> Upload Document
        </Button>
      }
    >
      {expiringSoon.length > 0 ? (
        <Card className="border-amber-200 bg-amber-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-base flex items-center gap-2 text-amber-900">
              <AlertTriangle className="h-4 w-4" />
              Contracts expiring within 6 months
            </CardTitle>
          </CardHeader>
          <CardContent className="text-sm text-amber-900">
            {expiringSoon.map((d) => (
              <div key={d.id}>
                {d.employeeName} — {d.title} (expires {d.expiresAt})
              </div>
            ))}
          </CardContent>
        </Card>
      ) : null}

      <Card>
        <CardHeader>
          <Input
            placeholder="Search documents..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="max-w-md"
          />
          {loadingArchive ? (
            <p className="text-xs text-gray-500 mt-2">Loading completed appraisal archives...</p>
          ) : null}
        </CardHeader>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Employee</TableHead>
                <TableHead>Document</TableHead>
                <TableHead>Category</TableHead>
                <TableHead>Uploaded</TableHead>
                <TableHead>Expires</TableHead>
                <TableHead>File</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map((d) => (
                <TableRow key={d.id}>
                  <TableCell>{d.employeeName}</TableCell>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell>
                    <Badge variant={d.category === 'Appraisal Archive' ? 'default' : 'secondary'}>
                      {d.category}
                    </Badge>
                  </TableCell>
                  <TableCell>{d.uploadedAt}</TableCell>
                  <TableCell>{d.expiresAt || '—'}</TableCell>
                  <TableCell>
                    {d.appraisalReviewId ? (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => openAppraisalArchive(d.appraisalReviewId!)}
                      >
                        <ClipboardCheck className="h-4 w-4 mr-1" /> {d.fileName}
                      </Button>
                    ) : (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toast.info('Preview will connect to file storage')}
                      >
                        <FileText className="h-4 w-4 mr-1" /> {d.fileName}
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
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
