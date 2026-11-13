import { CheckCircle2, Clock, Stamp, UserCheck, UserCog } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { OSEI_LEVELS, OSEI_NOT_APPLICABLE_DEFINITION, type HrAppraisalReview } from '@/features/hr/types';
import { formatPercent } from '@/features/hr/appraisal-form-utils';

/**
 * SECTION D: OSEI. The band is worked out from the overall score (as HR's view did before) instead of
 * a radio button the staff member could tick but that was never saved.
 */
export function OseiTable({ score, basis }: { score: 0 | 1 | 2 | 3 | null; basis?: string }) {
  return (
    <div className="rounded-lg border overflow-hidden break-inside-avoid">
      <div className="bg-gray-50 px-4 py-3 border-b">
        <h3 className="font-semibold text-gray-900">SECTION D: OSEI — Objectively Scorable Evaluation Instrument</h3>
        <p className="text-xs text-gray-500 mt-1">
          {basis ?? 'The band is set automatically from the overall score.'}
        </p>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="text-left text-xs uppercase tracking-wide text-gray-500">
            <tr className="border-b">
              <th className="px-3 py-2">Performance Level</th>
              <th className="px-3 py-2 text-center">Score</th>
              <th className="px-3 py-2 text-center">Band</th>
              <th className="px-3 py-2">Performance Definitions / Implications</th>
            </tr>
          </thead>
          <tbody>
            {OSEI_LEVELS.map((level) => {
              const active = score === level.score;
              return (
                <tr key={level.score} className={`border-b align-top ${active ? 'bg-green-50' : ''}`}>
                  <td className="px-3 py-2 font-medium">
                    {level.label} ({level.range})
                  </td>
                  <td className="px-3 py-2 text-center font-semibold">{level.score}</td>
                  <td className="px-3 py-2 text-center">
                    {active ? <CheckCircle2 className="inline h-5 w-5 text-[#015F2B]" aria-label="This band" /> : null}
                  </td>
                  <td className="px-3 py-2 text-gray-600">{level.definition}</td>
                </tr>
              );
            })}
            <tr className="align-top">
              <td className="px-3 py-2 font-medium">Not Applicable</td>
              <td className="px-3 py-2 text-center font-semibold">N/A</td>
              <td className="px-3 py-2" />
              <td className="px-3 py-2 text-gray-600">{OSEI_NOT_APPLICABLE_DEFINITION}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

const STEPS: Array<{ key: keyof HrAppraisalReview['progress']; label: string; icon: LucideIcon }> = [
  { key: 'selfAssessment', label: 'Self Assessment', icon: UserCheck },
  { key: 'supervisorRating', label: 'Supervisor Rating', icon: UserCog },
  { key: 'hrSigned', label: 'HR Signed', icon: Stamp },
  { key: 'vcSigned', label: 'VC Signed', icon: CheckCircle2 },
];

/** "Appraisal Progress Tracker" from the previous results page. */
export function AppraisalProgressTracker({ progress }: { progress: HrAppraisalReview['progress'] }) {
  const done = STEPS.filter((s) => progress[s.key]).length;
  const pct = Math.round((done / STEPS.length) * 100);
  return (
    <div className="rounded-lg border p-4">
      <h3 className="font-semibold text-gray-900 mb-4">Appraisal Progress Tracker</h3>
      <ol className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {STEPS.map((step) => {
          const complete = progress[step.key];
          const Icon = complete ? step.icon : Clock;
          return (
            <li key={step.key} className="flex flex-col items-center text-center gap-1">
              <span
                className={`flex h-10 w-10 items-center justify-center rounded-full ${
                  complete ? 'bg-[#015F2B] text-white' : 'bg-gray-100 text-gray-400'
                }`}
              >
                <Icon className="h-5 w-5" />
              </span>
              <span className="text-sm font-medium">{step.label}</span>
              <span className={`text-xs ${complete ? 'text-[#015F2B]' : 'text-gray-500'}`}>
                {complete ? 'Completed' : 'Pending'}
              </span>
            </li>
          );
        })}
      </ol>
      <div className="mt-4 h-2 rounded-full bg-gray-100 overflow-hidden">
        <div className="h-full bg-[#015F2B]" style={{ width: `${pct}%` }} />
      </div>
      <p className="mt-1 text-right text-xs text-gray-500">{pct}% Complete</p>
    </div>
  );
}

/** Staff self-assessment % next to supervisor rating %. */
export function ScoreComparison({
  selfScore,
  supervisorScore,
  showSupervisor = true,
}: {
  selfScore: number | null;
  supervisorScore: number | null;
  showSupervisor?: boolean;
}) {
  const box = (label: string, value: number | null, text: string, bar: string) => (
    <div className="rounded-lg border p-4 text-center">
      <p className="text-xs uppercase tracking-wide text-gray-500">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold ${text}`}>{formatPercent(value)}</p>
      <div className="mt-3 h-1 rounded bg-gray-100 overflow-hidden">
        <div className={`h-full ${bar}`} style={{ width: `${value ?? 0}%` }} />
      </div>
    </div>
  );
  return (
    <div className={`grid gap-4 ${showSupervisor ? 'sm:grid-cols-2' : ''}`}>
      {box('Staff Self Assessment', selfScore, 'text-[#015F2B]', 'bg-[#015F2B]')}
      {showSupervisor ? box('Supervisor Rating', supervisorScore, 'text-blue-600', 'bg-blue-600') : null}
    </div>
  );
}

/** "Appraisee Details" grid shown on every review page of the previous system. */
export function AppraiseeDetails({ review }: { review: HrAppraisalReview }) {
  const a = review.agreement;
  const items: Array<[string, string | null | undefined]> = [
    ['Name', review.employeeName],
    ['Job Title', a.designation || review.jobTitle],
    ['Employment Type', a.employmentType],
    ['Date of Appointment', a.appointmentDate],
    ['Appraisal Type', review.appraisalTypeLabel],
    ['Period From', a.periodFrom],
    ['Period To', a.periodTo],
    ['School / Unit', a.schoolUnit],
    ['Department', a.departmentName || review.department],
    ['Supervisor', review.supervisorName ?? 'Not assigned'],
    ['Rank of Supervisor', a.supervisorRank],
  ];
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2 lg:grid-cols-3 text-sm">
      {items.map(([label, value]) => (
        <div key={label}>
          <dt className="text-xs uppercase tracking-wide text-gray-500">{label}</dt>
          <dd className="font-medium text-gray-900">{value || '—'}</dd>
        </div>
      ))}
    </dl>
  );
}
