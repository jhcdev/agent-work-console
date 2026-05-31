# Hermes Work Platform App Plan

> **For Hermes:** 이 문서는 Hermes Work을 단순 웹/PWA가 아니라 Windows, Android, iOS 설치형 앱까지 포함하는 제품으로 전환하기 위한 플랫폼 전략이다.

**Goal:** 하나의 Hermes session/task core를 공유하면서 Windows, Android, iOS 각각에 맞는 설치형 Hermes Work을 제공한다.

**Architecture:** 현재 정적 웹 앱은 공통 UI/도메인/API 코어의 첫 구현체로 유지한다. 다음 단계는 `src/domain`, `src/services`, `src/ui`를 플랫폼 중립 패키지로 정리하고, 각 플랫폼 shell이 같은 Hermes API client와 session/chat 모델을 재사용하게 만든다.

**Tech Stack 후보:**
- Web/PWA: 현재 zero-dependency MJS 앱 유지. 빠른 검증, 내부 배포, 브라우저 smoke 기준.
- Windows: Tauri v2 또는 Electron. 우선순위는 Tauri v2 — 가볍고 Windows tray/notification/deep-link/local proxy 연동에 유리.
- Android/iOS: Capacitor 또는 React Native. 우선순위는 Capacitor — 현재 웹 UI를 최대한 재사용하면서 native notification, deep link, secure storage, share target을 붙이기 쉽다.
- 공통 backend: Hermes API Server `/api/sessions`, `/api/sessions/{id}/messages`, `/api/sessions/{id}/chat`, `/api/jobs`, `/v1/runs`.

---

## Product Requirement

“크로스 플랫폼”은 웹에서 반응형으로 보이는 것만 의미하지 않는다. 목표 지원 범위는 다음 네 가지다.

1. **Web/PWA** — 브라우저/내부 테스트/빠른 배포용.
2. **Windows desktop app** — 항상 켜두는 작업 콘솔, tray, 알림, local Hermes gateway companion.
3. **Android app** — 모바일에서 세션 확인, 새 프롬프트 입력, push 알림, 공유 intent.
4. **iOS app** — 모바일에서 세션 확인, 새 프롬프트 입력, push 알림, 공유 sheet.

## Platform-specific UX

### Windows
- 시스템 트레이에서 running/waiting/failed count 표시.
- 새 작업/최근 세션 빠른 열기.
- local Hermes gateway 자동 탐지: `127.0.0.1:8642` 또는 사용자가 설정한 remote gateway.
- OS 알림: 작업 완료, 승인 필요, 실패.
- 향후: protocol deep link `hermes-work://session/<id>`.

### Android
- 하단 탭 또는 compact session list 우선.
- push notification에서 바로 세션 열기.
- Android share intent로 텍스트/URL을 새 세션 또는 기존 세션에 전달.
- secure storage에 gateway URL/token 저장.

### iOS
- Android와 동일한 session-first UX.
- iOS share sheet로 텍스트/URL 전달.
- APNs 기반 알림.
- secure keychain에 gateway URL/token 저장.

## Implementation Phases

### Phase 0 — Current Web Core Stabilization
- 현재 zero-dependency app을 유지한다.
- Hermes API client, session mapping, chat panel, new-session creation을 안정화한다.
- Web smoke와 node:test를 계속 기준으로 둔다.

### Phase 1 — Shared Core Boundary
- `src/domain`과 `src/services`를 platform-neutral core로 정리한다.
- UI renderer가 platform shell에 직접 의존하지 않도록 분리한다.
- storage adapter 인터페이스를 만든다: browser localStorage, Tauri store, Capacitor secure storage.

### Phase 2 — Windows Desktop Shell
- Tauri v2 shell을 우선 spike한다.
- 기존 web app dist를 Tauri webview에 탑재한다.
- native 기능은 최소 3개만 붙인다: tray, notification, deep link/open session.
- 현재 상태: `src-tauri/` scaffold와 tray proof point를 추가했고 WSL Linux target에서 `cargo check`/`cargo build` 통과. 자세한 결과는 `docs/windows-tauri-spike.md`.
- 남은 검증: Windows host 또는 Windows CI runner에서 `cargo tauri build` installer/portable 산출물 생성, native window에서 Hermes gateway session/chat smoke.

### Phase 3 — Android/iOS Mobile Shell
- Capacitor shell을 우선 spike한다.
- 기존 web UI를 mobile layout으로 보완한다.
- native 기능은 최소 3개만 붙인다: push notification placeholder, secure storage, share target.
- 현재 상태: `capacitor.config.json`, `android/`, `ios/` scaffold를 추가했고 WSL에서 Android debug APK build가 통과했다. 자세한 결과는 `docs/mobile-capacitor-spike.md`.
- 남은 검증: macOS/Xcode/CocoaPods 환경에서 iOS simulator build, Android 실제 기기/에뮬레이터 설치 후 Hermes gateway session/chat smoke.

### Phase 4 — Real-time + Distribution
- SSE/WebSocket으로 session/run 이벤트 실시간 업데이트.
- 각 플랫폼 updater/distribution 정리.
- remote gateway 인증/토큰 갱신 정책 정리.

## Acceptance Criteria

- Web/PWA는 계속 `npm test`, `npm run build`, browser smoke가 통과한다.
- Windows 앱은 설치형 또는 portable 실행 파일로 열리고 Hermes gateway에 연결된다.
- Android 앱은 debug APK로 설치되고 session list/new session/chat smoke가 된다.
- iOS 앱은 Xcode project 또는 simulator build까지 생성되고 session list/new session/chat smoke가 된다.
- 세 플랫폼 모두 동일한 session/task 모델과 Hermes API client semantics를 공유한다.

## Current Decision

다음 큰 구현은 “새 기능 추가”보다 **platform shell spike**가 우선이다. 추천 순서는:

1. Windows Tauri shell
2. Capacitor mobile shell 공통 scaffold — 완료: Android/iOS project scaffold, Android debug APK build 통과
3. Android device/emulator smoke
4. iOS project/simulator smoke

이 순서가 좋은 이유는 현재 Hermes gateway가 Windows/WSL local companion 성격이 강하고, desktop shell에서 local gateway/proxy/tray/notification 요구사항을 먼저 검증할 수 있기 때문이다.
