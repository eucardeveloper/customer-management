import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fillTemplate } from '../src/lib/fillTemplate.ts';
import { translations } from '../src/app/translations.ts';

test('a name replaces its placeholder everywhere it appears', () => {
  assert.equal(fillTemplate('Delete {name}? Really {name}?', { name: 'ada' }), 'Delete ada? Really ada?');
});

test('a placeholder without a value is left as written', () => {
  assert.equal(fillTemplate('Hello {name}', {}), 'Hello {name}');
});

test('dollar signs and braces in a value are kept literally', () => {
  assert.equal(fillTemplate('Delete {name}?', { name: '$& {x}' }), 'Delete $& {x}?');
});

test('the delete-user confirmation names the user in every language', () => {
  for (const lang of ['en', 'tr', 'de'] as const) {
    const text = translations[lang].deleteUserConfirm;
    assert.ok(text.includes('{name}'), lang);
    assert.ok(fillTemplate(text, { name: 'qa_user' }).includes('qa_user'), lang);
  }
});
