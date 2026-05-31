import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkspaceList,
  createUserWorkspace,
  deleteUserWorkspace,
  moveUserWorkspace,
} from '../src/domain/workspaces.mjs';

test('builds sidebar categories from defaults, custom categories, and task-derived workspaces', () => {
  const tasks = [
    { id: 'a', workspaceId: 'tsr' },
    { id: 'b', workspaceId: 'meeting-notes' },
  ];
  const userWorkspaces = [{ id: 'custom-review', name: '리뷰', icon: '🧭', order: 0, custom: true }];

  const workspaces = buildWorkspaceList(tasks, userWorkspaces);

  assert.deepEqual(workspaces.map((workspace) => workspace.id), [
    'all',
    'custom-review',
    'tsr',
    'comfyui',
    'hermes',
    'research',
    'meeting-notes',
  ]);
  assert.equal(workspaces.find((workspace) => workspace.id === 'meeting-notes').name, 'Meeting Notes');
});

test('creates stable custom category IDs and keeps user sort order mutable', () => {
  const initial = [
    { id: 'custom-a', name: 'A', icon: '📁', order: 0, custom: true },
    { id: 'custom-b', name: 'B', icon: '📁', order: 1, custom: true },
  ];
  const created = createUserWorkspace(initial, '장기 작업');
  assert.equal(created.workspace.id, 'custom-janggi-jageob');
  assert.equal(created.workspace.name, '장기 작업');

  const moved = moveUserWorkspace(created.workspaces, 'custom-janggi-jageob', -1);
  assert.deepEqual(moved.map((workspace) => workspace.id), ['custom-a', 'custom-janggi-jageob', 'custom-b']);
});

test('deletes only custom categories and reports reassigned tasks', () => {
  const custom = [{ id: 'custom-review', name: '리뷰', icon: '📁', order: 0, custom: true }];
  const result = deleteUserWorkspace(custom, 'custom-review', [
    { id: 'a', workspaceId: 'custom-review' },
    { id: 'b', workspaceId: 'tsr' },
  ]);

  assert.deepEqual(result.workspaces, []);
  assert.deepEqual(result.tasks.map((task) => task.workspaceId), ['all', 'tsr']);
  assert.throws(() => deleteUserWorkspace(custom, 'tsr', []), /기본 카테고리는 삭제할 수 없습니다/);
});
