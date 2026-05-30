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

  assert.equal(calls[0][0], 'http://localhost:8642/api/sessions');
  assert.equal(calls[0][1].headers.Authorization, 'Bearer secret');
  assert.equal(calls[0][1].headers['X-Hermes-Session-Key'], 'web:jihun');
});

test('returns mock tasks when API call fails and fallback is enabled', async () => {
  const fetcher = async () => { throw new Error('offline'); };
  const client = new HermesApiClient({ baseUrl: 'http://localhost:8642', apiKey: 'secret', sessionKey: 'web:jihun', useMockFallback: true }, fetcher);

  const tasks = await client.listTasks();

  assert.ok(tasks.length > 0);
  assert.ok(tasks[0].title);
});
