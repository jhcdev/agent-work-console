export function nextLazyMessageLimit({ loadedCount = 0, totalCount = 0, currentLimit = 150, chunkSize = 150 } = {}) {
  const total = Math.max(0, Number(totalCount) || 0);
  const loaded = Math.max(0, Number(loadedCount) || 0);
  const limit = Math.max(0, Number(currentLimit) || 0, loaded);
  const chunk = Math.max(1, Number(chunkSize) || 150);
  if (!total || loaded >= total) return limit || chunk;
  return Math.min(total, Math.max(limit + chunk, loaded + chunk));
}

export function shouldLazyLoadOlderMessages({ scrollTop = 0, loadedCount = 0, totalCount = 0, loading = false, threshold = 48 } = {}) {
  if (loading) return false;
  const total = Math.max(0, Number(totalCount) || 0);
  const loaded = Math.max(0, Number(loadedCount) || 0);
  if (!total || loaded >= total) return false;
  return Number(scrollTop) <= Number(threshold);
}
