import type { BasicNodeShape } from '../opencanvas/domain/nodes/basicNodePresentation';
import { paletteSwatch, type PaletteKey, type SwatchResolver } from '../opencanvas/domain/nodes/nodePalette';
import type { Size2d } from '../opencanvas/domain/geometry/types';
import type { DslDirection } from './ast';
import type { CanonicalAttribute } from './sceneMeta';

// The language's vocabulary tables: DSL words -> scene presentation, and back.
// compile and serialize both read this file so the two directions cannot drift.

export interface DslShapeSpec {
  /** Scene kind the renderer dispatches on. */
  readonly kind: string;
  /** `content.shape` for basic nodes; absent for family renderers. */
  readonly shape?: BasicNodeShape;
  readonly minSize: Size2d;
  readonly maxSize: Size2d;
  /** Label wrap width used for measurement. */
  readonly wrap: number;
}

export const SHAPE_WORDS: Readonly<Record<string, DslShapeSpec>> = {
  rect: { kind: 'process', shape: 'rectangle', minSize: { width: 120, height: 52 }, maxSize: { width: 320, height: 220 }, wrap: 240 },
  rounded: { kind: 'process', shape: 'rounded', minSize: { width: 120, height: 52 }, maxSize: { width: 320, height: 220 }, wrap: 240 },
  circle: { kind: 'process', shape: 'circle', minSize: { width: 92, height: 92 }, maxSize: { width: 260, height: 260 }, wrap: 180 },
  ellipse: { kind: 'process', shape: 'ellipse', minSize: { width: 132, height: 84 }, maxSize: { width: 320, height: 220 }, wrap: 240 },
  diamond: { kind: 'process', shape: 'diamond', minSize: { width: 156, height: 96 }, maxSize: { width: 340, height: 260 }, wrap: 220 },
  cylinder: { kind: 'process', shape: 'cylinder', minSize: { width: 132, height: 88 }, maxSize: { width: 320, height: 240 }, wrap: 240 },
  hexagon: { kind: 'process', shape: 'hexagon', minSize: { width: 144, height: 80 }, maxSize: { width: 320, height: 220 }, wrap: 240 },
  cloud: { kind: 'process', shape: 'cloud', minSize: { width: 164, height: 96 }, maxSize: { width: 340, height: 240 }, wrap: 240 },
  doc: { kind: 'process', shape: 'document', minSize: { width: 132, height: 96 }, maxSize: { width: 320, height: 260 }, wrap: 240 },
  note: { kind: 'sticky', minSize: { width: 180, height: 100 }, maxSize: { width: 320, height: 320 }, wrap: 260 },
  parallelogram: { kind: 'process', shape: 'parallelogram', minSize: { width: 152, height: 80 }, maxSize: { width: 340, height: 220 }, wrap: 240 },
  person: { kind: 'process', shape: 'actor', minSize: { width: 104, height: 128 }, maxSize: { width: 240, height: 280 }, wrap: 165 },
  queue: { kind: 'process', shape: 'queue', minSize: { width: 152, height: 84 }, maxSize: { width: 340, height: 220 }, wrap: 240 },
  component: { kind: 'process', shape: 'rounded', minSize: { width: 140, height: 60 }, maxSize: { width: 320, height: 240 }, wrap: 240 },
  browser: { kind: 'browser', minSize: { width: 240, height: 170 }, maxSize: { width: 480, height: 400 }, wrap: 300 },
  mobile: { kind: 'mobile', minSize: { width: 150, height: 280 }, maxSize: { width: 320, height: 480 }, wrap: 200 },
  fork: { kind: 'process', shape: 'rectangle', minSize: { width: 150, height: 12 }, maxSize: { width: 150, height: 12 }, wrap: 150 },
  join: { kind: 'process', shape: 'rectangle', minSize: { width: 150, height: 12 }, maxSize: { width: 150, height: 12 }, wrap: 150 },
  choice: { kind: 'process', shape: 'diamond', minSize: { width: 64, height: 64 }, maxSize: { width: 96, height: 96 }, wrap: 80 },
  // Shape library (slice 6.2). Sizes mirror the toolbar's defaults: min ~60 %,
  // max ~2×, wrap the label width the tool used.
  triangle: { kind: 'process', shape: 'triangle', minSize: { width: 84, height: 68 }, maxSize: { width: 280, height: 224 }, wrap: 100 },
  trapezoid: { kind: 'process', shape: 'trapezoid', minSize: { width: 106, height: 58 }, maxSize: { width: 352, height: 192 }, wrap: 140 },
  venn: { kind: 'process', shape: 'venn', minSize: { width: 120, height: 72 }, maxSize: { width: 400, height: 240 }, wrap: 150 },
  speech: { kind: 'process', shape: 'speech-bubble', minSize: { width: 108, height: 62 }, maxSize: { width: 360, height: 208 }, wrap: 150 },
  comment: { kind: 'process', shape: 'comment', minSize: { width: 108, height: 58 }, maxSize: { width: 360, height: 192 }, wrap: 150 },
  star: { kind: 'process', shape: 'star', minSize: { width: 76, height: 76 }, maxSize: { width: 256, height: 256 }, wrap: 90 },
  'check-circle': { kind: 'process', shape: 'check-circle', minSize: { width: 64, height: 64 }, maxSize: { width: 216, height: 216 }, wrap: 70 },
  'cross-circle': { kind: 'process', shape: 'cross-circle', minSize: { width: 64, height: 64 }, maxSize: { width: 216, height: 216 }, wrap: 70 },
  heart: { kind: 'process', shape: 'heart', minSize: { width: 80, height: 72 }, maxSize: { width: 264, height: 240 }, wrap: 90 },
  bolt: { kind: 'process', shape: 'lightning', minSize: { width: 62, height: 82 }, maxSize: { width: 208, height: 272 }, wrap: 60 },
  bookmark: { kind: 'process', shape: 'bookmark', minSize: { width: 58, height: 80 }, maxSize: { width: 192, height: 264 }, wrap: 60 },
  bar: { kind: 'process', shape: 'filled-bar', minSize: { width: 84, height: 16 }, maxSize: { width: 280, height: 48 }, wrap: 120 },
  prism: { kind: 'process', shape: 'prism', minSize: { width: 96, height: 76 }, maxSize: { width: 320, height: 256 }, wrap: 100 },
  tag: { kind: 'process', shape: 'pentagon-tag', minSize: { width: 106, height: 58 }, maxSize: { width: 352, height: 192 }, wrap: 130 },
  chevron: { kind: 'process', shape: 'chevron', minSize: { width: 92, height: 52 }, maxSize: { width: 304, height: 176 }, wrap: 110 },
  octagon: { kind: 'process', shape: 'octagon', minSize: { width: 80, height: 80 }, maxSize: { width: 264, height: 264 }, wrap: 90 },
  cube: { kind: 'process', shape: 'cube', minSize: { width: 84, height: 80 }, maxSize: { width: 280, height: 264 }, wrap: 100 },
  target: { kind: 'process', shape: 'target', minSize: { width: 64, height: 64 }, maxSize: { width: 216, height: 216 }, wrap: 70 },
  page: { kind: 'process', shape: 'page', minSize: { width: 90, height: 84 }, maxSize: { width: 300, height: 280 }, wrap: 110 },
  'half-round': { kind: 'process', shape: 'half-round', minSize: { width: 106, height: 62 }, maxSize: { width: 352, height: 208 }, wrap: 130 },
  'callout-stack': { kind: 'process', shape: 'callout-stack', minSize: { width: 108, height: 72 }, maxSize: { width: 360, height: 240 }, wrap: 140 },
  'layer-stack': { kind: 'process', shape: 'layer-stack', minSize: { width: 108, height: 72 }, maxSize: { width: 360, height: 240 }, wrap: 140 },
  folder: { kind: 'process', shape: 'folder', minSize: { width: 100, height: 72 }, maxSize: { width: 336, height: 240 }, wrap: 130 },
  panel: { kind: 'process', shape: 'panel', minSize: { width: 100, height: 76 }, maxSize: { width: 336, height: 256 }, wrap: 90 },
  brace: { kind: 'process', shape: 'brace', minSize: { width: 70, height: 96 }, maxSize: { width: 232, height: 320 }, wrap: 80 },
  bracket: { kind: 'process', shape: 'bracket', minSize: { width: 70, height: 96 }, maxSize: { width: 232, height: 320 }, wrap: 80 },
  'numbered-circle': { kind: 'process', shape: 'numbered-circle', minSize: { width: 64, height: 64 }, maxSize: { width: 216, height: 216 }, wrap: 70 },
  'list-card': { kind: 'process', shape: 'list-card', minSize: { width: 100, height: 72 }, maxSize: { width: 336, height: 240 }, wrap: 140 },
  pin: { kind: 'process', shape: 'pin', minSize: { width: 58, height: 80 }, maxSize: { width: 192, height: 264 }, wrap: 70 },
  'arrow-up': { kind: 'process', shape: 'arrow-up', minSize: { width: 90, height: 66 }, maxSize: { width: 300, height: 220 }, wrap: 80 },
  'arrow-down': { kind: 'process', shape: 'arrow-down', minSize: { width: 90, height: 66 }, maxSize: { width: 300, height: 220 }, wrap: 80 },
  'arrow-left': { kind: 'process', shape: 'arrow-left', minSize: { width: 90, height: 66 }, maxSize: { width: 300, height: 220 }, wrap: 80 },
  'arrow-right': { kind: 'process', shape: 'arrow-right', minSize: { width: 90, height: 66 }, maxSize: { width: 300, height: 220 }, wrap: 80 },
  plus: { kind: 'process', shape: 'plus', minSize: { width: 76, height: 76 }, maxSize: { width: 256, height: 256 }, wrap: 80 },
  stadium: { kind: 'process', shape: 'capsule', minSize: { width: 100, height: 38 }, maxSize: { width: 336, height: 128 }, wrap: 130 },
};

