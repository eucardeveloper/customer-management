import { test } from 'node:test';
import assert from 'node:assert/strict';
import { customerFullName } from '../src/lib/customerName.ts';

test('bireysel müşteri ad ve soyad', () => assert.equal(customerFullName({ firstName: 'Ahmet', lastName: 'Yilmaz' }), 'Ahmet Yilmaz'));
test('şirket: soyad null ise "null" yazılmaz', () => assert.equal(customerFullName({ firstName: 'Test Musteri A.S.', lastName: null }), 'Test Musteri A.S.'));
test('şirket: soyad boş ise sondaki boşluk yok', () => assert.equal(customerFullName({ firstName: 'TechCo Ltd.', lastName: '' }), 'TechCo Ltd.'));
test('ikisi de boş', () => assert.equal(customerFullName({}), ''));
