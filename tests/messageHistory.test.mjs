import test from 'node:test';
import assert from 'node:assert/strict';
import { nextLazyMessageLimit, shouldLazyLoadOlderMessages } from '../src/domain/messageHistory.mjs';

test('grows message fetch limit in lazy-loading chunks until all history is loaded', () => {
  assert.equal(nextLazyMessageLimit({ loadedCount: 150, totalCount: 430, currentLimit: 150, chunkSize: 150 }), 300);
  assert.equal(nextLazyMessageLimit({ loadedCount: 300, totalCount: 430, currentLimit: 300, chunkSize: 150 }), 430);
  assert.equal(nextLazyMessageLimit({ loadedCount: 430, totalCount: 430, currentLimit: 430, chunkSize: 150 }), 430);
});

test('lazy-loads older messages only near the top while more history exists', () => {
  assert.equal(shouldLazyLoadOlderMessages({ scrollTop: 12, loadedCount: 150, totalCount: 430, loading: false }), true);
  assert.equal(shouldLazyLoadOlderMessages({ scrollTop: 24, loadedCount: 150, totalCount: 430, loading: false }), false);
  assert.equal(shouldLazyLoadOlderMessages({ scrollTop: 0, loadedCount: 430, totalCount: 430, loading: false }), false);
  assert.equal(shouldLazyLoadOlderMessages({ scrollTop: 0, loadedCount: 150, totalCount: 430, loading: true }), false);
});
