import {
  isLectureTaught,
  normalizeLectureComment,
  tallyUntaughtBreakdown,
} from '@/lib/lecture-outcome';

export type QaTeachingMetricRecord = {
  comment: string | null | undefined;
  deliveryMode?: string | null;
};

export type QaTeachingMetrics = {
  physicalClasses: number;
  onlineLectures: number;
  noTaught: number;
  noSdl: number;
  assignment: number;
  missedByLecturer: number;
  missedByStudents: number;
  missedOtherProgramsHolidays: number;
  totalLearningActivity: number;
  totalUntaught: number;
  totalMissed: number;
  noSubstituted: number;
  taughtCommentCount: number;
};

function isPhysicalDeliveryMode(mode: string | null | undefined): boolean {
  const normalized = mode || 'InPerson';
  return normalized === 'InPerson' || normalized === 'Hybrid';
}

function isOnlineDeliveryMode(mode: string | null | undefined): boolean {
  return mode === 'Online';
}

export function computeQaTeachingMetrics(
  records: ReadonlyArray<QaTeachingMetricRecord>
): QaTeachingMetrics {
  const breakdown = tallyUntaughtBreakdown(records);
  const taughtRecords = records.filter((r) => isLectureTaught(r.comment));
  const physicalClasses = taughtRecords.filter((r) => isPhysicalDeliveryMode(r.deliveryMode)).length;
  const onlineLectures = taughtRecords.filter((r) => isOnlineDeliveryMode(r.deliveryMode)).length;
  const noTaught = physicalClasses + onlineLectures;
  const noSdl = breakdown.sdl;
  const assignment = breakdown.assignment;
  const missedByLecturer = breakdown.missedByLecturer;
  const missedByStudents = breakdown.missedByStudents;
  const missedOtherProgramsHolidays = breakdown.missedOtherProgramsHolidays;
  const totalMissed = missedByLecturer + missedByStudents + missedOtherProgramsHolidays;
  const totalUntaught = noSdl + assignment + totalMissed;
  const totalLearningActivity = noTaught + noSdl + assignment;

  return {
    physicalClasses,
    onlineLectures,
    noTaught,
    noSdl,
    assignment,
    missedByLecturer,
    missedByStudents,
    missedOtherProgramsHolidays,
    totalLearningActivity,
    totalUntaught,
    totalMissed,
    noSubstituted: records.filter((r) => normalizeLectureComment(r.comment) === 'SUBSTITUTED').length,
    taughtCommentCount: taughtRecords.length,
  };
}

export function computeQaTeachingRatePercent(noTaught: number, totalUntaught: number): number {
  const denominator = noTaught + totalUntaught;
  if (denominator <= 0) return 0;
  return Math.round((noTaught / denominator) * 1000) / 10;
}
