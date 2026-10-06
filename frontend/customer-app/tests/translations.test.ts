import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/app/translations.ts';

const en = Object.keys(translations.en);
const tr = Object.keys(translations.tr);

test('tr has every key en has', () => {
  assert.deepEqual(en.filter((k) => !tr.includes(k)), []);
});

test('en has every key tr has', () => {
  assert.deepEqual(tr.filter((k) => !en.includes(k)), []);
});

test('no empty strings in either language', () => {
  for (const lang of ['en', 'tr'] as const) {
    const empty = Object.entries(translations[lang]).filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k);
    assert.deepEqual(empty, [], lang);
  }
});
