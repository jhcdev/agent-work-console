import { mockTasks } from './mocks/mockData.mjs';
import { createAppMarkup } from './ui/renderApp.mjs';
import { shouldSubmitChatShortcut } from './ui/keyboardShortcuts.mjs';
import { detailWidthFromPointer, sanitizeDetailPanelWidth } from './ui/panelResize.mjs';
import { HermesApiClient, readConnectionConfig } from './services/hermesApi.mjs';
import { filterTasks } from './domain/taskUtils.mjs';
import { shouldReloadSelectedMessages } from './domain/sessionRefresh.mjs';
import { nextLazyMessageLimit, shouldLazyLoadOlderMessages } from './domain/messageHistory.mjs';
import { buildWorkspaceList, createUserWorkspace, deleteUserWorkspace, matchUserWorkspaceForTask, normalizeUserWorkspaces, reorderWorkspaceOrder } from './domain/workspaces.mjs';
import { setStatusOverride } from './domain/statuses.mjs';

const SESSION_REFRESH_INTERVAL_MS = 1000;
const MESSAGE_LOAD_LIMIT = 150;
const MESSAGE_LAZY_CHUNK_SIZE = 150;
const MESSAGE_MAX_CONTENT_CHARS = 3_000;
let refreshInFlight = false;

const state = {
  tasks: mockTasks,
  selectedTaskId: mockTasks[0].id,
  workspaceId: 'all',
  status: 'all',
  userWorkspaces: readUserWorkspaces(),
  workspaceOrder: readWorkspaceOrder(),
  taskWorkspaceOverrides: readTaskWorkspaceOverrides(),
  taskStatusOverrides: readTaskStatusOverrides(),
  categoryDraft: '',
  query: '',
  connection: { baseUrl: '/hermes', sessionKey: 'web:jihun:hermes-work', useMockFallback: true },
  sessionMessages: [],
  messageLimit: MESSAGE_LOAD_LIMIT,
  pendingLocalMessages: [],
  chatState: { loading: false, sending: false, error: '' },
  detailPanelWidth: sanitizeDetailPanelWidth(localStorage.getItem('hermesWork.detailPanelWidth') || localStorage.getItem('agentConsole.detailPanelWidth')),
  mobileSessionListOpen: false,
  chatFocusMode: (localStorage.getItem('hermesWork.chatFocusMode') || localStorage.getItem('agentConsole.chatFocusMode')) === 'true',
  searchComposing: false,
  draggedWorkspaceId: '',
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
  } else if (options.preserveMessageTopAnchor) {
    restoreMessageTopAnchor(options.messageScrollTop, options.messageScrollHeight);
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
    state.messageLimit = MESSAGE_LOAD_LIMIT;
    render({ restoreBoardScroll: true, boardScrollTop });
    if (state.selectedTaskId) await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop });
  }));
  document.querySelectorAll('[data-workspace-drag]').forEach((el) => {
    el.addEventListener('dragstart', startWorkspaceDrag);
    el.addEventListener('dragover', overWorkspaceDragTarget);
    el.addEventListener('dragleave', leaveWorkspaceDragTarget);
    el.addEventListener('drop', dropWorkspaceDragTarget);
    el.addEventListener('dragend', endWorkspaceDrag);
  });
  document.querySelectorAll('[data-workspace-delete]').forEach((el) => el.addEventListener('click', (event) => {
    event.stopPropagation();
    const deletedId = el.dataset.workspaceDelete;
    const result = deleteUserWorkspace(state.userWorkspaces, deletedId, state.tasks);
    state.userWorkspaces = result.workspaces;
    state.workspaceOrder = state.workspaceOrder.filter((id) => id !== deletedId);
    state.tasks = result.tasks;
    Object.entries(state.taskWorkspaceOverrides).forEach(([taskId, workspaceId]) => {
      if (workspaceId === deletedId) delete state.taskWorkspaceOverrides[taskId];
    });
    if (state.workspaceId === deletedId) state.workspaceId = 'all';
    saveUserWorkspaces();
    saveWorkspaceOrder();
    saveTaskWorkspaceOverrides();
    render({ restoreBoardScroll: true, boardScrollTop: getBoardScrollTop() });
  }));
  document.getElementById('categoryForm')?.addEventListener('submit', createCategory);
  document.getElementById('categoryName')?.addEventListener('input', (event) => {
    state.categoryDraft = event.target.value;
  });
  document.querySelectorAll('[data-status]').forEach((el) => el.addEventListener('click', async () => {
    const boardScrollTop = getBoardScrollTop();
    state.status = el.dataset.status;
    state.selectedTaskId = firstVisibleTaskId();
    state.sessionMessages = [];
    state.messageLimit = MESSAGE_LOAD_LIMIT;
    render({ restoreBoardScroll: true, boardScrollTop });
    if (state.selectedTaskId) await loadSelectedMessages({ restoreBoardScroll: true, boardScrollTop });
  }));
  document.querySelectorAll('[data-task]').forEach((el) => el.addEventListener('click', async () => {
    const boardScrollTop = getBoardScrollTop();
    state.selectedTaskId = el.dataset.task;
    state.sessionMessages = [];
    state.messageLimit = MESSAGE_LOAD_LIMIT;
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
  document.getElementById('messageList')?.addEventListener('scroll', maybeLoadOlderMessages);
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
  document.getElementById('categoryMove')?.addEventListener('change', moveSelectedTaskToCategory);
  document.getElementById('statusMove')?.addEventListener('change', moveSelectedTaskToStatus);
}

function startWorkspaceDrag(event) {
  state.draggedWorkspaceId = event.currentTarget.dataset.workspaceDrag || '';
  event.currentTarget.classList.add('dragging');
  event.dataTransfer?.setData('text/plain', state.draggedWorkspaceId);
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move';
}

function overWorkspaceDragTarget(event) {
  if (!state.draggedWorkspaceId) return;
  const targetId = event.currentTarget.dataset.workspaceDrop;
  if (!targetId || targetId === state.draggedWorkspaceId) return;
  event.preventDefault();
  event.currentTarget.classList.add('drop-target');
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move';
}

function leaveWorkspaceDragTarget(event) {
  event.currentTarget.classList.remove('drop-target');
}

function dropWorkspaceDragTarget(event) {
  event.preventDefault();
  const draggedId = state.draggedWorkspaceId || event.dataTransfer?.getData('text/plain');
  const targetId = event.currentTarget.dataset.workspaceDrop;
  document.querySelectorAll('.workspace-row.drop-target').forEach((el) => el.classList.remove('drop-target'));
  if (!draggedId || !targetId || draggedId === targetId) return;
  state.workspaceOrder = reorderWorkspaceOrder(currentMovableWorkspaceIds(), draggedId, targetId);
  saveWorkspaceOrder();
  render({ restoreBoardScroll: true, boardScrollTop: getBoardScrollTop(), restoreMessageScroll: true, messageScrollTop: getMessageScrollTop() });
}

function endWorkspaceDrag(event) {
  state.draggedWorkspaceId = '';
  event.currentTarget.classList.remove('dragging');
  document.querySelectorAll('.workspace-row.drop-target').forEach((el) => el.classList.remove('drop-target'));
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

function moveSelectedTaskToCategory(event) {
  const taskId = event.currentTarget.dataset.taskCategory;
  const workspaceId = event.currentTarget.value;
  if (!taskId || !workspaceId) return;
  state.taskWorkspaceOverrides[taskId] = workspaceId;
  state.tasks = state.tasks.map((task) => task.id === taskId ? { ...task, workspaceId } : task);
  state.workspaceId = workspaceId;
  saveTaskWorkspaceOverrides();
  render({ restoreBoardScroll: true, boardScrollTop: getBoardScrollTop(), restoreMessageScroll: true, messageScrollTop: getMessageScrollTop() });
}

async function moveSelectedTaskToStatus(event) {
  const taskId = event.currentTarget.dataset.taskStatus;
  const status = event.currentTarget.value;
  if (!taskId) return;
  state.taskStatusOverrides = setStatusOverride(state.taskStatusOverrides, taskId, status);
  saveTaskStatusOverrides();
  const override = state.taskStatusOverrides[taskId];
  if (!override) {
    state.status = 'all';
    await refreshTasks({ force: true });
    return;
  }
  state.tasks = state.tasks.map((task) => task.id === taskId ? { ...task, status: override } : task);
  state.status = override;
  render({ restoreBoardScroll: true, boardScrollTop: getBoardScrollTop(), restoreMessageScroll: true, messageScrollTop: getMessageScrollTop() });
}

function createCategory(event) {
  event.preventDefault();
  const form = event.currentTarget;
  const input = form.querySelector('#categoryName');
  try {
    const result = createUserWorkspace(state.userWorkspaces, input?.value || state.categoryDraft || '');
    state.userWorkspaces = result.workspaces;
    state.workspaceOrder = [...state.workspaceOrder.filter((id) => id !== result.workspace.id), result.workspace.id];
    state.workspaceId = result.workspace.id;
    state.categoryDraft = '';
    input.value = '';
    saveUserWorkspaces();
    saveWorkspaceOrder();
    state.tasks = state.tasks.map(applyTaskOverrides);
    state.selectedTaskId = firstVisibleTaskId();
    state.sessionMessages = [];
    render();
  } catch (error) {
    state.chatState = { ...state.chatState, error: error.message };
    render();
  }
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
  if (!force && shouldSkipRefreshForUserInput()) return;
  refreshInFlight = true;
  const selectedBefore = state.selectedTaskId;
  const previousSelectedTask = state.tasks.find((task) => task.id === selectedBefore);
  const searchCaret = document.activeElement?.id === 'search' ? document.getElementById('search')?.selectionStart : undefined;
  const boardScrollTop = getBoardScrollTop();
  const messageScrollTop = getMessageScrollTop();
  try {
    const nextTasks = (await client().listTasks({ maxPages: force || loadMessages ? 25 : 1 })).map(applyTaskOverrides);
    state.tasks = force || loadMessages ? nextTasks : mergeTasksById(state.tasks, nextTasks);
    state.selectedTaskId = state.tasks.some((task) => task.id === selectedBefore) ? selectedBefore : state.tasks[0]?.id;
    const selectedChanged = state.selectedTaskId !== selectedBefore;
    const nextSelectedTask = state.tasks.find((task) => task.id === state.selectedTaskId);
    const pollLatestMessages = Boolean(state.selectedTaskId && !document.hidden);
    const reloadMessages = pollLatestMessages || shouldReloadSelectedMessages({
      selectedChanged,
      loadMessages,
      previousTask: previousSelectedTask,
      nextTask: nextSelectedTask,
    });
    const messageWasNearBottom = isMessageListNearBottom();
    render({
      restoreSearchFocus: searchCaret !== undefined,
      searchCaret,
      restoreBoardScroll: true,
      boardScrollTop,
      restoreMessageScroll: !selectedChanged,
      messageScrollTop,
    });
    if (state.selectedTaskId && reloadMessages) {
      await loadSelectedMessages({
        restoreBoardScroll: true,
        boardScrollTop,
        restoreMessageScroll: !selectedChanged && !messageWasNearBottom,
        messageScrollTop,
        scrollMessagesToBottom: selectedChanged || messageWasNearBottom,
        silent: !loadMessages && !selectedChanged,
      });
    }
  } finally {
    refreshInFlight = false;
  }
}

async function createNewSession() {
  state.chatState = { ...state.chatState, loading: true, error: '' };
  render();
  try {
    const task = applyTaskOverrides(await client().createSession());
    state.tasks = [task, ...state.tasks.filter((item) => item.id !== task.id)];
    state.selectedTaskId = task.id;
    state.workspaceId = 'all';
    state.status = 'all';
    state.query = '';
    state.sessionMessages = [];
    state.messageLimit = MESSAGE_LOAD_LIMIT;
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
      limit: options.limit || state.messageLimit || MESSAGE_LOAD_LIMIT,
      maxContentChars: MESSAGE_MAX_CONTENT_CHARS,
    });
    state.sessionMessages = fetchedMessages;
    state.chatState = {
      ...state.chatState,
      loading: false,
      error: '',
      totalCount: fetchedMessages.totalCount ?? fetchedMessages.length,
      loadedCount: fetchedMessages.length,
      messageLimit: fetchedMessages.limit ?? options.limit ?? state.messageLimit ?? MESSAGE_LOAD_LIMIT,
    };
    state.messageLimit = fetchedMessages.limit ?? options.limit ?? state.messageLimit ?? MESSAGE_LOAD_LIMIT;
    prunePersistedLocalMessages(state.selectedTaskId, fetchedMessages);
  } catch (error) {
    const fallback = state.tasks.find((task) => task.id === state.selectedTaskId)?.messages || [];
    state.sessionMessages = fallback;
    state.chatState = { ...state.chatState, loading: false, error: `대화내역을 불러오지 못했습니다: ${error.message}` };
  }
  render(options);
}

async function maybeLoadOlderMessages(event) {
  const list = event.currentTarget;
  if (!shouldLazyLoadOlderMessages({
    scrollTop: list.scrollTop,
    loadedCount: state.chatState.loadedCount,
    totalCount: state.chatState.totalCount,
    loading: state.chatState.loading,
  })) return;
  const nextLimit = nextLazyMessageLimit({
    loadedCount: state.chatState.loadedCount,
    totalCount: state.chatState.totalCount,
    currentLimit: state.messageLimit,
    chunkSize: MESSAGE_LAZY_CHUNK_SIZE,
  });
  if (nextLimit <= state.messageLimit) return;
  state.messageLimit = nextLimit;
  await loadSelectedMessages({
    limit: nextLimit,
    silent: true,
    preserveMessageTopAnchor: true,
    messageScrollTop: list.scrollTop,
    messageScrollHeight: list.scrollHeight,
    restoreBoardScroll: true,
    boardScrollTop: getBoardScrollTop(),
  });
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

function applyTaskOverrides(task) {
  const override = state.taskWorkspaceOverrides[task.id];
  const matchedUserWorkspace = override ? undefined : matchUserWorkspaceForTask(task, state.userWorkspaces);
  const statusOverride = state.taskStatusOverrides[task.id];
  return {
    ...task,
    ...(matchedUserWorkspace ? { workspaceId: matchedUserWorkspace } : {}),
    ...(override ? { workspaceId: override } : {}),
    ...(statusOverride ? { status: statusOverride } : {}),
  };
}

function mergeTasksById(currentTasks, refreshedTasks) {
  const byId = new Map(currentTasks.map((task) => [task.id, task]));
  refreshedTasks.forEach((task) => byId.set(task.id, task));
  return [...byId.values()].sort((left, right) => Date.parse(right.updatedAt) - Date.parse(left.updatedAt));
}

function readUserWorkspaces() {
  try {
    return normalizeUserWorkspaces(JSON.parse(localStorage.getItem('hermesWork.userWorkspaces') || '[]'));
  } catch {
    return [];
  }
}

function saveUserWorkspaces() {
  localStorage.setItem('hermesWork.userWorkspaces', JSON.stringify(normalizeUserWorkspaces(state.userWorkspaces)));
}

function readWorkspaceOrder() {
  try {
    const value = JSON.parse(localStorage.getItem('hermesWork.workspaceOrder') || '[]');
    return Array.isArray(value) ? value.map((id) => String(id)).filter(Boolean) : [];
  } catch {
    return [];
  }
}

function saveWorkspaceOrder() {
  localStorage.setItem('hermesWork.workspaceOrder', JSON.stringify(state.workspaceOrder));
}

function readTaskWorkspaceOverrides() {
  try {
    const value = JSON.parse(localStorage.getItem('hermesWork.taskWorkspaceOverrides') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function saveTaskWorkspaceOverrides() {
  localStorage.setItem('hermesWork.taskWorkspaceOverrides', JSON.stringify(state.taskWorkspaceOverrides));
}

function readTaskStatusOverrides() {
  try {
    const value = JSON.parse(localStorage.getItem('hermesWork.taskStatusOverrides') || '{}');
    return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
  } catch {
    return {};
  }
}

function saveTaskStatusOverrides() {
  localStorage.setItem('hermesWork.taskStatusOverrides', JSON.stringify(state.taskStatusOverrides));
}

function getMessageScrollTop() {
  return document.getElementById('messageList')?.scrollTop ?? 0;
}

function isMessageListNearBottom(thresholdPx = 80) {
  const list = document.getElementById('messageList');
  if (!list) return true;
  return list.scrollHeight - list.scrollTop - list.clientHeight <= thresholdPx;
}

function restoreMessageScroll(scrollTop = 0) {
  const list = document.getElementById('messageList');
  if (list) list.scrollTop = Math.min(scrollTop, list.scrollHeight);
}

function restoreMessageTopAnchor(previousScrollTop = 0, previousScrollHeight = 0) {
  const list = document.getElementById('messageList');
  if (!list) return;
  const addedHeight = Math.max(0, list.scrollHeight - Number(previousScrollHeight || 0));
  list.scrollTop = Number(previousScrollTop || 0) + addedHeight;
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

function currentMovableWorkspaceIds() {
  return buildWorkspaceList(state.tasks, state.userWorkspaces, state.workspaceOrder)
    .filter((workspace) => workspace.custom || workspace.auto)
    .map((workspace) => workspace.id);
}

function shouldSkipRefreshForUserInput() {
  const activeId = document.activeElement?.id;
  return Boolean(
    document.hidden
      || state.searchComposing
      || activeId === 'categoryName'
      || activeId === 'categoryMove'
      || activeId === 'statusMove'
  );
}

function restoreBoardScroll(scrollTop = 0) {
  const board = document.querySelector('.board');
  if (board) board.scrollTop = scrollTop;
}

await loadServerConfig();
render();
bindGlobalRefreshControls();
refreshTasks({ force: true, loadMessages: true });
