import type { SceneNode } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import { resolveAdaptiveInk } from '../color/adaptiveColor';
import { resolveNodeStyle, type NodeStyle } from './nodeStyle';
import { paletteSwatch } from './nodePalette';

// Wireframe widgets are one node kind, `widget`, whose `content.widget` names
// the control. This module turns a widget into a renderer-neutral list of
// primitives (rects, circles, paths, text) that Pixi and the SVG export both
// paint, so the canvas and the file can never disagree. Pure TypeScript.
//
// The control names are Koboyo's wireframe vocabulary, so `wireframe` text
// written for Koboyo compiles here unchanged.

export const WIDGET_KINDS = [
  'button', 'input', 'search', 'checkbox', 'radio', 'toggle', 'dropdown', 'slider',
  'navbar', 'tabs', 'image', 'avatar', 'heading', 'paragraph', 'divider', 'link',
  'textarea', 'stepper', 'badge', 'progress', 'breadcrumbs', 'pagination', 'rating',
  'card', 'list', 'alert', 'menu', 'tooltip', 'accordion', 'datepicker', 'sidebar',
  'segmented', 'tabbar', 'statusbar', 'fab',
] as const;

export type WidgetKind = (typeof WIDGET_KINDS)[number];

export const WIDGET_SEVERITIES = ['info', 'success', 'warning', 'error'] as const;
export type WidgetSeverity = (typeof WIDGET_SEVERITIES)[number];
/** `primary` fills a button; a severity tints an alert or a badge. */
export type WidgetVariant = 'primary' | WidgetSeverity;

/** Which state a control carries. The style bar and the DSL read this one table. */
export type WidgetStateKey = 'checked' | 'value' | 'active' | 'variant';

interface WidgetSpec {
  readonly name: string;
  readonly label: string;
  readonly size: Size2d;
  /** Its label is `A | B | C`: one entry per item. */
  readonly items?: true;
  readonly state?: WidgetStateKey;
  /** Keeps its own width in a frame; everything else spans the column (Koboyo). */
  readonly intrinsic?: true;
  /** What a fresh one shows, so an inserted widget reads at a glance. */
  readonly initial?: { readonly checked?: boolean; readonly value?: number; readonly active?: number; readonly variant?: WidgetVariant };
}

export const WIDGETS: Readonly<Record<WidgetKind, WidgetSpec>> = {
  button: { name: 'Button', label: 'Button', size: { width: 120, height: 40 }, state: 'variant' },
  input: { name: 'Input', label: 'Email', size: { width: 240, height: 40 } },
  search: { name: 'Search', label: 'Search', size: { width: 240, height: 40 } },
  checkbox: { name: 'Checkbox', label: 'Remember me', size: { width: 180, height: 24 }, state: 'checked', initial: { checked: true } },
  radio: { name: 'Radio', label: 'Option', size: { width: 160, height: 24 }, state: 'checked', initial: { checked: true } },
  toggle: { name: 'Toggle', label: 'Toggle', size: { width: 160, height: 28 }, state: 'checked', initial: { checked: true } },
  dropdown: { name: 'Dropdown', label: 'Select an option', size: { width: 240, height: 40 } },
  slider: { name: 'Slider', label: '', size: { width: 240, height: 24 }, state: 'value', initial: { value: 0.6 } },
  navbar: { name: 'Navigation bar', label: 'Home | About | Contact', size: { width: 400, height: 56 }, items: true, state: 'active', initial: { active: 0 } },
  tabs: { name: 'Tabs', label: 'Overview | Reports | Settings', size: { width: 360, height: 40 }, items: true, state: 'active', initial: { active: 0 } },
  image: { name: 'Image', label: '', size: { width: 240, height: 160 } },
  avatar: { name: 'Avatar', label: '', size: { width: 48, height: 48 }, intrinsic: true },
  heading: { name: 'Heading', label: 'Heading', size: { width: 240, height: 36 } },
  paragraph: { name: 'Paragraph', label: 'A short paragraph of body copy that explains what this section is for.', size: { width: 280, height: 64 } },
  divider: { name: 'Divider', label: '', size: { width: 280, height: 12 } },
  link: { name: 'Link', label: 'Learn more', size: { width: 100, height: 24 }, intrinsic: true },
  textarea: { name: 'Text area', label: 'Write a message…', size: { width: 280, height: 100 } },
  stepper: { name: 'Stepper', label: 'Cart | Shipping | Payment', size: { width: 360, height: 52 }, items: true, state: 'active', initial: { active: 1 } },
  badge: { name: 'Badge', label: 'New', size: { width: 56, height: 24 }, intrinsic: true, state: 'variant', initial: { variant: 'info' } },
  progress: { name: 'Progress bar', label: '', size: { width: 240, height: 10 }, state: 'value', initial: { value: 0.6 } },
  breadcrumbs: { name: 'Breadcrumbs', label: 'Home | Projects | Report', size: { width: 280, height: 24 }, items: true, state: 'active', initial: { active: 2 } },
  pagination: { name: 'Pagination', label: '1 | 2 | 3 | 4 | 5', size: { width: 280, height: 36 }, items: true, state: 'active', initial: { active: 0 } },
  rating: { name: 'Rating', label: '', size: { width: 136, height: 24 }, intrinsic: true, state: 'value', initial: { value: 0.8 } },
  card: { name: 'Card', label: 'Card title', size: { width: 240, height: 200 } },
  list: { name: 'List', label: 'First item | Second item | Third item', size: { width: 240, height: 132 }, items: true, state: 'active' },
  alert: { name: 'Alert', label: 'Something needs your attention', size: { width: 320, height: 48 }, state: 'variant', initial: { variant: 'info' } },
  menu: { name: 'Menu', label: 'Profile | Settings | Sign out', size: { width: 180, height: 124 }, intrinsic: true, items: true, state: 'active' },
  tooltip: { name: 'Tooltip', label: 'Tooltip text', size: { width: 140, height: 44 }, intrinsic: true },
  accordion: { name: 'Accordion', label: 'First section | Second section | Third section', size: { width: 280, height: 176 }, items: true, state: 'active', initial: { active: 0 } },
  datepicker: { name: 'Date picker', label: 'September 2026', size: { width: 280, height: 264 }, intrinsic: true, state: 'active', initial: { active: 12 } },
  sidebar: { name: 'Sidebar', label: 'Dashboard | Projects | Team | Settings', size: { width: 200, height: 320 }, intrinsic: true, items: true, state: 'active', initial: { active: 0 } },
  segmented: { name: 'Segmented control', label: 'Day | Week | Month', size: { width: 280, height: 36 }, items: true, state: 'active', initial: { active: 0 } },
  tabbar: { name: 'Tab bar', label: 'Home | Search | Profile', size: { width: 360, height: 56 }, items: true, state: 'active', initial: { active: 0 } },
  statusbar: { name: 'Status bar', label: '9:41', size: { width: 360, height: 24 } },
  fab: { name: 'Floating button', label: '', size: { width: 56, height: 56 }, intrinsic: true },
};

