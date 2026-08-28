import {
  TERM_FILTER_ACTIVE,
  TERM_FILTER_ALL,
  computeTermFilterDateRange,
  resolveAcademicTermFilter,
} from '@/components/AcademicTermFilter';
import type { AcademicTerm } from '@/services/academic.service';

const terms: AcademicTerm[] = [
  {
    id: 'closed-1',
    name: '2025/2026 Sem 1',
    academicYear: 2025,
    semester: 1,
    status: 'Closed',
    startDate: '2026-01-15T00:00:00.000Z',
    endDate: '2026-08-23T00:00:00.000Z',
  },
  {
    id: 'active-1',
    name: '2025/2026 Sem 2',
    academicYear: 2025,
    semester: 2,
    status: 'Active',
    startDate: '2026-08-24T00:00:00.000Z',
    endDate: '2026-12-04T00:00:00.000Z',
  },
];

describe('computeTermFilterDateRange', () => {
  it('uses active term dates for active filter', () => {
    expect(computeTermFilterDateRange(TERM_FILTER_ACTIVE, terms)).toEqual({
      dateFrom: '2026-08-24',
      dateTo: '2026-12-04',
    });
  });

  it('uses closed term dates for a specific closed term', () => {
    expect(computeTermFilterDateRange('closed-1', terms)).toEqual({
      dateFrom: '2026-01-15',
      dateTo: '2026-08-23',
    });
  });

  it('spans all terms for all filter', () => {
    expect(computeTermFilterDateRange(TERM_FILTER_ALL, terms)).toEqual({
      dateFrom: '2026-01-15',
      dateTo: '2026-12-04',
    });
  });
});

describe('resolveAcademicTermFilter', () => {
  it('includes date range on selection', () => {
    const closed = resolveAcademicTermFilter('closed-1', terms);
    expect(closed.academicTermId).toBe('closed-1');
    expect(closed.classStatusHint).toBe('all');
    expect(closed.dateFrom).toBe('2026-01-15');
    expect(closed.dateTo).toBe('2026-08-23');

    const all = resolveAcademicTermFilter(TERM_FILTER_ALL, terms);
    expect(all.academicTermId).toBe('all');
    expect(all.dateFrom).toBe('2026-01-15');
    expect(all.dateTo).toBe('2026-12-04');
  });
});
