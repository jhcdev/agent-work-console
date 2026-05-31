export { DEFAULT_WORKSPACES as workspaces } from '../domain/workspaces.mjs';

const now = Date.now();
const iso = (minutesAgo) => new Date(now - minutesAgo * 60_000).toISOString();

export const mockTasks = [
  {
    id: 'task-tsr-annotation', workspaceId: 'tsr', title: 'TSR annotation tool 수정', status: 'running', priority: 'high', updatedAt: iso(3), owner: 'Jihun',
    summary: 'CSV prediction-first annotation flow에서 object status와 export eligibility를 분리해 안정화하는 작업입니다.',
    messages: [
      { role: 'user', text: 'Delta Video에서 GT/PRED deltas가 직관적으로 보이게 수정해줘', at: iso(44) },
      { role: 'agent', text: '현재 Flet UI 구조와 export shape를 확인하고 영향 범위를 좁히겠습니다.', at: iso(42) },
      { role: 'agent', text: '상태: mode/visibility와 lock navigation 충돌을 재현 중입니다.', at: iso(3) },
    ],
    logs: [
      { level: 'info', text: 'Read tsr_tool/ui/main_view.py', at: iso(41) },
      { level: 'tool', text: 'pytest tests/test_delta_panel.py -q 실행 대기', at: iso(8) },
    ],
    approvals: [], artifacts: [{ name: 'implementation-plan.md', kind: 'doc' }]
  },
  {
    id: 'task-comfy-output', workspaceId: 'comfyui', title: 'ESP 생성 output count 점검', status: 'running', priority: 'medium', updatedAt: iso(7), owner: 'Jihun',
    summary: 'UI progress 대신 실제 저장 파일 수 기준으로 class folder별 생성 완료 여부를 확인합니다.',
    messages: [{ role: 'user', text: 'ComfyUI 저장 결과 기준으로 몇 장 남았는지 확인해줘', at: iso(33) }, { role: 'agent', text: 'saved output folder count를 기준으로 검증하겠습니다.', at: iso(29) }],
    logs: [{ level: 'tool', text: 'Scanning output directories...', at: iso(12) }], approvals: [], artifacts: []
  },
  {
    id: 'task-gateway-approval', workspaceId: 'hermes', title: 'Gateway restart 승인 필요', status: 'waiting_approval', priority: 'high', updatedAt: iso(14), owner: 'Jihun',
    summary: 'Slack thread index 기능 적용 후 gateway restart가 필요합니다.',
    messages: [{ role: 'agent', text: 'config 변경 반영을 위해 hermes gateway restart 승인이 필요합니다.', at: iso(14) }],
    logs: [{ level: 'warn', text: 'Awaiting approval: systemctl --user restart hermes-gateway', at: iso(14) }],
    approvals: [{ id: 'appr-1', label: 'Gateway restart 승인', command: 'hermes gateway restart' }], artifacts: []
  },
  {
    id: 'task-agent-console', workspaceId: 'hermes', title: 'Hermes Work MVP', status: 'done', priority: 'high', updatedAt: iso(60), owner: 'Jihun',
    summary: 'Windows/Android/iOS 설치형 앱까지 확장할 Hermes Work의 Web/PWA MVP입니다.',
    messages: [{ role: 'user', text: '크로스플랫폼 Hermes Work를 만들어줘', at: iso(120) }, { role: 'agent', text: 'MVP 계획과 구현을 완료했습니다.', at: iso(60) }],
    logs: [{ level: 'success', text: 'npm test and build passed', at: iso(60) }], approvals: [], artifacts: [{ name: 'dist/', kind: 'build' }]
  },
  {
    id: 'task-research-feed', workspaceId: 'research', title: 'AI agent tool 조사', status: 'done', priority: 'low', updatedAt: iso(180), owner: 'Jihun',
    summary: 'AI coding/agent tool ecosystem 신호를 Wiki 지식으로 컴파일했습니다.',
    messages: [{ role: 'agent', text: '신규 신호는 agent workforce 운영 레이어와 연결됩니다.', at: iso(180) }], logs: [], approvals: [], artifacts: [{ name: 'LLM Wiki update', kind: 'wiki' }]
  },
  {
    id: 'task-slack-index', workspaceId: 'hermes', title: 'Slack thread index 실험', status: 'failed', priority: 'medium', updatedAt: iso(28), owner: 'Jihun',
    summary: 'Slack native thread list는 불가능하므로 App Home/Index Message 방식으로 전환이 필요합니다.',
    messages: [{ role: 'agent', text: 'Slack native sidebar thread injection은 공식 API로 불가능합니다.', at: iso(28) }],
    logs: [{ level: 'error', text: 'Native Slack client UI extension point unavailable', at: iso(28) }], approvals: [], artifacts: []
  }
];
