import { TERM_FILTER_ALL, type AcademicTermFilterValue } from '@/components/AcademicTermFilter';

export function resolveReportsScopedDates(
  termFilter: AcademicTermFilterValue,
  termStartDate?: string,
  termEndDate?: string
): { dateFrom: string; dateTo: string } | undefined {
  if (termFilter === TERM_FILTER_ALL) return undefined;
  if (termStartDate && termEndDate) {
    return { dateFrom: termStartDate, dateTo: termEndDate };
  }
  return undefined;
}
