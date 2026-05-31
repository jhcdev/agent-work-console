import { mockTasks } from './mocks/mockData.mjs';
import { createAppMarkup } from './ui/renderApp.mjs';
import { shouldSubmitChatShortcut } from './ui/keyboardShortcuts.mjs';
import { detailWidthFromPointer, sanitizeDetailPanelWidth } from './ui/panelResize.mjs';
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
  detailPanelWidth: sanitizeDetailPanelWidth(localStorage.getItem('agentConsole.detailPanelWidth')),
};
const root = document.getElementById('root');

function mergedConnectionConfig() {
  return { ...state.connection, ...readConnectionConfig(), useMockFallback: true };
}

function client() {
  return new HermesApiClient(mergedConnectionConfig());
}

function render() {
  root.style.setProperty('--detail-width', `${state.detailPanelWidth}px`);
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
  document.getElementById('newSession')?.addEventListener('click', createNewSession);
  document.getElementById('sessionChatForm')?.addEventListener('submit', sendChatPrompt);
  document.getElementById('chatInput')?.addEventListener('keydown', submitChatOnEnter);
  document.getElementById('chatResizeHandle')?.addEventListener('pointerdown', startDetailPanelResize);
}

function startDetailPanelResize(event) {
  event.preventDefault();
  document.body.classList.add('resizing-detail-panel');
  const onPointerMove = (moveEvent) => {
    state.detailPanelWidth = detailWidthFromPointer({ viewportWidth: window.innerWidth, pointerX: moveEvent.clientX });
    root.style.setProperty('--detail-width', `${state.detailPanelWidth}px`);
  };
  const onPointerUp = () => {
    document.body.classList.remove('resizing-detail-panel');
    localStorage.setItem('agentConsole.detailPanelWidth', String(state.detailPanelWidth));
    window.removeEventListener('pointermove', onPointerMove);
    window.removeEventListener('pointerup', onPointerUp);
  };
  window.addEventListener('pointermove', onPointerMove);
  window.addEventListener('pointerup', onPointerUp, { once: true });
}

function submitChatOnEnter(event) {
  if (!shouldSubmitChatShortcut(event)) return;
  event.preventDefault();
  event.currentTarget?.form?.requestSubmit();
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

async function createNewSession() {
  state.chatState = { ...state.chatState, loading: true, error: '' };
  render();
  try {
    const task = await client().createSession();
    state.tasks = [task, ...state.tasks.filter((item) => item.id !== task.id)];
    state.selectedTaskId = task.id;
    state.workspaceId = 'all';
    state.status = 'all';
    state.query = '';
    state.sessionMessages = [];
    state.chatState = { ...state.chatState, loading: false, error: '' };
    render();
  } catch (error) {
    state.chatState = { ...state.chatState, loading: false, error: `새 세션을 만들지 못했습니다: ${error.message}` };
    render();
  }
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