export function isWidgetKind(value: unknown): value is WidgetKind {
  return typeof value === 'string' && value in WIDGETS;
}

/** Colour roles, resolved per theme by `resolveWidgetInks`. */
export type WidgetInk =
  | 'ink' | 'muted' | 'faint' // text and marks sitting on the backdrop
  | 'text' | 'subtle' // text inside the widget's own fill
  | 'line' | 'surface' | 'accent' | 'onAccent' | WidgetSeverity;

interface Paint {
  readonly fill?: WidgetInk;
  readonly stroke?: WidgetInk;
  readonly strokeWidth?: number;
  /** Multiplies both fill and stroke alpha. */
  readonly opacity?: number;
}

export type WidgetPrimitive =
  | ({ readonly kind: 'rect'; readonly x: number; readonly y: number; readonly width: number; readonly height: number; readonly radius: number } & Paint)
  | ({ readonly kind: 'circle'; readonly x: number; readonly y: number; readonly radius: number } & Paint)
  | ({ readonly kind: 'path'; readonly points: readonly Point2d[]; readonly closed: boolean } & Paint)
  | {
      readonly kind: 'text'; readonly x: number; readonly y: number; readonly text: string;
      readonly ink: WidgetInk; readonly size: number; readonly weight: 400 | 500 | 600 | 700;
      /** Horizontal anchor; `y` is always the vertical middle of the line. */
      readonly anchor: 'start' | 'middle' | 'end';
    };

export interface WidgetPresentation {
  readonly widget: WidgetKind;
  readonly label: string;
  readonly items: readonly string[];
  readonly checked: boolean;
  /** 0–1: slider, progress, rating. */
  readonly value: number;
  /** Selected item (or day of the month for a date picker); -1 for none. */
  readonly active: number;
  readonly variant: WidgetVariant | null;
  readonly primitives: readonly WidgetPrimitive[];
}

export interface WidgetInkPaint { readonly color: string; readonly alpha: number }

/**
 * What a flat control is drawn on: the nearest ancestor with an opaque fill
 * (a white phone frame), else the canvas.
 */
export function widgetBackdrop(
  node: SceneNode, parentOf: (id: string) => SceneNode | undefined, canvasColor: string
): string {
  const seen = new Set<string>();
  for (let parent = node.parentId ? parentOf(node.parentId) : undefined; parent && !seen.has(parent.id);
    parent = parent.parentId ? parentOf(parent.parentId) : undefined) {
    seen.add(parent.id);
    const fill = resolveNodeStyle(parent, canvasColor).fill;
    if (/^#[0-9a-f]{6}$/i.test(fill)) return fill;
  }
  return canvasColor;
}

/**
 * Colour per role. Flat controls (a heading, a checkbox's label) sit on their
 * backdrop, boxed ones (an input's placeholder) sit on the widget's fill, so
 * the two text roles adapt separately and both read in dark mode.
 */
export function resolveWidgetInks(node: SceneNode, style: NodeStyle, backdrop: string): Readonly<Record<WidgetInk, WidgetInkPaint>> {
  const ink = resolveAdaptiveInk(node.appearance.textColor, backdrop);
  const solid = (key: Parameters<typeof paletteSwatch>[0]): WidgetInkPaint => ({ color: paletteSwatch(key, 'solid').fill, alpha: 1 });
  const surface = style.fill === 'transparent' ? backdrop : style.fill;
  return {
    ink: { color: ink, alpha: 1 },
    muted: { color: ink, alpha: 0.6 },
    faint: { color: ink, alpha: 0.1 },
    text: { color: style.textColor, alpha: 1 },
    subtle: { color: style.textColor, alpha: 0.5 },
    line: { color: style.stroke === 'transparent' ? ink : style.stroke, alpha: style.stroke === 'transparent' ? 0.3 : 1 },
    surface: { color: surface, alpha: 1 },
    accent: solid('blue'),
    onAccent: { color: '#ffffff', alpha: 1 },
    info: solid('blue'),
    success: solid('emerald'),
    warning: solid('amber'),
    error: solid('red'),
  };
}

/** `A | B | C` → items; empty entries are dropped. */
export function widgetItems(label: string): string[] {
  return label.split('|').map((item) => item.trim()).filter(Boolean);
}

function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value));
}

