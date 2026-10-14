import { test } from 'node:test';
import assert from 'node:assert/strict';
import { RateLimiter, clientKey, parsePayload, MAX_INPUT_CHARS } from '../src/lib/chatGuard.ts';

const ok = JSON.stringify({ chatInput: 'Tüm müşterileri listele', sessionId: 'session-1' });

test('a well-formed payload is accepted and only the two fields are kept', () => {
  const p = parsePayload(JSON.stringify({ chatInput: 'hi', sessionId: 'abc_1', extra: 'ignored', url: 'http://x' }));
  assert.deepEqual(p, { chatInput: 'hi', sessionId: 'abc_1' });
  assert.ok(parsePayload(ok));
});

test('bad shapes are refused', () => {
  for (const raw of ['', 'not json', '[]', 'null', '{}', JSON.stringify({ chatInput: '', sessionId: 'a' }),
    JSON.stringify({ chatInput: 'x', sessionId: 'has space' }), JSON.stringify({ chatInput: 5, sessionId: 'a' })]) {
    assert.equal(parsePayload(raw), null, raw);
  }
});

test('size limits apply to the input and to the whole body', () => {
  assert.equal(parsePayload(JSON.stringify({ chatInput: 'x'.repeat(MAX_INPUT_CHARS + 1), sessionId: 'a' })), null);
  assert.equal(parsePayload(JSON.stringify({ chatInput: 'x', sessionId: 'a', pad: 'y'.repeat(9000) })), null);
});

test('the client key is the right-most forwarded address', () => {
  assert.equal(clientKey(null), 'unknown');
  assert.equal(clientKey('1.1.1.1, 203.0.113.9'), '203.0.113.9');
});

test('the rate limiter allows the limit, refuses the next, and recovers after the window', () => {
  const limiter = new RateLimiter(3, 1000);
  assert.ok(limiter.allow('a', 0));
  assert.ok(limiter.allow('a', 10));
  assert.ok(limiter.allow('a', 20));
  assert.equal(limiter.allow('a', 30), false);
  assert.ok(limiter.allow('b', 30), 'other clients are separate');
  assert.ok(limiter.allow('a', 1500), 'window passed');
});
