import { useEffect, useMemo, useState } from 'react';
import { academicService, type AcademicTerm } from '@/services/academic.service';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

export const TERM_FILTER_ACTIVE = '__active__';
export const TERM_FILTER_ALL = '__all__';

export type AcademicTermFilterValue = typeof TERM_FILTER_ACTIVE | typeof TERM_FILTER_ALL | string;

export type AcademicTermFilterSelection = {
  value: AcademicTermFilterValue;
  academicTermId?: string;
  classStatusHint: 'active' | 'all';
  term: AcademicTerm | null;
  dateFrom: string;
  dateTo: string;
};

function isoDateOnly(value: string): string {
  return value.slice(0, 10);
}

export function computeTermFilterDateRange(
  value: AcademicTermFilterValue,
  terms: AcademicTerm[]
): { dateFrom: string; dateTo: string } {
  if (value === TERM_FILTER_ALL) {
    const dated = terms.filter((t) => t.startDate && t.endDate);
    if (dated.length === 0) return { dateFrom: '', dateTo: '' };
    const starts = dated.map((t) => isoDateOnly(t.startDate!)).sort();
    const ends = dated.map((t) => isoDateOnly(t.endDate!)).sort();
    return { dateFrom: starts[0]!, dateTo: ends[ends.length - 1]! };
  }
  const term =
    value === TERM_FILTER_ACTIVE
      ? (terms.find((t) => t.status === 'Active') ?? null)
      : (terms.find((t) => t.id === value) ?? null);
  if (term?.startDate && term?.endDate) {
    return { dateFrom: isoDateOnly(term.startDate), dateTo: isoDateOnly(term.endDate) };
  }
  return { dateFrom: '', dateTo: '' };
}

function coverageLabel(semester: number) {
  if (semester === 0) return 'Both';
  return `Sem ${semester}`;
}

function termOptionLabel(term: AcademicTerm) {
  return `${term.name} · ${coverageLabel(term.semester)} · ${term.status}`;
}

export function resolveAcademicTermFilter(
  value: AcademicTermFilterValue,
  terms: AcademicTerm[]
): AcademicTermFilterSelection {
  const { dateFrom, dateTo } = computeTermFilterDateRange(value, terms);
  if (value === TERM_FILTER_ALL) {
    return {
      value,
      academicTermId: 'all',
      classStatusHint: 'all',
      term: null,
      dateFrom,
      dateTo,
    };
  }
  if (value === TERM_FILTER_ACTIVE) {
    const active = terms.find((t) => t.status === 'Active') ?? null;
    return {
      value,
      academicTermId: undefined,
      classStatusHint: 'active',
      term: active,
      dateFrom,
      dateTo,
    };
  }
  const term = terms.find((t) => t.id === value) ?? null;
  const closedOrDraft = term?.status === 'Closed' || term?.status === 'Draft';
  return {
    value,
    academicTermId: value,
    classStatusHint: closedOrDraft ? 'all' : 'active',
    term,
    dateFrom,
    dateTo,
  };
}

export function AcademicTermFilter({
  value,
  onChange,
  className,
  triggerClassName,
  showLabel = true,
}: {
  value: AcademicTermFilterValue;
  onChange: (next: AcademicTermFilterSelection) => void;
  className?: string;
  triggerClassName?: string;
  showLabel?: boolean;
}) {
  const [terms, setTerms] = useState<AcademicTerm[]>([]);

  useEffect(() => {
    academicService
      .getAcademicTerms()
      .then(setTerms)
      .catch(() => setTerms([]));
  }, []);

  const closedTerms = useMemo(
    () => terms.filter((t) => t.status === 'Closed'),
    [terms]
  );

  return (
    <div className={className ?? 'space-y-1'}>
      {showLabel ? (
        <LabelWithInfo info="Active is the current working term. Pick a Closed term to browse archived classes. All shows every term.">
          Academic term
        </LabelWithInfo>
      ) : null}
      <Select
        value={value}
        onValueChange={(v) => onChange(resolveAcademicTermFilter(v, terms))}
      >
        <SelectTrigger className={triggerClassName ?? 'w-[240px]'}>
          <SelectValue placeholder="Academic term" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={TERM_FILTER_ACTIVE}>Active term (default)</SelectItem>
          <SelectItem value={TERM_FILTER_ALL}>All terms</SelectItem>
          {closedTerms.map((t) => (
            <SelectItem key={t.id} value={t.id}>
              {termOptionLabel(t)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
