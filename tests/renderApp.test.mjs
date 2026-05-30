import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppMarkup } from '../src/ui/renderApp.mjs';
import { mockTasks } from '../src/mocks/mockData.mjs';

test('renders core Agent Work Console shell markup', () => {
  const html = createAppMarkup({ tasks: mockTasks, selectedTaskId: 'task-tsr-annotation' });
  assert.match(html, /Agent Work Console/);
  assert.match(html, /작업 흐름/);
  assert.match(html, /TSR annotation tool 수정/);
});
