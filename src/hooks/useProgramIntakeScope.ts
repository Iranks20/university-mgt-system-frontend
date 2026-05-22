import { useCallback, useEffect, useMemo, useState } from 'react';
import { academicService } from '@/services';

export const PROGRAM_INTAKE_ALL = '__all__';

export type IntakeTypeValue = 'Day' | 'Evening' | 'Weekend';

export type ProgramIntakeRecord = {
  id: string;
  year: number;
  semester: number;
  intakeType: string;
};

export type ProgramOption = {
  id: string;
  name: string;
  code?: string;
  departmentId: string;
};

export type UseProgramIntakeScopeOptions = {
  enabled?: boolean;
  intakeField?: 'type' | 'cohortList';
  showSchool?: boolean;
  allowAllSchool?: boolean;
  allowAllProgram?: boolean;
  allowAllYear?: boolean;
  allowAllSemester?: boolean;
  yearOptions?: number[];
  semesterOptions?: number[];
  schools?: Array<{ id: string; name: string }>;
  programs?: ProgramOption[];
  programToSchoolMap?: Map<string, string>;
};

export type ResolvedProgramIntake = {
  id: string;
  label: string;
};

export function formatProgramLabel(program: ProgramOption | undefined): string {
  if (!program) return 'Program';
  return program.code ? `${program.name} (${program.code})` : program.name;
}

export function formatCohortLabel(intake: ProgramIntakeRecord): string {
  return `${intake.year}.${intake.semester} · ${intake.intakeType}`;
}

export function buildIntakeTypeScopeLabel(params: {
  showSchool: boolean;
  schoolId: string;
  schoolName: string | null;
  program: ProgramOption | undefined;
  year: number | undefined;
  semester: number | undefined;
  intakeType: IntakeTypeValue;
}): string {
  if (!params.program) return '';
  const schoolName =
    params.showSchool && params.schoolId && params.schoolId !== PROGRAM_INTAKE_ALL
      ? params.schoolName ?? 'School'
      : null;
  const parts = [
    schoolName,
    formatProgramLabel(params.program),
    params.year != null ? `Year ${params.year}` : null,
    params.semester != null ? `Semester ${params.semester}` : null,
    params.intakeType,
  ].filter(Boolean);
  return parts.join(' · ');
}

