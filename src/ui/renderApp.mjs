import { countByStatus, filterTasks, formatRelativeTime, statusLabel, statusTone } from '../domain/taskUtils.mjs';
import { STATUS_IDS } from '../domain/statuses.mjs';
import { buildWorkspaceList } from '../domain/workspaces.mjs';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export function createAppMarkup({ tasks, selectedTaskId, workspaceId = 'all', status = 'all', query = '', sessionMessages = [], chatState = {}, chatFocusMode = false, userWorkspaces = [], workspaceOrder = [], categoryDraft = '' }) {
  const workspaces = buildWorkspaceList(tasks, userWorkspaces, workspaceOrder);
  const visibleTasks = filterTasks(tasks, { workspaceId, status, query });
  const selected = selectedTaskId
    ? tasks.find((task) => task.id === selectedTaskId)
    : visibleTasks[0];
  const counts = countByStatus(tasks);

  return `
    <aside class="sidebar">
      <div class="brand"><div class="logo">▣</div><div><strong>Hermes Work</strong><span>Hermes work control</span></div></div>
      <form id="categoryForm" class="category-form">
        <label for="categoryName">카테고리 추가</label>
        <div class="category-input-row"><input id="categoryName" name="categoryName" placeholder="새 카테고리 이름" autocomplete="off" value="${esc(categoryDraft)}"/><button class="ghost" type="submit">추가</button></div>
      </form>
      <nav class="workspace-list compact-workspaces" aria-label="워크스페이스">
        ${workspaces.map((w) => workspaceButton(w, workspaceId)).join('')}
      </nav>
    </aside>

    <main class="board">
      <header class="topbar">
        <div><p class="eyebrow">세션 칸반</p><h1>세션을 고르고 그대로 대화합니다</h1></div>
        <div class="topbar-actions"><button class="ghost mobile-only" id="closeSessionList" aria-label="세션 목록 접기">채팅으로 돌아가기</button><button class="primary" id="newSession">새 세션</button><button class="ghost" id="refreshTasks">새로고침</button></div>
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
      ${selected ? sessionChat(selected, sessionMessages, chatState, chatFocusMode, workspaces) : '<div class="empty">세션을 선택하세요.</div>'}
    </aside>
  `;
}

function workspaceButton(workspace, activeId) {
  const badge = workspace.auto ? '<small>자동</small>' : workspace.custom ? '<small>사용자</small>' : '';
  const draggable = workspace.custom || workspace.auto;
  const dragAttrs = draggable
    ? ` draggable="true" data-workspace-drag="${esc(workspace.id)}" data-workspace-drop="${esc(workspace.id)}"`
    : '';
  const deleteButton = workspace.custom
    ? `<button class="mini danger" data-workspace-delete="${esc(workspace.id)}" type="button" aria-label="${esc(workspace.name)} 삭제">삭제</button>`
    : '';
  const controls = draggable
    ? `<span class="workspace-controls"><span class="drag-handle" aria-label="${esc(workspace.name)} 드래그 정렬" title="드래그해서 정렬">⋮⋮</span>${deleteButton}</span>`
    : '';
  return `<div class="workspace-row ${workspace.id === activeId ? 'active' : ''}"${dragAttrs}>
    <button class="workspace ${workspace.id === activeId ? 'active' : ''}" data-workspace="${esc(workspace.id)}" type="button"><span>${esc(workspace.icon)}</span><strong>${esc(workspace.name)}</strong>${badge}</button>
    ${controls}
  </div>`;
}

function taskCard(task, selectedId) {
  const messageCount = task.messageCount ?? task.messages?.length ?? 0;
  return `<article class="task-card ${task.id === selectedId ? 'selected' : ''}" data-task="${esc(task.id)}">
    <div class="task-head"><span class="status ${statusTone(task.status)}">${statusLabel(task.status)}</span><span>${formatRelativeTime(task.updatedAt)}</span></div>
    <h2>${esc(task.title)}</h2>
    <div class="task-meta"><span>${messageCount} messages</span><span>${esc(task.owner || 'Hermes')}</span></div>
  </article>`;
}

