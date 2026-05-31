import { workspaces } from '../mocks/mockData.mjs';
import { countByStatus, filterTasks, formatRelativeTime, statusLabel, statusTone } from '../domain/taskUtils.mjs';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export function createAppMarkup({ tasks, selectedTaskId, workspaceId = 'all', status = 'all', query = '', sessionMessages = [], chatState = {} }) {
  const visibleTasks = filterTasks(tasks, { workspaceId, status, query });
  const selected = tasks.find((task) => task.id === selectedTaskId) || visibleTasks[0] || tasks[0];
  const counts = countByStatus(tasks);

  return `
    <aside class="sidebar">
      <div class="brand"><div class="logo">▣</div><div><strong>Agent Work Console</strong><span>Hermes session control</span></div></div>
      <nav class="workspace-list" aria-label="워크스페이스">
        ${workspaces.map((w) => `<button class="workspace ${workspaceId === w.id ? 'active' : ''}" data-workspace="${esc(w.id)}"><span>${esc(w.icon)}</span>${esc(w.name)}</button>`).join('')}
      </nav>
    </aside>

    <main class="board">
      <header class="topbar">
        <div><p class="eyebrow">세션 칸반</p><h1>세션을 고르고 그대로 대화합니다</h1></div>
        <div class="topbar-actions"><button class="primary" id="newSession">새 세션</button><button class="ghost" id="refreshTasks">새로고침</button></div>
      </header>
      <section class="stats">
        ${Object.entries(counts).map(([key, value]) => `<button class="stat ${status === key ? 'active' : ''}" data-status="${esc(key)}"><span class="dot ${statusTone(key)}"></span><strong>${value}</strong><small>${statusLabel(key)}</small></button>`).join('')}
      </section>
      <div class="toolbar"><input id="search" placeholder="세션 제목/요약 검색" value="${esc(query)}"/><button data-status="all" class="ghost">전체 상태</button></div>
      <section class="task-list" aria-label="Hermes 세션 목록">
        ${visibleTasks.map((task) => taskCard(task, selected?.id)).join('') || '<div class="empty">조건에 맞는 세션이 없습니다.</div>'}
      </section>
    </main>

    <aside class="detail">
      <button id="chatResizeHandle" class="chat-resize-handle" type="button" aria-label="채팅 패널 크기 조절" title="채팅 패널 크기 조절"></button>
      ${selected ? sessionChat(selected, sessionMessages, chatState) : '<div class="empty">세션을 선택하세요.</div>'}
    </aside>
  `;
}

function taskCard(task, selectedId) {
  const messageCount = task.messageCount ?? task.messages?.length ?? 0;
  return `<article class="task-card ${task.id === selectedId ? 'selected' : ''}" data-task="${esc(task.id)}">
    <div class="task-head"><span class="status ${statusTone(task.status)}">${statusLabel(task.status)}</span><span>${formatRelativeTime(task.updatedAt)}</span></div>
    <h2>${esc(task.title)}</h2>
    <p>${esc(task.summary)}</p>
    <div class="task-meta"><span>${messageCount} messages</span><span>${esc(task.owner || 'Hermes')}</span></div>
  </article>`;
}

function sessionChat(task, messages, chatState) {
  const list = messages?.length ? messages : task.messages || [];
  return `<div class="detail-header"><span class="status ${statusTone(task.status)}">${statusLabel(task.status)}</span><h2>${esc(task.title)}</h2><p>${esc(task.summary)}</p></div>
  <section class="chat-panel">
    <div class="chat-head"><div class="section-title">대화내역</div>${chatState.loading ? '<span class="sync-pill">불러오는 중</span>' : ''}</div>
    ${chatState.error ? `<p class="error-text">${esc(chatState.error)}</p>` : ''}
    <div class="message-list" id="messageList">
      ${list.map(messageBubble).join('') || '<p class="muted">아직 이 세션에 표시할 대화가 없습니다. 아래에 프롬프트를 입력하면 이 세션에 이어서 남습니다.</p>'}
    </div>
    <form id="sessionChatForm" class="chat-form" data-session="${esc(task.id)}">
      <textarea id="chatInput" name="message" rows="3" placeholder="이 세션에 이어서 프롬프트 입력…" aria-label="세션 프롬프트 입력" ${chatState.sending ? 'disabled' : ''}></textarea>
      <div class="chat-actions">
        <span class="shortcut-hint">Enter로 보내기 · Shift+Enter 줄바꿈</span>
        <button class="primary" type="submit" ${chatState.sending ? 'disabled' : ''}>${chatState.sending ? '전송 중…' : '보내기'}</button>
      </div>
    </form>
  </section>`;
}

function messageBubble(message) {
  const role = message.role || 'message';
  const text = message.text || message.content || '';
  return `<article class="message ${esc(role)}">
    <div class="message-meta"><b>${roleLabel(role)}</b><time>${formatRelativeTime(message.at || message.timestamp)}</time></div>
    <p>${esc(text)}</p>
  </article>`;
}

function roleLabel(role) {
  const labels = { user: '사용자', assistant: 'Hermes', tool: '도구', system: '시스템' };
  return labels[role] || role;
}
