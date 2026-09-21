import type { SceneNode } from '../document/types';
import { resolveNodeVisualStyle, resolveTextVisualStyle } from '../../../theme';
import { resolveBasicNodePresentation } from './basicNodePresentation';
import { resolveNodeStroke, type NodeStrokeStyle } from './nodeStroke';
import { optionalPresentationString } from './nodePresentationValues';

// Every visible property of a node, resolved from flat `appearance` keys
// (docs/plan/phase-1-style.md §1) with legacy `content.*` palette/typography
// keys as fallbacks. Renderers, the label editor and measurement all read
// this and nothing else, so a style edit is one shallow appearance merge.

export type FontFamilyKey = 'sans' | 'serif' | 'mono' | 'hand';
export type FontWeight = 400 | 500 | 600 | 700;
export type TextDecoration = 'none' | 'underline' | 'line-through';
export type TextAlign = 'start' | 'center' | 'end';
export type TextVerticalAlign = 'top' | 'middle' | 'bottom';

export const FONT_STACKS: Readonly<Record<FontFamilyKey, string>> = {
  sans: 'Inter, ui-sans-serif, system-ui, sans-serif',
  serif: 'Georgia, "Iowan Old Style", "Times New Roman", serif',
  mono: '"JetBrains Mono", ui-monospace, SFMono-Regular, Menlo, monospace',
  hand: '"Comic Sans MS", "Chalkboard SE", "Segoe Print", cursive',
};

export interface NodeStyle {
  /** Hex or 'transparent'. */
  readonly fill: string;
  readonly stroke: string;
  readonly strokeWidth: number;
  readonly strokeStyle: NodeStrokeStyle;
  readonly dash: readonly number[];
  readonly cornerRadius: number;
  readonly opacity: number;
  readonly shadow: boolean;
  readonly textColor: string;
  readonly fontSize: number;
  readonly fontFamily: FontFamilyKey;
  readonly fontWeight: FontWeight;
  readonly fontStyle: 'normal' | 'italic';
  readonly textDecoration: TextDecoration;
  readonly textAlign: TextAlign;
  readonly textVerticalAlign: TextVerticalAlign;
  /** Multiplier of fontSize. */
  readonly lineHeight: number;
  /** Fraction of fontSize (em). */
  readonly letterSpacing: number;
  readonly textPadding: number;
}

export const STYLE_LIMITS = {
  strokeWidth: { min: 0, max: 24 },
  cornerRadius: { min: 0, max: 64 },
  fontSize: { min: 8, max: 96 },
  lineHeight: { min: 1, max: 2 },
  letterSpacing: { min: -0.05, max: 0.2 },
  textPadding: { min: 0, max: 32 },
} as const;

const FONT_SIZE_ALIASES: Readonly<Record<string, number>> = { small: 14, medium: 16, large: 18 };
const FONT_FAMILY_ALIASES: Readonly<Record<string, FontFamilyKey>> = {
  inter: 'sans', sans: 'sans', serif: 'serif', mono: 'mono', monospace: 'mono', hand: 'hand',
};

function clampNumber(value: unknown, limits: { readonly min: number; readonly max: number }, fallback: number): number {
  const parsed = typeof value === 'number' ? value : typeof value === 'string' ? Number(value) : Number.NaN;
  if (!Number.isFinite(parsed)) return fallback;
  return Math.min(limits.max, Math.max(limits.min, parsed));
}

function oneOf<T extends string | number>(value: unknown, allowed: readonly T[], fallback: T): T {
  return (allowed as readonly unknown[]).includes(value) ? (value as T) : fallback;
}