export function resolveWidgetPresentation(node: SceneNode): WidgetPresentation | null {
  if (node.kind !== 'widget' || !isWidgetKind(node.content.widget)) return null;
  const widget = node.content.widget;
  const spec = WIDGETS[widget];
  const label = typeof node.content.label === 'string' ? node.content.label : spec.label;
  const rawValue = node.content.value;
  const rawActive = node.content.active;
  const rawVariant = node.content.variant;
  const variant = rawVariant === 'primary' || (WIDGET_SEVERITIES as readonly unknown[]).includes(rawVariant)
    ? rawVariant as WidgetVariant : null;
  const state = {
    widget,
    label,
    items: spec.items ? widgetItems(label) : [],
    checked: node.content.checked === true,
    value: typeof rawValue === 'number' && Number.isFinite(rawValue) ? clamp01(rawValue) : 0,
    active: typeof rawActive === 'number' && Number.isInteger(rawActive) ? rawActive : -1,
    variant,
  };
  return { ...state, primitives: widgetPrimitives(state, node.size) };
}

/** Where a widget draws its label, node-local, and how: the label editor opens on it. */
export interface WidgetLabelBox {
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly align: 'start' | 'center';
  readonly verticalAlign: 'top' | 'middle';
  readonly size: number;
  readonly weight: 400 | 500 | 600 | 700;
  /** The ink the label is drawn in, so the editor's text matches it (white in a tooltip). */
  readonly ink: WidgetInk;
}

/**
 * The label's box, mirroring the offsets `widgetPrimitives` draws at. Null for
 * widgets that draw no label (an image, a divider, a rating…): there is
 * nothing to edit, so the editor does not open.
 */
export function widgetLabelBox(node: SceneNode): WidgetLabelBox | null {
  if (node.kind !== 'widget' || !isWidgetKind(node.content.widget)) return null;
  const { width: w, height: h } = node.size;
  const box = (
    x: number, y: number, width: number, height: number, ink: WidgetInk, align: 'start' | 'center' = 'start',
    size = BODY, weight: WidgetLabelBox['weight'] = 400, verticalAlign: 'top' | 'middle' = 'middle'
  ): WidgetLabelBox => ({ x, y, width: Math.max(1, width), height: Math.max(1, height), align, verticalAlign, size, weight, ink });
  const widget = node.content.widget;
  switch (widget) {
    // Items widgets edit `A | B | C` over the whole control; boxed ones draw on their fill.
    case 'navbar': case 'tabbar': case 'menu': case 'accordion': case 'sidebar': return box(0, 0, w, h, 'text', 'center');
    case 'tabs': case 'segmented': case 'stepper': case 'breadcrumbs': case 'pagination': case 'list': return box(0, 0, w, h, 'ink', 'center');
    case 'button': return box(0, 0, w, h, node.content.variant === 'primary' ? 'onAccent' : 'text', 'center', BODY, 600);
    case 'input': return box(12, 0, w - 24, h, 'text');
    case 'search': return box(34, 0, w - 46, h, 'text');
    case 'dropdown': return box(12, 0, w - 44, h, 'text');
    case 'textarea': return box(12, 8, w - 24, h - 16, 'text', 'start', BODY, 400, 'top');
    case 'checkbox': { const size = Math.min(16, h); return box(size + 8, 0, w - size - 8, h, 'ink'); }
    case 'radio': { const size = Math.min(8, h / 2) * 2; return box(size + 8, 0, w - size - 8, h, 'ink'); }
    case 'toggle': { const track = Math.min(20, h) * 1.8; return box(track + 10, 0, w - track - 10, h, 'ink'); }
    case 'slider': return box(0, 0, w * 0.4, h, 'ink');
    case 'heading': return box(0, 0, w, h, 'ink', 'start', Math.max(14, Math.min(40, h * 0.62)), 700);
    case 'paragraph': return box(0, 0, w, h, 'ink', 'start', BODY, 400, 'top');
    case 'link': return box(0, 0, w, h, 'accent', 'start', BODY, 500);
    case 'badge': return box(0, 0, w, h, 'onAccent', 'center', SMALL, 600);
    case 'card': { const media = Math.max(0, Math.min(h * 0.5, h - 72)); return box(14, media + 14, w - 28, 20, 'text', 'start', 14, 600); }
    case 'alert': return box(38, 0, w - 50, h, 'ink', 'start', BODY, 500);
    case 'tooltip': return box(0, 0, w, Math.max(12, h - 8), 'surface', 'center', 12, 500);
    case 'datepicker': return box(14, 12, w - 70, 20, 'text', 'start', BODY, 600);
    case 'statusbar': return box(16, 0, w / 2, h, 'ink', 'start', 12, 600);
    case 'image': case 'avatar': case 'divider': case 'progress': case 'rating': case 'fab': return null;
  }
}

