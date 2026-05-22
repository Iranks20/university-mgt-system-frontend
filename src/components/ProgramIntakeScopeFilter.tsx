import React from 'react';
import { Filter, Loader2, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  PROGRAM_INTAKE_ALL,
  type IntakeTypeValue,
  type ProgramIntakeScopeApi,
} from '@/hooks/useProgramIntakeScope';

const PRIMARY_BUTTON_CLASS = 'bg-[#015F2B] hover:bg-[#014022] text-white';

export type ProgramIntakeScopeFilterProps = {
  scope: ProgramIntakeScopeApi;
  intakeField?: 'type' | 'cohortList';
  showSchool?: boolean;
  description?: string;
  scopeHint?: string;
  schoolLabel?: string;
  programLabel?: string;
  cohortLabel?: string;
  yearLabel?: string;
  semesterLabel?: string;
  intakeLabel?: string;
  showFilterIcon?: boolean;
  bordered?: boolean;
  className?: string;
  trailing?: React.ReactNode;
  actionButton?: {
    label: string;
    onClick: () => void | Promise<void>;
    loading?: boolean;
    disabled?: boolean;
  };
  secondaryAction?: {
    label: string;
    onClick: () => void | Promise<void>;
    loading?: boolean;
    disabled?: boolean;
    variant?: 'outline' | 'ghost';
  };
  showReset?: boolean;
  onReset?: () => void;
  onFieldChange?: () => void;
};

