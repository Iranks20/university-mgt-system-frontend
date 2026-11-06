export type NcheCourseHoursInput = {
  lectureHours?: number | null;
  tutorialHours?: number | null;
  practicalHours?: number | null;
};

export type NcheCourseHours = {
  lectureHours: number;
  tutorialHours: number;
  practicalHours: number;
  contactHours: number;
  creditUnits: number;
};

export function normalizeHourInput(value: number | null | undefined): number {
  if (value == null || Number.isNaN(Number(value))) return 0;
  return Math.max(0, Math.round(Number(value)));
}

export function computeNcheCourseHours(input: NcheCourseHoursInput): NcheCourseHours {
  const lectureHours = normalizeHourInput(input.lectureHours);
  const tutorialHours = normalizeHourInput(input.tutorialHours);
  const practicalHours = normalizeHourInput(input.practicalHours);
  const contactHours = Math.round(lectureHours + tutorialHours / 2 + practicalHours / 2);
  const creditUnits = Math.max(0, Math.round(contactHours / 15));
  return {
    lectureHours,
    tutorialHours,
    practicalHours,
    contactHours,
    creditUnits,
  };
}
