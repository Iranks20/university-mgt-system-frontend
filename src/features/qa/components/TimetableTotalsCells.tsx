import { CircleHelp } from 'lucide-react';
import { TableCell, TableHead } from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import type { TimetableExpectationFields } from '@/types/qa';
import { fmtHours } from './ExpectedSessionsDialog';

type TimetableRow = TimetableExpectationFields & {
  weeklySessions?: number;
  weeklyHours?: number;
};

const FIELD_INFO = {
  recordedExpected: 'Taught + untaught from QA lecture records only. Does not include sessions with no QA action.',
  weeklySessions: 'How many timetable sessions this course unit has each week.',
  weeklyHours: 'Weekly teaching hours from the class timetable pattern.',
  ttExpected: 'Total sessions scheduled on the timetable for the selected term or date range.',
  ttHours: 'Total scheduled hours from the timetable for the selected term or date range.',
  noRecord: 'Elapsed timetable sessions with no QA action yet. Investigation list — not the same as missed by lecturer.',
  taughtHours: 'Hours taught per QA records (actual duration when recorded; otherwise scheduled length).',
  lostHours: 'Elapsed timetable hours minus taught hours. Future sessions are never counted as lost.',
  coverage: 'Taught hours as a percentage of elapsed timetable hours.',
} as const;

function TableHeadWithInfo({
  label,
  info,
  className = 'text-right whitespace-nowrap',
}: {
  label: string;
  info: string;
  className?: string;
}) {
  return (
    <TableHead className={className}>
      <span className="inline-flex items-center justify-end gap-1">
        {label}
        <Tooltip>
          <TooltipTrigger asChild>
            <button
              type="button"
              className="inline-flex text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring rounded-sm"
              aria-label={`About ${label}`}
            >
              <CircleHelp className="h-3.5 w-3.5" />
            </button>
          </TooltipTrigger>
          <TooltipContent side="top" className="max-w-xs text-left leading-relaxed">
            {info}
          </TooltipContent>
        </Tooltip>
      </span>
    </TableHead>
  );
}

export function TimetableTotalsHeaderCells({
  showRecordedExpected = true,
  showWeekly = false,
  ttExpectedFirst = false,
}: {
  showRecordedExpected?: boolean;
  showWeekly?: boolean;
  ttExpectedFirst?: boolean;
}) {
  const recorded = showRecordedExpected ? (
    <TableHeadWithInfo key="rec" label="REC. EXPECTED" info={FIELD_INFO.recordedExpected} />
  ) : null;
  const weekly = showWeekly ? (
    <>
      <TableHeadWithInfo key="sw" label="SESSIONS/WEEK" info={FIELD_INFO.weeklySessions} />
      <TableHeadWithInfo key="hw" label="HRS/WEEK" info={FIELD_INFO.weeklyHours} />
    </>
  ) : null;
  const ttExpected = (
    <TableHeadWithInfo key="tte" label="TT EXPECTED" info={FIELD_INFO.ttExpected} />
  );
  const ttHours = <TableHeadWithInfo key="tth" label="TT HOURS" info={FIELD_INFO.ttHours} />;
  const rest = (
    <>
      <TableHeadWithInfo key="nr" label="NO RECORD" info={FIELD_INFO.noRecord} />
      <TableHeadWithInfo key="th" label="TAUGHT HRS" info={FIELD_INFO.taughtHours} />
      <TableHeadWithInfo key="lh" label="LOST HRS" info={FIELD_INFO.lostHours} />
      <TableHeadWithInfo key="cov" label="COVERAGE" info={FIELD_INFO.coverage} />
    </>
  );

  if (ttExpectedFirst) {
    return (
      <>
        {ttExpected}
        {ttHours}
        {weekly}
        {recorded}
        {rest}
      </>
    );
  }

  return (
    <>
      {recorded}
      {weekly}
      {ttExpected}
      {ttHours}
      {rest}
    </>
  );
}

