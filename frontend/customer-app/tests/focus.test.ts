import { test } from 'node:test';
import assert from 'node:assert/strict';
import { blurActiveElement } from '../src/lib/focus.ts';

test('the element that holds focus is blurred before a drawer hides the page behind it', () => {
  let blurred = 0;
  blurActiveElement({ activeElement: { blur: () => { blurred += 1; } } });
  assert.equal(blurred, 1);
});

test('nothing is thrown when no element holds focus or it cannot blur', () => {
  blurActiveElement({ activeElement: null });
  blurActiveElement({ activeElement: {} });
  blurActiveElement(undefined);
});