export const SHAPE_ALIASES: Readonly<Record<string, string>> = {
  box: 'rect', process: 'rect',
  oval: 'ellipse', start: 'ellipse', end: 'ellipse', terminator: 'ellipse',
  decision: 'diamond',
  database: 'cylinder', db: 'cylinder', storage: 'cylinder',
  document: 'doc', docs: 'doc',
  actor: 'person', user: 'person',
  io: 'parallelogram', data: 'parallelogram',
  prep: 'hexagon', hex: 'hexagon',
  subroutine: 'component',
  // Mermaid `@{shape: …}` names that map onto exactly one library shape.
  tri: 'triangle', trap: 'trapezoid', dblcircle: 'venn', 'double-circle': 'venn',
  'speech-bubble': 'speech', bolt: 'bolt', 'lightning-bolt': 'bolt',
  'filled-bar': 'bar', 'pentagon-tag': 'tag', 'tag-rect': 'tag',
  'half-circle': 'half-round', delay: 'half-round', 'stadium-rect': 'stadium',
  'lined-rect': 'list-card', 'window-rect': 'panel', 'brace-r': 'brace',
  'brace-l': 'brace', 'brace-round': 'bracket', 'lin-doc': 'doc',
};

export function canonicalShapeWord(value: string): string | undefined {
  const word = value.trim().toLowerCase();
  if (SHAPE_WORDS[word]) return word;
  const alias = SHAPE_ALIASES[word];
  return alias && SHAPE_WORDS[alias] ? alias : undefined;
}

