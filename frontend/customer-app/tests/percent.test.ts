import { test } from 'node:test';
import assert from 'node:assert/strict';
import { percentShares } from '../src/lib/percent.ts';

test('shares always add up to 100', () => {
  for (const counts of [[1, 1, 2, 4], [1, 1, 1], [3, 3, 3, 1], [7, 0, 0, 0, 0], [1, 2, 3, 4, 5], [13, 13, 25, 49]]) {
    assert.equal(percentShares(counts).reduce((a, b) => a + b, 0), 100, counts.join(','));
  }
});

test('the demo order mix (1,1,2,4) is 12/13, 12/13, 25, 50 and not 101', () => {
  const p = percentShares([1, 1, 2, 4]);
  assert.equal(p[2], 25);
  assert.equal(p[3], 50);
  assert.equal(p.reduce((a, b) => a + b, 0), 100);
});

test('nothing to share gives zeros', () => {
  assert.deepEqual(percentShares([0, 0, 0]), [0, 0, 0]);
  assert.deepEqual(percentShares([]), []);
});
