import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parsePrice, statusChangeBody } from '../src/lib/orderInput.ts';

test('a price typed with a decimal comma or a decimal point is read whole', () => {
  assert.equal(parsePrice('1,5'), 1.5);
  assert.equal(parsePrice('1.5'), 1.5);
  assert.equal(parsePrice(' 1299,99 '), 1299.99);
  assert.equal(parsePrice('20'), 20);
});

test('text that is not a plain amount is refused instead of cut short', () => {
  for (const bad of ['12abc', 'abc', '', ' ', '1,2,3', '1.999', '1e3', '-5', '0', '0,00', '1 000', '1234567890']) {
    assert.equal(parsePrice(bad), null, JSON.stringify(bad));
  }
});

test('a status change carries the version the row was loaded with and keeps the other fields', () => {
  const order = { id: 4, customerId: 2, productName: 'Laptop', price: 10.5, quantity: 3, date: '2026-11-01', status: 'PENDING', version: 6 };
  assert.deepEqual(statusChangeBody(order, 'SHIPPED'), {
    customerId: 2, productName: 'Laptop', price: 10.5, quantity: 3, status: 'SHIPPED', version: 6,
  });
});

test('a row without a version sends none', () => {
  const body = statusChangeBody({ customerId: 1, productName: 'x', price: 1, quantity: 1 }, 'DELIVERED');
  assert.equal('version' in body, false);
});
