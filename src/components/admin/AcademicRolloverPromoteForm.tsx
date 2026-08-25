import type { HoldbackGroupPayload } from '@/services/academic.service';
import { PROMOTE_ALL } from '@/lib/academic-rollover-promote';
import {
  SELECT_UNSET,
  fromOptionalSelectValue,
  hasOptionalSelectValue,
  toOptionalSelectValue,
} from '@/lib/academic-rollover-defaults';
import { ResetFiltersButton } from '@/components/ui/reset-filters-button';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LabelWithInfo } from '@/components/ui/label-with-info';
import { Textarea } from '@/components/ui/textarea';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

type ProgramOption = { id: string; name: string; code?: string };

export function AcademicRolloverPromoteForm({
  programs,
  promoteProgramId,
  onPromoteProgramIdChange,
  promoteYear,
  onPromoteYearChange,
  promoteSemester,
  onPromoteSemesterChange,
  holdbackGroups,
  onRemoveHoldbackGroup,
  holdbackRaw,
  onHoldbackRawChange,
  groupProgramId,
  onGroupProgramIdChange,
  groupYear,
  onGroupYearChange,
  groupSemester,
  onGroupSemesterChange,
  groupReason,
  onGroupReasonChange,
  onAddHoldbackGroup,
  holdbackTextareaId = 'rollover-holdbacks',
  onScopeChange,
  onResetHoldbackDraft,
}: {
  programs: ProgramOption[];
  promoteProgramId: string;
  onPromoteProgramIdChange: (value: string) => void;
  promoteYear: string;
  onPromoteYearChange: (value: string) => void;
  promoteSemester: string;
  onPromoteSemesterChange: (value: string) => void;
  holdbackGroups: HoldbackGroupPayload[];
  onRemoveHoldbackGroup: (group: HoldbackGroupPayload) => void;
  holdbackRaw: string;
  onHoldbackRawChange: (value: string) => void;
  groupProgramId: string;
  onGroupProgramIdChange: (value: string) => void;
  groupYear: string;
  onGroupYearChange: (value: string) => void;
  groupSemester: string;
  onGroupSemesterChange: (value: string) => void;
  groupReason: string;
  onGroupReasonChange: (value: string) => void;
  onAddHoldbackGroup: () => void;
  holdbackTextareaId?: string;
  onScopeChange?: () => void;
  onResetHoldbackDraft?: () => void;
}) {
  const wrapScope = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    onScopeChange?.();
  };

  return (
    <div className="space-y-3">
      <div>
        <LabelWithInfo info="Leave All to promote every Active student, or pick a program to limit the run.">
          Program
        </LabelWithInfo>
        <Select
          value={promoteProgramId}
          onValueChange={wrapScope(onPromoteProgramIdChange)}
        >
          <SelectTrigger className="mt-1">
            <SelectValue placeholder="All programs" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={PROMOTE_ALL}>All programs</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code ? `${p.name} (${p.code})` : p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <LabelWithInfo info="Optional filter. With semester, promotes one cohort group (e.g. Year 2 Sem 1).">
            Year
          </LabelWithInfo>
          <Select value={promoteYear} onValueChange={wrapScope(onPromoteYearChange)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All years" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PROMOTE_ALL}>All years</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Year {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <LabelWithInfo info="Optional filter. Sem 1 students move to Sem 2; Sem 2 students move to next year Sem 1.">
            Semester
          </LabelWithInfo>
          <Select value={promoteSemester} onValueChange={wrapScope(onPromoteSemesterChange)}>
            <SelectTrigger className="mt-1">
              <SelectValue placeholder="All semesters" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={PROMOTE_ALL}>All semesters</SelectItem>
              <SelectItem value="1">Semester 1</SelectItem>
              <SelectItem value="2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="rounded-md border p-3 space-y-2">
        <div className="flex items-start justify-between gap-2">
          <LabelWithInfo info="Hold an entire cohort while others promote (e.g. internship year). Students stay Active with a Held back reason.">
            Hold back cohort
          </LabelWithInfo>
          {onResetHoldbackDraft ? (
            <ResetFiltersButton
              label="Clear"
              className="h-8 shrink-0"
              disabled={
                !hasOptionalSelectValue(groupProgramId) &&
                !hasOptionalSelectValue(groupYear) &&
                !hasOptionalSelectValue(groupSemester) &&
                !groupReason.trim()
              }
              onClick={onResetHoldbackDraft}
            />
          ) : null}
        </div>
        <Select
          value={toOptionalSelectValue(groupProgramId)}
          onValueChange={(v) => onGroupProgramIdChange(fromOptionalSelectValue(v))}
        >
          <SelectTrigger>
            <SelectValue placeholder="Select program" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value={SELECT_UNSET}>Select program</SelectItem>
            {programs.map((p) => (
              <SelectItem key={p.id} value={p.id}>
                {p.code ? `${p.name} (${p.code})` : p.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="grid grid-cols-2 gap-2">
          <Select
            value={toOptionalSelectValue(groupYear)}
            onValueChange={(v) => onGroupYearChange(fromOptionalSelectValue(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_UNSET}>Select year</SelectItem>
              {[1, 2, 3, 4, 5, 6].map((y) => (
                <SelectItem key={y} value={String(y)}>
                  Year {y}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Select
            value={toOptionalSelectValue(groupSemester)}
            onValueChange={(v) => onGroupSemesterChange(fromOptionalSelectValue(v))}
          >
            <SelectTrigger>
              <SelectValue placeholder="Semester" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={SELECT_UNSET}>Select semester</SelectItem>
              <SelectItem value="1">Semester 1</SelectItem>
              <SelectItem value="2">Semester 2</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <Input
          placeholder="Reason (e.g. Clinical internship)"
          value={groupReason}
          onChange={(e) => onGroupReasonChange(e.target.value)}
        />
        <Button type="button" variant="outline" size="sm" onClick={onAddHoldbackGroup}>
          Add cohort holdback
        </Button>
        {holdbackGroups.length > 0 ? (
          <ul className="space-y-1 text-xs">
            {holdbackGroups.map((g) => {
              const prog = programs.find((p) => p.id === g.programId);
              const label = prog?.code || prog?.name || g.programId.slice(0, 8);
              return (
                <li
                  key={`${g.programId}-${g.year}-${g.semester}`}
                  className="flex items-start justify-between gap-2 rounded border bg-amber-50/50 px-2 py-1"
                >
                  <span>
                    {label} Y{g.year}.S{g.semester} — {g.reason}
                  </span>
                  <button
                    type="button"
                    className="text-destructive shrink-0"
                    onClick={() => onRemoveHoldbackGroup(g)}
                  >
                    Remove
                  </button>
                </li>
              );
            })}
          </ul>
        ) : null}
      </div>
      <div>
        <LabelWithInfo
          htmlFor={holdbackTextareaId}
          info="Optional individual holdbacks by student UUID. Cohort holdbacks above are preferred for whole year/sem groups."
        >
          Individual holdbacks
        </LabelWithInfo>
        <Textarea
          id={holdbackTextareaId}
          className="mt-1 font-mono text-xs"
          rows={3}
          placeholder="Paste student UUIDs, one per line"
          value={holdbackRaw}
          onChange={(e) => onHoldbackRawChange(e.target.value)}
        />
      </div>
    </div>
  );
}
