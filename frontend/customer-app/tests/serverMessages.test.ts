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

test('review-batch messages (stale edit, self deletion, byte limit) are translated', () => {
  assert.equal(translateServerMessage('tr', 'The customer was changed by someone else; reload it and try again'),
    'Bu kayıt başka biri tarafından değiştirildi; liste yenilendi, lütfen tekrar deneyin');
  assert.equal(translateServerMessage('en', 'The order was changed by someone else; reload it and try again'),
    'Someone else changed this record; the list was reloaded, please try again');
  assert.equal(translateServerMessage('de', 'You cannot delete your own account; ask another administrator'),
    'Sie können Ihr eigenes Konto nicht löschen; bitten Sie einen anderen Administrator');
  assert.equal(translateServerMessage('tr', 'New password must be at most 72 bytes (accented letters count as 2)'),
    'Şifre çok uzun (en fazla 72 bayt; ş, ğ, ı gibi harfler 2 sayılır)');
  assert.equal(translateServerMessage('tr', 'Customer 7 is already being deleted; try again shortly'),
    'Bu müşteri şu anda siliniyor; birazdan tekrar deneyin');
});
