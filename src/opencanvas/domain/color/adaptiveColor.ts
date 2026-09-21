import { getContrastText, normalizeHex } from '../../../lib/colorUtils';

export const AUTO_COLOR = 'auto' as const;
export const DEFAULT_CANVAS_COLOR = '#f7f7f5';

/** Default ink follows canvas luminance. Explicit document colours stay fixed. */
export function resolveAdaptiveInk(value: unknown, background = DEFAULT_CANVAS_COLOR): string {
  if (typeof value === 'string' && value !== AUTO_COLOR) {
    const explicit = normalizeHex(value);
    if (explicit) return explicit;
  }
  return getContrastText(background);
}

export function numericColorToHex(color: number): string {
  return `#${Math.max(0, Math.min(0xffffff, color)).toString(16).padStart(6, '0')}`;
}
