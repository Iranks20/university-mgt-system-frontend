import { useEffect, useState } from 'react';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { academicService } from '@/services/academic.service';

type StreamOption = { id: string; code: string; name: string; minYear: number | null };

/**
 * "Specialization stream" picker for a course unit. Renders nothing when the program has no
 * streams. Only streams that start at or before the course unit's year can be chosen; a stream
 * that no longer fits (program or year changed) is cleared.
 */
export function CourseStreamSelect({
  programId,
  level,
  value,
  onChange,
}: {
  programId: string | null | undefined;
  level: number;
  value: string;
  onChange: (streamId: string) => void;
}) {
  const [streams, setStreams] = useState<StreamOption[]>([]);
  /** Program whose streams are loaded (avoids clearing the value before they arrive). */
  const [loadedFor, setLoadedFor] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    if (!programId) {
      setStreams([]);
      setLoadedFor(null);
      return;
    }
    academicService
      .getProgramStreams(programId)
      .then((rows) => {
        if (cancelled) return;
        setStreams(rows.filter((r) => r.isActive !== false));
        setLoadedFor(programId);
      })
      .catch(() => {
        if (cancelled) return;
        setStreams([]);
        setLoadedFor(programId);
      });
    return () => {
      cancelled = true;
    };
  }, [programId]);

  const available = streams.filter((s) => s.minYear == null || level >= s.minYear);

  // Clear a stream that no longer fits (program removed/changed, or year below the stream's start).
  useEffect(() => {
    if (!value) return;
    if (!programId) {
      onChange('');
      return;
    }
    if (loadedFor !== programId) return;
    if (!available.some((s) => s.id === value)) onChange('');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [value, programId, level, streams, loadedFor]);

  if (!programId || streams.length === 0) return null;

  const earliest = Math.min(...streams.map((s) => s.minYear ?? 1));
  return (
    <div className="space-y-1">
      <Label>Specialization stream</Label>
      <Select
        value={value || '__none__'}
        onValueChange={(v) => onChange(v === '__none__' ? '' : v)}
        disabled={available.length === 0}
      >
        <SelectTrigger>
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="__none__">None (all students take it)</SelectItem>
          {available.map((s) => (
            <SelectItem key={s.id} value={s.id}>
              {s.name} ({s.code}) only
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <p className="text-xs text-muted-foreground">
        {available.length === 0
          ? `Specializations start at Year ${earliest}; this course unit is for all students.`
          : 'A stream course unit is enrolled and timetabled only for students of that specialization. Its classes follow this setting unless a class sets its own stream.'}
      </p>
    </div>
  );
}
