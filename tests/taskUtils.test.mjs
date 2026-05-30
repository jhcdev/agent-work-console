import test from 'node:test';
import assert from 'node:assert/strict';
import { countByStatus, filterTasks, formatRelativeTime } from '../src/domain/taskUtils.mjs';
import { mockTasks } from '../src/mocks/mockData.mjs';

test('counts tasks by status with zero defaults', () => {
  assert.deepEqual(countByStatus(mockTasks), { running: 2, waiting_approval: 1, failed: 1, done: 2 });
});

test('filters by workspace, status, and query', () => {
  const result = filterTasks(mockTasks, { workspaceId: 'tsr', status: 'running', query: 'annotation' });
  assert.deepEqual(result.map((task) => task.id), ['task-tsr-annotation']);
});

test('formats recent timestamps for cards', () => {
  assert.equal(formatRelativeTime(new Date(Date.now() - 90_000).toISOString()), '1분 전');
});
