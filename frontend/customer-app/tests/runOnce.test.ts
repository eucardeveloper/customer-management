import test from 'node:test';
import assert from 'node:assert/strict';
import { runOnce } from '../src/lib/runOnce.ts';

test('a second call while the first is running is skipped', async () => {
  const flag = { current: false };
  let calls = 0;
  const slow = async () => { calls++; await new Promise(r => setTimeout(r, 30)); };
  const [a, b, c] = await Promise.all([runOnce(flag, slow), runOnce(flag, slow), runOnce(flag, slow)]);
  assert.equal(calls, 1);
  assert.deepEqual([a, b, c], [true, false, false]);
});

test('the flag is released after success and after an error', async () => {
  const flag = { current: false };
  await runOnce(flag, async () => {});
  assert.equal(flag.current, false);
  await assert.rejects(runOnce(flag, async () => { throw new Error('x'); }));
  assert.equal(flag.current, false);
  assert.equal(await runOnce(flag, async () => {}), true);
});
