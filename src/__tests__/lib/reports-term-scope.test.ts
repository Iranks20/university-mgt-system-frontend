import { TERM_FILTER_ACTIVE, TERM_FILTER_ALL } from '@/components/AcademicTermFilter';
import { resolveReportsScopedDates } from '@/lib/reports-term-scope';

describe('resolveReportsScopedDates', () => {
  it('returns undefined when all terms is selected', () => {
    expect(resolveReportsScopedDates(TERM_FILTER_ALL, '2026-01-01', '2026-06-01')).toBeUndefined();
  });

  it('returns term dates when a scoped term is selected', () => {
    expect(resolveReportsScopedDates(TERM_FILTER_ACTIVE, '2026-08-24', '2026-12-04')).toEqual({
      dateFrom: '2026-08-24',
      dateTo: '2026-12-04',
    });
  });

  it('returns undefined when scoped term has no dates', () => {
    expect(resolveReportsScopedDates(TERM_FILTER_ACTIVE, '', '')).toBeUndefined();
  });
});
