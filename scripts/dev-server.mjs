import http from 'node:http';
import https from 'node:https';
import { createReadStream, existsSync, readFileSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = process.argv[2] || '.';
const port = Number(process.argv[3] || 5173);
const base = join(process.cwd(), root);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

export function parseDotEnv(text) {
  return Object.fromEntries(text.split(/\r?\n/).flatMap((line) => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#') || !trimmed.includes('=')) return [];
    const [key, ...rest] = trimmed.split('=');
    let value = rest.join('=').trim();
    if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
    return [[key.trim(), value]];
  }));
}

export function loadHermesEnv(envPath = process.env.HERMES_ENV_PATH || '/home/ml/.hermes/.env') {
  if (!existsSync(envPath)) return {};
  return parseDotEnv(readFileSync(envPath, 'utf8'));
}

export function buildHermesTarget(env = process.env, hermesEnv = loadHermesEnv()) {
  if (env.HERMES_API_TARGET) return env.HERMES_API_TARGET;
  const host = env.API_SERVER_HOST || hermesEnv.API_SERVER_HOST || '127.0.0.1';
  const portValue = env.API_SERVER_PORT || hermesEnv.API_SERVER_PORT || '8642';
  const connectHost = ['0.0.0.0', '::', '[::]'].includes(host) ? '127.0.0.1' : host;
  return `http://${connectHost}:${portValue}`;
}

export function buildProxyHeaders(reqHeaders, target, env = process.env, hermesEnv = loadHermesEnv()) {
  const headers = { ...reqHeaders, host: target.host };
  return headers;
}

const hermesEnv = loadHermesEnv();
const hermesTarget = buildHermesTarget(process.env, hermesEnv);

function proxyHermes(req, res, pathname) {
  const target = new URL(pathname.replace(/^\/hermes/, '') + (new URL(req.url, `http://localhost:${port}`).search || ''), hermesTarget);
  const headers = buildProxyHeaders(req.headers, target, process.env, hermesEnv);
  const transport = target.protocol === 'https:' ? https : http;
  const proxyReq = transport.request(target, { method: req.method, headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hermes proxy failed', message: error.message }));
  });
  req.pipe(proxyReq);
}

function serveConfig(res) {
  res.writeHead(200, { 'content-type': 'application/json' });
  res.end(JSON.stringify({ baseUrl: '/hermes', sessionKey: 'web:jihun:agent-console' }));
}

export function createServer() {
  return http.createServer((req, res) => {
    const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
    if (pathname === '/agent-console/config') return serveConfig(res);
    if (pathname === '/hermes' || pathname.startsWith('/hermes/')) return proxyHermes(req, res, pathname);
    let file = join(base, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
    if (!existsSync(file) || statSync(file).isDirectory()) file = join(base, 'index.html');
    res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
    createReadStream(file).pipe(res);
  });
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) {
  createServer().listen(port, '0.0.0.0', () => {
    console.log(`Agent Work Console on http://127.0.0.1:${port} (Hermes proxy: /hermes -> ${hermesTarget})`);
  });
}