function TimetableMetricCells({
  row,
  recordedExpected,
  showWeekly,
  ttExpectedFirst,
}: {
  row: TimetableRow;
  recordedExpected?: number;
  showWeekly: boolean;
  ttExpectedFirst: boolean;
}) {
  const has = row.timetableExpectedSessions != null;
  const recorded =
    recordedExpected != null ? (
      <TableCell className="text-right">{recordedExpected}</TableCell>
    ) : null;
  const weekly = showWeekly ? (
    <>
      <TableCell className="text-right">{row.weeklySessions != null ? row.weeklySessions : '—'}</TableCell>
      <TableCell className="text-right">{row.weeklyHours != null ? fmtHours(row.weeklyHours) : '—'}</TableCell>
    </>
  ) : null;
  const ttExpected = (
    <TableCell className="text-right">{has ? row.timetableExpectedSessions : '—'}</TableCell>
  );
  const ttHours = (
    <TableCell className="text-right">{has ? fmtHours(row.timetableExpectedHours) : '—'}</TableCell>
  );
  const rest = (
    <>
      <TableCell className="text-right">
        {has ? `${row.noRecordSessions ?? 0} · ${fmtHours(row.noRecordHours)}h` : '—'}
      </TableCell>
      <TableCell className="text-right">{has ? fmtHours(row.timetableTaughtHours) : '—'}</TableCell>
      <TableCell className="text-right">{has ? fmtHours(row.lostHours) : '—'}</TableCell>
      <TableCell className="text-right">{row.coveragePercent != null ? `${row.coveragePercent}%` : '—'}</TableCell>
    </>
  );

  if (ttExpectedFirst) {
    return (
      <>
        {ttExpected}
        {ttHours}
        {weekly}
        {recorded}
        {rest}
      </>
    );
  }

  return (
    <>
      {recorded}
      {weekly}
      {ttExpected}
      {ttHours}
      {rest}
    </>
  );
}

export function TimetableTotalsCells({
  row,
  recordedExpected,
  showWeekly = false,
  ttExpectedFirst = false,
}: {
  row: TimetableRow;
  recordedExpected?: number;
  showWeekly?: boolean;
  ttExpectedFirst?: boolean;
}) {
  return (
    <TimetableMetricCells
      row={row}
      recordedExpected={recordedExpected}
      showWeekly={showWeekly}
      ttExpectedFirst={ttExpectedFirst}
    />
  );
}

export function TimetableTotalsFooterCells({
  rows,
  recordedExpected,
  showWeekly = false,
  ttExpectedFirst = false,
}: {
  rows: TimetableRow[];
  recordedExpected?: number;
  showWeekly?: boolean;
  ttExpectedFirst?: boolean;
}) {
  const sum = (pick: (r: TimetableRow) => number) => rows.reduce((acc, r) => acc + pick(r), 0);
  const elapsedMinutes = sum((r) => r.elapsedExpectedMinutes ?? 0);
  const taughtMinutes = sum((r) => r.timetableTaughtMinutes ?? 0);
  const coverage = elapsedMinutes > 0 ? Math.round((taughtMinutes / elapsedMinutes) * 1000) / 10 : null;
  const has = rows.some((r) => r.timetableExpectedSessions != null);
  const hasWeekly = rows.some((r) => r.weeklySessions != null);

  const recorded =
    recordedExpected != null ? (
      <TableCell className="text-right">{recordedExpected}</TableCell>
    ) : null;
  const weekly = showWeekly ? (
    <>
      <TableCell className="text-right">{hasWeekly ? sum((r) => r.weeklySessions ?? 0) : '—'}</TableCell>
      <TableCell className="text-right">
        {hasWeekly ? fmtHours(sum((r) => r.weeklyHours ?? 0)) : '—'}
      </TableCell>
    </>
  ) : null;
  const ttExpected = (
    <TableCell className="text-right">{has ? sum((r) => r.timetableExpectedSessions ?? 0) : '—'}</TableCell>
  );
  const ttHours = (
    <TableCell className="text-right">
      {has ? fmtHours(sum((r) => r.timetableExpectedMinutes ?? 0) / 60) : '—'}
    </TableCell>
  );
  const rest = (
    <>
      <TableCell className="text-right">
        {has ? `${sum((r) => r.noRecordSessions ?? 0)} · ${fmtHours(sum((r) => r.noRecordMinutes ?? 0) / 60)}h` : '—'}
      </TableCell>
      <TableCell className="text-right">{has ? fmtHours(taughtMinutes / 60) : '—'}</TableCell>
      <TableCell className="text-right">
        {has ? fmtHours(Math.max(0, elapsedMinutes - taughtMinutes) / 60) : '—'}
      </TableCell>
      <TableCell className="text-right">{coverage != null ? `${coverage}%` : '—'}</TableCell>
    </>
  );

  if (ttExpectedFirst) {
    return (
      <>
        {ttExpected}
        {ttHours}
        {weekly}
        {recorded}
        {rest}
      </>
    );
  }

  return (
    <>
      {recorded}
      {weekly}
      {ttExpected}
      {ttHours}
      {rest}
    </>
  );
}

export { FIELD_INFO, TableHeadWithInfo };
