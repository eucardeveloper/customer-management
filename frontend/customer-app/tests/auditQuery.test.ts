import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildAuditQuery, EMPTY_AUDIT_FILTERS, hasActiveFilters, isRangeInvalid } from '../src/lib/auditQuery.ts';

const f = (over: Partial<typeof EMPTY_AUDIT_FILTERS>) => ({ ...EMPTY_AUDIT_FILTERS, ...over });

test('no filters: only paging is sent', () => {
  assert.equal(buildAuditQuery('orders', EMPTY_AUDIT_FILTERS, 2, 20), 'page=2&size=20');
});

test('the subject box maps to the right parameter for each feed', () => {
  assert.equal(buildAuditQuery('orders', f({ subject: '7' }), 0, 20), 'page=0&size=20&orderId=7');
  assert.equal(buildAuditQuery('customers', f({ subject: '12' }), 0, 20), 'page=0&size=20&customerId=12');
  assert.equal(buildAuditQuery('accounts', f({ subject: 'alice' }), 0, 20), 'page=0&size=20&target=alice');
});

test('an order or customer number that is not a number is not sent', () => {
  assert.equal(buildAuditQuery('orders', f({ subject: 'abc' }), 0, 20), 'page=0&size=20');
  assert.equal(buildAuditQuery('customers', f({ subject: '1; drop' }), 0, 20), 'page=0&size=20');
});

test('action, actor and dates are sent, trimmed and encoded', () => {
  const q = buildAuditQuery('orders', f({ action: 'UPDATE', actor: '  a&b c ', from: '2026-11-01', to: '2026-11-14' }), 1, 50);
  assert.equal(q, 'page=1&size=50&action=UPDATE&actor=a%26b%20c&from=2026-11-01&to=2026-11-14');
});

test('a half-typed date is dropped instead of being sent', () => {
  assert.equal(buildAuditQuery('orders', f({ from: '2026-1', to: '' }), 0, 20), 'page=0&size=20');
});

test('hasActiveFilters ignores blanks', () => {
  assert.equal(hasActiveFilters(EMPTY_AUDIT_FILTERS), false);
  assert.equal(hasActiveFilters(f({ actor: '   ' })), false);
  assert.equal(hasActiveFilters(f({ action: 'DELETE' })), true);
});

test('isRangeInvalid is true only when the end is before the start', () => {
  assert.equal(isRangeInvalid(f({ from: '2026-02-02', to: '2026-02-01' })), true);
  assert.equal(isRangeInvalid(f({ from: '2026-02-01', to: '2026-02-01' })), false);
  assert.equal(isRangeInvalid(f({ from: '2026-02-01' })), false);
});
