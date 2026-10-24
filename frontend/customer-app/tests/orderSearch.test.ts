import { test } from 'node:test';
import assert from 'node:assert/strict';
import { orderMatchesSearch } from '../src/lib/orderSearch.ts';

const order = { productName: 'Mechanical Keyboard', customerId: 2, status: 'DELIVERED' };

test('an empty search matches every order', () => {
  assert.equal(orderMatchesSearch(order, '', 'Fatma Kaya', 'Teslim Edildi'), true);
  assert.equal(orderMatchesSearch(order, '   ', 'Fatma Kaya', 'Teslim Edildi'), true);
});

test('the customer name matches, whole or in part, in any letter case', () => {
  assert.equal(orderMatchesSearch(order, 'fatma', 'Fatma Kaya', 'Teslim Edildi'), true);
  assert.equal(orderMatchesSearch(order, 'KAYA', 'Fatma Kaya', 'Teslim Edildi'), true);
  assert.equal(orderMatchesSearch(order, 'fatma kaya', 'Fatma Kaya', 'Teslim Edildi'), true);
  assert.equal(orderMatchesSearch(order, 'mehmet', 'Fatma Kaya', 'Teslim Edildi'), false);
});

test('the product and the status as shown on screen still match', () => {
  assert.equal(orderMatchesSearch(order, 'keyboard', 'Fatma Kaya', 'Teslim Edildi'), true);
  assert.equal(orderMatchesSearch(order, 'teslim', 'Fatma Kaya', 'Teslim Edildi'), true);
  assert.equal(orderMatchesSearch(order, 'delivered', 'Fatma Kaya', 'Teslim Edildi'), true);
});

test('a missing name or product does not throw', () => {
  assert.equal(orderMatchesSearch({}, 'x', '', ''), false);
});
