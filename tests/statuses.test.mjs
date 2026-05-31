import test from 'node:test';
import assert from 'node:assert/strict';
import {
  STATUS_IDS,
  countByStatus,
  inferTaskStatus,
  normalizeStatus,
  setStatusOverride,
} from '../src/domain/statuses.mjs';

test('normalizes Hermes session states into the four visible buckets', () => {
  assert.deepEqual(STATUS_IDS, ['running', 'waiting_approval', 'failed', 'done']);
  assert.equal(normalizeStatus('complete'), 'done');
  assert.equal(normalizeStatus('completed'), 'done');
  assert.equal(normalizeStatus('error'), 'failed');
  assert.equal(normalizeStatus('pending_approval'), 'waiting_approval');
  assert.equal(normalizeStatus('needs_approval'), 'waiting_approval');
});

test('infers status from session fields before falling back to running', () => {
  assert.equal(inferTaskStatus({ status: 'failed' }), 'failed');
  assert.equal(inferTaskStatus({ status: 'waiting_approval' }), 'waiting_approval');
  assert.equal(inferTaskStatus({ status: 'completed' }), 'done');
  assert.equal(inferTaskStatus({ error: 'boom' }), 'failed');
  assert.equal(inferTaskStatus({ pending_approval: true }), 'waiting_approval');
  assert.equal(inferTaskStatus({ approvals: [{ id: 'a1' }] }), 'waiting_approval');
  assert.equal(inferTaskStatus({ ended_at: 1780000000 }), 'done');
  assert.equal(inferTaskStatus({}), 'running');
});

test('counts only normalized statuses and preserves zero buckets', () => {
  const counts = countByStatus([
    { status: 'running' },
    { status: 'completed' },
    { status: 'error' },
    { status: 'pending_approval' },
    { status: 'unknown' },
  ]);

  assert.deepEqual(counts, { running: 1, waiting_approval: 1, failed: 1, done: 1 });
});

test('sets, clears, and ignores invalid local status overrides', () => {
  assert.deepEqual(setStatusOverride({}, 's1', 'failed'), { s1: 'failed' });
  assert.deepEqual(setStatusOverride({ s1: 'failed' }, 's1', 'auto'), {});
  assert.deepEqual(setStatusOverride({ s1: 'failed' }, 's2', 'not-real'), { s1: 'failed' });
});
