/** Pure direction detection shared by the secure reader and Studio preview.
 * An inward pinch opens the compact reader; outward pinch restores fullscreen.
 * Small two-finger movement is ignored so it cannot trigger accidental menus.
 */
export type PinchAction = 'open' | 'close' | null;
export function pinchAction(startDistance: number, currentDistance: number, menuOpen: boolean, threshold = 30): PinchAction {
  if (!Number.isFinite(startDistance) || !Number.isFinite(currentDistance) || startDistance <= 0) return null;
  const delta = currentDistance - startDistance;
  if (delta <= -threshold && !menuOpen) return 'open';
  if (delta >= threshold && menuOpen) return 'close';
  return null;
}
