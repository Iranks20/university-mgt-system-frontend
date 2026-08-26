import { useCallback, useState } from 'react';
import {
  TERM_FILTER_ACTIVE,
  type AcademicTermFilterSelection,
  type AcademicTermFilterValue,
} from '@/components/AcademicTermFilter';
import type { AcademicTerm } from '@/services/academic.service';

export function useAcademicTermFilterState() {
  const [termFilter, setTermFilter] = useState<AcademicTermFilterValue>(TERM_FILTER_ACTIVE);
  const [academicTermId, setAcademicTermId] = useState<string | undefined>(undefined);
  const [classStatusHint, setClassStatusHint] = useState<'active' | 'all'>('active');
  const [termStartDate, setTermStartDate] = useState<string | undefined>(undefined);
  const [termEndDate, setTermEndDate] = useState<string | undefined>(undefined);
  const [selectedTerm, setSelectedTerm] = useState<AcademicTerm | null>(null);

  const onTermChange = useCallback((sel: AcademicTermFilterSelection) => {
    setTermFilter(sel.value);
    setAcademicTermId(sel.academicTermId);
    setClassStatusHint(sel.classStatusHint);
    setTermStartDate(sel.term?.startDate);
    setTermEndDate(sel.term?.endDate);
    setSelectedTerm(sel.term);
  }, []);

  const applyTermDatesTo = useCallback(
    (setFrom: (v: string) => void, setTo: (v: string) => void) =>
      (sel: AcademicTermFilterSelection) => {
        onTermChange(sel);
        if (sel.term?.startDate) setFrom(sel.term.startDate);
        if (sel.term?.endDate) setTo(sel.term.endDate);
      },
    [onTermChange]
  );

  return {
    termFilter,
    academicTermId,
    classStatusHint,
    termStartDate,
    termEndDate,
    selectedTerm,
    onTermChange,
    applyTermDatesTo,
  };
}
