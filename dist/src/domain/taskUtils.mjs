const STATUSES = ['running', 'waiting_approval', 'failed', 'done'];

export function countByStatus(tasks) {
  const counts = Object.fromEntries(STATUSES.map((status) => [status, 0]));
  for (const task of tasks) {
    if (task.status in counts) counts[task.status] += 1;
  }
  return counts;
}

export function filterTasks(tasks, { workspaceId = 'all', status = 'all', query = '' } = {}) {
  const q = query.trim().toLowerCase();
  return tasks
    .filter((task) => workspaceId === 'all' || task.workspaceId === workspaceId)
    .filter((task) => status === 'all' || task.status === status)
    .filter((task) => !q || `${task.title} ${task.summary} ${task.owner}`.toLowerCase().includes(q))
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
}

export function statusLabel(status) {
  return ({ running: '진행중', waiting_approval: '승인 대기', failed: '실패', done: '완료' })[status] ?? status;
}

export function statusTone(status) {
  return ({ running: 'blue', waiting_approval: 'amber', failed: 'red', done: 'green' })[status] ?? 'gray';
}

export function formatRelativeTime(iso) {
  const diffMs = Math.max(0, Date.now() - new Date(iso).getTime());
  const minutes = Math.floor(diffMs / 60_000);
  if (minutes < 1) return '방금 전';
  if (minutes < 60) return `${minutes}분 전`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}시간 전`;
  return `${Math.floor(hours / 24)}일 전`;
}
