import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  EMPTY_ORDER_FILTERS, customerKind, filterCustomersByKind, filterOrders, filterUsersByRole, hasOrderFilters, isOrderRangeInvalid,
} from '../src/lib/listFilters.ts';

const orders = [
  { id: 1, status: 'PENDING', date: '2026-10-01T09:00:00' },
  { id: 2, status: 'DELIVERED', date: '2026-10-15' },
  { id: 3, status: 'CANCELLED', date: '2026-10-31T23:59:59' },
  { id: 4, status: undefined, date: '2026-11-01' },
];

test('no filters keeps every order', () => {
  assert.deepEqual(filterOrders(orders, EMPTY_ORDER_FILTERS).map((o) => o.id), [1, 2, 3, 4]);
});

test('status filter is exact; a missing status counts as PENDING like the screen shows', () => {
  assert.deepEqual(filterOrders(orders, { ...EMPTY_ORDER_FILTERS, status: 'DELIVERED' }).map((o) => o.id), [2]);
  assert.deepEqual(filterOrders(orders, { ...EMPTY_ORDER_FILTERS, status: 'PENDING' }).map((o) => o.id), [1, 4]);
});

test('date range includes both whole days', () => {
  assert.deepEqual(filterOrders(orders, { ...EMPTY_ORDER_FILTERS, from: '2026-10-01', to: '2026-10-31' }).map((o) => o.id), [1, 2, 3]);
  assert.deepEqual(filterOrders(orders, { ...EMPTY_ORDER_FILTERS, from: '2026-10-16' }).map((o) => o.id), [3, 4]);
  assert.deepEqual(filterOrders(orders, { ...EMPTY_ORDER_FILTERS, to: '2026-10-15' }).map((o) => o.id), [1, 2]);
});

test('status and dates combine', () => {
  assert.deepEqual(filterOrders(orders, { status: 'CANCELLED', from: '2026-10-20', to: '2026-10-31' }).map((o) => o.id), [3]);
});

test('an order without a date never matches a date filter', () => {
  assert.deepEqual(filterOrders([{ id: 9, status: 'PENDING', date: '' }], { ...EMPTY_ORDER_FILTERS, from: '2026-01-01' }), []);
});

test('a half-typed date is ignored; a reversed range is detected', () => {
  assert.deepEqual(filterOrders(orders, { ...EMPTY_ORDER_FILTERS, from: '2026-1' }).map((o) => o.id), [1, 2, 3, 4]);
  assert.equal(isOrderRangeInvalid({ ...EMPTY_ORDER_FILTERS, from: '2026-02-02', to: '2026-02-01' }), true);
  assert.equal(isOrderRangeInvalid({ ...EMPTY_ORDER_FILTERS, from: '2026-02-01', to: '2026-02-01' }), false);
});

test('hasOrderFilters ignores blanks', () => {
  assert.equal(hasOrderFilters(EMPTY_ORDER_FILTERS), false);
  assert.equal(hasOrderFilters({ ...EMPTY_ORDER_FILTERS, status: 'SHIPPED' }), true);
});

test('customer kind: COMPANY and CORPORATE are companies; no type falls back to the last name like the chip does', () => {
  assert.equal(customerKind({ customerType: 'COMPANY' }), 'COMPANY');
  assert.equal(customerKind({ customerType: 'CORPORATE' }), 'COMPANY');
  assert.equal(customerKind({ customerType: 'INDIVIDUAL' }), 'INDIVIDUAL');
  assert.equal(customerKind({ lastName: 'Lovelace' }), 'INDIVIDUAL');
  assert.equal(customerKind({ lastName: '  ' }), 'COMPANY');
});

test('customer kind filter', () => {
  const cs = [{ id: 1, customerType: 'INDIVIDUAL' }, { id: 2, customerType: 'CORPORATE' }, { id: 3, customerType: 'COMPANY' }];
  assert.deepEqual(filterCustomersByKind(cs, '').map((c) => c.id), [1, 2, 3]);
  assert.deepEqual(filterCustomersByKind(cs, 'COMPANY').map((c) => c.id), [2, 3]);
  assert.deepEqual(filterCustomersByKind(cs, 'INDIVIDUAL').map((c) => c.id), [1]);
});

test('user role filter is exact', () => {
  const us = [{ id: 1, role: 'ADMIN' }, { id: 2, role: 'USER' }];
  assert.deepEqual(filterUsersByRole(us, '').map((u) => u.id), [1, 2]);
  assert.deepEqual(filterUsersByRole(us, 'USER').map((u) => u.id), [2]);
});
