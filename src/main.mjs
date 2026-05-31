import { mockTasks } from './mocks/mockData.mjs';
import { createAppMarkup } from './ui/renderApp.mjs';
import { HermesApiClient, readConnectionConfig, saveConnectionConfig } from './services/hermesApi.mjs';

const state = { tasks: mockTasks, selectedTaskId: mockTasks[0].id, workspaceId: 'all', status: 'all', query: '', connection: { baseUrl: '/hermes', sessionKey: 'web:jihun:agent-console' } };
const root = document.getElementById('root');

function mergedConnectionConfig() {
  return { ...state.connection, ...readConnectionConfig() };
}

function render() {
  root.innerHTML = createAppMarkup({ ...state, connection: mergedConnectionConfig() });
  bind();
}

function bind() {
  document.querySelectorAll('[data-workspace]').forEach((el) => el.addEventListener('click', () => { state.workspaceId = el.dataset.workspace; state.selectedTaskId = undefined; render(); }));
  document.querySelectorAll('[data-status]').forEach((el) => el.addEventListener('click', () => { state.status = el.dataset.status; state.selectedTaskId = undefined; render(); }));
  document.querySelectorAll('[data-task]').forEach((el) => el.addEventListener('click', () => { state.selectedTaskId = el.dataset.task; render(); }));
  document.getElementById('search')?.addEventListener('input', (event) => { state.query = event.target.value; render(); });
  document.getElementById('saveConfig')?.addEventListener('click', () => {
    saveConnectionConfig({ baseUrl: document.getElementById('baseUrl').value, apiKey: document.getElementById('apiKey').value, sessionKey: document.getElementById('sessionKey').value, useMockFallback: true });
    alert('Hermes 연결 설정을 저장했습니다. 기본값은 현재 실행 중인 Hermes gateway 프록시(/hermes)를 사용합니다.');
  });
  document.getElementById('refreshTasks')?.addEventListener('click', refreshTasks);
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
  const formConfig = { baseUrl: document.getElementById('baseUrl')?.value, apiKey: document.getElementById('apiKey')?.value, sessionKey: document.getElementById('sessionKey')?.value, useMockFallback: true };
  const client = new HermesApiClient({ ...state.connection, ...readConnectionConfig(), ...formConfig });
  state.tasks = await client.listTasks();
  state.selectedTaskId = state.tasks[0]?.id;
  render();
}

await loadServerConfig();
render();
refreshTasks();
