import test from 'node:test';
import assert from 'node:assert/strict';
import { detailWidthFromPointer, sanitizeDetailPanelWidth } from '../src/ui/panelResize.mjs';

test('calculates detail panel width from the left resize handle position', () => {
  assert.equal(detailWidthFromPointer({ viewportWidth: 1200, pointerX: 650 }), 550);
});

test('clamps detail panel width to desktop-friendly bounds', () => {
  assert.equal(detailWidthFromPointer({ viewportWidth: 1200, pointerX: 100 }), 760);
  assert.equal(detailWidthFromPointer({ viewportWidth: 1200, pointerX: 1000 }), 360);
  assert.equal(sanitizeDetailPanelWidth('620'), 620);
  assert.equal(sanitizeDetailPanelWidth('nope'), 520);
});
