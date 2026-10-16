export type Paged<T> = {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  totalPages?: number;
};

export const DEFAULT_PAGE_SIZE = 25;

export const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

export function emptyPage<T>(pageSize = DEFAULT_PAGE_SIZE): Paged<T> {
  return { data: [], total: 0, page: 1, pageSize, totalPages: 1 };
}
