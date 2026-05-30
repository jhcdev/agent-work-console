import http from 'node:http';
import { createReadStream, existsSync, statSync } from 'node:fs';
import { join, extname } from 'node:path';

const root = process.argv[2] || '.';
const port = Number(process.argv[3] || 5173);
const base = join(process.cwd(), root);
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json' };

http.createServer((req, res) => {
  const pathname = decodeURIComponent(new URL(req.url, `http://localhost:${port}`).pathname);
  let file = join(base, pathname === '/' ? 'index.html' : pathname.replace(/^\//, ''));
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(base, 'index.html');
  res.setHeader('Content-Type', types[extname(file)] || 'application/octet-stream');
  createReadStream(file).pipe(res);
}).listen(port, '0.0.0.0', () => console.log(`Agent Work Console on http://127.0.0.1:${port}`));
