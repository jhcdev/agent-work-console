# Agent Work Console

모바일과 PC 어디서든 AI 에이전트의 작업 흐름을 한곳에서 추적하고, 대화·실행 로그·승인·결과물을 작업 단위로 관리하는 크로스플랫폼 Agent Work Console MVP입니다.

## 기능

- 작업 중심 보드: 진행중 / 승인 대기 / 실패 / 완료 상태 집계
- 워크스페이스 분리: TSR, ComfyUI, Hermes 운영, Research
- 작업 상세 패널: 대화, 실행 로그, 승인 요청, 결과물
- Hermes API Server 연결 설정: base URL, API key, session key
- Hermes API 장애 시 mock fallback으로 오프라인 데모 가능
- PWA manifest 포함: 모바일/PC 브라우저에서 설치형 앱처럼 사용 가능
- 의존성 없는 정적 앱: npm install 없이 테스트/빌드 가능

## 실행

```bash
cd /home/ml/agent-work-console
npm test
npm run build
npm run dev
# http://127.0.0.1:5173
```

## Hermes API Server 연결

Hermes 쪽 예시 설정:

```bash
API_SERVER_ENABLED=true
API_SERVER_KEY=<긴 랜덤 키>
API_SERVER_HOST=127.0.0.1
API_SERVER_PORT=8642
API_SERVER_MODEL_NAME=hermes-agent
hermes gateway restart
```

앱 좌측 `Hermes 연결` 패널에서 다음을 입력합니다.

- Base URL: `http://127.0.0.1:8642`
- API Key: `API_SERVER_KEY`
- Session Key: `web:jihun:agent-console`

## 구조

```text
src/domain/taskUtils.mjs       # 작업 필터/카운트/시간 표시
src/services/hermesApi.mjs     # Hermes API Server client + mock fallback
src/ui/renderApp.mjs           # 정적 HTML renderer
src/main.mjs                   # browser state/binding
src/mocks/mockData.mjs         # 데모 task data
scripts/build.mjs              # dist 생성
scripts/dev-server.mjs         # zero-dependency local server
tests/*.test.mjs               # node:test 기반 테스트
```
