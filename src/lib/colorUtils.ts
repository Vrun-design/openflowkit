export function clampChannel(value: number): number {
  return Math.max(0, Math.min(255, Math.round(value)));
}

export function normalizeHex(hex: string): string | null {
  const normalized = hex.trim().replace('#', '');
  if (/^[\da-fA-F]{3}$/.test(normalized)) {
    return `#${normalized
      .split('')
      .map((char) => char + char)
      .join('')}`.toLowerCase();
  }
  if (/^[\da-fA-F]{6}$/.test(normalized)) {
    return `#${normalized}`.toLowerCase();
  }
  return null;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const normalized = normalizeHex(hex);
  if (!normalized) return null;
  const value = normalized.slice(1);
  return {
    r: Number.parseInt(value.slice(0, 2), 16),
    g: Number.parseInt(value.slice(2, 4), 16),
    b: Number.parseInt(value.slice(4, 6), 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((channel) => clampChannel(channel).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function mixHex(colorA: string, colorB: string, ratio: number): string {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);
  if (!a || !b) return colorA;
  return rgbToHex(
    a.r * (1 - ratio) + b.r * ratio,
    a.g * (1 - ratio) + b.g * ratio,
    a.b * (1 - ratio) + b.b * ratio
  );
}

export function getLuminance(hex: string): number {
  const rgb = hexToRgb(hex);
  if (!rgb) return 1;
  const channels = [rgb.r, rgb.g, rgb.b].map((channel) => {
    const value = channel / 255;
    return value <= 0.03928 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

export function getContrastText(hex: string): '#0f172a' | '#ffffff' {
  return getLuminance(hex) > 0.44 ? '#0f172a' : '#ffffff';
}
