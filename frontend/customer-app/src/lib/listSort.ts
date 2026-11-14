export type SortDir = 'asc' | 'desc';
export interface SortState { key: string; dir: SortDir }
export type SortValue = string | number | null | undefined;
export type Accessors<T> = Record<string, (row: T) => SortValue>;

/** Clicking a column: ascending, then descending, then back to the screen's default order. Another column starts ascending. */
export function nextSort(current: SortState | null, key: string): SortState | null {
  if (!current || current.key !== key) return { key, dir: 'asc' };
  return current.dir === 'asc' ? { key, dir: 'desc' } : null;
}

const empty = (v: SortValue) => v === null || v === undefined || v === '';

function compare(a: SortValue, b: SortValue): number {
  if (typeof a === 'number' && typeof b === 'number') return a - b;
  return String(a).localeCompare(String(b), undefined, { sensitivity: 'base', numeric: true });
}

/** A sorted copy. Equal rows keep their original order; empty values go last in both directions. */
export function sortRows<T>(rows: readonly T[], sort: SortState | null, accessors: Accessors<T>): T[] {
  const get = sort ? accessors[sort.key] : undefined;
  if (!sort || !get) return [...rows];
  const sign = sort.dir === 'asc' ? 1 : -1;
  return rows
    .map((row, index) => ({ row, index, value: get(row) }))
    .sort((x, y) => {
      const xe = empty(x.value);
      const ye = empty(y.value);
      if (xe || ye) return xe && ye ? x.index - y.index : xe ? 1 : -1;
      return sign * compare(x.value, y.value) || x.index - y.index;
    })
    .map((x) => x.row);
}
