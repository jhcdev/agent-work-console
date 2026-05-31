import { mockTasks } from './mocks/mockData.mjs';
import { createAppMarkup } from './ui/renderApp.mjs';
import { HermesApiClient, readConnectionConfig } from './services/hermesApi.mjs';

const state = {
  tasks: mockTasks,
  selectedTaskId: mockTasks[0].id,
  workspaceId: 'all',
  status: 'all',
  query: '',
  connection: { baseUrl: '/hermes', sessionKey: 'web:jihun:agent-console', useMockFallback: true },
  sessionMessages: [],
  chatState: { loading: false, sending: false, error: '' },
};
const root = document.getElementById('root');

function mergedConnectionConfig() {
  return { ...state.connection, ...readConnectionConfig(), useMockFallback: true };
}

function client() {
  return new HermesApiClient(mergedConnectionConfig());
}

function render() {
  root.innerHTML = createAppMarkup({ ...state, connection: mergedConnectionConfig() });
  bind();
  scrollMessagesToBottom();
}

function bind() {
  document.querySelectorAll('[data-workspace]').forEach((el) => el.addEventListener('click', () => {
    state.workspaceId = el.dataset.workspace;
    state.selectedTaskId = undefined;
    state.sessionMessages = [];
    render();
  }));
  document.querySelectorAll('[data-status]').forEach((el) => el.addEventListener('click', () => {
    state.status = el.dataset.status;
    state.selectedTaskId = undefined;
    state.sessionMessages = [];
    render();
  }));
  document.querySelectorAll('[data-task]').forEach((el) => el.addEventListener('click', async () => {
    state.selectedTaskId = el.dataset.task;
    state.sessionMessages = [];
    render();
    await loadSelectedMessages();
  }));
  document.getElementById('search')?.addEventListener('input', (event) => { state.query = event.target.value; render(); });
  document.getElementById('refreshTasks')?.addEventListener('click', refreshTasks);
  document.getElementById('sessionChatForm')?.addEventListener('submit', sendChatPrompt);
}

async function loadServerConfig() {
  try {
    const response = await fetch('/agent-console/config');
    if (response.ok) state.connection = { ...state.connection, ...(await response.json()) };
  } catch {
    // Static preview or file:// use can still rely on defaults/localStorage.
  }
}

async function refreshTasks() {
  const selectedBefore = state.selectedTaskId;
  state.tasks = await client().listTasks();
  state.selectedTaskId = state.tasks.some((task) => task.id === selectedBefore) ? selectedBefore : state.tasks[0]?.id;
  render();
  await loadSelectedMessages();
}

async function loadSelectedMessages() {
  if (!state.selectedTaskId) return;
  state.chatState = { ...state.chatState, loading: true, error: '' };
  render();
  try {
    state.sessionMessages = await client().listMessages(state.selectedTaskId);
    state.chatState = { ...state.chatState, loading: false, error: '' };
  } catch (error) {
    const fallback = state.tasks.find((task) => task.id === state.selectedTaskId)?.messages || [];
    state.sessionMessages = fallback;
    state.chatState = { ...state.chatState, loading: false, error: `대화내역을 불러오지 못했습니다: ${error.message}` };
  }
  render();
}

async function sendChatPrompt(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector('#chatInput');
  const message = input?.value.trim();
  const sessionId = form.dataset.session;
  if (!message || !sessionId) return;

  state.chatState = { ...state.chatState, sending: true, error: '' };
  state.sessionMessages = [...state.sessionMessages, { role: 'user', text: message, at: new Date().toISOString() }];
  render();
  try {
    await client().sendChat(sessionId, message);
    state.chatState = { ...state.chatState, sending: false };
    await loadSelectedMessages();
  } catch (error) {
    state.chatState = { ...state.chatState, sending: false, error: `전송 실패: ${error.message}` };
    render();
  }
}

function scrollMessagesToBottom() {
  const list = document.getElementById('messageList');
  if (list) list.scrollTop = list.scrollHeight;
}

await loadServerConfig();
render();
refreshTasks();
