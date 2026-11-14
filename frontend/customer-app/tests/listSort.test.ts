import { test } from 'node:test';
import assert from 'node:assert/strict';
import { nextSort, sortRows, type Accessors } from '../src/lib/listSort.ts';

interface Row { id: number; name: string; price: number | null }
const rows: Row[] = [
  { id: 1, name: 'beta', price: 20 },
  { id: 2, name: 'Alpha', price: null },
  { id: 3, name: 'gamma', price: 5 },
  { id: 4, name: 'alpha', price: 20 },
];
const acc: Accessors<Row> = { id: (r) => r.id, name: (r) => r.name, price: (r) => r.price };

test('clicking a column cycles ascending, descending, then back to the default order', () => {
  assert.deepEqual(nextSort(null, 'name'), { key: 'name', dir: 'asc' });
  assert.deepEqual(nextSort({ key: 'name', dir: 'asc' }, 'name'), { key: 'name', dir: 'desc' });
  assert.equal(nextSort({ key: 'name', dir: 'desc' }, 'name'), null);
});

test('clicking another column starts it ascending', () => {
  assert.deepEqual(nextSort({ key: 'name', dir: 'desc' }, 'price'), { key: 'price', dir: 'asc' });
});

test('no sort keeps the given order and does not touch the original array', () => {
  const copy = sortRows(rows, null, acc);
  assert.deepEqual(copy.map((r) => r.id), [1, 2, 3, 4]);
  assert.notEqual(copy, rows);
});

test('text sorts case-insensitively; ties keep their original order', () => {
  const asc = sortRows(rows, { key: 'name', dir: 'asc' }, acc);
  assert.deepEqual(asc.map((r) => r.id), [2, 4, 1, 3]); // Alpha, alpha (original order), beta, gamma
});

test('numbers sort as numbers, not as text', () => {
  const r = sortRows([{ id: 10, name: 'x', price: 1 }, { id: 9, name: 'y', price: 1 }, { id: 100, name: 'z', price: 1 }], { key: 'id', dir: 'asc' }, acc);
  assert.deepEqual(r.map((x) => x.id), [9, 10, 100]);
});

test('empty values go last in both directions', () => {
  assert.deepEqual(sortRows(rows, { key: 'price', dir: 'asc' }, acc).map((r) => r.id), [3, 1, 4, 2]);
  assert.deepEqual(sortRows(rows, { key: 'price', dir: 'desc' }, acc).map((r) => r.id), [1, 4, 3, 2]);
});

test('an unknown column leaves the order alone', () => {
  assert.deepEqual(sortRows(rows, { key: 'nope', dir: 'asc' }, acc).map((r) => r.id), [1, 2, 3, 4]);
});
