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

  assert.match(html, /Hermes Work/);
  assert.match(html, /세션 칸반/);
  assert.match(html, /TSR annotation tool 수정/);
  assert.match(html, /sessionChatForm/);
  assert.match(html, /새 세션/);
  assert.match(html, /id="newSession"/);
  assert.match(html, /Enter로 보내기/);
  assert.match(html, /Shift\+Enter 줄바꿈/);
  assert.match(html, /chatResizeHandle/);
  assert.match(html, /채팅 패널 크기 조절/);
  assert.match(html, /toggleSessionList/);
  assert.match(html, /세션 목록 펼치기/);
  assert.match(html, /closeSessionList/);
  assert.match(html, /채팅으로 돌아가기/);
  assert.match(html, /toggleChatFocus/);
  assert.match(html, /채팅창 확장/);
  assert.match(html, /categoryName/);
  assert.match(html, /카테고리 추가/);
  assert.match(html, /categoryMove/);
  assert.match(html, /카테고리 이동/);
  assert.match(html, /자동/);
  assert.match(html, /삭제/);
  assert.match(html, /확인했습니다/);
  assert.doesNotMatch(html, /Hermes 연결/);
  assert.doesNotMatch(html, /<div class="section-title">실행 로그/);
  assert.doesNotMatch(html, /<div class="section-title">승인/);
  assert.doesNotMatch(html, /<div class="section-title">결과물/);
});

test('renders chat focus mode with a collapse action', () => {
  const html = createAppMarkup({
    tasks: mockTasks,
    selectedTaskId: 'task-tsr-annotation',
    chatFocusMode: true,
  });

  assert.match(html, /toggleChatFocus/);
  assert.match(html, /채팅창 축소/);
});

test('renders fast-history notice and truncated message marker', () => {
  const messages = [
    { role: 'tool', text: '긴 도구 출력', truncated: true, omittedChars: 12345, at: new Date().toISOString() },
  ];
  const html = createAppMarkup({
    tasks: mockTasks,
    selectedTaskId: 'task-tsr-annotation',
    sessionMessages: messages,
    chatState: { totalCount: 1000, loadedCount: 300 },
  });

  assert.match(html, /최근 300 \/ 전체 1,000개 메시지만 로딩/);
  assert.match(html, /긴 내용 12,345자를 접었습니다/);
});

test('does not show an unrelated detail panel when a category has no visible tasks', () => {
  const html = createAppMarkup({
    tasks: mockTasks,
    workspaceId: 'research',
    status: 'failed',
  });

  assert.match(html, /조건에 맞는 세션이 없습니다/);
  assert.match(html, /세션을 선택하세요/);
  assert.doesNotMatch(html, /TSR annotation tool 수정/);
});

test('renders fast-history notice and truncation marker', () => {
  const html = createAppMarkup({
    tasks: mockTasks,
    selectedTaskId: 'task-tsr-annotation',
    chatState: { totalCount: 1200, loadedCount: 300 },
    sessionMessages: [{ role: 'tool', text: 'x'.repeat(10), truncated: true, omittedChars: 9000, at: new Date().toISOString() }],
  });

  assert.match(html, /최근 300 \/ 전체 1,200개 메시지만 로딩/);
  assert.match(html, /긴 내용 9,000자를 접었습니다/);
});