export function ProgramIntakeScopeFilter({
  scope,
  intakeField: intakeFieldProp,
  showSchool: showSchoolProp,
  description,
  scopeHint,
  schoolLabel = 'School',
  programLabel = 'Program',
  cohortLabel = 'Cohort',
  yearLabel = 'Year',
  semesterLabel = 'Semester',
  intakeLabel = 'Intake',
  showFilterIcon = false,
  bordered = true,
  className = '',
  trailing,
  actionButton,
  secondaryAction,
  showReset = false,
  onReset,
  onFieldChange,
}: ProgramIntakeScopeFilterProps) {
  const intakeField = intakeFieldProp ?? scope.intakeField;
  const showSchool = showSchoolProp ?? scope.showSchool;
  const {
    schools,
    filteredPrograms,
    intakes,
    schoolId,
    setSchoolId,
    programId,
    setProgramId,
    year,
    setYear,
    semester,
    setSemester,
    intakeType,
    setIntakeType,
    programIntakeId,
    setProgramIntakeId,
    scopeLabel,
    loadingIntakes,
    yearOptions,
    semesterOptions,
    allowAllSchool,
    allowAllProgram,
    allowAllYear,
    allowAllSemester,
  } = scope;

  const wrapChange = (fn: (v: string) => void) => (v: string) => {
    fn(v);
    onFieldChange?.();
  };

  const wrapIntakeTypeChange = (v: IntakeTypeValue) => {
    setIntakeType(v);
    onFieldChange?.();
  };

  const containerClass = bordered
    ? `rounded-md border bg-muted/30 p-3 ${className}`
    : className;

  return (
    <div className={containerClass}>
      {description ? <p className="text-xs text-muted-foreground mb-3">{description}</p> : null}
      <div className="flex flex-wrap items-end gap-3">
        {showFilterIcon ? (
          <Filter className="h-4 w-4 text-muted-foreground shrink-0 mb-2" aria-hidden />
        ) : null}
        {showSchool ? (
          <div className="space-y-1 min-w-[180px]">
            <Label className="text-xs text-muted-foreground">{schoolLabel}</Label>
            <Select value={schoolId} onValueChange={wrapChange(setSchoolId)}>
              <SelectTrigger className="h-9">
                <SelectValue placeholder={allowAllSchool ? 'All schools' : 'Select school'} />
              </SelectTrigger>
              <SelectContent>
                {allowAllSchool ? <SelectItem value={PROGRAM_INTAKE_ALL}>All schools</SelectItem> : null}
                {schools.map((s) => (
                  <SelectItem key={s.id} value={s.id}>
                    {s.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        <div className="space-y-1 min-w-[200px]">
          <Label className="text-xs text-muted-foreground">{programLabel}</Label>
          <Select
            value={programId}
            onValueChange={wrapChange(setProgramId)}
            disabled={showSchool && !allowAllSchool && !schoolId}
          >
            <SelectTrigger className="h-9">
              <SelectValue placeholder={allowAllProgram ? 'Select programme' : 'Select program'} />
            </SelectTrigger>
            <SelectContent>
              {allowAllProgram ? (
                <SelectItem value={PROGRAM_INTAKE_ALL}>
                  {allowAllProgram ? 'Select programme' : 'All programmes'}
                </SelectItem>
              ) : null}
              {filteredPrograms.map((p) => (
                <SelectItem key={p.id} value={p.id}>
                  {p.code ? `${p.name} (${p.code})` : p.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{yearLabel}</Label>
          <Select value={year} onValueChange={wrapChange(setYear)}>
            <SelectTrigger className="h-9 w-[110px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowAllYear ? <SelectItem value={PROGRAM_INTAKE_ALL}>All</SelectItem> : null}
              {yearOptions.map((y) => (
                <SelectItem key={y} value={String(y)}>
                  {allowAllYear ? String(y) : `Year ${y}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label className="text-xs text-muted-foreground">{semesterLabel}</Label>
          <Select value={semester} onValueChange={wrapChange(setSemester)}>
            <SelectTrigger className="h-9 w-[120px]">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {allowAllSemester ? <SelectItem value={PROGRAM_INTAKE_ALL}>All</SelectItem> : null}
              {semesterOptions.map((s) => (
                <SelectItem key={s} value={String(s)}>
                  {allowAllSemester ? String(s) : `Sem ${s}`}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        {intakeField === 'type' ? (
          <div className="space-y-1">
            <Label className="text-xs text-muted-foreground">{intakeLabel}</Label>
            <Select value={intakeType} onValueChange={(v) => wrapIntakeTypeChange(v as IntakeTypeValue)}>
              <SelectTrigger className="h-9 w-[140px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Day">Day</SelectItem>
                <SelectItem value="Evening">Evening</SelectItem>
                <SelectItem value="Weekend">Weekend</SelectItem>
              </SelectContent>
            </Select>
          </div>
        ) : (
          <div className="space-y-1 min-w-[220px]">
            <Label className="text-xs text-muted-foreground">{cohortLabel}</Label>
            <Select
              value={programIntakeId}
              onValueChange={wrapChange(setProgramIntakeId)}
              disabled={programId === PROGRAM_INTAKE_ALL || !programId || loadingIntakes}
            >
              <SelectTrigger className="h-9">
                <SelectValue
                  placeholder={
                    programId === PROGRAM_INTAKE_ALL || !programId ? 'Select programme' : 'Select cohort'
                  }
                />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={PROGRAM_INTAKE_ALL}>Select cohort</SelectItem>
                {intakes.map((i) => (
                  <SelectItem key={i.id} value={i.id}>
                    {i.year}.{i.semester} · {i.intakeType}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
        {trailing}
        {showReset ? (
          <Button
            type="button"
            variant="outline"
            className="h-9"
            onClick={() => {
              scope.reset();
              onReset?.();
            }}
          >
            <RotateCcw className="mr-2 h-4 w-4" />
            Reset
          </Button>
        ) : null}
        {secondaryAction ? (
          <Button
            type="button"
            variant={secondaryAction.variant ?? 'ghost'}
            className="h-9"
            disabled={secondaryAction.disabled || secondaryAction.loading}
            onClick={() => void secondaryAction.onClick()}
          >
            {secondaryAction.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {secondaryAction.label}
          </Button>
        ) : null}
        {actionButton ? (
          <Button
            type="button"
            className={`h-9 ${PRIMARY_BUTTON_CLASS}`}
            disabled={actionButton.disabled || actionButton.loading}
            onClick={() => void actionButton.onClick()}
          >
            {actionButton.loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
            {actionButton.label}
          </Button>
        ) : null}
      </div>
      {scopeHint ? (
        <p className="text-xs text-muted-foreground mt-2">{scopeHint}</p>
      ) : scopeLabel ? (
        <p className="text-xs text-muted-foreground mt-2">
          <span className="font-medium text-foreground">{scopeLabel}</span>
        </p>
      ) : null}
    </div>
  );
}
