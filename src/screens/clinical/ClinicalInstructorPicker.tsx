import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Combobox } from '@/components/ui/combobox';
import { clinicalService } from '@/services/clinical.service';

export type InstructorPickValue = string;

function encodePick(id: string) {
  return `clinical:${id}`;
}

type ClinicalInstructorPickerProps = {
  value: InstructorPickValue;
  onValueChange: (value: InstructorPickValue, label?: string) => void;
  clinicalSiteId?: string;
  disabled?: boolean;
};

export function ClinicalInstructorPicker({
  value,
  onValueChange,
  clinicalSiteId,
  disabled,
}: ClinicalInstructorPickerProps) {
  const [options, setOptions] = useState<Array<{ id: string; label: string; description?: string }>>([]);
  const [loading, setLoading] = useState(false);
  const labelByValue = useRef(new Map<string, string>());
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const load = useCallback(
    async (search: string) => {
      setLoading(true);
      try {
        const rows = await clinicalService.searchSessionInstructorPicker({
          search: search.trim() || undefined,
          clinicalSiteId: clinicalSiteId || undefined,
          limit: search.trim() ? 40 : 25,
        });
        setOptions(rows);
        const nextLabels = new Map<string, string>();
        for (const row of rows) {
          nextLabels.set(encodePick(row.id), row.label);
        }
        labelByValue.current = nextLabels;
      } catch {
        setOptions([]);
      } finally {
        setLoading(false);
      }
    },
    [clinicalSiteId]
  );

  useEffect(() => {
    load('');
  }, [load]);

  const comboboxOptions = useMemo(() => {
    const items = options.map((row) => ({
      value: encodePick(row.id),
      label: row.label,
      description: row.description,
    }));
    if (value && !items.some((o) => o.value === value)) {
      const saved = labelByValue.current.get(value);
      if (saved) {
        items.unshift({ value, label: saved, description: 'Selected instructor' });
      }
    }
    return items;
  }, [options, value]);

  const selectedLabel = value ? labelByValue.current.get(value) : undefined;

  const handleSearchChange = (query: string) => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      load(query);
    }, 280);
  };

  return (
    <Combobox
      options={comboboxOptions}
      value={value || undefined}
      onValueChange={(v) => {
        const next = v || '';
        const label = next ? labelByValue.current.get(next) : undefined;
        onValueChange(next, label);
      }}
      placeholder="Select registered instructor"
      searchPlaceholder="Search registered clinical instructors…"
      emptyText={loading ? 'Searching…' : 'No registered instructor. Add one under Clinical → Instructors, or type a name below.'}
      initialDisplayCount={25}
      manualFiltering
      loading={loading}
      disabled={disabled}
      selectedLabel={selectedLabel}
      onSearchChange={handleSearchChange}
    />
  );
}

export function instructorPickToSessionPayload(
  pick: string,
  labelByPick: Map<string, string>,
  manualName: string
): { clinicalInstructorId?: string | null; staffId?: string | null; instructorName?: string | null } {
  const manual = manualName.trim();
  if (manual) {
    return { clinicalInstructorId: null, staffId: null, instructorName: manual };
  }
  if (!pick) {
    return { clinicalInstructorId: null, staffId: null, instructorName: null };
  }
  if (pick.startsWith('clinical:')) {
    return { clinicalInstructorId: pick.slice('clinical:'.length), staffId: null, instructorName: null };
  }
  return { clinicalInstructorId: null, staffId: null, instructorName: null };
}
