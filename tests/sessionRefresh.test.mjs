import test from 'node:test';
import assert from 'node:assert/strict';
import { shouldReloadSelectedMessages } from '../src/domain/sessionRefresh.mjs';

test('reloads selected messages for explicit loads or selected-session changes', () => {
  assert.equal(shouldReloadSelectedMessages({ loadMessages: true }), true);
  assert.equal(shouldReloadSelectedMessages({ selectedChanged: true }), true);
});

test('skips silent message reload when selected session activity is unchanged', () => {
  const previousTask = { id: 's1', messageCount: 12, updatedAt: '2026-05-31T00:00:00.000Z', status: 'running' };
  const nextTask = { ...previousTask, title: 'renamed but same activity' };

  assert.equal(shouldReloadSelectedMessages({ previousTask, nextTask }), false);
});

test('reloads selected messages when message count or update timestamp changes', () => {
  const previousTask = { id: 's1', messageCount: 12, updatedAt: '2026-05-31T00:00:00.000Z', status: 'running' };

  assert.equal(shouldReloadSelectedMessages({
    previousTask,
    nextTask: { ...previousTask, messageCount: 13 },
  }), true);
  assert.equal(shouldReloadSelectedMessages({
    previousTask,
    nextTask: { ...previousTask, updatedAt: '2026-05-31T00:01:00.000Z' },
  }), true);
});
