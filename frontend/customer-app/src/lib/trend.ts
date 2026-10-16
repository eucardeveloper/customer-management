/**
 * Percentage change between two time windows, as a string with one decimal.
 *
 * Returns null when there is nothing to compare: an empty window on either side means
 * "no data", not "-100 %" (a dashboard whose newest order is 31 days old would otherwise
 * report a collapse that is really just a quiet month).
 */
export function pctChange(curr: number, prev: number, currCount: number, prevCount: number): string | null {
  if (currCount <= 0 || prevCount <= 0 || prev <= 0) return null;
  return (((curr - prev) / prev) * 100).toFixed(1);
}
