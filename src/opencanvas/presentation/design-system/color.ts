/** Pure color math for the picker. Hex in/out, HSV inside. No DOM. */
export interface Hsva {
  h: number; // 0–360
  s: number; // 0–1
  v: number; // 0–1
  a: number; // 0–1
}
export function parseHex(input: string): { r: number; g: number; b: number; a: number } | null {
  const hex = input.trim().replace(/^#/, '');
  if (!/^[0-9a-f]{3,4}$|^[0-9a-f]{6}$|^[0-9a-f]{8}$/i.test(hex)) return null;
  const full = hex.length <= 4 ? [...hex].map((c) => c + c).join('') : hex;
  const n = Number.parseInt(full.slice(0, 6), 16);
  const a = full.length === 8 ? Number.parseInt(full.slice(6, 8), 16) / 255 : 1;
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255, a };
}
export function hexToHsva(hex: string): Hsva | null {
  const rgb = parseHex(hex);
  if (!rgb) return null;
  const r = rgb.r / 255,
    g = rgb.g / 255,
    b = rgb.b / 255;
  const max = Math.max(r, g, b),
    min = Math.min(r, g, b),
    d = max - min;
  let h = 0;
  if (d) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h = (h * 60 + 360) % 360;
  }
  return { h, s: max ? d / max : 0, v: max, a: rgb.a };
}
export function hsvaToHex({ h, s, v, a }: Hsva, withAlpha = a < 1): string {
  const c = v * s,
    x = c * (1 - Math.abs(((h / 60) % 2) - 1)),
    m = v - c;
  const [r1, g1, b1] =
    h < 60
      ? [c, x, 0]
      : h < 120
        ? [x, c, 0]
        : h < 180
          ? [0, c, x]
          : h < 240
            ? [0, x, c]
            : h < 300
              ? [x, 0, c]
              : [c, 0, x];
  const to = (n: number) =>
    Math.round((n + m) * 255)
      .toString(16)
      .padStart(2, '0');
  const alpha = withAlpha
    ? Math.round(a * 255)
        .toString(16)
        .padStart(2, '0')
    : '';
  return `#${to(r1)}${to(g1)}${to(b1)}${alpha}`;
}
export const clamp01 = (n: number) => Math.min(1, Math.max(0, n));