function paint(value: unknown, fallback: string): string {
  return typeof value === 'string' && (value === 'transparent' || /^#[0-9a-f]{3,8}$/i.test(value))
    ? value.toLowerCase() : fallback;
}

export function isTextNode(node: Pick<SceneNode, 'kind'>): boolean {
  return node.kind === 'text';
}

function fontSizeFallback(node: SceneNode): number {
  if (!isTextNode(node)) return 14;
  const legacy = node.content.fontSize;
  const text = typeof legacy === 'string' ? legacy : typeof legacy === 'number' ? String(legacy) : '';
  const parsed = Number(text);
  return Number.isFinite(parsed) && text !== '' ? parsed : (FONT_SIZE_ALIASES[text] ?? 16);
}

function fontWeightValue(value: unknown, fallback: FontWeight): FontWeight {
  const parsed = typeof value === 'string' ? Number(value) : value;
  if (parsed === 'bold') return 700;
  return oneOf<FontWeight>(parsed, [400, 500, 600, 700], fallback);
}

// Nodes are immutable records: a style edit replaces the node, so the node
// itself is the cache key and the renderer pays the resolve once per edit.
const cache = new WeakMap<SceneNode, NodeStyle>();

export function resolveNodeStyle(node: SceneNode): NodeStyle {
  const cached = cache.get(node);
  if (cached) return cached;
  const style = computeNodeStyle(node);
  cache.set(node, style);
  return style;
}

function computeNodeStyle(node: SceneNode): NodeStyle {
  const a = node.appearance;
  const c = node.content;
  const text = isTextNode(node);
  // Palette fallback: the legacy content.color / colorMode / customColor keys.
  const basic = resolveBasicNodePresentation(node);
  const palette = text
    ? { bg: 'transparent', border: 'transparent',
        text: resolveTextVisualStyle(optionalPresentationString(c.color) ?? 'slate', 'subtle',
          optionalPresentationString(c.customColor), 'slate').text }
    : resolveNodeVisualStyle(basic?.colorKey, basic?.colorMode, basic?.customColor);
  const stroke = resolveNodeStroke(node);
  const strokeWidth = text && a.strokeWidth === undefined ? 0 : stroke.width;
  const legacyBackground = text ? optionalPresentationString(c.backgroundColor) : undefined;
  const defaultRadius = basic?.shape === 'rounded' ? 12 : 0;
  return {
    fill: paint(a.fill, legacyBackground ?? palette.bg),
    stroke: paint(a.stroke, palette.border),
    strokeWidth,
    strokeStyle: stroke.style,
    dash: strokeWidth > 0 ? stroke.dash : [],
    cornerRadius: clampNumber(a.cornerRadius, STYLE_LIMITS.cornerRadius, defaultRadius),
    opacity: clampNumber(a.opacity, { min: 0, max: 1 }, 1),
    shadow: a.shadow === true,
    textColor: paint(a.textColor, text ? optionalPresentationString(c.customColor) ?? palette.text : palette.text),
    fontSize: clampNumber(a.fontSize, STYLE_LIMITS.fontSize, fontSizeFallback(node)),
    fontFamily: oneOf<FontFamilyKey>(a.fontFamily, ['sans', 'serif', 'mono', 'hand'],
      FONT_FAMILY_ALIASES[optionalPresentationString(c.fontFamily) ?? ''] ?? 'sans'),
    fontWeight: fontWeightValue(a.fontWeight, text ? fontWeightValue(c.fontWeight, 500) : 600),
    fontStyle: oneOf(a.fontStyle, ['normal', 'italic'], text ? oneOf(c.fontStyle, ['normal', 'italic'], 'normal') : 'normal'),
    textDecoration: oneOf<TextDecoration>(a.textDecoration, ['none', 'underline', 'line-through'], 'none'),
    textAlign: oneOf<TextAlign>(a.textAlign, ['start', 'center', 'end'], 'center'),
    textVerticalAlign: oneOf<TextVerticalAlign>(a.textVerticalAlign, ['top', 'middle', 'bottom'], 'middle'),
    lineHeight: clampNumber(a.lineHeight, STYLE_LIMITS.lineHeight, 1.2),
    letterSpacing: clampNumber(a.letterSpacing, STYLE_LIMITS.letterSpacing, 0),
    textPadding: clampNumber(a.textPadding, STYLE_LIMITS.textPadding, text ? 8 : 16),
  };
}

/** CSS `font` shorthand for the DOM label editor; `scale` is the screen zoom. */
export function nodeStyleFont(style: NodeStyle, scale = 1): string {
  return `${style.fontStyle} ${style.fontWeight} ${style.fontSize * scale}px/${style.lineHeight} ${FONT_STACKS[style.fontFamily]}`;
}
