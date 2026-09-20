import { foundation, rendererColor, type Appearance, type ColorRole } from './tokens';
export type CanvasFeedbackKind =
  | 'hover'
  | 'selection'
  | 'binding'
  | 'addition'
  | 'modification'
  | 'removal'
  | 'locked';
const roles: Record<CanvasFeedbackKind, ColorRole> = {
  hover: 'controlBorder',
  selection: 'selection',
  binding: 'selection',
  addition: 'success',
  modification: 'info',
  removal: 'danger',
  locked: 'muted',
};
const markers = {
  hover: 'none',
  selection: 'handles',
  binding: 'port',
  addition: 'plus',
  modification: 'delta',
  removal: 'minus',
  locked: 'lock',
} as const;
/** All dimensions are CSS screen pixels. Adapter converts once; DPR belongs to renderer. */
export function canvasFeedback(
  kind: CanvasFeedbackKind,
  appearance: Appearance,
  input: 'pointer' | 'touch' = 'pointer'
) {
  return {
    color: rendererColor(appearance, roles[kind]),
    strokePx: foundation.canvas.stroke,
    handlePx: foundation.canvas.handle,
    hitTargetPx:
      input === 'touch' ? foundation.canvas.touchTarget : foundation.canvas.pointerTarget,
    dashPx: kind === 'removal' ? [6, 4] : kind === 'addition' ? [3, 3] : [],
    marker: markers[kind],
    // Preview overlays never become authoritative hit-testable document objects.
    proposalOverlay: kind === 'addition' || kind === 'modification' || kind === 'removal',
  } as const;
}
export function screenPixelsToWorld(pixels: number, zoom: number): number {
  if (!Number.isFinite(zoom) || zoom <= 0 || !Number.isFinite(pixels) || pixels < 0) {
    throw new RangeError(
      'Screen-space dimensions require finite nonnegative pixels and positive zoom.'
    );
  }
  return pixels / zoom;
}
