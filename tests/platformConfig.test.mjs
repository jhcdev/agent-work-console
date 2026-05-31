import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
}

test('package exposes desktop shell scripts without replacing web workflow', async () => {
  const pkg = await readJson('package.json');

  assert.equal(pkg.scripts.build, 'node scripts/build.mjs');
  assert.equal(pkg.scripts.test, 'node --test tests/*.test.mjs');
  assert.equal(pkg.scripts.desktop, 'cargo tauri dev --manifest-path src-tauri/Cargo.toml');
  assert.equal(pkg.scripts['desktop:build'], 'cargo tauri build --manifest-path src-tauri/Cargo.toml');
});

test('Tauri config wraps the existing web dist and dev server', async () => {
  const config = await readJson('src-tauri/tauri.conf.json');

  assert.equal(config.identifier, 'dev.jhc.agent-work-console');
  assert.equal(config.build.devUrl, 'http://127.0.0.1:5173');
  assert.equal(config.build.frontendDist, '../dist');
  assert.equal(config.build.beforeDevCommand, 'npm run dev');
  assert.equal(config.build.beforeBuildCommand, 'npm run build');
  assert.equal(config.app.windows[0].title, 'Agent Work Console');
  assert.ok(config.app.windows[0].width >= 1200);
});

test('Tauri Cargo manifest uses v2 runtime crates', async () => {
  const manifest = await readFile(new URL('src-tauri/Cargo.toml', root), 'utf8');

  assert.match(manifest, /name = "agent-work-console-app"/);
  assert.match(manifest, /tauri = \{ version = "2"/);
  assert.match(manifest, /tauri-build = \{ version = "2"/);
});

test('Tauri shell has required desktop icon assets', async () => {
  const requiredIcons = ['icon.png', 'icon.ico', '32x32.png', '128x128.png', '256x256.png', '512x512.png'];

  await Promise.all(
    requiredIcons.map(async (name) => {
      const icon = await readFile(new URL(`src-tauri/icons/${name}`, root));
      assert.ok(icon.byteLength > 0, `${name} should not be empty`);
    }),
  );
});
