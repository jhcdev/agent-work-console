import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppMarkup } from '../src/ui/renderApp.mjs';
import { mockTasks } from '../src/mocks/mockData.mjs';

test('renders a lean session kanban and chat panel', () => {
  const html = createAppMarkup({
    tasks: mockTasks,
    selectedTaskId: 'task-tsr-annotation',
    sessionMessages: [
      { role: 'user', text: '확인해줘', at: new Date().toISOString() },
      { role: 'assistant', text: '확인했습니다', at: new Date().toISOString() },
    ],
  });

  assert.match(html, /Agent Work Console/);
  assert.match(html, /세션 칸반/);
  assert.match(html, /TSR annotation tool 수정/);
  assert.match(html, /sessionChatForm/);
  assert.match(html, /새 세션/);
  assert.match(html, /id="newSession"/);
  assert.match(html, /Enter로 보내기/);
  assert.match(html, /Shift\+Enter 줄바꿈/);
  assert.match(html, /chatResizeHandle/);
  assert.match(html, /채팅 패널 크기 조절/);
  assert.match(html, /확인했습니다/);
  assert.doesNotMatch(html, /Hermes 연결/);
  assert.doesNotMatch(html, /<div class="section-title">실행 로그/);
  assert.doesNotMatch(html, /<div class="section-title">승인/);
  assert.doesNotMatch(html, /<div class="section-title">결과물/);
});
