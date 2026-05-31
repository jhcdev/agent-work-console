import { mockTasks } from './mocks/mockData.mjs';
import { createAppMarkup } from './ui/renderApp.mjs';
import { shouldSubmitChatShortcut } from './ui/keyboardShortcuts.mjs';
import { detailWidthFromPointer, sanitizeDetailPanelWidth } from './ui/panelResize.mjs';
import { HermesApiClient, readConnectionConfig } from './services/hermesApi.mjs';
import { filterTasks } from './domain/taskUtils.mjs';

const SESSION_REFRESH_INTERVAL_MS = 1000;
const MESSAGE_LOAD_LIMIT = 300;
const MESSAGE_MAX_CONTENT_CHARS = 8_000;
let refreshInFlight = false;

const state = {
  tasks: mockTasks,
  selectedTaskId: mockTasks[0].id,
  workspaceId: 'all',
  status: 'all',
  query: '',
  connection: { baseUrl: '/hermes', sessionKey: 'web:jihun:hermes-work', useMockFallback: true },
  sessionMessages: [],
  pendingLocalMessages: [],
  chatState: { loading: false, sending: false, error: '' },
  detailPanelWidth: sanitizeDetailPanelWidth(localStorage.getItem('hermesWork.detailPanelWidth') || localStorage.getItem('agentConsole.detailPanelWidth')),
  mobileSessionListOpen: false,
  chatFocusMode: (localStorage.getItem('hermesWork.chatFocusMode') || localStorage.getItem('agentConsole.chatFocusMode')) === 'true',
  searchComposing: false,
};
const root = document.getElementById('root');

function mergedConnectionConfig() {
  return { ...state.connection, ...readConnectionConfig(), useMockFallback: true };
}

function client() {
  return new HermesApiClient(mergedConnectionConfig());
}

function render(options = {}) {
  root.style.setProperty('--detail-width', `${state.detailPanelWidth}px`);
  root.classList.toggle('session-list-open', state.mobileSessionListOpen);
  root.classList.toggle('chat-focus-mode', state.chatFocusMode);
  root.innerHTML = createAppMarkup({
    ...state,
    sessionMessages: visibleSessionMessages(),
    connection: mergedConnectionConfig(),
  });
  bind();
  if (options.restoreSearchFocus) restoreSearchFocus(options.searchCaret);
  if (options.restoreBoardScroll) restoreBoardScroll(options.boardScrollTop);
  if (options.restoreMessageScroll) {
    restoreMessageScroll(options.messageScrollTop);
  } else if (options.scrollMessagesToBottom !== false) {
    scrollMessagesToBottom();
  }
}

function bind() {
  document.querySelectorAll('[data-workspace]').forEach((el) => el.addEventListener('click', async () => {
    const boardScrollTop = getBoardScrollTop();
    state.workspaceId = el.dataset.workspace;
    state.selectedTaskId = firstVisibleTaskId();
    state.sessionMessages = [];
    render({ restoreBoardScroll: true, boardScrollTop });
    if (state.selectedTaskId) await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop });
  }));
  document.querySelectorAll('[data-status]').forEach((el) => el.addEventListener('click', async () => {
    const boardScrollTop = getBoardScrollTop();
    state.status = el.dataset.status;
    state.selectedTaskId = firstVisibleTaskId();
    state.sessionMessages = [];
    render({ restoreBoardScroll: true, boardScrollTop });
    if (state.selectedTaskId) await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop });
  }));
  document.querySelectorAll('[data-task]').forEach((el) => el.addEventListener('click', async () => {
    const boardScrollTop = getBoardScrollTop();
    state.selectedTaskId = el.dataset.task;
    state.sessionMessages = [];
    state.mobileSessionListOpen = false;
    render({ restoreBoardScroll: true, boardScrollTop });
    await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop });
  }));
  const searchInput = document.getElementById('search');
  searchInput?.addEventListener('compositionstart', () => { state.searchComposing = true; });
  searchInput?.addEventListener('compositionend', (event) => {
    state.searchComposing = false;
    state.query = event.target.value;
    render({ restoreSearchFocus: true, searchCaret: event.target.value.length });
  });
  searchInput?.addEventListener('input', (event) => {
    state.query = event.target.value;
    if (state.searchComposing || event.isComposing) return;
    render({ restoreSearchFocus: true, searchCaret: event.target.selectionStart });
  });
  document.getElementById('refreshTasks')?.addEventListener('click', refreshTasks);
  document.getElementById('newSession')?.addEventListener('click', createNewSession);
  document.getElementById('sessionChatForm')?.addEventListener('submit', sendChatPrompt);
  document.getElementById('chatInput')?.addEventListener('keydown', submitChatOnEnter);
  document.getElementById('chatResizeHandle')?.addEventListener('pointerdown', startDetailPanelResize);
  document.getElementById('toggleSessionList')?.addEventListener('click', () => {
    state.mobileSessionListOpen = true;
    render();
  });
  document.getElementById('closeSessionList')?.addEventListener('click', () => {
    state.mobileSessionListOpen = false;
    render();
  });
  document.getElementById('toggleChatFocus')?.addEventListener('click', () => {
    state.chatFocusMode = !state.chatFocusMode;
    localStorage.setItem('hermesWork.chatFocusMode', String(state.chatFocusMode));
    render();
  });
}