export function useProgramIntakeScope(options: UseProgramIntakeScopeOptions = {}) {
  const {
    enabled = true,
    intakeField = 'type',
    showSchool = true,
    allowAllSchool = false,
    allowAllProgram = false,
    allowAllYear = false,
    allowAllSemester = false,
    yearOptions = [1, 2, 3, 4, 5, 6],
    semesterOptions = [1, 2],
    schools: externalSchools,
    programs: externalPrograms,
    programToSchoolMap: externalProgramToSchoolMap,
  } = options;

  const [catalogSchools, setCatalogSchools] = useState<Array<{ id: string; name: string }>>([]);
  const [catalogPrograms, setCatalogPrograms] = useState<ProgramOption[]>([]);
  const [levels, setLevels] = useState<Array<{ id: string; schoolId: string }>>([]);
  const [departments, setDepartments] = useState<Array<{ id: string; levelId: string }>>([]);
  const [loadingCatalog, setLoadingCatalog] = useState(false);

  const [schoolId, setSchoolId] = useState(allowAllSchool ? PROGRAM_INTAKE_ALL : '');
  const [programId, setProgramId] = useState(allowAllProgram ? PROGRAM_INTAKE_ALL : '');
  const [year, setYear] = useState(allowAllYear ? PROGRAM_INTAKE_ALL : String(yearOptions[0] ?? 1));
  const [semester, setSemester] = useState(
    allowAllSemester ? PROGRAM_INTAKE_ALL : String(semesterOptions[0] ?? 1)
  );
  const [intakeType, setIntakeType] = useState<IntakeTypeValue>('Day');
  const [programIntakeId, setProgramIntakeId] = useState(
    intakeField === 'cohortList' ? PROGRAM_INTAKE_ALL : ''
  );
  const [intakes, setIntakes] = useState<ProgramIntakeRecord[]>([]);
  const [loadingIntakes, setLoadingIntakes] = useState(false);

  const usesExternalCatalog = Boolean(externalSchools || externalPrograms);

  useEffect(() => {
    if (!enabled || usesExternalCatalog) return;
    setLoadingCatalog(true);
    Promise.all([
      academicService.getSchools(),
      academicService.getLevels(),
      academicService.getDepartments(),
      academicService.getPrograms(),
    ])
      .then(([schoolsRes, levelsRes, deptsRes, programsRes]) => {
        const schoolsData = (Array.isArray(schoolsRes) ? schoolsRes : (schoolsRes as { data?: { id: string; name: string }[] })?.data ?? []) as { id: string; name: string }[];
        setCatalogSchools(schoolsData.map((s) => ({ id: s.id, name: s.name })));
        setLevels((levelsRes || []).map((l: { id: string; schoolId: string }) => ({ id: l.id, schoolId: l.schoolId })));
        setDepartments(
          (deptsRes || []).map((d: { id: string; levelId: string }) => ({ id: d.id, levelId: d.levelId }))
        );
        const programs = Array.isArray(programsRes) ? programsRes : (programsRes as { data?: unknown[] })?.data ?? [];
        setCatalogPrograms(
          programs.map((p: ProgramOption) => ({
            id: p.id,
            name: p.name,
            code: p.code,
            departmentId: p.departmentId,
          }))
        );
      })
      .catch(() => {
        setCatalogSchools([]);
        setCatalogPrograms([]);
      })
      .finally(() => setLoadingCatalog(false));
  }, [enabled, usesExternalCatalog]);

  const schools = externalSchools ?? catalogSchools;
  const programs = externalPrograms ?? catalogPrograms;

  const programToSchoolMap = useMemo(() => {
    if (externalProgramToSchoolMap) return externalProgramToSchoolMap;
    const levelToSchool = new Map(levels.map((l) => [l.id, l.schoolId]));
    const deptToLevel = new Map(departments.map((d) => [d.id, d.levelId]));
    return new Map(
      programs.map((p) => [p.id, levelToSchool.get(deptToLevel.get(p.departmentId) || '') || ''])
    );
  }, [externalProgramToSchoolMap, levels, departments, programs]);

  const filteredPrograms = useMemo(() => {
    if (!showSchool || schoolId === PROGRAM_INTAKE_ALL || !schoolId) return programs;
    return programs.filter((p) => programToSchoolMap.get(p.id) === schoolId);
  }, [programs, showSchool, schoolId, programToSchoolMap]);

  const selectedProgram = useMemo(
    () => programs.find((p) => p.id === programId),
    [programs, programId]
  );

  const parsedYear = year === PROGRAM_INTAKE_ALL ? undefined : Number(year);
  const parsedSemester = semester === PROGRAM_INTAKE_ALL ? undefined : Number(semester);

  useEffect(() => {
    if (intakeField !== 'cohortList') return;
    if (!enabled || programId === PROGRAM_INTAKE_ALL || !programId) {
      setIntakes([]);
      setProgramIntakeId(PROGRAM_INTAKE_ALL);
      return;
    }
    setLoadingIntakes(true);
    academicService
      .getProgramIntakes({ programId, year: parsedYear, semester: parsedSemester })
      .then((list) => {
        const rows = (Array.isArray(list) ? list : []).map((i: ProgramIntakeRecord) => ({
          id: i.id,
          year: i.year,
          semester: i.semester,
          intakeType: i.intakeType,
        }));
        setIntakes(rows);
        setProgramIntakeId((prev) => (rows.some((r) => r.id === prev) ? prev : PROGRAM_INTAKE_ALL));
      })
      .catch(() => {
        setIntakes([]);
        setProgramIntakeId(PROGRAM_INTAKE_ALL);
      })
      .finally(() => setLoadingIntakes(false));
  }, [intakeField, enabled, programId, year, semester, parsedYear, parsedSemester]);

  const scopeLabel = useMemo(() => {
    if (intakeField === 'cohortList') {
      if (!programIntakeId || programIntakeId === PROGRAM_INTAKE_ALL) return '';
      const intake = intakes.find((i) => i.id === programIntakeId);
      if (!intake) return '';
      const schoolPart =
        showSchool && schoolId && schoolId !== PROGRAM_INTAKE_ALL
          ? `${schools.find((s) => s.id === schoolId)?.name ?? 'School'} · `
          : '';
      return `${schoolPart}${formatProgramLabel(selectedProgram)} · ${formatCohortLabel(intake)}`;
    }
    if (!programId) return '';
    return buildIntakeTypeScopeLabel({
      showSchool,
      schoolId,
      schoolName: schools.find((s) => s.id === schoolId)?.name ?? null,
      program: selectedProgram,
      year: parsedYear,
      semester: parsedSemester,
      intakeType,
    });
  }, [
    intakeField,
    programIntakeId,
    intakes,
    showSchool,
    schoolId,
    schools,
    selectedProgram,
    programId,
    parsedYear,
    parsedSemester,
    intakeType,
  ]);

  const isComplete =
    intakeField === 'cohortList'
      ? Boolean(programIntakeId && programIntakeId !== PROGRAM_INTAKE_ALL)
      : Boolean(programId) && (!showSchool || Boolean(schoolId));

  const reset = useCallback(() => {
    setSchoolId(allowAllSchool ? PROGRAM_INTAKE_ALL : '');
    setProgramId(allowAllProgram ? PROGRAM_INTAKE_ALL : '');
    setYear(allowAllYear ? PROGRAM_INTAKE_ALL : String(yearOptions[0] ?? 1));
    setSemester(allowAllSemester ? PROGRAM_INTAKE_ALL : String(semesterOptions[0] ?? 1));
    setIntakeType('Day');
    setProgramIntakeId(intakeField === 'cohortList' ? PROGRAM_INTAKE_ALL : '');
    setIntakes([]);
  }, [
    allowAllSchool,
    allowAllProgram,
    allowAllYear,
    allowAllSemester,
    yearOptions,
    semesterOptions,
    intakeField,
  ]);

  const resolveProgramIntake = useCallback(async (): Promise<ResolvedProgramIntake | null> => {
    if (intakeField === 'cohortList') {
      if (!programIntakeId || programIntakeId === PROGRAM_INTAKE_ALL) return null;
      const intake = intakes.find((i) => i.id === programIntakeId);
      const label = scopeLabel || (intake ? formatCohortLabel(intake) : programIntakeId);
      return { id: programIntakeId, label };
    }
    if (showSchool && !schoolId) return null;
    if (!programId) return null;
    const list = await academicService.getProgramIntakes({
      programId,
      year: parsedYear ?? Number(year),
      semester: parsedSemester ?? Number(semester),
      intakeType,
    });
    const intake = (Array.isArray(list) ? list : [])[0];
    if (!intake?.id) return null;
    return { id: intake.id, label: scopeLabel || intake.id };
  }, [
    intakeField,
    programIntakeId,
    intakes,
    scopeLabel,
    showSchool,
    schoolId,
    programId,
    parsedYear,
    parsedSemester,
    year,
    semester,
    intakeType,
  ]);

  const handleSchoolChange = useCallback(
    (value: string) => {
      setSchoolId(value);
      setProgramId(allowAllProgram ? PROGRAM_INTAKE_ALL : '');
      setProgramIntakeId(intakeField === 'cohortList' ? PROGRAM_INTAKE_ALL : '');
    },
    [allowAllProgram, intakeField]
  );

  const handleProgramChange = useCallback(
    (value: string) => {
      setProgramId(value);
      setProgramIntakeId(intakeField === 'cohortList' ? PROGRAM_INTAKE_ALL : '');
    },
    [intakeField]
  );

  return {
    schools,
    programs,
    filteredPrograms,
    intakes,
    schoolId,
    setSchoolId: handleSchoolChange,
    programId,
    setProgramId: handleProgramChange,
    year,
    setYear,
    semester,
    setSemester,
    intakeType,
    setIntakeType,
    programIntakeId,
    setProgramIntakeId,
    scopeLabel,
    isComplete,
    reset,
    resolveProgramIntake,
    loadingCatalog,
    loadingIntakes,
    selectedProgram,
    yearOptions,
    semesterOptions,
    allowAllSchool,
    allowAllProgram,
    allowAllYear,
    allowAllSemester,
    showSchool,
    intakeField,
  };
}

export type ProgramIntakeScopeApi = ReturnType<typeof useProgramIntakeScope>;