/** Authored DSL word for a scene presentation, so canvas shape edits win over stale text. */
export function dslShapeWord(kind: unknown, shape: unknown, authored?: unknown): string | undefined {
  const sceneKind = typeof kind === 'string' ? kind : '';
  const sceneShape = typeof shape === 'string' ? shape : undefined;
  const spec = typeof authored === 'string' ? SHAPE_WORDS[canonicalShapeWord(authored) ?? ''] : undefined;
  if (spec && spec.kind === sceneKind && spec.shape === sceneShape) return canonicalShapeWord(authored as string);
  // The basic renderer's default for `process` is `rounded`; report it honestly.
  if (sceneKind === 'process' && sceneShape === undefined) return 'rounded';
  return Object.keys(SHAPE_WORDS).find((word) => {
    const candidate = SHAPE_WORDS[word]!;
    return candidate.kind === sceneKind && candidate.shape === sceneShape;
  });
}

export interface DslColorSpec {
  /** Theme palette key (`nodePalette.ts`) written to the scene. */
  readonly key: string;
}

// docs/plan/grammar.md §5.1 palette mapped onto PALETTE_KEYS: green is the
// theme's emerald, orange its amber, gray its slate, teal its cyan.
export const COLOR_WORDS: Readonly<Record<string, DslColorSpec>> = {
  blue: { key: 'blue' },
  green: { key: 'emerald' },
  red: { key: 'red' },
  orange: { key: 'amber' },
  violet: { key: 'violet' },
  teal: { key: 'cyan' },
  pink: { key: 'pink' },
  yellow: { key: 'yellow' },
  gray: { key: 'slate' },
};

export const COLOR_ALIASES: Readonly<Record<string, string>> = {
  grey: 'gray', purple: 'violet', emerald: 'green', amber: 'orange', slate: 'gray', cyan: 'teal',
};

export const COLOR_WORD_FOR_KEY: Readonly<Record<string, string>> = Object.fromEntries(
  Object.entries(COLOR_WORDS).map(([word, spec]) => [spec.key, word]),
);

export function canonicalColorWord(value: string): string | undefined {
  const word = value.trim().toLowerCase();
  if (COLOR_WORDS[word]) return word;
  const alias = COLOR_ALIASES[word];
  return alias && COLOR_WORDS[alias] ? alias : undefined;
}

/** `#hex`, or an unknown colour name (kept verbatim, warning at compile). */
export function isHexColor(value: string): boolean {
  return /^#[0-9a-f]{3}(?:[0-9a-f]{3})?$/i.test(value.trim());
}

