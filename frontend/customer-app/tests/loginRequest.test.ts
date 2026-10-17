import { test } from 'node:test';
import assert from 'node:assert/strict';

const { fetchWithStartupRetry, STARTING_MESSAGE, isTransientStatus } = await import('../src/lib/loginRequest.ts');

const noSleep = async () => {};
const ok = (status: number) => new Response('{}', { status });

test('a real answer is returned at once, including 401 and 429', async () => {
  for (const status of [200, 401, 429]) {
    let calls = 0;
    const res = await fetchWithStartupRetry(async () => { calls++; return ok(status); }, 'u', {}, { sleep: noSleep });
    assert.equal(res.status, status);
    assert.equal(calls, 1);
  }
});

test('network errors are retried until the server answers', async () => {
  let calls = 0;
  const res = await fetchWithStartupRetry(async () => {
    calls++;
    if (calls < 3) throw new TypeError('Failed to fetch');
    return ok(200);
  }, 'u', {}, { sleep: noSleep });
  assert.equal(res.status, 200);
  assert.equal(calls, 3);
});

test('502, 503 and 504 are retried', async () => {
  const seq = [503, 502, 200];
  let i = 0;
  const res = await fetchWithStartupRetry(async () => ok(seq[i++]), 'u', {}, { sleep: noSleep });
  assert.equal(res.status, 200);
  assert.equal(i, 3);
});

test('after the last attempt a network error becomes a readable message', async () => {
  let calls = 0;
  await assert.rejects(
    fetchWithStartupRetry(async () => { calls++; throw new TypeError('Failed to fetch'); }, 'u', {}, { attempts: 3, sleep: noSleep }),
    (e: Error) => e.message === STARTING_MESSAGE && !e.message.includes('Failed to fetch'),
  );
  assert.equal(calls, 3);
});

test('a persistent 503 is handed back so the caller can show the message', async () => {
  const res = await fetchWithStartupRetry(async () => ok(503), 'u', {}, { attempts: 2, sleep: noSleep });
  assert.equal(res.status, 503);
});

test('only gateway-style statuses count as transient', () => {
  assert.equal(isTransientStatus(503), true);
  assert.equal(isTransientStatus(500), false);
  assert.equal(isTransientStatus(401), false);
});
