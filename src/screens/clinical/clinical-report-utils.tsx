import { Button } from '@/components/ui/button';

export const CLINICAL_REPORT_PAGE_SIZE = 25;
export const ALL_FILTER = '__all__';

export function paginateRows<T>(rows: T[], page: number, pageSize = CLINICAL_REPORT_PAGE_SIZE) {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const start = (safePage - 1) * pageSize;
  return {
    page: safePage,
    totalPages,
    total,
    rows: rows.slice(start, start + pageSize),
    rangeStart: total === 0 ? 0 : start + 1,
    rangeEnd: Math.min(start + pageSize, total),
  };
}

type ReportPaginationBarProps = {
  page: number;
  totalPages: number;
  total: number;
  rangeStart: number;
  rangeEnd: number;
  onPageChange: (page: number) => void;
};

export function ReportPaginationBar({
  page,
  totalPages,
  total,
  rangeStart,
  rangeEnd,
  onPageChange,
}: ReportPaginationBarProps) {
  if (total === 0) return null;
  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 py-4 border-t">
      <p className="text-sm text-muted-foreground">
        Showing {rangeStart}–{rangeEnd} of {total}
      </p>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => onPageChange(page - 1)}>
          Previous
        </Button>
        <span className="text-sm text-muted-foreground min-w-[88px] text-center">
          Page {page} of {totalPages}
        </span>
        <Button variant="outline" size="sm" disabled={page >= totalPages} onClick={() => onPageChange(page + 1)}>
          Next
        </Button>
      </div>
    </div>
  );
}

export type DateRangePreset = 'all' | 'last_30_days' | 'this_term' | 'custom';

export function defaultClinicalReportDateRange() {
  const end = new Date();
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return {
    dateFrom: start.toISOString().slice(0, 10),
    dateTo: end.toISOString().slice(0, 10),
  };
}

export function defaultDateRangeForReportType(reportType: string): { dateFrom: string; dateTo: string; preset: DateRangePreset } {
  const today = new Date().toISOString().slice(0, 10);
  if (reportType === 'daily-student-register') {
    return { dateFrom: today, dateTo: today, preset: 'custom' };
  }
  if (reportType === 'weekly-attendance-summary') {
    const start = new Date();
    start.setDate(start.getDate() - 6);
    return { dateFrom: start.toISOString().slice(0, 10), dateTo: today, preset: 'custom' };
  }
  const start = new Date();
  start.setDate(start.getDate() - 30);
  return { dateFrom: start.toISOString().slice(0, 10), dateTo: today, preset: 'last_30_days' };
}

export function dateRangeFromPreset(preset: DateRangePreset): { dateFrom: string; dateTo: string } {
  const now = new Date();
  const dateTo = now.toISOString().slice(0, 10);
  if (preset === 'all') {
    const from = new Date(now);
    from.setFullYear(from.getFullYear() - 5);
    return { dateFrom: from.toISOString().slice(0, 10), dateTo };
  }
  if (preset === 'this_term') {
    const from = new Date(now);
    from.setMonth(from.getMonth() - 3);
    return { dateFrom: from.toISOString().slice(0, 10), dateTo };
  }
  if (preset === 'last_30_days') {
    const from = new Date(now);
    from.setDate(from.getDate() - 30);
    return { dateFrom: from.toISOString().slice(0, 10), dateTo };
  }
  return defaultClinicalReportDateRange();
}
