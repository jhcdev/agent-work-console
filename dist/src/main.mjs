import { mockTasks } from './mocks/mockData.mjs';
import { createAppMarkup } from './ui/renderApp.mjs';
import { HermesApiClient, readConnectionConfig, saveConnectionConfig } from './services/hermesApi.mjs';

const state = { tasks: mockTasks, selectedTaskId: mockTasks[0].id, workspaceId: 'all', status: 'all', query: '' };
const root = document.getElementById('root');

function render() {
  root.innerHTML = createAppMarkup(state);
  bind();
}

function bind() {
  document.querySelectorAll('[data-workspace]').forEach((el) => el.addEventListener('click', () => { state.workspaceId = el.dataset.workspace; state.selectedTaskId = undefined; render(); }));
  document.querySelectorAll('[data-status]').forEach((el) => el.addEventListener('click', () => { state.status = el.dataset.status; state.selectedTaskId = undefined; render(); }));
  document.querySelectorAll('[data-task]').forEach((el) => el.addEventListener('click', () => { state.selectedTaskId = el.dataset.task; render(); }));
  document.getElementById('search')?.addEventListener('input', (event) => { state.query = event.target.value; render(); });
  document.getElementById('saveConfig')?.addEventListener('click', () => {
    saveConnectionConfig({ baseUrl: document.getElementById('baseUrl').value, apiKey: document.getElementById('apiKey').value, sessionKey: document.getElementById('sessionKey').value, useMockFallback: true });
    alert('Hermes 연결 설정을 저장했습니다.');
  });
  document.getElementById('refreshTasks')?.addEventListener('click', refreshTasks);
}

async function refreshTasks() {
  const config = { baseUrl: document.getElementById('baseUrl')?.value, apiKey: document.getElementById('apiKey')?.value, sessionKey: document.getElementById('sessionKey')?.value, useMockFallback: true, ...readConnectionConfig() };
  const client = new HermesApiClient(config);
  state.tasks = await client.listTasks();
  state.selectedTaskId = state.tasks[0]?.id;
  render();
}

render();