function sessionChat(task, messages, chatState, chatFocusMode, workspaces) {
  const list = messages?.length ? messages : task.messages || [];
  const focusLabel = chatFocusMode ? '채팅창 축소' : '채팅창 확장';
  const movableWorkspaces = workspaces.filter((workspace) => workspace.id !== 'all');
  const categorySelect = `<label class="category-move">카테고리 이동<select id="categoryMove" data-task-category="${esc(task.id)}">${movableWorkspaces.map((workspace) => `<option value="${esc(workspace.id)}" ${task.workspaceId === workspace.id ? 'selected' : ''}>${esc(workspace.name)}</option>`).join('')}</select></label>`;
  const statusSelect = `<label class="category-move status-move">상태 변경<select id="statusMove" data-task-status="${esc(task.id)}"><option value="auto">자동</option>${STATUS_IDS.map((status) => `<option value="${esc(status)}" ${task.status === status ? 'selected' : ''}>${statusLabel(status)}</option>`).join('')}</select></label>`;
  return `<div class="mobile-chat-bar"><button id="toggleSessionList" class="ghost" type="button" aria-label="세션 목록 펼치기">☰ 세션 목록</button><span>${esc(task.title)}</span></div>
  <div class="detail-header"><div class="detail-title-row"><div><span class="status ${statusTone(task.status)}">${statusLabel(task.status)}</span><h2>${esc(task.title)}</h2></div><button id="toggleChatFocus" class="ghost" type="button" aria-label="채팅창 전체화면 전환">${focusLabel}</button></div><div class="detail-controls">${categorySelect}${statusSelect}</div></div>
  <section class="chat-panel">
    <div class="chat-head"><div><div class="section-title">대화내역</div></div>${chatState.loading ? '<span class="sync-pill">불러오는 중</span>' : ''}</div>
    ${chatState.error ? `<p class="error-text">${esc(chatState.error)}</p>` : ''}
    <div class="message-list" id="messageList">
      ${renderMessageTimeline(list) || '<p class="muted">아직 표시할 대화가 없습니다.</p>'}
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

function renderMessageTimeline(messages) {
  const rendered = [];
  for (let index = 0; index < messages.length; index += 1) {
    const message = messages[index];
    if (!isToolActivity(message)) {
      rendered.push(messageBubble(message));
      continue;
    }
    const group = [];
    while (index < messages.length && isToolActivity(messages[index])) {
      group.push(messages[index]);
      index += 1;
    }
    index -= 1;
    rendered.push(toolActivityGroup(group));
  }
  return rendered.join('');
}

function isToolActivity(message) {
  return Boolean(message?.toolName || message?.role === 'tool' || message?.toolCalls?.length);
}

function messageBubble(message) {
  const role = message.role || 'message';
  const text = message.text || message.content || '';
  const omitted = Number(message.omittedChars || 0);
  const truncated = message.truncated
    ? `<span class="truncated-note">긴 내용 ${omitted.toLocaleString('ko-KR')}자를 접었습니다.</span>`
    : '';
  const isAgentRole = role === 'assistant' || role === 'agent';
  return `<article class="message ${esc(role)} ${isAgentRole ? 'agent-message' : ''}">
    <div class="message-meta"><b>${roleLabel(role)}</b><time>${formatRelativeTime(message.at || message.timestamp)}</time></div>
    <p>${esc(text)}${truncated}</p>
  </article>`;
}

function toolActivityGroup(messages) {
  const rows = compressToolRows(messages.flatMap(toolActivityEntries));
  const lastTime = messages.at(-1)?.at || messages.at(-1)?.timestamp;
  return `<article class="message tool-activity-group">
    <div class="tool-activity-meta"><b>도구 활동</b><time>${formatRelativeTime(lastTime)}</time></div>
    <div class="tool-activity-list">${rows.map(toolActivityRow).join('')}</div>
  </article>`;
}

function toolActivityEntries(message) {
  const status = message.toolStatus || (message.role === 'tool' ? 'success' : 'running');
  if (Array.isArray(message.toolCalls) && message.toolCalls.length > 0) {
    return message.toolCalls.map((call) => ({
      name: call.name,
      preview: call.preview || '',
      status,
      text: status === 'running' ? '' : message.text || '',
    }));
  }
  return [{
    name: message.toolName || 'tool',
    preview: '',
    status,
    text: message.text || '',
  }];
}

function compressToolRows(entries) {
  const rows = [];
  for (const entry of entries) {
    const key = `${entry.status}|${entry.name}|${entry.preview}|${entry.text}`;
    const previous = rows.at(-1);
    if (previous?.key === key) {
      previous.count += 1;
    } else {
      rows.push({ ...entry, key, count: 1 });
    }
  }
  return rows;
}

function toolActivityRow(entry) {
  const statusLabel = entry.status === 'running' ? '사용' : entry.status === 'error' ? '실패' : '완료';
  const statusClass = entry.status || 'success';
  const preview = entry.preview ? `<span class="tool-activity-preview">${esc(entry.preview)}</span>` : '';
  const detail = entry.text && entry.text !== '도구 사용' ? `<span class="tool-activity-result">${esc(entry.text)}</span>` : '';
  const count = entry.count > 1 ? `<span class="tool-activity-count">×${entry.count.toLocaleString('ko-KR')}</span>` : '';
  return `<div class="tool-activity-row ${esc(statusClass)}">
    <span class="tool-activity-icon" aria-hidden="true">${toolIcon(entry.name)}</span>
    <code>${esc(entry.name)}</code>
    ${preview}
    ${count}
    <span class="tool-activity-status">${statusLabel}</span>
    ${detail}
  </div>`;
}

function toolIcon(name) {
  const normalized = String(name || '').replace(/^functions\./, '');
  const icons = {
    read_file: '📖', skill_view: '📚', terminal: '💻', patch: '🔧', write_file: '✍️', search_files: '🔎', todo: '📋',
    browser_navigate: '🌐', browser_console: '🖥️', browser_click: '🖱️', browser_type: '⌨️', browser_snapshot: '📸', browser_vision: '👁️',
    web_search: '🔍', web_extract: '📰', execute_code: '🐍', delegate_task: '🤖', image_generate: '🎨', memory: '🧠',
  };
  return icons[normalized] || '⚙️';
}

function roleLabel(role) {
  const labels = { user: '사용자', assistant: 'Hermes Agent', agent: 'Hermes Agent', tool: '도구', system: '시스템' };
  return labels[role] || role;
}
