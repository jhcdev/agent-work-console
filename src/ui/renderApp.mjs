import { workspaces } from '../mocks/mockData.mjs';
import { countByStatus, filterTasks, formatRelativeTime, statusLabel, statusTone } from '../domain/taskUtils.mjs';

function esc(value) {
  return String(value ?? '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[ch]);
}

export function createAppMarkup({ tasks, selectedTaskId, workspaceId = 'all', status = 'all', query = '' }) {
  const visibleTasks = filterTasks(tasks, { workspaceId, status, query });
  const selected = tasks.find((task) => task.id === selectedTaskId) || visibleTasks[0] || tasks[0];
  const counts = countByStatus(tasks);

  return `
    <aside class="sidebar">
      <div class="brand"><div class="logo">▣</div><div><strong>Agent Work Console</strong><span>cross-platform control room</span></div></div>
      <nav class="workspace-list">
        ${workspaces.map((w) => `<button class="workspace ${workspaceId === w.id ? 'active' : ''}" data-workspace="${esc(w.id)}"><span>${esc(w.icon)}</span>${esc(w.name)}</button>`).join('')}
      </nav>
      <section class="connection-card">
        <div class="section-title">Hermes 연결</div>
        <label>Base URL<input id="baseUrl" value="http://127.0.0.1:8642" /></label>
        <label>API Key<input id="apiKey" type="password" placeholder="API_SERVER_KEY" /></label>
        <label>Session Key<input id="sessionKey" value="web:jihun:agent-console" /></label>
        <button class="primary" id="saveConfig">설정 저장</button>
      </section>
    </aside>

    <main class="board">
      <header class="topbar">
        <div><p class="eyebrow">작업 흐름</p><h1>AI 에이전트 작업을 한 화면에서 추적합니다</h1></div>
        <button class="primary" id="refreshTasks">Hermes 동기화</button>
      </header>
      <section class="stats">
        ${Object.entries(counts).map(([key, value]) => `<button class="stat ${status === key ? 'active' : ''}" data-status="${esc(key)}"><span class="dot ${statusTone(key)}"></span><strong>${value}</strong><small>${statusLabel(key)}</small></button>`).join('')}
      </section>
      <div class="toolbar"><input id="search" placeholder="작업, 결과, 담당자 검색" value="${esc(query)}"/><button data-status="all" class="ghost">전체 상태</button></div>
      <section class="task-list">
        ${visibleTasks.map((task) => taskCard(task, selected?.id)).join('') || '<div class="empty">조건에 맞는 작업이 없습니다.</div>'}
      </section>
    </main>

    <aside class="detail">
      ${selected ? taskDetail(selected) : '<div class="empty">작업을 선택하세요.</div>'}
    </aside>
  `;
}

function taskCard(task, selectedId) {
  return `<article class="task-card ${task.id === selectedId ? 'selected' : ''}" data-task="${esc(task.id)}">
    <div class="task-head"><span class="status ${statusTone(task.status)}">${statusLabel(task.status)}</span><span>${formatRelativeTime(task.updatedAt)}</span></div>
    <h2>${esc(task.title)}</h2>
    <p>${esc(task.summary)}</p>
    <div class="task-meta"><span>Priority ${esc(task.priority)}</span><span>${task.messages.length} messages</span><span>${task.logs.length} logs</span></div>
  </article>`;
}

function taskDetail(task) {
  return `<div class="detail-header"><span class="status ${statusTone(task.status)}">${statusLabel(task.status)}</span><h2>${esc(task.title)}</h2><p>${esc(task.summary)}</p></div>
  <div class="detail-actions"><button class="ghost">Stop</button><button class="ghost">Fork</button><button class="primary">Final report</button></div>
  <section class="panel"><div class="section-title">대화</div>${task.messages.map((m) => `<div class="message ${esc(m.role)}"><b>${esc(m.role)}</b><p>${esc(m.text)}</p><time>${formatRelativeTime(m.at)}</time></div>`).join('')}</section>
  <section class="panel"><div class="section-title">실행 로그</div>${task.logs.map((log) => `<div class="log ${esc(log.level)}"><span>${esc(log.level)}</span><code>${esc(log.text)}</code><time>${formatRelativeTime(log.at)}</time></div>`).join('') || '<p class="muted">아직 로그가 없습니다.</p>'}</section>
  <section class="panel"><div class="section-title">승인</div>${task.approvals.map((a) => `<div class="approval"><b>${esc(a.label)}</b><code>${esc(a.command)}</code><div><button class="primary">Approve</button><button class="ghost">Deny</button></div></div>`).join('') || '<p class="muted">대기 중인 승인이 없습니다.</p>'}</section>
  <section class="panel"><div class="section-title">결과물</div>${task.artifacts.map((a) => `<span class="artifact">${esc(a.kind)} · ${esc(a.name)}</span>`).join('') || '<p class="muted">아직 결과물이 없습니다.</p>'}</section>`;
}
