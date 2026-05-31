export const DEFAULT_WORKSPACES = [
  { id: 'all', name: '전체 작업', icon: '⌘', locked: true },
  { id: 'tsr', name: 'TSR', icon: '🚦', locked: true },
  { id: 'comfyui', name: 'ComfyUI', icon: '🎛️', locked: true },
  { id: 'hermes', name: 'Hermes 운영', icon: '⚙️', locked: true },
  { id: 'research', name: 'Research', icon: '🔎', locked: true },
];

const DEFAULT_IDS = new Set(DEFAULT_WORKSPACES.map((workspace) => workspace.id));
const HANGUL_SLUG_WORDS = new Map([
  ['장기', 'janggi'],
  ['작업', 'jageob'],
  ['리뷰', 'review'],
  ['회의', 'meeting'],
  ['메모', 'memo'],
  ['조사', 'research'],
  ['운영', 'ops'],
]);

export function buildWorkspaceList(tasks = [], userWorkspaces = []) {
  const normalizedCustom = normalizeUserWorkspaces(userWorkspaces);
  const knownIds = new Set([...DEFAULT_IDS, ...normalizedCustom.map((workspace) => workspace.id)]);
  const taskWorkspaces = [...new Set(tasks.map((task) => task.workspaceId).filter(Boolean))]
    .filter((id) => !knownIds.has(id) && id !== 'all')
    .sort((left, right) => left.localeCompare(right))
    .map((id) => ({ id, name: titleizeWorkspaceId(id), icon: '#', auto: true }));

  return [DEFAULT_WORKSPACES[0], ...normalizedCustom, ...DEFAULT_WORKSPACES.slice(1), ...taskWorkspaces];
}

export function normalizeUserWorkspaces(workspaces = []) {
  return workspaces
    .filter((workspace) => workspace && workspace.id && workspace.name)
    .map((workspace, index) => ({
      id: String(workspace.id),
      name: String(workspace.name),
      icon: workspace.icon || '📁',
      matchQuery: String(workspace.matchQuery || workspace.name).trim(),
      order: Number.isFinite(Number(workspace.order)) ? Number(workspace.order) : index,
      custom: true,
    }))
    .sort((left, right) => left.order - right.order)
    .map((workspace, order) => ({ ...workspace, order }));
}

export function createUserWorkspace(existing = [], name, icon = '📁') {
  const trimmed = String(name || '').trim();
  if (!trimmed) throw new Error('카테고리 이름을 입력하세요');
  const current = normalizeUserWorkspaces(existing);
  const baseId = `custom-${slugifyWorkspaceName(trimmed)}`;
  const id = uniqueWorkspaceId(baseId, current);
  const workspace = { id, name: trimmed, icon: icon || '📁', matchQuery: trimmed, order: current.length, custom: true };
  return { workspace, workspaces: [...current, workspace] };
}

export function matchUserWorkspaceForTask(task = {}, userWorkspaces = []) {
  const haystack = `${task.title || ''} ${task.name || ''} ${task.summary || ''} ${task.preview || ''} ${task.owner || ''} ${task.source || ''}`.toLowerCase();
  if (!haystack.trim()) return undefined;
  const match = normalizeUserWorkspaces(userWorkspaces).find((workspace) => {
    const query = String(workspace.matchQuery || workspace.name || '').trim().toLowerCase();
    return query && haystack.includes(query);
  });
  return match?.id;
}

export function moveUserWorkspace(existing = [], workspaceId, direction) {
  const current = normalizeUserWorkspaces(existing);
  const from = current.findIndex((workspace) => workspace.id === workspaceId);
  if (from < 0) return current;
  const to = Math.max(0, Math.min(current.length - 1, from + Math.sign(direction || 0)));
  if (from === to) return current;
  const next = [...current];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next.map((workspace, order) => ({ ...workspace, order }));
}

export function deleteUserWorkspace(existing = [], workspaceId, tasks = []) {
  if (DEFAULT_IDS.has(workspaceId)) throw new Error('기본 카테고리는 삭제할 수 없습니다');
  const current = normalizeUserWorkspaces(existing);
  const removed = current.find((workspace) => workspace.id === workspaceId);
  if (!removed) return { workspaces: current, tasks };
  return {
    workspaces: current.filter((workspace) => workspace.id !== workspaceId).map((workspace, order) => ({ ...workspace, order })),
    tasks: tasks.map((task) => task.workspaceId === workspaceId ? { ...task, workspaceId: 'all' } : task),
  };
}

function uniqueWorkspaceId(baseId, existing) {
  const used = new Set([...DEFAULT_IDS, ...existing.map((workspace) => workspace.id)]);
  if (!used.has(baseId)) return baseId;
  let suffix = 2;
  while (used.has(`${baseId}-${suffix}`)) suffix += 1;
  return `${baseId}-${suffix}`;
}

function slugifyWorkspaceName(name) {
  const tokenized = name.split(/\s+/).map((word) => HANGUL_SLUG_WORDS.get(word) || word).join('-');
  const ascii = tokenized
    .normalize('NFKD')
    .replace(/[^\w\s-]/g, '')
    .trim()
    .toLowerCase()
    .replace(/[\s_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-+|-+$/g, '');
  return ascii || `category-${Date.now().toString(36)}`;
}

function titleizeWorkspaceId(id) {
  return String(id)
    .replace(/^custom-/, '')
    .split(/[-_]+/)
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ') || id;
}
