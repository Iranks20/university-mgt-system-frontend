import { TableCell, TableHead } from '@/components/ui/table';
import type { TimetableExpectationFields } from '@/types/qa';
import { fmtHours } from './ExpectedSessionsDialog';

export function TimetableTotalsHeaderCells({ showRecordedExpected = true }: { showRecordedExpected?: boolean }) {
  return (
    <>
      {showRecordedExpected ? (
        <TableHead className="text-right whitespace-nowrap">REC. EXPECTED</TableHead>
      ) : null}
      <TableHead className="text-right whitespace-nowrap">TT EXPECTED</TableHead>
      <TableHead className="text-right whitespace-nowrap">TT HOURS</TableHead>
      <TableHead className="text-right whitespace-nowrap">NO RECORD</TableHead>
      <TableHead className="text-right whitespace-nowrap">TAUGHT HRS</TableHead>
      <TableHead className="text-right whitespace-nowrap">LOST HRS</TableHead>
      <TableHead className="text-right whitespace-nowrap">COVERAGE</TableHead>
    </>
  );
}

export function TimetableTotalsCells({
  row,
  recordedExpected,
}: {
  row: TimetableExpectationFields;
  recordedExpected?: number;
}) {
  const has = row.timetableExpectedSessions != null;
  return (
    <>
      {recordedExpected != null ? (
        <TableCell className="text-right">{recordedExpected}</TableCell>
      ) : null}
      <TableCell className="text-right">{has ? row.timetableExpectedSessions : '—'}</TableCell>
      <TableCell className="text-right">{has ? fmtHours(row.timetableExpectedHours) : '—'}</TableCell>
      <TableCell className="text-right">
        {has ? `${row.noRecordSessions ?? 0} · ${fmtHours(row.noRecordHours)}h` : '—'}
      </TableCell>
      <TableCell className="text-right">{has ? fmtHours(row.timetableTaughtHours) : '—'}</TableCell>
      <TableCell className="text-right">{has ? fmtHours(row.lostHours) : '—'}</TableCell>
      <TableCell className="text-right">{row.coveragePercent != null ? `${row.coveragePercent}%` : '—'}</TableCell>
    </>
  );
}

export function TimetableTotalsFooterCells({
  rows,
  recordedExpected,
}: {
  rows: TimetableExpectationFields[];
  recordedExpected?: number;
}) {
  const sum = (pick: (r: TimetableExpectationFields) => number) =>
    rows.reduce((acc, r) => acc + pick(r), 0);
  const elapsedMinutes = sum((r) => r.elapsedExpectedMinutes ?? 0);
  const taughtMinutes = sum((r) => r.timetableTaughtMinutes ?? 0);
  const coverage = elapsedMinutes > 0 ? Math.round((taughtMinutes / elapsedMinutes) * 1000) / 10 : null;
  const has = rows.some((r) => r.timetableExpectedSessions != null);
  return (
    <>
      {recordedExpected != null ? (
        <TableCell className="text-right">{recordedExpected}</TableCell>
      ) : null}
      <TableCell className="text-right">{has ? sum((r) => r.timetableExpectedSessions ?? 0) : '—'}</TableCell>
      <TableCell className="text-right">{has ? fmtHours(sum((r) => r.timetableExpectedMinutes ?? 0) / 60) : '—'}</TableCell>
      <TableCell className="text-right">
        {has ? `${sum((r) => r.noRecordSessions ?? 0)} · ${fmtHours(sum((r) => r.noRecordMinutes ?? 0) / 60)}h` : '—'}
      </TableCell>
      <TableCell className="text-right">{has ? fmtHours(taughtMinutes / 60) : '—'}</TableCell>
      <TableCell className="text-right">{has ? fmtHours(Math.max(0, elapsedMinutes - taughtMinutes) / 60) : '—'}</TableCell>
      <TableCell className="text-right">{coverage != null ? `${coverage}%` : '—'}</TableCell>
    </>
  );
}
