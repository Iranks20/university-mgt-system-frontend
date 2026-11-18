import { useRef } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { HrAppraisalReview } from '@/features/hr/types';
import { printElement } from '@/features/hr/print-element';
import { AppraisalReport } from '@/components/hr/appraisal/AppraisalReport';

/** Printable appraisal (same order as the previous system's PDF) with a Print / Save as PDF button. */
export function AppraisalPrintView({ review }: { review: HrAppraisalReview }) {
  const ref = useRef<HTMLDivElement>(null);
  return (
    <div className="min-w-0 space-y-4">
      <div className="flex justify-end">
        <Button
          type="button"
          onClick={() => ref.current && printElement(ref.current, `Appraisal — ${review.employeeName}`)}
        >
          <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
        </Button>
      </div>
      <div ref={ref}>
        <AppraisalReport review={review} showHeader />
      </div>
    </div>
  );
}

/** Button that prints a review without showing it first. */
export function PrintAppraisalButton({
  targetRef,
  review,
}: {
  targetRef: React.RefObject<HTMLDivElement | null>;
  review: HrAppraisalReview;
}) {
  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => targetRef.current && printElement(targetRef.current, `Appraisal — ${review.employeeName}`)}
    >
      <Printer className="h-4 w-4 mr-2" /> Print / Save as PDF
    </Button>
  );
}
