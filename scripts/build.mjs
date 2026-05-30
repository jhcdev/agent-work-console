import { mkdir, rm, cp, readFile, writeFile } from 'node:fs/promises';
import { dirname, join } from 'node:path';

const root = new URL('..', import.meta.url).pathname;
const dist = join(root, 'dist');
await rm(dist, { recursive: true, force: true });
await mkdir(dist, { recursive: true });
await cp(join(root, 'src'), join(dist, 'src'), { recursive: true });
await cp(join(root, 'public'), dist, { recursive: true });
let html = await readFile(join(root, 'index.html'), 'utf8');
html = html
  .replace('/src/main.mjs', './src/main.mjs')
  .replace('/src/styles.css', './src/styles.css')
  .replace('/manifest.webmanifest', './manifest.webmanifest');
await writeFile(join(dist, 'index.html'), html);
console.log(`Built ${dist}`);
