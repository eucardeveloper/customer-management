import { test } from 'node:test';
import assert from 'node:assert/strict';
import { translations } from '../src/app/translations.ts';

const en = Object.keys(translations.en);
const tr = Object.keys(translations.tr);
const de = Object.keys(translations.de);

test('tr has every key en has', () => {
  assert.deepEqual(en.filter((k) => !tr.includes(k)), []);
});

test('de has every key en has', () => {
  assert.deepEqual(en.filter((k) => !de.includes(k)), []);
});

test('en has every key de has', () => {
  assert.deepEqual(de.filter((k) => !en.includes(k)), []);
});

test('en has every key tr has', () => {
  assert.deepEqual(tr.filter((k) => !en.includes(k)), []);
});

test('no empty strings in either language', () => {
  for (const lang of ['en', 'tr', 'de'] as const) {
    const empty = Object.entries(translations[lang]).filter(([, v]) => typeof v === 'string' && v.trim() === '').map(([k]) => k);
    assert.deepEqual(empty, [], lang);
  }
});

test('de keeps the {n} placeholder where en has it', () => {
  for (const k of Object.keys(translations.en) as (keyof typeof translations.en)[]) {
    const e = String(translations.en[k]);
    if (e.includes('{n}')) assert.ok(String(translations.de[k]).includes('{n}'), k);
  }
});
