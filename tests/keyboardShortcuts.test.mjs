import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldSubmitChatShortcut } from '../src/ui/keyboardShortcuts.mjs';

test('submits chat when Enter is pressed in the message box', () => {
  assert.equal(shouldSubmitChatShortcut({ key: 'Enter' }), true);
});

test('keeps multiline editing behavior for Shift+Enter and IME composition', () => {
  assert.equal(shouldSubmitChatShortcut({ key: 'Enter', shiftKey: true }), false);
  assert.equal(shouldSubmitChatShortcut({ key: 'Enter', isComposing: true }), false);
  assert.equal(shouldSubmitChatShortcut({ key: 'a' }), false);
});
