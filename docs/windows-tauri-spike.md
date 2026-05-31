# Windows Tauri Shell Spike

> **Verdict:** PARTIAL / validated for scaffold and Rust-level compilation in WSL; Windows installer smoke still requires a Windows host or CI runner.

## Question

Given the current zero-dependency Web/PWA Hermes Work, can we wrap the existing `dist` output in a Tauri v2 desktop shell without replacing the web workflow?

## Approach

- Add `src-tauri/` with a minimal Tauri v2 Rust app.
- Keep the current web commands unchanged: `npm test`, `npm run build`, `npm run dev`.
- Add desktop commands:
  - `npm run desktop` → `cargo tauri dev --manifest-path src-tauri/Cargo.toml`
  - `npm run desktop:build` → `cargo tauri build --manifest-path src-tauri/Cargo.toml`
- Configure Tauri to use:
  - dev URL: `http://127.0.0.1:5173`
  - production frontend dist: `../dist`
- Add a tray menu proof point with Korean labels: `Hermes Work 열기`, `종료`.
- Add desktop icon assets required by Tauri.

## Implemented files

```text
src-tauri/Cargo.toml
src-tauri/build.rs
src-tauri/tauri.conf.json
src-tauri/src/main.rs
src-tauri/src/lib.rs
src-tauri/icons/*
tests/platformConfig.test.mjs
```

## Verification performed

```bash
npm test
npm run build
cargo check --manifest-path src-tauri/Cargo.toml
cargo build --manifest-path src-tauri/Cargo.toml
```

Result:

- `npm test` passed: 18/18.
- `npm run build` produced `dist`.
- `cargo check` passed after adding required Tauri icon assets.
- `cargo build` passed in WSL Linux target.

## Environment notes

Initial `cargo check` failed because WSL lacked native Linux packages required by Tauri/WebKitGTK:

```text
Package 'dbus-1', required by 'virtual:world', not found
```

Installed packages to unblock WSL compilation:

```bash
sudo apt-get install -y \
  pkg-config \
  libdbus-1-dev \
  libwebkit2gtk-4.1-dev \
  libayatana-appindicator3-dev \
  librsvg2-dev \
  libssl-dev
```

`apt-get update` also reported a NodeSource certificate warning, but Ubuntu package installation continued using the normal Ubuntu repositories.

## What worked

- Existing Web/PWA workflow stayed intact.
- Tauri v2 config can wrap the existing `dist` rather than introducing a bundler.
- Rust shell compiles on WSL once native dependencies are installed.
- Tray/menu proof point compiles, so Windows tray/desktop companion UX remains feasible.
- Icon asset regression is now covered by `tests/platformConfig.test.mjs`.

## What did not get fully validated yet

- `cargo tauri build` installer output was not produced because `cargo-tauri` CLI is not installed in this environment.
- A real Windows `.exe`/MSI smoke was not run from WSL. For product validation, run the desktop build on a Windows host or Windows CI runner.
- Notification and deep-link APIs are not wired yet; only the shell/tray foundation exists.
- Hermes gateway chat smoke was already validated in the web shell, but not inside a native Tauri window.

## Recommendation for the real build

1. Keep Tauri v2 as the Windows shell path.
2. Next Windows-specific task: install/use Tauri CLI on a Windows host and produce a portable/bundled artifact.
3. Add a small Tauri command layer only where native behavior is required: notifications, tray badge/status, deep links, local gateway discovery.
4. Keep `src/domain` and `src/services` platform-neutral so Android/iOS Capacitor can reuse the same session/task core.
5. Add CI matrix later:
   - Node tests/build on Linux.
   - `cargo check` on Linux.
   - Tauri bundle smoke on Windows.
