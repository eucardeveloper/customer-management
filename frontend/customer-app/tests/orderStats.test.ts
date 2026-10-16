import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  DAY_MS, sumRevenue, isPending, countByStatus, trendWindows, deliveredRateChange,
  monthlyRevenue, dailyRevenue, topCustomersByRevenue, monthlySeries,
} from '../src/lib/orderStats.ts';

// Local-time dates, so the tests do not depend on the machine's time zone.
const at = (y: number, m: number, d: number) => new Date(y, m - 1, d, 12).toISOString();
const NOW = new Date(2026, 9, 14, 12).getTime(); // 14 Oct 2026

const order = (over: Partial<{ customerId: number; price: number; quantity: number; status: string; date: string }> = {}) =>
  ({ customerId: 1, price: 10, quantity: 1, status: 'PENDING', date: at(2026, 10, 1), ...over });

test('sumRevenue multiplies price by quantity and is 0 for no orders', () => {
  assert.equal(sumRevenue([]), 0);
  assert.equal(sumRevenue([order({ price: 29.99, quantity: 2 }), order({ price: 100, quantity: 1 })]), 159.98);
});

test('a missing status counts as pending', () => {
  assert.equal(isPending({}), true);
  assert.equal(isPending({ status: 'PENDING' }), true);
  assert.equal(isPending({ status: 'SHIPPED' }), false);
});

test('countByStatus keeps every status, including the empty ones, in the given order', () => {
  const result = countByStatus([{ status: 'DELIVERED' }, { status: 'DELIVERED' }, {}], ['PENDING', 'DELIVERED', 'CANCELLED']);
  assert.deepEqual(result, [
    { status: 'PENDING', count: 1 },
    { status: 'DELIVERED', count: 2 },
    { status: 'CANCELLED', count: 0 },
  ]);
});

test('trendWindows separates the last 30 days from the 30 before', () => {
  const fresh = order({ date: new Date(NOW - 5 * DAY_MS).toISOString() });
  const edgeCurrent = order({ date: new Date(NOW - 30 * DAY_MS + 1000).toISOString() });
  const older = order({ date: new Date(NOW - 45 * DAY_MS).toISOString() });
  const tooOld = order({ date: new Date(NOW - 61 * DAY_MS).toISOString() });
  const noDate = { ...order(), date: undefined };
  const { current, previous } = trendWindows([fresh, edgeCurrent, older, tooOld, noDate], NOW);
  assert.deepEqual(current, [fresh, edgeCurrent]);
  assert.deepEqual(previous, [older]);
});

test('trendWindows: exactly 30 days old is already "previous", and the window length is configurable', () => {
  const exactly30 = order({ date: new Date(NOW - 30 * DAY_MS).toISOString() });
  assert.deepEqual(trendWindows([exactly30], NOW).previous, [exactly30]);
  assert.deepEqual(trendWindows([exactly30], NOW, 60).current, [exactly30]);
});

test('deliveredRateChange is the change in percentage points, or null when a window is empty', () => {
  const half = [{ status: 'DELIVERED' }, { status: 'PENDING' }];
  const all = [{ status: 'DELIVERED' }, { status: 'DELIVERED' }];
  assert.equal(deliveredRateChange(all, half), '50.0');
  assert.equal(deliveredRateChange(half, all), '-50.0');
  assert.equal(deliveredRateChange([], half), null);
  assert.equal(deliveredRateChange(half, []), null);
});

test('monthlyRevenue groups by calendar month, oldest first, with a short label', () => {
  const rows = monthlyRevenue([
    order({ price: 100, date: at(2026, 9, 3) }),
    order({ price: 50, date: at(2026, 8, 30) }),
    order({ price: 25, quantity: 2, date: at(2026, 9, 20) }),
    { ...order(), date: undefined },
  ]);
  assert.deepEqual(rows, [{ label: "Aug '26", value: 50 }, { label: "Sep '26", value: 150 }]);
});

test('monthlyRevenue sorts across a year boundary', () => {
  const rows = monthlyRevenue([order({ date: at(2027, 1, 5) }), order({ date: at(2026, 12, 5) })]);
  assert.deepEqual(rows.map((r) => r.label), ["Dec '26", "Jan '27"]);
});

test('dailyRevenue groups by calendar day', () => {
  const rows = dailyRevenue([
    order({ price: 10, date: at(2026, 9, 2) }),
    order({ price: 5, date: at(2026, 9, 2) }),
    order({ price: 7, date: at(2026, 9, 1) }),
  ]);
  assert.deepEqual(rows, [{ label: 'Sep 1', value: 7 }, { label: 'Sep 2', value: 15 }]);
});

test('topCustomersByRevenue ranks by revenue, breaks ties by customer id and respects the limit', () => {
  const orders = [
    order({ customerId: 3, price: 100 }),
    order({ customerId: 1, price: 40, quantity: 2 }),
    order({ customerId: 2, price: 80 }),
    order({ customerId: 1, price: 20 }),
  ];
  assert.deepEqual(topCustomersByRevenue(orders, 2), [
    { customerId: 1, revenue: 100 },
    { customerId: 3, revenue: 100 },
  ]);
  assert.deepEqual(topCustomersByRevenue([], 5), []);
});

test('monthlySeries has one value per month, ending with the current month', () => {
  const orders = [
    order({ date: at(2026, 10, 2) }), order({ date: at(2026, 10, 9) }),
    order({ date: at(2026, 8, 15) }),
    order({ date: at(2025, 1, 1) }), // outside the six months
  ];
  // May, Jun, Jul, Aug, Sep, Oct 2026
  assert.deepEqual(monthlySeries(orders, NOW, (os) => os.length), [0, 0, 0, 1, 0, 2]);
});
