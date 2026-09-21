export type EdgeCurve =
  | 'basis'
  | 'linear'
  | 'step'
  | 'stepBefore'
  | 'stepAfter'
  | 'smoothstep'
  | 'monotoneX'
  | 'monotoneY'
  | 'natural'
  | 'cardinal'
  | 'catmullRom'
  | 'bumpX'
  | 'bumpY';

const VALID_CURVES = new Set<string>([
  'basis', 'linear', 'step', 'stepBefore', 'stepAfter', 'smoothstep',
  'monotoneX', 'monotoneY', 'natural', 'cardinal', 'catmullRom', 'bumpX', 'bumpY',
]);

export function coerceEdgeCurve(value: unknown, fallback: EdgeCurve = 'basis'): EdgeCurve {
  if (typeof value !== 'string') return fallback;
  const trimmed = value.trim();
  return VALID_CURVES.has(trimmed) ? (trimmed as EdgeCurve) : fallback;
}
