import { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { staffService } from '@/services/staff.service';
import type { Staff } from '@/types';

/** Search active staff by name, email or staff number and pick one. */
export function StaffSearchPicker({
  onPick,
  excludeIds = [],
  placeholder = 'Search staff by name, email or staff number',
}: {
  onPick: (staff: Staff) => void;
  excludeIds?: string[];
  placeholder?: string;
}) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Staff[]>([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const term = query.trim();
    if (term.length < 2) {
      setResults([]);
      return;
    }
    let cancelled = false;
    setLoading(true);
    // The staff API matches one field at a time, so "Jane Doe" finds nothing. Search by the first word
    // and keep only people whose name, email or staff number contains every word typed.
    const words = term.toLowerCase().split(/\s+/).filter(Boolean);
    const timer = setTimeout(() => {
      staffService
        .getStaff({ search: words[0], status: 'Active', limit: 50, page: 1 })
        .then((res) => {
          if (cancelled) return;
          const matches = res.data.filter((s) => {
            const haystack = `${s.firstName} ${s.lastName} ${s.email} ${s.staffNumber}`.toLowerCase();
            return words.every((w) => haystack.includes(w));
          });
          setResults(matches.slice(0, 10));
        })
        .finally(() => !cancelled && setLoading(false));
    }, 250);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const visible = results.filter((s) => !excludeIds.includes(s.id));

  return (
    <div className="space-y-2">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" />
        <Input className="pl-9" value={query} onChange={(e) => setQuery(e.target.value)} placeholder={placeholder} />
      </div>
      {query.trim().length >= 2 ? (
        <ul className="max-h-56 overflow-y-auto rounded-md border divide-y">
          {loading ? <li className="p-3 text-sm text-gray-500">Searching…</li> : null}
          {!loading && visible.length === 0 ? <li className="p-3 text-sm text-gray-500">No staff found</li> : null}
          {visible.map((s) => (
            <li key={s.id}>
              <button
                type="button"
                className="w-full px-3 py-2 text-left text-sm hover:bg-gray-50"
                onClick={() => {
                  onPick(s);
                  setQuery('');
                }}
              >
                <span className="font-medium">
                  {s.firstName} {s.lastName}
                </span>
                <span className="text-gray-500"> · {s.role} · {s.staffNumber}</span>
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}
