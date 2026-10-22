import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateServerMessage } from '../src/lib/serverMessages.ts';

test('known backend messages are translated per language', () => {
  assert.equal(translateServerMessage('tr', 'Invalid email format'), 'Geçersiz e-posta biçimi');
  assert.equal(translateServerMessage('de', 'Username already taken: bob'), 'Benutzername bereits vergeben');
  assert.equal(translateServerMessage('en', 'Email already registered: a@b.c'), 'Email already registered');
  // messages of the admin's "add user" call (POST /api/users)
  assert.equal(translateServerMessage('tr', 'Password must be 8-72 characters'), 'Şifre 8-72 karakter olmalı');
  assert.equal(translateServerMessage('de', 'Username or email already taken'), 'Benutzername oder E-Mail bereits vergeben');
});

test('unknown messages pass through unchanged', () => {
  assert.equal(translateServerMessage('de', 'Something unexpected'), 'Something unexpected');
  assert.equal(translateServerMessage('tr', 'The last administrator cannot be demoted or deleted'), 'Son yönetici silinemez veya rolü düşürülemez');
  assert.equal(translateServerMessage('en', 'Customer 7 still has orders; delete or reassign them first'), 'This customer still has orders; delete or reassign them first');
});
