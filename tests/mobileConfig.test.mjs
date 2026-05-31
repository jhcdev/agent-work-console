import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);

async function readJson(relativePath) {
  return JSON.parse(await readFile(new URL(relativePath, root), 'utf8'));
}

test('package exposes optional Capacitor mobile shell scripts', async () => {
  const pkg = await readJson('package.json');

  assert.equal(pkg.scripts.mobile, 'npx cap sync');
  assert.equal(pkg.scripts['mobile:android'], 'npx cap open android');
  assert.equal(pkg.scripts['mobile:ios'], 'npx cap open ios');
  assert.equal(pkg.scripts['mobile:doctor'], 'npx cap doctor');
});

test('Capacitor config wraps the existing web dist for Android and iOS shells', async () => {
  const config = await readJson('capacitor.config.json');

  assert.equal(config.appId, 'dev.jhc.agentworkconsole');
  assert.equal(config.appName, 'Agent Work Console');
  assert.equal(config.webDir, 'dist');
  assert.equal(config.server.androidScheme, 'https');
  assert.equal(config.server.iosScheme, 'https');
  assert.equal(config.plugins.SplashScreen.launchAutoHide, true);
});

test('mobile shell documents platform-specific validation state', async () => {
  const doc = await readFile(new URL('docs/mobile-capacitor-spike.md', root), 'utf8');

  assert.match(doc, /Android\/iOS Capacitor Shell Spike/);
  assert.match(doc, /npm test/);
  assert.match(doc, /npm run build/);
  assert.match(doc, /Android/);
  assert.match(doc, /iOS/);
});
