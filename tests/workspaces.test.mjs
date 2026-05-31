import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildWorkspaceList,
  createUserWorkspace,
  deleteUserWorkspace,
  matchUserWorkspaceForTask,
  moveUserWorkspace,
  reorderWorkspaceOrder,
  reorderUserWorkspace,
} from '../src/domain/workspaces.mjs';

test('builds sidebar categories from defaults, custom categories, and task-derived workspaces', () => {
  const tasks = [
    { id: 'a', workspaceId: 'tsr' },
    { id: 'b', workspaceId: 'meeting-notes' },
  ];
  const userWorkspaces = [{ id: 'custom-review', name: '리뷰', icon: '🧭', order: 0, custom: true }];

  const workspaces = buildWorkspaceList(tasks, userWorkspaces, ['meeting-notes', 'custom-review']);

  assert.deepEqual(workspaces.map((workspace) => workspace.id), [
    'all',
    'meeting-notes',
    'custom-review',
    'tsr',
    'comfyui',
    'hermes',
    'research',
  ]);
  assert.equal(workspaces.find((workspace) => workspace.id === 'meeting-notes').name, 'Meeting Notes');
  assert.equal(workspaces.find((workspace) => workspace.id === 'meeting-notes').auto, true);
});

test('creates stable custom category IDs and keeps user sort order mutable', () => {
  const initial = [
    { id: 'custom-a', name: 'A', icon: '📁', order: 0, custom: true },
    { id: 'custom-b', name: 'B', icon: '📁', order: 1, custom: true },
  ];
  const created = createUserWorkspace(initial, '장기 작업');
  assert.equal(created.workspace.id, 'custom-janggi-jageob');
  assert.equal(created.workspace.name, '장기 작업');
  assert.equal(created.workspace.matchQuery, '장기 작업');

  const moved = moveUserWorkspace(created.workspaces, 'custom-janggi-jageob', -1);
  assert.deepEqual(moved.map((workspace) => workspace.id), ['custom-a', 'custom-janggi-jageob', 'custom-b']);
});

test('matches sessions into user categories by category keyword before defaults', () => {
  const userWorkspaces = [
    { id: 'custom-svnet3', name: 'SVNET3', icon: '📁', order: 0, custom: true },
    { id: 'custom-meeting', name: '회의', icon: '📁', order: 1, custom: true },
  ];

  assert.equal(matchUserWorkspaceForTask({ title: 'SVNET3 TSR 모델 디버깅', summary: 'annotation 개선' }, userWorkspaces), 'custom-svnet3');
  assert.equal(matchUserWorkspaceForTask({ title: '주간 정리', summary: '회의 메모 요약' }, userWorkspaces), 'custom-meeting');
  assert.equal(matchUserWorkspaceForTask({ title: 'ComfyUI workflow 수정', summary: '이미지 생성' }, userWorkspaces), undefined);
});

test('reorders custom categories by dragged and target category IDs', () => {
  const initial = [
    { id: 'custom-a', name: 'A', icon: '📁', order: 0, custom: true },
    { id: 'custom-b', name: 'B', icon: '📁', order: 1, custom: true },
    { id: 'custom-c', name: 'C', icon: '📁', order: 2, custom: true },
  ];

  assert.deepEqual(reorderUserWorkspace(initial, 'custom-c', 'custom-a').map((workspace) => workspace.id), ['custom-c', 'custom-a', 'custom-b']);
  assert.deepEqual(reorderUserWorkspace(initial, 'custom-a', 'custom-c').map((workspace) => workspace.id), ['custom-b', 'custom-c', 'custom-a']);
  assert.deepEqual(reorderUserWorkspace(initial, 'missing', 'custom-c').map((workspace) => workspace.id), ['custom-a', 'custom-b', 'custom-c']);
});

test('stores drag order for custom and auto categories together', () => {
  assert.deepEqual(reorderWorkspaceOrder(['custom-a', 'meeting-notes', 'custom-b'], 'meeting-notes', 'custom-a'), ['meeting-notes', 'custom-a', 'custom-b']);
  assert.deepEqual(reorderWorkspaceOrder(['custom-a', 'meeting-notes', 'custom-b'], 'custom-b', 'meeting-notes'), ['custom-a', 'custom-b', 'meeting-notes']);
  assert.deepEqual(reorderWorkspaceOrder(['custom-a'], 'auto-new', 'custom-a'), ['auto-new', 'custom-a']);
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