function bindGlobalRefreshControls() {
  window.addEventListener('keydown', (event) => {
    if (event.key !== 'F5' && !(event.key.toLowerCase() === 'r' && (event.metaKey || event.ctrlKey))) return;
    event.preventDefault();
    refreshTasks({ force: true, loadMessages: true });
  });
  window.addEventListener('focus', () => refreshTasks({ silent: true }));
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden) refreshTasks({ silent: true });
  });
  const scheduleRealtimeRefresh = () => {
    window.setTimeout(async () => {
      await refreshTasks({ silent: true });
      scheduleRealtimeRefresh();
    }, SESSION_REFRESH_INTERVAL_MS);
  };
  scheduleRealtimeRefresh();
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
    localStorage.setItem('hermesWork.detailPanelWidth', String(state.detailPanelWidth));
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
  for (const configPath of ['/hermes-work/config', '/agent-console/config']) {
    try {
      const response = await fetch(configPath);
      if (response.ok) {
        state.connection = { ...state.connection, ...(await response.json()) };
        return;
      }
    } catch {
      // Static preview or file:// use can still rely on defaults/localStorage.
    }
  }
}

async function refreshTasks({ force = false, loadMessages = false } = {}) {
  if (refreshInFlight) return;
  if (!force && (document.hidden || state.searchComposing)) return;
  refreshInFlight = true;
  const selectedBefore = state.selectedTaskId;
  const searchCaret = document.activeElement?.id === 'search' ? document.getElementById('search')?.selectionStart : undefined;
  const boardScrollTop = getBoardScrollTop();
  const messageScrollTop = getMessageScrollTop();
  try {
    const nextTasks = await client().listTasks();
    state.tasks = nextTasks;
    state.selectedTaskId = state.tasks.some((task) => task.id === selectedBefore) ? selectedBefore : state.tasks[0]?.id;
    const selectedChanged = state.selectedTaskId !== selectedBefore;
    render({
      restoreSearchFocus: searchCaret !== undefined,
      searchCaret,
      restoreBoardScroll: true,
      boardScrollTop,
      restoreMessageScroll: !selectedChanged,
      messageScrollTop,
    });
    if (state.selectedTaskId && (loadMessages || selectedChanged)) {
      await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop });
    } else if (state.selectedTaskId) {
      await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop, restoreMessageScroll: true, messageScrollTop, silent: true });
    }
  } finally {
    refreshInFlight = false;
  }
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
    state.pendingLocalMessages = state.pendingLocalMessages.filter((message) => message.sessionId !== task.id);
    state.mobileSessionListOpen = false;
    state.chatState = { ...state.chatState, loading: false, error: '' };
    render();
  } catch (error) {
    state.chatState = { ...state.chatState, loading: false, error: `새 세션을 만들지 못했습니다: ${error.message}` };
    render();
  }
}

