import { mockTasks } from '../mocks/mockData.mjs';

export class HermesApiClient {
  constructor(config, fetcher = (...args) => globalThis.fetch(...args)) {
    this.config = { useMockFallback: true, ...config };
    this.fetcher = fetcher;
  }

  headers(extra = {}) {
    const headers = { 'Content-Type': 'application/json', ...extra };
    if (this.config.apiKey) headers.Authorization = `Bearer ${this.config.apiKey}`;
    if (this.config.sessionKey) headers['X-Hermes-Session-Key'] = this.config.sessionKey;
    return headers;
  }

  url(path) {
    const base = (this.config.baseUrl || '/hermes').replace(/\/$/, '');
    return `${base}${path}`;
  }

  async request(path, init = {}) {
    const response = await this.fetcher(this.url(path), { ...init, headers: this.headers(init.headers || {}) });
    if (!response.ok) throw new Error(`Hermes API ${response.status}: ${await response.text()}`);
    return response.json();
  }

  async listSessions({ limit = 200, maxPages = 5 } = {}) {
    const all = [];
    let offset = 0;
    let last = null;
    for (let page = 0; page < maxPages; page += 1) {
      last = await this.request(`/api/sessions?limit=${limit}&offset=${offset}`);
      const rows = Array.isArray(last) ? last : last.sessions || last.data || [];
      all.push(...rows);
      if (!last?.has_more || rows.length === 0) break;
      offset += rows.length;
    }
    return { object: 'list', data: all, limit, offset: 0, has_more: Boolean(last?.has_more) };
  }

  async listMessages(sessionId) {
    const payload = await this.request(`/api/sessions/${encodeURIComponent(sessionId)}/messages`);
    const rows = Array.isArray(payload) ? payload : payload.data || payload.messages || [];
    return rows.map(normalizeMessage).filter(Boolean);
  }

  async sendChat(sessionId, message) {
    return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async createSession({ title } = {}) {
    const payload = await this.request('/api/sessions', {
      method: 'POST',
      body: JSON.stringify({ title: title || defaultSessionTitle() }),
    });
    return sessionToTask(payload.session || payload);
  }

  async listTasks() {
    try {
      const data = await this.listSessions();
      const sessions = Array.isArray(data) ? data : data.sessions || data.data || [];
      return sessions.filter(isUsefulSession).map(sessionToTask);
    } catch (error) {
      if (this.config.useMockFallback) return mockTasks;
      throw error;
    }
  }
}

function isUsefulSession(session) {
  const messageCount = session.message_count ?? session.messages?.length ?? 0;
  if (session.source === 'cron') return false;
  return messageCount > 0 || session.source === 'api_server';
}

function sessionToTask(session) {
  const id = session.id || session.session_id || session.sessionId;
  const title = session.title || session.name || `Hermes session ${String(id).slice(0, 8)}`;
  const messageCount = session.message_count ?? session.messages?.length ?? 0;
  return {
    id: String(id), workspaceId: session.workspaceId || 'hermes', title, status: session.status || (session.ended_at ? 'done' : 'running'), priority: 'medium',
    updatedAt: timestampToIso(session.updated_at || session.updatedAt || session.ended_at || session.started_at) || new Date().toISOString(), owner: session.user || 'Hermes',
    summary: session.summary || `${messageCount}개 메시지가 저장된 Hermes 세션입니다.`,
    messages: [], logs: [], approvals: [], artifacts: [], messageCount,
  };
}

export function normalizeMessage(message) {
  if (!message) return undefined;
  const toolCallNames = Array.isArray(message.tool_calls)
    ? message.tool_calls.map((call) => call?.function?.name || call?.name).filter(Boolean)
    : [];
  const text = String(message.content || message.text || (toolCallNames.length ? `tool call: ${toolCallNames.join(', ')}` : '') || '').trim();
  return {
    id: message.id,
    role: message.role || 'message',
    text,
    at: timestampToIso(message.timestamp || message.created_at || message.at) || new Date().toISOString(),
    toolName: message.tool_name || toolCallNames.join(', '),
  };
}

function timestampToIso(value) {
  if (!value) return undefined;
  if (typeof value === 'string') return value;
  if (typeof value === 'number') return new Date(value < 10_000_000_000 ? value * 1000 : value).toISOString();
  return undefined;
}

function defaultSessionTitle() {
  const now = new Date();
  const date = now.toLocaleString('ko-KR', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' });
  return `새 세션 ${date}`;
}

export function readConnectionConfig() {
  try {
    return JSON.parse(localStorage.getItem('agent-console-config') || '{}');
  } catch {
    return {};
  }
}

export function saveConnectionConfig(config) {
  localStorage.setItem('agent-console-config', JSON.stringify(config));
}
