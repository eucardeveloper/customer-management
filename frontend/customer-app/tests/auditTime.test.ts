import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseServerUtc } from '../src/lib/auditTime.ts';

test('a timestamp without a zone is read as UTC', () => {
  assert.equal(parseServerUtc('2026-11-11T13:17:42.451037').toISOString(), '2026-11-11T13:17:42.451Z');
});

test('a timestamp that already has a zone is left alone', () => {
  assert.equal(parseServerUtc('2026-11-11T16:17:42+03:00').toISOString(), '2026-11-11T13:17:42.000Z');
  assert.equal(parseServerUtc('2026-11-11T13:17:42Z').toISOString(), '2026-11-11T13:17:42.000Z');
});
