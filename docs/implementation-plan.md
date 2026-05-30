# Agent Work Console Implementation Plan

> **For Hermes:** This plan scopes a working MVP that can run on mobile and PC as a PWA and connect to Hermes API Server.

**Goal:** Build a cross-platform Agent Work Console that tracks AI-agent tasks, conversations, execution logs, approvals, and results by task.

**Architecture:** A Vite + React + TypeScript PWA. The UI is task-first: workspace sidebar, task board, task detail timeline, log/artifact/approval panels. The app uses a typed Hermes API client for real `/api/sessions`, `/api/sessions/{id}/messages`, and `/api/sessions/{id}/chat/stream` integration, with mock data fallback for offline development.

**Tech Stack:** React 18, TypeScript, Vite, Vitest, Testing Library, CSS custom properties, PWA manifest.

---

## Acceptance Criteria

1. Runs on desktop and mobile browser with responsive layout.
2. Shows workspace/task list grouped by status: running, waiting approval, failed, done.
3. Shows task detail with conversation, execution logs, approvals, and artifacts.
4. Provides Hermes API connection settings: base URL, API key, session key.
5. Can operate with mock fallback when Hermes API Server is unavailable.
6. Includes tests for status derivation, task filtering, API client behavior, and rendering smoke checks.
7. `npm test` and `npm run build` pass.

## MVP Tasks

### Task 1: Project scaffolding
Create package, TypeScript, Vite, Vitest, static PWA manifest and HTML shell.

### Task 2: Domain model and test-first helpers
Create typed models for AgentTask, AgentMessage, ExecutionLog, Approval, Artifact. Add tested helper functions for filtering, status counts, and timestamp formatting.

### Task 3: Hermes API client
Create a small client that fetches sessions/messages, sends chat requests, and falls back to mock data. Test fetch headers and fallback behavior.

### Task 4: React UI
Create App, WorkspaceSidebar, TaskBoard, TaskDetail, ConnectionPanel components with Linear-inspired dark dashboard styling.

### Task 5: Verification
Run unit tests, build, and a local browser smoke test if possible.
