export const DEFAULT_DETAIL_PANEL_WIDTH = 520;
export const MIN_DETAIL_PANEL_WIDTH = 360;
export const MAX_DETAIL_PANEL_WIDTH = 760;

export function sanitizeDetailPanelWidth(value) {
  const width = Number.parseInt(value, 10);
  if (!Number.isFinite(width)) return DEFAULT_DETAIL_PANEL_WIDTH;
  return Math.min(MAX_DETAIL_PANEL_WIDTH, Math.max(MIN_DETAIL_PANEL_WIDTH, width));
}

export function detailWidthFromPointer({ viewportWidth, pointerX }) {
  return sanitizeDetailPanelWidth(viewportWidth - pointerX);
}
