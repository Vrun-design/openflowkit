import { normalizeHex } from '@/lib/colorUtils';

export function pixiHexColor(value: string, fallback: number): number {
  const normalized = normalizeHex(value);
  return normalized ? Number.parseInt(normalized.slice(1), 16) : fallback;
}

export interface PixiPaintColor {
  readonly color: number;
  readonly alpha: number;
}

export function pixiPaintColor(value: string, fallback: number): PixiPaintColor {
  if (value === 'transparent') return { color: 0, alpha: 0 };
  if (/^#[0-9a-f]{8}$/i.test(value)) return {
    color: Number.parseInt(value.slice(1, 7), 16), alpha: Number.parseInt(value.slice(7), 16) / 255,
  };
  const normalized = normalizeHex(value);
  if (normalized) return { color: Number.parseInt(normalized.slice(1), 16), alpha: 1 };
  const rgba = value.match(
    /^rgba\(\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(\d{1,3})\s*,\s*(0(?:\.\d+)?|1(?:\.0+)?)\s*\)$/i
  );
  if (!rgba) return { color: fallback, alpha: 1 };
  const channels = rgba.slice(1, 4).map((channel) => Math.min(255, Number.parseInt(channel, 10)));
  return {
    color: (channels[0] << 16) | (channels[1] << 8) | channels[2],
    alpha: Number.parseFloat(rgba[4]),
  };
}