// ---------------------------------------------------------------------------
// Geometry. Everything below is node-local, top-left origin, in world units.
// ---------------------------------------------------------------------------

type WidgetValues = Omit<WidgetPresentation, 'primitives'>;
type Draw = WidgetPrimitive[];

const BODY = 13;
const SMALL = 11;

// ponytail: text width is estimated per character class (Inter-like advance
// widths, ±10%), not measured — the domain has no font metrics. Upgrade path:
// inject a measure function like FamilyContext.measureLabel.
const NARROW = /[ijlI.,:;'!|ftr ()[\]]/;
const WIDE = /[mwMW@%]/;
export function estimateTextWidth(text: string, size: number): number {
  let em = 0;
  for (const char of text) {
    em += NARROW.test(char) ? 0.3 : WIDE.test(char) ? 0.86 : /[A-Z0-9#$&]/.test(char) ? 0.64 : 0.54;
  }
  return em * size;
}

/** Cut a line to fit `width`, ending in an ellipsis. */
function fit(text: string, width: number, size: number): string {
  if (estimateTextWidth(text, size) <= width) return text;
  let cut = text.length;
  while (cut > 0 && estimateTextWidth(`${text.slice(0, cut).trimEnd()}…`, size) > width) cut -= 1;
  return cut === 0 ? '' : `${text.slice(0, cut).trimEnd()}…`;
}

/** Greedy word wrap on the same estimate; the last line that fits ends in an ellipsis. */
export function wrapText(text: string, width: number, size: number, maxLines: number): string[] {
  const lines: string[] = [];
  let line = '';
  for (const word of text.split(/\s+/).filter(Boolean)) {
    const next = line ? `${line} ${word}` : word;
    if (estimateTextWidth(next, size) <= width || !line) { line = next; continue; }
    lines.push(line);
    line = word;
  }
  if (line) lines.push(line);
  if (lines.length <= maxLines) return lines.map((entry) => fit(entry, width, size));
  const kept = lines.slice(0, Math.max(0, maxLines));
  if (kept.length > 0) kept[kept.length - 1] = fit(`${kept[kept.length - 1]!}…`, width, size);
  return kept;
}

const rect = (x: number, y: number, width: number, height: number, radius: number, paint: Paint): WidgetPrimitive =>
  ({ kind: 'rect', x, y, width: Math.max(0, width), height: Math.max(0, height), radius, ...paint });
const circle = (x: number, y: number, radius: number, paint: Paint): WidgetPrimitive =>
  ({ kind: 'circle', x, y, radius: Math.max(0, radius), ...paint });
const path = (points: readonly Point2d[], paint: Paint, closed = false): WidgetPrimitive =>
  ({ kind: 'path', points, closed, ...paint });
const text = (
  x: number, y: number, value: string, ink: WidgetInk, size = BODY,
  weight: 400 | 500 | 600 | 700 = 400, anchor: 'start' | 'middle' | 'end' = 'start'
): WidgetPrimitive => ({ kind: 'text', x, y, text: value, ink, size, weight, anchor });
const line = (x1: number, y1: number, x2: number, y2: number, ink: WidgetInk, width = 1.5): WidgetPrimitive =>
  path([{ x: x1, y: y1 }, { x: x2, y: y2 }], { stroke: ink, strokeWidth: width });

/** A boxed field: border, fill, and the text it holds. */
function field(size: Size2d, value: string, left: number, right: number): Draw {
  return [
    rect(0, 0, size.width, size.height, 6, { fill: 'surface', stroke: 'line' }),
    text(left, size.height / 2, fit(value, size.width - left - right, BODY), 'subtle'),
  ];
}

function chevronDown(x: number, y: number, ink: WidgetInk): WidgetPrimitive {
  return path([{ x: x - 4, y: y - 2 }, { x, y: y + 2 }, { x: x + 4, y: y - 2 }], { stroke: ink, strokeWidth: 1.5 });
}

function magnifier(x: number, y: number, ink: WidgetInk): Draw {
  return [circle(x, y, 5, { stroke: ink, strokeWidth: 1.5 }), line(x + 3.6, y + 3.6, x + 7.5, y + 7.5, ink)];
}

function check(x: number, y: number, s: number, ink: WidgetInk): WidgetPrimitive {
  return path([{ x: x - s * 0.5, y }, { x: x - s * 0.1, y: y + s * 0.4 }, { x: x + s * 0.55, y: y - s * 0.4 }], { stroke: ink, strokeWidth: 2 });
}

function star(cx: number, cy: number, r: number): Point2d[] {
  return Array.from({ length: 10 }, (_, index) => {
    const radius = index % 2 === 0 ? r : r * 0.45;
    const angle = -Math.PI / 2 + (index * Math.PI) / 5;
    return { x: cx + radius * Math.cos(angle), y: cy + radius * Math.sin(angle) };
  });
}

/** Evenly spaced columns of `count` over `width`, centre x of each. */
function columns(width: number, count: number): number[] {
  return Array.from({ length: count }, (_, index) => (width / count) * (index + 0.5));
}

function severityGlyph(x: number, y: number, ink: WidgetInk): Draw {
  return [circle(x, y, 8, { fill: ink }), text(x, y, '!', 'onAccent', SMALL, 700, 'middle')];
}

function widgetPrimitives(state: WidgetValues, size: Size2d): Draw {
  const { width: w, height: h } = size;
  const midY = h / 2;
  const items = state.items;
  switch (state.widget) {
    case 'button': {
      const primary = state.variant === 'primary';
      return [
        rect(0, 0, w, h, Math.min(8, h / 2), primary ? { fill: 'accent' } : { fill: 'surface', stroke: 'line' }),
        text(w / 2, midY, fit(state.label, w - 16, BODY), primary ? 'onAccent' : 'text', BODY, 600, 'middle'),
      ];
    }
    case 'input':
      return field(size, state.label, 12, 12);
    case 'search':
      return [...field(size, state.label, 34, 12), ...magnifier(16, midY - 1, 'subtle')];
    case 'dropdown':
      return [...field(size, state.label, 12, 32), chevronDown(w - 16, midY, 'subtle')];
    case 'textarea':
      return [
        rect(0, 0, w, h, 6, { fill: 'surface', stroke: 'line' }),
        ...wrapText(state.label, w - 24, BODY, Math.max(1, Math.floor((h - 16) / 19)))
          .map((entry, index) => text(12, 18 + index * 19, entry, 'subtle')),
        line(w - 14, h - 5, w - 5, h - 14, 'subtle', 1),
        line(w - 9, h - 5, w - 5, h - 9, 'subtle', 1),
      ];
    case 'checkbox': {
      const box = Math.min(16, h);
      return [
        rect(0, midY - box / 2, box, box, 3, state.checked ? { fill: 'accent' } : { fill: 'surface', stroke: 'line' }),
        ...(state.checked ? [check(box / 2, midY, box * 0.55, 'onAccent')] : []),
        text(box + 8, midY, fit(state.label, w - box - 8, BODY), 'ink'),
      ];
    }
    case 'radio': {
      const r = Math.min(8, h / 2);
      return [
        circle(r, midY, r, { fill: 'surface', stroke: state.checked ? 'accent' : 'line', strokeWidth: state.checked ? 2 : 1.5 }),
        ...(state.checked ? [circle(r, midY, r * 0.45, { fill: 'accent' })] : []),
        text(r * 2 + 8, midY, fit(state.label, w - r * 2 - 8, BODY), 'ink'),
      ];
    }
    case 'toggle': {
      const trackH = Math.min(20, h);
      const trackW = trackH * 1.8;
      const knob = trackH / 2 - 2.5;
      const on = state.checked;
      return [
        rect(0, midY - trackH / 2, trackW, trackH, trackH / 2, on ? { fill: 'accent' } : { fill: 'faint', stroke: 'line' }),
        circle(on ? trackW - trackH / 2 : trackH / 2, midY, knob, on ? { fill: 'onAccent' } : { fill: 'surface', stroke: 'line', strokeWidth: 1 }),
        text(trackW + 10, midY, fit(state.label, w - trackW - 10, BODY), 'ink'),
      ];
    }
    case 'slider': {
      const left = state.label ? Math.min(w * 0.4, estimateTextWidth(state.label, BODY) + 12) : 8;
      const right = w - 8;
      const at = left + (right - left) * state.value;
      return [
        ...(state.label ? [text(0, midY, fit(state.label, left - 12, BODY), 'ink')] : []),
        rect(left, midY - 2, right - left, 4, 2, { fill: 'faint' }),
        rect(left, midY - 2, at - left, 4, 2, { fill: 'accent' }),
        circle(at, midY, Math.min(8, h / 2), { fill: 'surface', stroke: 'accent', strokeWidth: 2 }),
      ];
    }
    case 'progress':
      return [
        rect(0, 0, w, h, h / 2, { fill: 'faint' }),
        rect(0, 0, w * state.value, h, h / 2, { fill: 'accent' }),
      ];
    case 'navbar': {
      const xs = columns(w, Math.max(1, items.length));
      return [
        rect(0, 0, w, h, 8, { fill: 'surface', stroke: 'line' }),
        ...items.map((item, index) => text(xs[index]!, midY, fit(item, w / items.length - 12, BODY),
          index === state.active ? 'text' : 'subtle', BODY, index === state.active ? 600 : 400, 'middle')),
      ];
    }
    case 'tabs': {
      const tabWidth = w / Math.max(1, items.length);
      return [
        line(0, h - 1, w, h - 1, 'faint', 1),
        ...items.flatMap((item, index) => [
          text(tabWidth * (index + 0.5), midY, fit(item, tabWidth - 12, BODY),
            index === state.active ? 'ink' : 'muted', BODY, index === state.active ? 600 : 400, 'middle'),
          ...(index === state.active ? [rect(tabWidth * index + 8, h - 2.5, tabWidth - 16, 2.5, 1, { fill: 'accent' })] : []),
        ]),
      ];
    }
    case 'segmented': {
      const segment = (w - 6) / Math.max(1, items.length);
      return [
        rect(0, 0, w, h, 8, { fill: 'faint' }),
        ...(state.active >= 0 && state.active < items.length
          ? [rect(3 + segment * state.active, 3, segment, h - 6, 6, { fill: 'surface', stroke: 'line', strokeWidth: 1 })] : []),
        ...items.map((item, index) => text(3 + segment * (index + 0.5), midY, fit(item, segment - 10, BODY),
          index === state.active ? 'text' : 'muted', BODY, index === state.active ? 600 : 400, 'middle')),
      ];
    }
    case 'tabbar': {
      const xs = columns(w, Math.max(1, items.length));
      return [
        rect(0, 0, w, h, 0, { fill: 'surface' }),
        line(0, 0.5, w, 0.5, 'line', 1),
        ...items.flatMap((item, index) => {
          const ink: WidgetInk = index === state.active ? 'accent' : 'subtle';
          return [
            rect(xs[index]! - 8, h * 0.22, 16, 16, 4, { stroke: ink, strokeWidth: 1.5 }),
            text(xs[index]!, h * 0.22 + 26, fit(item, w / items.length - 8, SMALL), ink, SMALL, index === state.active ? 600 : 400, 'middle'),
          ];
        }),
      ];
    }
    case 'statusbar':
      return [
        text(16, midY, fit(state.label, w / 2, 12), 'ink', 12, 600),
        ...[0, 1, 2, 3].map((index) => rect(w - 62 + index * 5, midY + 4 - (index + 1) * 2.5, 3, (index + 1) * 2.5, 0.5, { fill: 'ink' })),
        rect(w - 36, midY - 5, 20, 10, 2.5, { stroke: 'ink', strokeWidth: 1 }),
        rect(w - 34, midY - 3, 13, 6, 1.5, { fill: 'ink' }),
      ];
    case 'image': {
      const s = Math.min(w, h);
      const cx = w / 2;
      const cy = h / 2;
      return [
        rect(0, 0, w, h, 6, { fill: 'faint', stroke: 'line', strokeWidth: 1 }),
        circle(cx + s * 0.14, cy - s * 0.14, s * 0.07, { stroke: 'muted', strokeWidth: 1.5 }),
        path([
          { x: cx - s * 0.3, y: cy + s * 0.2 }, { x: cx - s * 0.08, y: cy - s * 0.04 },
          { x: cx + s * 0.06, y: cy + s * 0.1 }, { x: cx + s * 0.14, y: cy + s * 0.03 },
          { x: cx + s * 0.3, y: cy + s * 0.2 },
        ], { stroke: 'muted', strokeWidth: 1.5 }),
      ];
    }
    case 'avatar': {
      const r = Math.min(h, w) / 2;
      const cx = w / 2;
      return [
        circle(cx, midY, r, { fill: 'faint', stroke: 'line', strokeWidth: 1 }),
        circle(cx, midY - r * 0.18, r * 0.32, { fill: 'muted' }),
        path(Array.from({ length: 13 }, (_, index) => {
          const angle = Math.PI + (index / 12) * Math.PI;
          return { x: cx + Math.cos(angle) * r * 0.55, y: midY + r * 0.68 + Math.sin(angle) * r * 0.42 };
        }), { fill: 'muted' }, true),
      ];
    }
    case 'heading': {
      const size = Math.max(14, Math.min(40, h * 0.62));
      return [text(0, midY, fit(state.label, w, size), 'ink', size, 700)];
    }
    case 'paragraph':
      return wrapText(state.label, w, BODY, Math.max(1, Math.floor(h / 19)))
        .map((entry, index) => text(0, 9.5 + index * 19, entry, 'muted'));
    case 'divider':
      return [line(0, midY, w, midY, 'line', 1)];
    case 'link': {
      const shown = fit(state.label, w, BODY);
      return [
        text(0, midY, shown, 'accent', BODY, 500),
        line(0, midY + 8, Math.min(w, estimateTextWidth(shown, BODY)), midY + 8, 'accent', 1),
      ];
    }
    case 'stepper': {
      const xs = columns(w, Math.max(1, items.length));
      const r = 12;
      const cy = items.length > 0 && h >= 44 ? 14 : midY;
      return [
        ...xs.slice(1).map((x, index) => line(xs[index]! + r + 4, cy, x - r - 4, cy, index < state.active ? 'accent' : 'faint', 2)),
        ...items.flatMap((item, index) => {
          const done = index < state.active;
          const current = index === state.active;
          const x = xs[index]!;
          return [
            circle(x, cy, r, done || current ? { fill: 'accent' } : { fill: 'surface', stroke: 'line' }),
            done ? check(x, cy, 10, 'onAccent') : text(x, cy, String(index + 1), current ? 'onAccent' : 'subtle', SMALL, 600, 'middle'),
            ...(h >= 44 ? [text(x, cy + r + 13, fit(item, w / items.length - 8, SMALL), current ? 'ink' : 'muted', SMALL, current ? 600 : 400, 'middle')] : []),
          ];
        }),
      ];
    }
    case 'badge': {
      const tint: WidgetInk = state.variant && state.variant !== 'primary' ? state.variant : 'accent';
      return [
        rect(0, 0, w, h, h / 2, { fill: tint }),
        text(w / 2, midY, fit(state.label, w - 12, SMALL), 'onAccent', SMALL, 600, 'middle'),
      ];
    }
    case 'breadcrumbs': {
      const parts: Draw = [];
      let x = 0;
      items.forEach((item, index) => {
        const current = index === state.active || (state.active < 0 && index === items.length - 1);
        const shown = fit(item, Math.max(0, w - x), BODY);
        parts.push(text(x, midY, shown, current ? 'ink' : 'muted', BODY, current ? 600 : 400));
        x += estimateTextWidth(shown, BODY) + 8;
        if (index < items.length - 1) {
          parts.push(path([{ x, y: midY - 4 }, { x: x + 4, y: midY }, { x, y: midY + 4 }], { stroke: 'muted', strokeWidth: 1.5 }));
          x += 12;
        }
      });
      return parts;
    }
    case 'pagination': {
      const cells = items.length + 2;
      const cell = Math.min(h, (w - (cells - 1) * 6) / cells);
      const at = (index: number) => index * (cell + 6);
      const arrow = (x: number, direction: 1 | -1) => path([
        { x: x + cell / 2 + 2 * direction, y: midY - 4 }, { x: x + cell / 2 - 2 * direction, y: midY }, { x: x + cell / 2 + 2 * direction, y: midY + 4 },
      ], { stroke: 'muted', strokeWidth: 1.5 });
      return [
        rect(0, midY - cell / 2, cell, cell, 6, { stroke: 'line', strokeWidth: 1 }),
        arrow(0, 1),
        ...items.flatMap((item, index) => {
          const x = at(index + 1);
          const current = index === state.active;
          return [
            rect(x, midY - cell / 2, cell, cell, 6, current ? { fill: 'accent' } : { stroke: 'line', strokeWidth: 1 }),
            text(x + cell / 2, midY, fit(item, cell - 4, SMALL), current ? 'onAccent' : 'ink', SMALL, current ? 600 : 400, 'middle'),
          ];
        }),
        rect(at(cells - 1), midY - cell / 2, cell, cell, 6, { stroke: 'line', strokeWidth: 1 }),
        arrow(at(cells - 1), -1),
      ];
    }
    case 'rating': {
      const r = Math.min(h / 2, w / 10) - 1;
      const filled = Math.round(state.value * 5);
      return Array.from({ length: 5 }, (_, index) => path(star(r + 1 + index * (w - r * 2 - 2) / 4, midY, r),
        index < filled ? { fill: 'warning' } : { stroke: 'line', strokeWidth: 1.25 }, true));
    }
    case 'card': {
      const media = Math.max(0, Math.min(h * 0.5, h - 72));
      return [
        rect(0, 0, w, h, 10, { fill: 'surface', stroke: 'line' }),
        ...(media > 0 ? [rect(1, 1, w - 2, media, 9, { fill: 'faint' })] : []),
        text(14, media + 24, fit(state.label, w - 28, 14), 'text', 14, 600),
        rect(14, media + 42, (w - 28) * 0.9, 6, 3, { fill: 'subtle', opacity: 0.35 }),
        rect(14, media + 54, (w - 28) * 0.6, 6, 3, { fill: 'subtle', opacity: 0.35 }),
      ];
    }
    case 'list':
    case 'menu': {
      const boxed = state.widget === 'menu';
      const pad = boxed ? 6 : 0;
      const row = (h - pad * 2) / Math.max(1, items.length);
      return [
        ...(boxed ? [rect(0, 0, w, h, 8, { fill: 'surface', stroke: 'line' })] : []),
        ...items.flatMap((item, index) => {
          const y = pad + row * index;
          const current = index === state.active;
          const ink: WidgetInk = boxed ? 'text' : 'ink';
          return [
            ...(current ? [rect(pad, y, w - pad * 2, row, 6, { fill: 'accent', opacity: 0.12 })] : []),
            ...(boxed ? [] : [circle(8, y + row / 2, 3, { fill: 'muted' })]),
            text(boxed ? 14 : 20, y + row / 2, fit(item, w - 28, BODY), current ? 'accent' : ink, BODY, current ? 600 : 400),
            ...(!boxed && index < items.length - 1 ? [line(0, y + row, w, y + row, 'faint', 1)] : []),
          ];
        }),
      ];
    }
    case 'alert': {
      const tint: WidgetInk = state.variant && state.variant !== 'primary' ? state.variant : 'info';
      return [
        rect(0, 0, w, h, 8, { fill: tint, opacity: 0.12 }),
        rect(0, 0, w, h, 8, { stroke: tint, strokeWidth: 1 }),
        ...severityGlyph(20, midY, tint),
        text(38, midY, fit(state.label, w - 50, BODY), 'ink', BODY, 500),
      ];
    }
    case 'tooltip': {
      const body = Math.max(12, h - 8);
      return [
        // Inverted from the widget's own fill, so it stays readable on either canvas.
        rect(0, 0, w, body, 6, { fill: 'text' }),
        path([{ x: w / 2 - 6, y: body }, { x: w / 2, y: h }, { x: w / 2 + 6, y: body }], { fill: 'text' }, true),
        text(w / 2, body / 2, fit(state.label, w - 16, 12), 'surface', 12, 500, 'middle'),
      ];
    }
    case 'accordion': {
      const header = Math.min(40, h / Math.max(1, items.length));
      const open = state.active >= 0 && state.active < items.length ? state.active : -1;
      const body = open >= 0 ? Math.max(0, h - header * items.length) : 0;
      const parts: Draw = [rect(0, 0, w, h, 8, { fill: 'surface', stroke: 'line' })];
      let y = 0;
      items.forEach((item, index) => {
        if (index > 0) parts.push(line(0, y, w, y, 'line', 1));
        parts.push(text(14, y + header / 2, fit(item, w - 44, BODY), 'text', BODY, index === open ? 600 : 400));
        parts.push(index === open
          ? path([{ x: w - 20, y: y + header / 2 + 2 }, { x: w - 16, y: y + header / 2 - 2 }, { x: w - 12, y: y + header / 2 + 2 }], { stroke: 'subtle', strokeWidth: 1.5 })
          : chevronDown(w - 16, y + header / 2, 'subtle'));
        y += header;
        if (index === open && body > 0) {
          for (let row = 0; row * 14 + 22 < body; row += 1) {
            parts.push(rect(14, y + 10 + row * 14, (w - 28) * (row % 2 === 0 ? 0.92 : 0.7), 6, 3, { fill: 'subtle', opacity: 0.35 }));
          }
          y += body;
        }
      });
      return parts;
    }
    case 'datepicker': {
      const top = 44;
      const cellW = (w - 16) / 7;
      const cellH = Math.max(12, (h - top - 26) / 6);
      const day = state.active;
      const parts: Draw = [
        rect(0, 0, w, h, 10, { fill: 'surface', stroke: 'line' }),
        text(14, 22, fit(state.label, w - 70, BODY), 'text', BODY, 600),
        path([{ x: w - 44, y: 18 }, { x: w - 48, y: 22 }, { x: w - 44, y: 26 }], { stroke: 'subtle', strokeWidth: 1.5 }),
        path([{ x: w - 20, y: 18 }, { x: w - 16, y: 22 }, { x: w - 20, y: 26 }], { stroke: 'subtle', strokeWidth: 1.5 }),
        ...['S', 'M', 'T', 'W', 'T', 'F', 'S'].map((letter, index) => text(8 + cellW * (index + 0.5), top, letter, 'subtle', SMALL, 600, 'middle')),
      ];
      // ponytail: the month always starts on a Tuesday with 30 days — a wireframe, not a calendar.
      for (let date = 1; date <= 30; date += 1) {
        const slot = date + 1;
        const x = 8 + cellW * ((slot % 7) + 0.5);
        const y = top + 20 + cellH * (Math.floor(slot / 7) + 0.5);
        if (date === day) parts.push(circle(x, y, Math.min(cellW, cellH) / 2 - 1, { fill: 'accent' }));
        parts.push(text(x, y, String(date), date === day ? 'onAccent' : 'text', SMALL, date === day ? 600 : 400, 'middle'));
      }
      return parts;
    }
    case 'sidebar': {
      const row = 36;
      return [
        rect(0, 0, w, h, 0, { fill: 'surface' }),
        line(w - 0.5, 0, w - 0.5, h, 'line', 1),
        ...items.slice(0, Math.max(0, Math.floor((h - 16) / row))).flatMap((item, index) => {
          const y = 12 + index * row;
          const current = index === state.active;
          return [
            ...(current ? [rect(8, y, w - 16, row - 4, 6, { fill: 'accent', opacity: 0.12 })] : []),
            rect(18, y + (row - 4) / 2 - 6, 12, 12, 3, { stroke: current ? 'accent' : 'subtle', strokeWidth: 1.5 }),
            text(40, y + (row - 4) / 2, fit(item, w - 52, BODY), current ? 'accent' : 'text', BODY, current ? 600 : 400),
          ];
        }),
      ];
    }
    case 'fab': {
      const r = Math.min(w, h) / 2;
      return [
        circle(w / 2, h / 2, r, { fill: 'accent' }),
        line(w / 2 - r * 0.36, h / 2, w / 2 + r * 0.36, h / 2, 'onAccent', 2),
        line(w / 2, h / 2 - r * 0.36, w / 2, h / 2 + r * 0.36, 'onAccent', 2),
      ];
    }
  }
}

/** Screen-reader name: "Toggle 'Dark mode', on". */
export function describeWidget(presentation: WidgetPresentation): string {
  const spec = WIDGETS[presentation.widget];
  const label = presentation.label ? ` '${presentation.label}'` : '';
  const state = spec.state === 'checked' ? (presentation.checked ? ', on' : ', off')
    : spec.state === 'value' ? `, ${Math.round(presentation.value * 100)}%`
      : spec.state === 'active' && presentation.active >= 0
        ? `, ${presentation.items[presentation.active] ?? presentation.active} selected`
        : spec.state === 'variant' && presentation.variant ? `, ${presentation.variant}` : '';
  return `Wireframe ${spec.name.toLowerCase()}${label}${state}`;
}
