import test from 'node:test';
import assert from 'node:assert/strict';
import { HermesApiClient } from '../src/services/hermesApi.mjs';

test('sends bearer auth and session key when listing sessions', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    return new Response(JSON.stringify({ sessions: [] }), { status: 200 });
  };
  const client = new HermesApiClient({ baseUrl: 'http://localhost:8642', apiKey: 'secret', sessionKey: 'web:jihun' }, fetcher);

  await client.listSessions();

  assert.equal(calls[0][0], 'http://localhost:8642/api/sessions?limit=200&offset=0');
  assert.equal(calls[0][1].cache, 'no-store');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer secret');
  assert.equal(calls[0][1].headers['X-Hermes-Session-Key'], 'web:jihun');
});

test('paginates the full session list instead of stopping after five pages', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    const offset = Number(new URL(url, 'http://example.test').searchParams.get('offset'));
    return new Response(JSON.stringify({
      object: 'list',
      data: [0, 1].map((index) => ({
        id: `session-${offset + index}`,
        source: 'api_server',
        message_count: 0,
        updated_at: 1780000000 + offset + index,
      })),
      has_more: true,
    }), { status: 200 });
  };
  const client = new HermesApiClient({ baseUrl: '/hermes', sessionKey: 'web:jihun', useMockFallback: false }, fetcher);

  const sessions = await client.listSessions({ limit: 200 });

  assert.equal(calls.length, 25);
  assert.equal(calls.at(-1)[0], '/hermes/api/sessions?limit=200&offset=48');
  assert.equal(sessions.data.length, 50);
  assert.equal(sessions.has_more, true);
});

test('returns mock tasks when API call fails and fallback is enabled', async () => {
  const fetcher = async () => { throw new Error('offline'); };
  const client = new HermesApiClient({ baseUrl: 'http://localhost:8642', apiKey: 'secret', sessionKey: 'web:jihun', useMockFallback: true }, fetcher);

  const tasks = await client.listTasks();

  assert.ok(tasks.length > 0);
  assert.ok(tasks[0].title);
});

test('maps useful Hermes sessions including active gateway rows to newest-first task cards', async () => {
  const fetcher = async () => new Response(JSON.stringify({
    object: 'list',
    data: [
      { id: 'empty-cron', source: 'cron', message_count: 0, preview: '', started_at: 1780000000 },
      { id: 'scheduled-cron', source: 'cron', message_count: 32, preview: 'scheduled task', started_at: 1780000001 },
      { id: 'empty-discord', source: 'discord', title: '빈 세션', message_count: 0, preview: '', started_at: 1780000002 },
      { id: 'active-discord', source: 'discord', title: '게이트웨이 실행 세션', message_count: 0, preview: '', api_call_count: 7, tool_call_count: 2, last_active: 1780000005 },
      { id: 'chat-session', source: 'discord', title: '실제 작업 세션', message_count: 4, preview: '작업 이어서', updated_at: 1780000003 },
      { id: 'new-api-session', source: 'api_server', title: '새 API 세션', message_count: 0, updated_at: 1780000004 },
    ],
  }), { status: 200 });
  const client = new HermesApiClient({ baseUrl: '/hermes', sessionKey: 'web:jihun', useMockFallback: false }, fetcher);

  const tasks = await client.listTasks();

  assert.deepEqual(tasks.map((task) => task.id), ['active-discord', 'new-api-session', 'chat-session']);
  assert.equal(tasks[0].messageCount, 0);
  assert.equal(tasks[0].updatedAt, '2026-05-28T20:26:45.000Z');
  assert.equal(tasks[1].messageCount, 0);
  assert.equal(tasks[2].messageCount, 4);
});

test('creates a new Hermes session and maps the response to a task', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    return new Response(JSON.stringify({
      object: 'hermes.session',
      session: { id: 'api_123_new', source: 'api_server', title: '새 작업', message_count: 0, started_at: 1780000000 },
    }), { status: 201 });
  };
  const client = new HermesApiClient({ baseUrl: '/hermes', sessionKey: 'web:jihun' }, fetcher);

  const task = await client.createSession({ title: '새 작업' });

  assert.equal(calls[0][0], '/hermes/api/sessions');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(JSON.parse(calls[0][1].body).title, '새 작업');
  assert.equal(calls[0][1].headers['X-Hermes-Session-Key'], 'web:jihun');
  assert.equal(task.id, 'api_123_new');
  assert.equal(task.title, '새 작업');
  assert.equal(task.messageCount, 0);
});

test('normalizes persisted session messages for the chat panel', async () => {
  const fetcher = async () => new Response(JSON.stringify({
    object: 'list',
    data: [
      { id: 1, role: 'user', content: 'hello', timestamp: 1780000000 },
      { id: 2, role: 'assistant', content: '', tool_calls: [{ function: { name: 'read_file' } }], timestamp: 1780000001 },
      { id: 3, role: 'tool', content: 'tool output', tool_name: 'read_file', timestamp: 1780000002 },
    ],
  }), { status: 200 });
  const client = new HermesApiClient({ baseUrl: '/hermes', sessionKey: 'web:jihun' }, fetcher);

  const messages = await client.listMessages('session-1');

  assert.deepEqual(messages.map((message) => message.role), ['user', 'assistant', 'tool']);
  assert.equal(messages[0].text, 'hello');
  assert.equal(messages[1].text, 'tool call: read_file');
  assert.equal(messages[2].text, 'tool output');
  assert.match(messages[0].at, /T/);
});

test('posts chat prompts to a persisted Hermes session', async () => {
  const calls = [];
  const fetcher = async (url, init) => {
    calls.push([url, init]);
    return new Response(JSON.stringify({ ok: true }), { status: 200 });
  };
  const client = new HermesApiClient({ baseUrl: '/hermes', sessionKey: 'web:jihun' }, fetcher);

  await client.sendChat('session-1', '계속 진행해줘');

  assert.equal(calls[0][0], '/hermes/api/sessions/session-1/chat');
  assert.equal(calls[0][1].method, 'POST');
  assert.equal(JSON.parse(calls[0][1].body).message, '계속 진행해줘');
  assert.equal(calls[0][1].headers['X-Hermes-Session-Key'], 'web:jihun');
});
