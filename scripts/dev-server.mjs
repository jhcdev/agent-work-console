import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] || '.';
const port = Number(process.argv[3] || 5173);
const base = join(process.cwd(), root);
const hermesTarget = process.env.HERMES_API_TARGET || 'http://127.0.0.1:8642';
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

function proxyHermes(req, res, pathname) {
  const target = new URL(pathname.replace(/^\/hermes/, '') + (new URL(req.url, `http://localhost:${port}`).search || ''), hermesTarget);
  const headers = { ...req.headers, host: target.host };
  const proxyReq = http.request(target, { method: req.method, headers }, (proxyRes) => {
    res.writeHead(proxyRes.statusCode || 502, proxyRes.headers);
    proxyRes.pipe(res);
  });
  proxyReq.on('error', (error) => {
    res.writeHead(502, { 'content-type': 'application/json' });
    res.end(JSON.stringify({ error: 'Hermes proxy failed', message: error.message }));
  });
  req.pipe(proxyReq);
}

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  if (pathname === '/hermes' || pathname.startsWith('/hermes/')) return proxyHermes(req, res, pathname);
  let file = join(base, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(base, 'index.html');
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(port, '0.0.0.0', () => console.log(`Agent Work Console on http://127.0.0.1:${port} (Hermes proxy: /hermes -> ${hermesTarget})`));
