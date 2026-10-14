import test from 'node:test';
import assert from 'node:assert/strict';
import { pctChange } from '../src/lib/trend.ts';

test('growth and decline between two populated windows', () => {
  assert.equal(pctChange(150, 100, 3, 2), '50.0');
  assert.equal(pctChange(50, 100, 1, 2), '-50.0');
  assert.equal(pctChange(100, 100, 2, 2), '0.0');
});

test('an empty current window is "no data", not -100%', () => {
  assert.equal(pctChange(0, 500, 0, 4), null);
});

test('an empty previous window has no baseline', () => {
  assert.equal(pctChange(500, 0, 4, 0), null);
});

test('zero-value baseline does not divide by zero', () => {
  assert.equal(pctChange(10, 0, 1, 1), null);
});
