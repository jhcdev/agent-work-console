import { mockTasks } from '../mocks/mockData.mjs';

export class HermesApiClient {
  constructor(config, fetcher = globalThis.fetch) {
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
    const base = (this.config.baseUrl || 'http://127.0.0.1:8642').replace(/\/$/, '');
    return `${base}${path}`;
  }

  async request(path, init = {}) {
    const response = await this.fetcher(this.url(path), { ...init, headers: this.headers(init.headers || {}) });
    if (!response.ok) throw new Error(`Hermes API ${response.status}: ${await response.text()}`);
    return response.json();
  }

  async listSessions() {
    return this.request('/api/sessions');
  }

  async listMessages(sessionId) {
    return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/messages`);
  }

  async sendChat(sessionId, message) {
    return this.request(`/api/sessions/${encodeURIComponent(sessionId)}/chat`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  }

  async listTasks() {
    try {
      const data = await this.listSessions();
      const sessions = Array.isArray(data) ? data : data.sessions || data.data || [];
      return sessions.map(sessionToTask);
    } catch (error) {
      if (this.config.useMockFallback) return mockTasks;
      throw error;
    }
  }
}

function sessionToTask(session) {
  const id = session.id || session.session_id || session.sessionId;
  const title = session.title || session.name || `Hermes session ${String(id).slice(0, 8)}`;
  return {
    id: String(id), workspaceId: session.workspaceId || 'hermes', title, status: session.status || 'running', priority: 'medium',
    updatedAt: session.updated_at || session.updatedAt || new Date().toISOString(), owner: session.user || 'Hermes',
    summary: session.summary || 'Hermes API Server에서 가져온 세션입니다.',
    messages: [], logs: [], approvals: [], artifacts: [],
  };
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
