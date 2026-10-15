/**
 * The order numbers behind the dashboard and the analytics page. They used to be written out twice inside
 * the 1,800-line page component; as plain functions they have one definition and can be tested.
 * Dates are read in the browser's local time, like the charts that show them.
 */

export interface StatOrder {
  customerId: number;
  price: number;
  quantity: number;
  status?: string;
  date?: string;
}

export const DAY_MS = 24 * 60 * 60 * 1000;

export const orderTotal = (o: Pick<StatOrder, 'price' | 'quantity'>): number => o.price * o.quantity;

export const sumRevenue = (orders: Pick<StatOrder, 'price' | 'quantity'>[]): number =>
  orders.reduce((sum, o) => sum + orderTotal(o), 0);

/** An order without a status counts as pending (the API defaults it the same way). */
export const isPending = (o: Pick<StatOrder, 'status'>): boolean => (o.status ?? 'PENDING') === 'PENDING';

export function countByStatus<T extends Pick<StatOrder, 'status'>>(
  orders: T[],
  statuses: readonly string[],
): { status: string; count: number }[] {
  return statuses.map((status) => ({ status, count: orders.filter((o) => (o.status ?? 'PENDING') === status).length }));
}

/**
 * Splits orders into "the last {days} days" and "the {days} before that" (age measured back from `now`).
 * Orders without a date belong to neither; an order dated in the future counts as current.
 */
export function trendWindows<T extends { date?: string }>(
  orders: T[],
  now: number,
  days = 30,
): { current: T[]; previous: T[] } {
  const span = days * DAY_MS;
  const age = (o: T) => now - new Date(o.date as string).getTime();
  return {
    current: orders.filter((o) => o.date && age(o) < span),
    previous: orders.filter((o) => o.date && age(o) >= span && age(o) < 2 * span),
  };
}

/** Change of the delivered share between two windows, in percentage points; null if either window is empty. */
export function deliveredRateChange(
  current: Pick<StatOrder, 'status'>[],
  previous: Pick<StatOrder, 'status'>[],
): string | null {
  if (current.length === 0 || previous.length === 0) return null;
  const share = (os: Pick<StatOrder, 'status'>[]) => (os.filter((o) => o.status === 'DELIVERED').length / os.length) * 100;
  return (share(current) - share(previous)).toFixed(1);
}

export interface RevenuePoint {
  label: string;
  value: number;
}

function revenueBy(orders: StatOrder[], keyOf: (d: Date) => string, labelOf: (d: Date) => string): RevenuePoint[] {
  const buckets = new Map<string, RevenuePoint>();
  for (const o of orders) {
    if (!o.date) continue;
    const d = new Date(o.date);
    const key = keyOf(d);
    const bucket = buckets.get(key) ?? { label: labelOf(d), value: 0 };
    bucket.value += orderTotal(o);
    buckets.set(key, bucket);
  }
  return [...buckets.entries()].sort((a, b) => a[0].localeCompare(b[0])).map(([, point]) => point);
}

const pad = (n: number) => String(n).padStart(2, '0');

/** Revenue per calendar month, oldest first; label like "Aug '26". */
export const monthlyRevenue = (orders: StatOrder[]): RevenuePoint[] =>
  revenueBy(
    orders,
    (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}`,
    (d) => `${d.toLocaleString('en-US', { month: 'short' })} '${String(d.getFullYear()).slice(-2)}`,
  );

/** Revenue per calendar day, oldest first; label like "Aug 25". */
export const dailyRevenue = (orders: StatOrder[]): RevenuePoint[] =>
  revenueBy(
    orders,
    (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`,
    (d) => d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
  );

/** The customers who brought in the most revenue, best first (ties: lower customer id first). */
export function topCustomersByRevenue(
  orders: Pick<StatOrder, 'customerId' | 'price' | 'quantity'>[],
  limit: number,
): { customerId: number; revenue: number }[] {
  const totals = new Map<number, number>();
  for (const o of orders) totals.set(o.customerId, (totals.get(o.customerId) ?? 0) + orderTotal(o));
  return [...totals.entries()]
    .map(([customerId, revenue]) => ({ customerId, revenue }))
    .sort((a, b) => b.revenue - a.revenue || a.customerId - b.customerId)
    .slice(0, limit);
}

const monthKey = (d: Date) => `${d.getFullYear()}-${d.getMonth()}`;

/** One value per calendar month for the last `months` months ending with the month of `now` (for the sparklines). */
export function monthlySeries<T extends { date?: string }>(
  orders: T[],
  now: number,
  pick: (ordersOfMonth: T[]) => number,
  months = 6,
): number[] {
  return Array.from({ length: months }, (_, i) => {
    const d = new Date(now);
    d.setDate(1);
    d.setMonth(d.getMonth() - (months - 1 - i));
    const key = monthKey(d);
    return pick(orders.filter((o) => o.date && monthKey(new Date(o.date)) === key));
  });
}
