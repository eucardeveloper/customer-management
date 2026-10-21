import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translateServerMessage } from '../src/lib/serverMessages.ts';

test('known backend messages are translated per language', () => {
  assert.equal(translateServerMessage('tr', 'Invalid email format'), 'Geçersiz e-posta biçimi');
  assert.equal(translateServerMessage('de', 'Username already taken: bob'), 'Benutzername bereits vergeben');
  assert.equal(translateServerMessage('en', 'Email already registered: a@b.c'), 'Email already registered');
});

test('unknown messages pass through unchanged', () => {
  assert.equal(translateServerMessage('de', 'Something unexpected'), 'Something unexpected');
});
