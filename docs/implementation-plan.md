# Agent Work Console Implementation Plan

> **For Hermes:** This plan covers the current Web/PWA MVP. The product-level cross-platform requirement is broader: Windows, Android, and iOS installation targets are tracked in `docs/platform-app-plan.md`.

**Goal:** Build the first working Agent Work Console core that tracks AI-agent sessions, conversations, execution logs, approvals, and results by task.

**Architecture:** A zero-dependency static ES-module web app for the first MVP, with platform-neutral domain/API modules that can later be reused by native shells. The UI is session-first: workspace sidebar, session board, selected session chat panel. The app uses a Hermes API client for real `/api/sessions`, `/api/sessions/{id}/messages`, and `/api/sessions/{id}/chat` integration, with mock data fallback for offline development.

**Tech Stack:** Native ES modules, Node `node:test`, CSS custom properties, PWA manifest, zero-dependency static dev server with Hermes gateway proxy.

---

## Acceptance Criteria

1. Runs on desktop and mobile browser with responsive layout.
2. Shows workspace/session list grouped by status: running, waiting approval, failed, done.
3. Shows selected session detail with persisted conversation and prompt input.
4. Can create a new Hermes session from the UI and immediately continue chat in it.
5. Connects through the existing Hermes gateway proxy without exposing `API_SERVER_KEY` in the UI or dev server.
6. Filters cron/no-message noise while preserving fresh `api_server` sessions.
7. Can operate with mock fallback when Hermes API Server is unavailable.
8. Includes tests for status derivation, task filtering, API client behavior, session creation, and rendering smoke checks.
9. `npm test` and `npm run build` pass.

## Product-level Platform Requirement

Current MVP is not the full meaning of “cross-platform”. Final product must support:

- Web/PWA for quick access and internal testing.
- Windows desktop app, likely Tauri v2 first, for tray/notifications/local companion use.
- Android app, likely Capacitor first, for mobile session control, push, secure storage, share intent.
- iOS app, likely Capacitor first, for mobile session control, APNs/share sheet, keychain storage.

See `docs/platform-app-plan.md` for phased implementation.

## MVP Tasks Completed

### Task 1: Project scaffolding
Create package, static PWA manifest, HTML shell, zero-dependency dev server and build script.

### Task 2: Domain model and test-first helpers
Create task/session helpers for filtering, status counts, and timestamp formatting.

### Task 3: Hermes API client
Create a small client that fetches sessions/messages, sends chat requests, creates sessions, and falls back to mock data. Test fetch headers and fallback behavior.

### Task 4: Lean session UI
Create workspace sidebar, session board, selected-session chat panel, refresh and new-session actions with Linear-inspired dark dashboard styling.

### Task 5: Verification
Run unit tests, build, live Hermes proxy smoke, and local browser smoke.

## Next Platform Tasks

### Task 6: Shared core boundary
Split `src/domain` and `src/services` into platform-neutral modules with storage/config adapter interfaces.

### Task 7: Windows shell spike
Add a Tauri v2 wrapper around the built web app and verify local gateway connection, tray, notification, and deep link feasibility.

Status: initial scaffold complete. `src-tauri/` wraps the existing web app, tray proof point compiles, and `cargo check`/`cargo build` pass on WSL Linux target. See `docs/windows-tauri-spike.md` for the evidence and remaining Windows-host validation.

### Task 8: Mobile shell spike
Add a Capacitor wrapper and verify Android debug build plus iOS project/simulator generation.

### Task 9: Mobile UX pass
Make session board/chat panel comfortable on phone dimensions: compact list, persistent input, safe-area handling, platform navigation.