async function loadSelectedMessages(options = {}) {
  if (!state.selectedTaskId) return;
  if (!options.silent) {
    state.chatState = { ...state.chatState, loading: true, error: '' };
    render(options);
  }
  try {
    const fetchedMessages = await client().listMessages(state.selectedTaskId, {
      limit: MESSAGE_LOAD_LIMIT,
      maxContentChars: MESSAGE_MAX_CONTENT_CHARS,
    });
    state.sessionMessages = fetchedMessages;
    state.chatState = {
      ...state.chatState,
      loading: false,
      error: '',
      totalCount: fetchedMessages.totalCount ?? fetchedMessages.length,
      loadedCount: fetchedMessages.length,
      messageLimit: fetchedMessages.limit ?? MESSAGE_LOAD_LIMIT,
    };
    prunePersistedLocalMessages(state.selectedTaskId, fetchedMessages);
  } catch (error) {
    const fallback = state.tasks.find((task) => task.id === state.selectedTaskId)?.messages || [];
    state.sessionMessages = fallback;
    state.chatState = { ...state.chatState, loading: false, error: `대화내역을 불러오지 못했습니다: ${error.message}` };
  }
  render(options);
}

async function sendChatPrompt(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector('#chatInput');
  const message = input?.value.trim();
  const sessionId = form.dataset.session;
  if (!message || !sessionId) return;

  state.chatState = { ...state.chatState, sending: true, error: '' };
  const pendingMessage = { sessionId, role: 'user', text: message, at: new Date().toISOString(), pending: true };
  state.pendingLocalMessages = [...state.pendingLocalMessages, pendingMessage];
  render();
  try {
    const response = await client().sendChat(sessionId, message);
    const responseSessionId = response?.session_id || sessionId;
    if (responseSessionId !== state.selectedTaskId) {
      const previousTask = state.tasks.find((task) => task.id === sessionId);
      if (previousTask && !state.tasks.some((task) => task.id === responseSessionId)) {
        state.tasks = [{ ...previousTask, id: responseSessionId }, ...state.tasks.filter((task) => task.id !== sessionId)];
      }
      state.selectedTaskId = responseSessionId;
      state.pendingLocalMessages = state.pendingLocalMessages.map((item) => (
        item === pendingMessage ? { ...item, sessionId: responseSessionId } : item
      ));
    }
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

function visibleSessionMessages() {
  const selectedId = state.selectedTaskId;
  if (!selectedId) return state.sessionMessages;
  const pending = state.pendingLocalMessages.filter((message) => message.sessionId === selectedId);
  if (!pending.length) return state.sessionMessages;
  const existingUserTexts = new Set(
    state.sessionMessages
      .filter((message) => message.role === 'user')
      .map((message) => String(message.text || message.content || '').trim())
      .filter(Boolean),
  );
  const missingPending = pending.filter((message) => !existingUserTexts.has(String(message.text || '').trim()));
  return [...state.sessionMessages, ...missingPending];
}

function prunePersistedLocalMessages(sessionId, fetchedMessages) {
  const fetchedUserTexts = new Set(
    fetchedMessages
      .filter((message) => message.role === 'user')
      .map((message) => String(message.text || message.content || '').trim())
      .filter(Boolean),
  );
  state.pendingLocalMessages = state.pendingLocalMessages.filter((message) => (
    message.sessionId !== sessionId || !fetchedUserTexts.has(String(message.text || '').trim())
  ));
}

function getMessageScrollTop() {
  return document.getElementById('messageList')?.scrollTop ?? 0;
}

function restoreMessageScroll(scrollTop = 0) {
  const list = document.getElementById('messageList');
  if (list) list.scrollTop = Math.min(scrollTop, list.scrollHeight);
}

function restoreSearchFocus(caret = state.query.length) {
  const search = document.getElementById('search');
  if (!search) return;
  search.focus();
  const nextCaret = Math.min(caret ?? state.query.length, search.value.length);
  search.setSelectionRange(nextCaret, nextCaret);
}

function getBoardScrollTop() {
  return document.querySelector('.board')?.scrollTop ?? 0;
}

function firstVisibleTaskId() {
  return filterTasks(state.tasks, {
    workspaceId: state.workspaceId,
    status: state.status,
    query: state.query,
  })[0]?.id;
}

function restoreBoardScroll(scrollTop = 0) {
  const board = document.querySelector('.board');
  if (board) board.scrollTop = scrollTop;
}

await loadServerConfig();
render();
bindGlobalRefreshControls();
refreshTasks({ force: true, loadMessages: true });
