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
};

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
  if (value === TERM_FILTER_ALL) {
    return {
      value,
      academicTermId: 'all',
      classStatusHint: 'all',
      term: null,
    };
  }
  if (value === TERM_FILTER_ACTIVE) {
    const active = terms.find((t) => t.status === 'Active') ?? null;
    return {
      value,
      academicTermId: undefined,
      classStatusHint: 'active',
      term: active,
    };
  }
  const term = terms.find((t) => t.id === value) ?? null;
  const closedOrDraft = term?.status === 'Closed' || term?.status === 'Draft';
  return {
    value,
    academicTermId: value,
    classStatusHint: closedOrDraft ? 'all' : 'active',
    term,
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
