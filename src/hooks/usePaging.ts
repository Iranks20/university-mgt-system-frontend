import { useCallback, useState } from 'react';
import { DEFAULT_PAGE_SIZE } from '@/lib/pagination';

export function usePaging(resetKey: string, initialPageSize = DEFAULT_PAGE_SIZE) {
  const [state, setState] = useState({ key: resetKey, page: 1, pageSize: initialPageSize });
  const page = state.key === resetKey ? state.page : 1;

  const setPage = useCallback(
    (next: number) => setState((current) => ({ ...current, key: resetKey, page: next })),
    [resetKey]
  );

  const setPageSize = useCallback(
    (size: number) => setState({ key: resetKey, page: 1, pageSize: size }),
    [resetKey]
  );

  return { page, pageSize: state.pageSize, setPage, setPageSize };
}
