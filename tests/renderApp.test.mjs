import test from 'node:test';
import assert from 'node:assert/strict';
import { createAppMarkup } from '../src/ui/renderApp.mjs';
import { mockTasks } from '../src/mocks/mockData.mjs';

test('renders a lean session kanban and chat panel', () => {
  const html = createAppMarkup({
    tasks: [...mockTasks, { id: 'auto-task', workspaceId: 'meeting-notes', title: 'Meeting notes', summary: 'auto', status: 'running', updatedAt: new Date().toISOString(), owner: 'Jihun' }],
    selectedTaskId: 'task-tsr-annotation',
    userWorkspaces: [{ id: 'custom-review', name: '리뷰', icon: '•', custom: true }],
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
  assert.match(html, /compact-workspaces/);
  assert.match(html, /categoryName/);
  assert.match(html, /카테고리 추가/);
  assert.doesNotMatch(html, /세션에서 감지된 미분류/);
  assert.match(html, /categoryMove/);
  assert.match(html, /카테고리 이동/);
  assert.match(html, /statusMove/);
  assert.match(html, /상태 변경/);
  assert.match(html, /진행중/);
  assert.match(html, /승인 대기/);
  assert.match(html, /실패/);
  assert.match(html, /완료/);
  assert.match(html, /자동/);
  assert.match(html, /삭제/);
  assert.match(html, /draggable="true"/);
  assert.match(html, /data-workspace-drag="custom-review"/);
  assert.match(html, /data-workspace-drag="meeting-notes"/);
  assert.match(html, /Meeting Notes/);
  assert.doesNotMatch(html, /data-workspace-move/);
  assert.doesNotMatch(html, />↑</);
  assert.doesNotMatch(html, />↓</);
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
    { role: 'assistant', text: '긴 도구 출력', truncated: true, omittedChars: 12345, at: new Date().toISOString() },
  ];
  const html = createAppMarkup({
    tasks: mockTasks,
    selectedTaskId: 'task-tsr-annotation',
    sessionMessages: messages,
    chatState: { totalCount: 1000, loadedCount: 300 },
  });

  assert.doesNotMatch(html, /최근 300 \/ 전체 1,000개 메시지를 먼저 로딩/);
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
    sessionMessages: [{ role: 'assistant', text: 'x'.repeat(10), truncated: true, omittedChars: 9000, at: new Date().toISOString() }],
  });

  assert.doesNotMatch(html, /최근 300 \/ 전체 1,200개 메시지를 먼저 로딩/);
  assert.match(html, /긴 내용 9,000자를 접었습니다/);
});

test('renders grouped tool activity rows with icons, argument previews, counts, and distinct agent replies', () => {
  const html = createAppMarkup({
    tasks: mockTasks,
    selectedTaskId: 'task-tsr-annotation',
    sessionMessages: [
      { role: 'assistant', text: '도구 사용', toolName: 'read_file', toolStatus: 'running', toolCalls: [{ name: 'read_file', preview: '"/mnt/c/Users/User/Documents/Obsidian Vault/LLM Wiki/SCHEMA.md"' }], at: new Date().toISOString() },
      { role: 'assistant', text: '도구 사용', toolName: 'read_file', toolStatus: 'running', toolCalls: [{ name: 'read_file', preview: '"/mnt/c/Users/User/Documents/Obsidian Vault/LLM Wiki/SCHEMA.md"' }], at: new Date().toISOString() },
      { role: 'assistant', text: '도구 사용', toolName: 'skill_view', toolStatus: 'running', toolCalls: [{ name: 'skill_view', preview: '"hermes-agent"' }], at: new Date().toISOString() },
      { role: 'tool', text: '성공 · 42 lines', toolName: 'read_file', toolStatus: 'success', at: new Date().toISOString() },
      { role: 'agent', text: '수정 완료했습니다.', at: new Date().toISOString() },
    ],
  });

  assert.match(html, /tool-activity-group/);
  assert.match(html, /도구 활동/);
  assert.match(html, /📖/);
  assert.match(html, /read_file/);
  assert.match(html, /SCHEMA.md/);
  assert.match(html, /×2/);
  assert.match(html, /📚/);
  assert.match(html, /skill_view/);
  assert.match(html, /&quot;hermes-agent&quot;/);
  assert.match(html, /성공 · 42 lines/);
  assert.match(html, /Hermes Agent/);
  assert.match(html, /agent-message/);
  assert.match(html, /<span class="agent-mark">앱<\/span>/);
  assert.doesNotMatch(html, /CSV prediction-first annotation flow/);
  assert.doesNotMatch(html, /아래에 프롬프트를 입력/);
  assert.doesNotMatch(html, /맨 위로 스크롤하면/);
  assert.doesNotMatch(html, /\{"success"/);
});
