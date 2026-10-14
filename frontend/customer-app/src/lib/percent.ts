/**
 * Whole-number percentages that add up to exactly 100 (largest-remainder method). Rounding each share
 * on its own can give 101% (for example 12.5 + 12.5 + 25 + 50 shown as 13 + 13 + 25 + 50).
 * An all-zero input gives all zeros.
 */
export function percentShares(counts: number[]): number[] {
  const total = counts.reduce((a, b) => a + b, 0);
  if (total <= 0) return counts.map(() => 0);
  const exact = counts.map((c) => (c / total) * 100);
  const floors = exact.map(Math.floor);
  let left = 100 - floors.reduce((a, b) => a + b, 0);
  const order = exact
    .map((x, i) => ({ i, frac: x - Math.floor(x) }))
    .sort((a, b) => b.frac - a.frac || a.i - b.i);
  for (const { i } of order) {
    if (left <= 0) break;
    floors[i] += 1;
    left -= 1;
  }
  return floors;
}
