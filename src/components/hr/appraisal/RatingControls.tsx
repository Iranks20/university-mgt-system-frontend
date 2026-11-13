import { APPRAISAL_RATING_OPTIONS, type AppraisalCriterionRating } from '@/features/hr/types';

function toValue(raw: string): AppraisalCriterionRating | null {
  if (raw === '') return null;
  if (raw === 'N/A') return 'N/A';
  return Number(raw) as AppraisalCriterionRating;
}

export function RatingSelect({
  value,
  onChange,
  disabled,
  includeNa = true,
  label,
}: {
  value: AppraisalCriterionRating | null;
  onChange: (value: AppraisalCriterionRating | null) => void;
  disabled?: boolean;
  includeNa?: boolean;
  label: string;
}) {
  return (
    <select
      aria-label={label}
      className={`w-full min-w-[9.5rem] rounded-md border px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-[#015F2B]/40 disabled:bg-gray-50 ${
        value === null ? 'border-amber-300' : 'border-gray-300'
      }`}
      value={value === null ? '' : String(value)}
      disabled={disabled}
      onChange={(e) => onChange(toValue(e.target.value))}
    >
      <option value="">— Select —</option>
      {APPRAISAL_RATING_OPTIONS.filter((o) => includeNa || o.value !== 'N/A').map((o) => (
        <option key={String(o.value)} value={String(o.value)}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

/** Coloured rating chip, as on the previous system: 2–3 high, 1 medium, 0 low. */
export function RatingBadge({ value }: { value: AppraisalCriterionRating | null }) {
  if (value === null) return <span className="text-gray-400">—</span>;
  const tone =
    value === 'N/A'
      ? 'bg-gray-100 text-gray-600'
      : value >= 2
        ? 'bg-green-100 text-green-800'
        : value >= 1
          ? 'bg-amber-100 text-amber-800'
          : 'bg-red-100 text-red-700';
  return (
    <span className={`inline-flex min-w-[2rem] justify-center rounded-full px-2 py-0.5 text-xs font-semibold ${tone}`}>
      {value}
    </span>
  );
}
