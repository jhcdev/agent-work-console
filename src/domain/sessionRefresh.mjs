export function shouldReloadSelectedMessages({ selectedChanged = false, loadMessages = false, previousTask, nextTask } = {}) {
  if (loadMessages || selectedChanged) return true;
  if (!previousTask || !nextTask) return false;
  return sessionActivityKey(previousTask) !== sessionActivityKey(nextTask);
}

function sessionActivityKey(task = {}) {
  return [
    task.id || '',
    task.messageCount ?? '',
    task.updatedAt || '',
    task.status || '',
  ].join('|');
}
