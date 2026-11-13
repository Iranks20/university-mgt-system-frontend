import { useState } from 'react';
import { BarChart3, Clock, Eye, Star } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import type { HrAppraisalReview } from '@/features/hr/types';
import { AppraiseeDetails } from './AppraisalSummaryParts';

export function DoneBadge({ done, doneLabel = 'Done', pendingLabel = 'Pending' }: { done: boolean; doneLabel?: string; pendingLabel?: string }) {
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-semibold ${
        done ? 'bg-green-100 text-green-800' : 'bg-amber-100 text-amber-800'
      }`}
    >
      {done ? '✓' : <Clock className="h-3 w-3" />} {done ? doneLabel : pendingLabel}
    </span>
  );
}

/** "Appraisees Registry": everyone whose supervisor is the signed-in user. */
export function AppraiseesRegistry({
  reviews,
  onOpen,
}: {
  reviews: HrAppraisalReview[];
  onOpen: (review: HrAppraisalReview) => void;
}) {
  const [details, setDetails] = useState<HrAppraisalReview | null>(null);

  if (!reviews.length) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-gray-500">
        No appraisees are assigned to you in an open appraisal period.
      </div>
    );
  }

  return (
    <>
      <div className="rounded-lg border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>School</TableHead>
              <TableHead>Department</TableHead>
              <TableHead>Self Assessment</TableHead>
              <TableHead>Supervisor Rating</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {reviews.map((row) => {
              const selfDone = row.progress.selfAssessment;
              const rated = row.progress.supervisorRating;
              return (
                <TableRow key={row.id}>
                  <TableCell>
                    <div className="font-semibold">{row.employeeName}</div>
                    <div className="text-xs text-gray-500">{row.employeeEmail}</div>
                    <div className="text-xs text-gray-500">{row.appraisalTypeLabel}</div>
                  </TableCell>
                  <TableCell>{row.agreement.schoolUnit || '—'}</TableCell>
                  <TableCell className="text-gray-600">{row.agreement.departmentName || row.department}</TableCell>
                  <TableCell>
                    <DoneBadge done={selfDone} />
                  </TableCell>
                  <TableCell>
                    <DoneBadge done={rated} />
                  </TableCell>
                  <TableCell className="text-right whitespace-nowrap space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setDetails(row)}>
                      <Eye className="h-4 w-4 mr-1" /> View
                    </Button>
                    {rated ? (
                      <Button size="sm" variant="outline" onClick={() => onOpen(row)}>
                        <BarChart3 className="h-4 w-4 mr-1" /> View Results
                      </Button>
                    ) : selfDone ? (
                      <Button size="sm" onClick={() => onOpen(row)}>
                        <Star className="h-4 w-4 mr-1" /> Start Rating
                      </Button>
                    ) : (
                      <Button size="sm" variant="outline" disabled>
                        Awaiting Self-Rating
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>

      <Dialog open={!!details} onOpenChange={(open) => !open && setDetails(null)}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Appraisee Details</DialogTitle>
            <DialogDescription>{details?.formTemplateName}</DialogDescription>
          </DialogHeader>
          {details ? <AppraiseeDetails review={details} /> : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