/** Palette fill/stroke/text as the style bar writes them, plus outline and shadow. */
export function nodeAppearance(
  color: string | undefined,
  fill: 'pastel' | 'bold' | 'outline',
  shadow: boolean,
  swatchOf: SwatchResolver = paletteSwatch,
): Record<string, string | boolean> {
  const key = color && !isHexColor(color) ? COLOR_WORDS[color]?.key : undefined;
  const custom = color && isHexColor(color) ? color : undefined;
  const mode = fill === 'bold' ? 'solid' : 'pastel';
  const swatch = custom
    ? { fill: custom, stroke: custom, textColor: mode === 'solid' ? '#ffffff' : '#0f172a' }
    : swatchOf((key ?? 'white') as PaletteKey, mode);
  return {
    fill: fill === 'outline' ? 'transparent' : swatch.fill,
    stroke: fill === 'outline' ? swatchOf((key ?? 'slate') as PaletteKey, 'solid').stroke : swatch.stroke,
    textColor: swatch.textColor,
    ...(shadow ? { shadow: true } : {}),
  };
}

export const FILL_WORDS = new Set(['pastel', 'bold', 'outline']);
export const NODE_FLAG_WORDS = new Set(['shadow']);
export const EDGE_FLAG_WORDS = new Set(['dashed', 'thick', 'invisible', 'flow']);
export type Side = 'top' | 'right' | 'bottom' | 'left';
export const SIDE_WORDS: Readonly<Record<string, Side>> = { top: 'top', right: 'right', bottom: 'bottom', left: 'left' };
export const DIRECTIONS: Readonly<Record<string, DslDirection>> = {
  down: 'down', right: 'right', left: 'left', up: 'up',
  tb: 'down', td: 'down', lr: 'right', rl: 'left', bt: 'up', 'top-down': 'down', 'left-right': 'right',
};

export const ATTRIBUTE_KEYS = new Set([
  'label', 'link', 'tech', 'desc', 'kind', 'tags', 'pin', 'rank', 'width', 'height',
  'icon', 'color', 'shape', 'fill', 'head', 'tail', 'from', 'to', 'order',
]);

/** Canonical attribute order (grammar §5.2). Unknown words go last, in input order. */
export const ATTRIBUTE_SLOT_ORDER = [
  'shape', 'color', 'fill', 'flag', 'icon', 'head', 'tail', 'from', 'to',
  'label', 'tech', 'desc', 'kind', 'tags', 'link', 'pin', 'rank', 'width', 'height',
] as const;

/** Which dedupe slot a canonical word or key/value pair occupies. */
export function attributeSlot(attribute: { key?: string; value: string }): string {
  const key = attribute.key?.toLowerCase();
  if (key === 'shape' || key === 'color' || key === 'fill' || key === 'icon') return key;
  if (key === 'head' || key === 'tail' || key === 'from' || key === 'to') return key;
  if (key) return `key:${key}`;
  const value = attribute.value.toLowerCase();
  const shape = canonicalShapeWord(value);
  if (shape) return 'shape';
  if (canonicalColorWord(value) || isHexColor(value)) return 'color';
  if (FILL_WORDS.has(value)) return 'fill';
  if (NODE_FLAG_WORDS.has(value) || EDGE_FLAG_WORDS.has(value)) return `flag:${value}`;
  if (isIconWord(value)) return 'icon';
  return `word:${value}`;
}

export function isIconWord(value: string): boolean {
  const word = value.trim();
  return word.includes('/') || /^(?:aws|azure|gcp|cncf|tech)-/.test(word) || /^(?:aws|azure|gcp|cncf|tech):/.test(word);
}

function slotRank(slot: string): number {
  const base = slot.replace(/^(?:key|flag|word):/, '');
  const order = ATTRIBUTE_SLOT_ORDER as readonly string[];
  const position = order.indexOf(base);
  if (slot.startsWith('flag:')) return order.indexOf('flag') * 100 + position;
  if (slot.startsWith('word:')) return 10_000;
  return position >= 0 ? position * 100 : 5_000;
}

/** Canonical attribute order (grammar §5.2); stable for equal slots. */
export function sortAttributes(entries: readonly CanonicalAttribute[]): CanonicalAttribute[] {
  return [...entries]
    .map((entry, index) => ({ entry, index, rank: slotRank(attributeSlot(entry)) }))
    .sort((a, b) => a.rank - b.rank || a.index - b.index)
    .map(({ entry }) => entry);
}

export const DSL_FAMILY_DIRECTION: Readonly<Record<string, DslDirection>> = {
  flowchart: 'down', state: 'down', erd: 'right', class: 'down',
  architecture: 'right', gitgraph: 'right', sequence: 'right', mindmap: 'right',
};

/** Effective layout direction for a family name (grammar §3.2). */
export function dslFamilyDirection(family: string): DslDirection {
  return DSL_FAMILY_DIRECTION[family] ?? 'down';
}
