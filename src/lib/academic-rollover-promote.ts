import { useCallback, useState } from 'react';
import { toast } from 'sonner';
import type { HoldbackGroupPayload } from '@/services/academic.service';

export const PROMOTE_ALL = '__all__';

export function parseHoldbackIds(raw: string): string[] {
  return [
    ...new Set(
      raw
        .split(/[\s,;]+/)
        .map((s) => s.trim())
        .filter(Boolean)
    ),
  ];
}

export type PromoteScopeState = {
  promoteProgramId: string;
  promoteYear: string;
  promoteSemester: string;
  holdbackRaw: string;
  holdbackGroups: HoldbackGroupPayload[];
};

export function buildPromotePayload(state: PromoteScopeState) {
  return {
    holdbackStudentIds: parseHoldbackIds(state.holdbackRaw),
    holdbackGroups: state.holdbackGroups,
    ...(state.promoteProgramId !== PROMOTE_ALL ? { programId: state.promoteProgramId } : {}),
    ...(state.promoteYear !== PROMOTE_ALL ? { year: Number(state.promoteYear) } : {}),
    ...(state.promoteSemester !== PROMOTE_ALL ? { semester: Number(state.promoteSemester) } : {}),
  };
}

export function useAcademicRolloverPromoteState() {
  const [promoteProgramId, setPromoteProgramId] = useState(PROMOTE_ALL);
  const [promoteYear, setPromoteYear] = useState(PROMOTE_ALL);
  const [promoteSemester, setPromoteSemester] = useState(PROMOTE_ALL);
  const [holdbackRaw, setHoldbackRaw] = useState('');
  const [holdbackGroups, setHoldbackGroups] = useState<HoldbackGroupPayload[]>([]);
  const [groupProgramId, setGroupProgramId] = useState('');
  const [groupYear, setGroupYear] = useState('');
  const [groupSemester, setGroupSemester] = useState('');
  const [groupReason, setGroupReason] = useState('');

  const scopeState: PromoteScopeState = {
    promoteProgramId,
    promoteYear,
    promoteSemester,
    holdbackRaw,
    holdbackGroups,
  };

  const buildPayload = useCallback(() => buildPromotePayload(scopeState), [scopeState]);

  const addHoldbackGroup = useCallback(
    (programs: Array<{ id: string; name: string; code?: string }>, onChanged?: () => void) => {
      if (!groupProgramId) {
        toast.error('Select a program for the holdback group');
        return;
      }
      if (!groupYear || !groupSemester) {
        toast.error('Select year and semester for the holdback cohort');
        return;
      }
      const reason = groupReason.trim();
      if (reason.length < 3) {
        toast.error('Enter a holdback reason (at least 3 characters)');
        return;
      }
      const year = Number(groupYear);
      const semester = Number(groupSemester);
      if (
        holdbackGroups.some(
          (g) => g.programId === groupProgramId && g.year === year && g.semester === semester
        )
      ) {
        toast.error('That cohort is already in the holdback list');
        return;
      }
      setHoldbackGroups((prev) => [
        ...prev,
        { programId: groupProgramId, year, semester, reason },
      ]);
      setGroupReason('');
      onChanged?.();
    },
    [groupProgramId, groupReason, groupYear, groupSemester, holdbackGroups]
  );

  const removeHoldbackGroup = useCallback(
    (target: HoldbackGroupPayload, onChanged?: () => void) => {
      setHoldbackGroups((prev) =>
        prev.filter(
          (g) =>
            !(
              g.programId === target.programId &&
              g.year === target.year &&
              g.semester === target.semester
            )
        )
      );
      onChanged?.();
    },
    []
  );

  const resetHoldbackGroupDraft = useCallback(() => {
    setGroupProgramId('');
    setGroupYear('');
    setGroupSemester('');
    setGroupReason('');
  }, []);

  return {
    promoteProgramId,
    setPromoteProgramId,
    promoteYear,
    setPromoteYear,
    promoteSemester,
    setPromoteSemester,
    holdbackRaw,
    setHoldbackRaw,
    holdbackGroups,
    setHoldbackGroups,
    groupProgramId,
    setGroupProgramId,
    groupYear,
    setGroupYear,
    groupSemester,
    setGroupSemester,
    groupReason,
    setGroupReason,
    buildPayload,
    addHoldbackGroup,
    removeHoldbackGroup,
    resetHoldbackGroupDraft,
  };
}
