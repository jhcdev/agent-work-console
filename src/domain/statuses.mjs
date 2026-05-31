export const STATUS_IDS = ['running', 'waiting_approval', 'failed', 'done'];

const STATUS_ALIASES = {
  running: 'running',
  active: 'running',
  in_progress: 'running',
  processing: 'running',
  queued: 'running',
  pending: 'running',
  waiting: 'running',
  waiting_approval: 'waiting_approval',
  pending_approval: 'waiting_approval',
  needs_approval: 'waiting_approval',
  approval_required: 'waiting_approval',
  failed: 'failed',
  error: 'failed',
  errored: 'failed',
  cancelled: 'failed',
  canceled: 'failed',
  timeout: 'failed',
  timed_out: 'failed',
  done: 'done',
  complete: 'done',
  completed: 'done',
  success: 'done',
  succeeded: 'done',
  finished: 'done',
};

export function normalizeStatus(value) {
  const key = String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
  return STATUS_ALIASES[key] || undefined;
}

export function inferTaskStatus(session = {}) {
  const explicit = normalizeStatus(session.status);
  if (explicit) return explicit;
  if (session.error || session.last_error) return 'failed';
  if (session.pending_approval === true || hasOpenApprovals(session.approvals)) return 'waiting_approval';
  if (session.ended_at || session.completed_at || session.finished_at) return 'done';
  return 'running';
}

export function countByStatus(tasks = []) {
  const counts = Object.fromEntries(STATUS_IDS.map((status) => [status, 0]));
  for (const task of tasks) {
    const status = normalizeStatus(task?.status);
    if (status) counts[status] += 1;
  }
  return counts;
}

export function setStatusOverride(overrides = {}, taskId, status) {
  if (!taskId) return { ...overrides };
  const next = { ...overrides };
  if (status === 'auto' || status === '' || status === undefined || status === null) {
    delete next[taskId];
    return next;
  }
  const normalized = normalizeStatus(status);
  if (!normalized) return next;
  next[taskId] = normalized;
  return next;
}

function hasOpenApprovals(approvals) {
  return Array.isArray(approvals) && approvals.some((approval) => {
    const status = String(approval?.status || '').toLowerCase();
    return !status || status === 'pending' || status === 'open' || status === 'waiting_approval';
  });
}
