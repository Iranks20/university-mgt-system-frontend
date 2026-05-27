import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';

type ClinicalReportPreviewTableProps = {
  reportType: string;
  preview: any;
  rows: any[];
};

export function ClinicalReportPreviewTable({ reportType, preview, rows }: ClinicalReportPreviewTableProps) {
  if (reportType === 'daily-student-register') {
    const dates: string[] = preview?.sessionDates ?? [];
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Reg. No.</TableHead>
            <TableHead>Rotation</TableHead>
            <TableHead>Site</TableHead>
            {dates.map((d) => (
              <TableHead key={d} className="text-center">
                {d}
              </TableHead>
            ))}
            <TableHead>Presents</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow key={`${r.registrationNo}-${r.rotation}`}>
              <TableCell>{r.no}</TableCell>
              <TableCell className="font-medium">{r.studentName}</TableCell>
              <TableCell>{r.registrationNo}</TableCell>
              <TableCell>{r.rotation}</TableCell>
              <TableCell>{r.clinicalSite}</TableCell>
              {dates.map((d) => (
                <TableCell key={d} className="text-center">
                  {r.dateValues?.[d] ?? 0}
                </TableCell>
              ))}
              <TableCell>{r.totalPresents}</TableCell>
              <TableCell>{r.expectedSessions}</TableCell>
              <TableCell>{r.attendancePercentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reportType === 'student-attendance-summary') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>No.</TableHead>
            <TableHead>Student</TableHead>
            <TableHead>Reg. No.</TableHead>
            <TableHead>Rotation</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Attended</TableHead>
            <TableHead>Absent</TableHead>
            <TableHead>%</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any) => (
            <TableRow key={`${r.registrationNo}-${r.rotation}`}>
              <TableCell>{r.no}</TableCell>
              <TableCell className="font-medium">{r.studentName}</TableCell>
              <TableCell>{r.registrationNo}</TableCell>
              <TableCell>{r.rotation}</TableCell>
              <TableCell>{r.clinicalSite}</TableCell>
              <TableCell>{r.expectedSessions}</TableCell>
              <TableCell>{r.attendedSessions}</TableCell>
              <TableCell>{r.totalAbsent}</TableCell>
              <TableCell>{r.attendancePercentage}%</TableCell>
              <TableCell>{r.statusComment}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reportType === 'weekly-attendance-summary') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Week</TableHead>
            <TableHead>Rotation</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Date(s)</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Present</TableHead>
            <TableHead>Absent</TableHead>
            <TableHead>Att. %</TableHead>
            <TableHead>Weekly avg %</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{r.weekRange}</TableCell>
              <TableCell>{r.rotation}</TableCell>
              <TableCell>{r.clinicalSite}</TableCell>
              <TableCell>{r.date}</TableCell>
              <TableCell>{r.expectedTotalStudents}</TableCell>
              <TableCell>{r.presentCount}</TableCell>
              <TableCell>{r.absentCount}</TableCell>
              <TableCell>{r.attendancePercentage}%</TableCell>
              <TableCell>{r.weeklyAverageAttendancePercentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reportType === 'lecturer-teaching-sessions') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Date</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Topic</TableHead>
            <TableHead>Start</TableHead>
            <TableHead>End</TableHead>
            <TableHead>Duration</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Status</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{r.date}</TableCell>
              <TableCell>{r.lecturerName}</TableCell>
              <TableCell>{r.courseUnitTopic}</TableCell>
              <TableCell>{r.timeStarted}</TableCell>
              <TableCell>{r.timeEnded}</TableCell>
              <TableCell>{r.duration}</TableCell>
              <TableCell>{r.clinicalSite}</TableCell>
              <TableCell>{r.commentStatus}</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  if (reportType === 'course-topic-attendance') {
    return (
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Topic</TableHead>
            <TableHead>Date</TableHead>
            <TableHead>Lecturer</TableHead>
            <TableHead>Site</TableHead>
            <TableHead>Expected</TableHead>
            <TableHead>Present</TableHead>
            <TableHead>Absent</TableHead>
            <TableHead>%</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {rows.map((r: any, i: number) => (
            <TableRow key={i}>
              <TableCell>{r.courseUnitTopic}</TableCell>
              <TableCell>{r.date}</TableCell>
              <TableCell>{r.lecturerName}</TableCell>
              <TableCell>{r.clinicalSite}</TableCell>
              <TableCell>{r.expectedStudents}</TableCell>
              <TableCell>{r.presentStudents}</TableCell>
              <TableCell>{r.absentStudents}</TableCell>
              <TableCell>{r.attendancePercentage}%</TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    );
  }

  return null;
}

export function getClinicalReportRows(preview: any, reportType: string): any[] {
  if (!preview) return [];
  if (reportType === 'individual-student-attendance') return preview.detailRows ?? [];
  return preview.rows ?? [];
}

export function IndividualStudentAttendanceTables({
  preview,
  summaryPage,
  detailPage,
  onSummaryPageChange,
  onDetailPageChange,
  pageSize,
}: {
  preview: any;
  summaryPage: number;
  detailPage: number;
  onSummaryPageChange: (p: number) => void;
  onDetailPageChange: (p: number) => void;
  pageSize: number;
}) {
  const summaries = preview?.summaries ?? [];
  const details = preview?.detailRows ?? [];
  const summaryPaginated = paginateSlice(summaries, summaryPage, pageSize);
  const detailPaginated = paginateSlice(details, detailPage, pageSize);

  return (
    <div className="space-y-6">
      <div>
        <h4 className="mb-2 text-sm font-semibold">Summary</h4>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Reg. No.</TableHead>
                <TableHead>Expected</TableHead>
                <TableHead>Presents</TableHead>
                <TableHead>Absent</TableHead>
                <TableHead>%</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {summaryPaginated.rows.map((s: any) => (
                <TableRow key={s.registrationNo}>
                  <TableCell>{s.studentName}</TableCell>
                  <TableCell>{s.registrationNo}</TableCell>
                  <TableCell>{s.expectedSessions}</TableCell>
                  <TableCell>{s.totalPresents}</TableCell>
                  <TableCell>{s.totalAbsent}</TableCell>
                  <TableCell>{s.attendancePercentage}%</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ReportPaginationInline
          {...summaryPaginated}
          page={summaryPage}
          onPageChange={onSummaryPageChange}
        />
      </div>
      <div>
        <h4 className="mb-2 text-sm font-semibold">Session detail</h4>
        <div className="rounded-md border overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Student</TableHead>
                <TableHead>Topic</TableHead>
                <TableHead>Date</TableHead>
                <TableHead>Site</TableHead>
                <TableHead>Status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {detailPaginated.rows.map((r: any, i: number) => (
                <TableRow key={i}>
                  <TableCell>{r.studentName}</TableCell>
                  <TableCell>{r.courseUnitTopic}</TableCell>
                  <TableCell>{r.date}</TableCell>
                  <TableCell>{r.clinicalSite}</TableCell>
                  <TableCell>{r.attendanceStatus}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
        <ReportPaginationInline {...detailPaginated} page={detailPage} onPageChange={onDetailPageChange} />
      </div>
    </div>
  );
}

function paginateSlice<T>(rows: T[], page: number, pageSize: number) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    totalPages,
    total,
    rows: rows.slice(start, start + pageSize),
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}

function ReportPaginationInline({
  total,
  rangeStart,
  rangeEnd,
  page,
  totalPages,
  onPageChange,
}: ReturnType<typeof paginateSlice> & { page: number; onPageChange: (p: number) => void }) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-2 py-3 text-sm text-muted-foreground">
      <span>
        Showing {rangeStart}–{rangeEnd} of {total}
      </span>
      <div className="flex gap-2">
        <button
          type="button"
          className="underline disabled:opacity-40"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </button>
        <span>
          Page {page} of {totalPages}
        </span>
        <button
          type="button"
          className="underline disabled:opacity-40"
          disabled={page >= totalPages}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
