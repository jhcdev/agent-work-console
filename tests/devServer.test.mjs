import test from 'node:test';
import assert from 'node:assert/strict';
import { buildHermesTarget, buildProxyHeaders, parseDotEnv } from '../scripts/dev-server.mjs';

test('parses Hermes .env values used for gateway location only', () => {
  assert.deepEqual(parseDotEnv('API_SERVER_KEY=abc123\nAPI_SERVER_HOST=0.0.0.0\n# ignored\nAPI_SERVER_PORT="8642"'), {
    API_SERVER_KEY: 'abc123',
    API_SERVER_HOST: '0.0.0.0',
    API_SERVER_PORT: '8642',
  });
});

test('builds Hermes target from API_SERVER_HOST and API_SERVER_PORT', () => {
  assert.equal(buildHermesTarget({}, { API_SERVER_HOST: '0.0.0.0', API_SERVER_PORT: '8642' }), 'http://127.0.0.1:8642');
  assert.equal(buildHermesTarget({ HERMES_API_TARGET: 'http://10.0.0.2:9000' }, {}), 'http://10.0.0.2:9000');
});

test('does not inject server .env API key into proxied Hermes requests', () => {
  const target = new URL('http://127.0.0.1:8642/api/sessions');
  const headers = buildProxyHeaders({ accept: 'application/json' }, target, {}, { API_SERVER_KEY: 'server-secret' });
  assert.equal(headers.Authorization, undefined);
  assert.equal(headers.authorization, undefined);
  assert.equal(headers.host, '127.0.0.1:8642');
});

test('does not override browser-provided Authorization header', () => {
  const target = new URL('http://127.0.0.1:8642/api/sessions');
  const headers = buildProxyHeaders({ authorization: 'Bearer browser-secret' }, target, {}, { API_SERVER_KEY: 'server-secret' });
  assert.equal(headers.authorization, 'Bearer browser-secret');
  assert.equal(headers.Authorization, undefined);
});
