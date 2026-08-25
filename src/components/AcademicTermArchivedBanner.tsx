import { AlertCircle } from 'lucide-react';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import type { AcademicTerm } from '@/services/academic.service';
import { TERM_FILTER_ACTIVE, TERM_FILTER_ALL } from '@/components/AcademicTermFilter';

export function AcademicTermArchivedBanner({
  term,
  termFilter,
}: {
  term: AcademicTerm | null | undefined;
  termFilter: string;
}) {
  if (!term || term.status !== 'Closed') return null;
  if (termFilter === TERM_FILTER_ACTIVE || termFilter === TERM_FILTER_ALL) return null;

  return (
    <Alert className="border-slate-300 bg-slate-50 text-slate-900">
      <AlertCircle className="h-4 w-4" />
      <AlertTitle>Viewing archived term — read-only</AlertTitle>
      <AlertDescription>
        {term.name} is closed. Operational edits (attendance, timetable, enrollment) apply to the
        Active term only.
      </AlertDescription>
    </Alert>
  );
}
