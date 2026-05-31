# Agent Work Console

모바일과 PC 어디서든 AI 에이전트의 작업 흐름을 한곳에서 추적하고, 대화·실행 로그·승인·결과물을 작업 단위로 관리하는 Agent Work Console입니다.

> 현재 구현은 Web/PWA 기반 MVP입니다. 최종 제품 목표는 웹만이 아니라 **Windows / Android / iOS 설치형 앱**까지 포함하는 크로스 플랫폼 애플리케이션입니다. 플랫폼별 계획은 `docs/platform-app-plan.md`를 기준으로 합니다.

## 기능

- 세션 중심 보드: 진행중 / 승인 대기 / 실패 / 완료 상태 집계
- 워크스페이스 분리: TSR, ComfyUI, Hermes 운영, Research
- 세션 상세 패널: Hermes 대화내역 조회와 같은 세션에 이어서 프롬프트 전송
- 새 세션 시작: `POST /api/sessions`로 Hermes 세션 생성 후 즉시 채팅 패널로 이동
- dev server가 `~/.hermes/.env`의 `API_SERVER_HOST`, `API_SERVER_PORT`를 읽어 현재 Hermes gateway 위치로 proxy 연결
- Hermes API 장애 시 mock fallback으로 오프라인 데모 가능
- Web/PWA manifest 포함: 브라우저에서 설치형 앱처럼 사용 가능
- 의존성 없는 정적 앱: npm install 없이 테스트/빌드 가능

## 플랫폼 목표

| 플랫폼 | 목표 형태 | 우선 기능 |
| --- | --- | --- |
| Web/PWA | 현재 MVP, 빠른 내부 배포/검증 | session list, chat, new session, browser smoke |
| Windows | Tauri v2 우선 검토 | tray, OS notification, local Hermes gateway companion, deep link |
| Android | Capacitor 우선 검토 | push notification, secure storage, share intent, mobile session UX |
| iOS | Capacitor 우선 검토 | APNs/share sheet, secure keychain, mobile session UX |

## 실행

Hermes fork 안의 submodule 위치에서 실행하는 기준:

```bash
cd /home/ml/.hermes/hermes-agent/apps/agent-work-console
npm test
npm run build
npm run dev
# http://127.0.0.1:5173
```

독립 checkout을 쓰는 경우:

```bash
cd /home/ml/agent-work-console
npm run dev
```

## Hermes API Server 연결

Hermes 쪽 예시 설정 (`~/.hermes/.env`):

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=<긴 랜덤 키>
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_MODEL_NAME=hermes-agent
hermes gateway restart
```

앱 dev server는 시작 시 `~/.hermes/.env`에서 gateway host/port만 읽습니다.
`API_SERVER_KEY`는 읽거나 proxy에 자동 주입하지 않습니다. 즉 `/hermes/*`는 현재 실행 중인 Hermes gateway로 그대로 전달됩니다.

기본 연결:

- Base URL: `/hermes`
- Session Key: `web:jihun:agent-console`
- API key는 UI/dev server에 저장하거나 자동 주입하지 않음. local companion은 Hermes gateway의 loopback 정책으로 처리.

다른 Hermes API gateway에 붙이고 싶으면 실행 시 환경변수로 target을 지정할 수 있습니다.

```bash
HERMES_API_TARGET=http://127.0.0.1:8642 npm run dev
```

## 구조

```text
src/domain/taskUtils.mjs       # 작업 필터/카운트/시간 표시
src/services/hermesApi.mjs     # Hermes API Server client + mock fallback
src/ui/renderApp.mjs           # 정적 HTML renderer
src/main.mjs                   # browser state/binding
src/mocks/mockData.mjs         # 데모 task data
scripts/build.mjs              # dist 생성
scripts/dev-server.mjs         # zero-dependency local server + Hermes gateway proxy
tests/*.test.mjs               # node:test 기반 테스트
docs/platform-app-plan.md      # Windows/Android/iOS 설치형 앱 전환 계획
```
