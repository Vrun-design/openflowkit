import type { ScenePage, SceneNode } from '../../opencanvas/domain/document/types';
import type { Size2d } from '../../opencanvas/domain/geometry/types';
import type { JsonObject } from '../../opencanvas/domain/document/json';
import {
  FRAME_NAME_OFFSET, FRAME_PRESETS, FRAME_PRESET_SPECS, createPresetFrame, frameBottomInset, frameChromeInset, framePresetOf, isFramePreset,
  type FramePreset,
} from '../../opencanvas/domain/nodes/framePreset';
import { createWidgetNode } from '../../opencanvas/domain/nodes/widgetNode';
import {
  WIDGETS, WIDGET_KINDS, WIDGET_SEVERITIES, isWidgetKind, resolveWidgetPresentation, widgetItems, wrapText,
  type WidgetKind, type WidgetVariant,
} from '../../opencanvas/domain/nodes/widgetNodePresentation';
import { CONTAINER_TITLE_HEIGHT } from '../../opencanvas/domain/nodes/nodeLabelBounds';
import type { DslDiagnostic } from '../ast';
import { tokenDiagnostic } from '../diagnostics';
import { joinTokens, splitOnCommas, type DslSegment } from '../segments';
import type { DslFrameScene } from '../sceneMeta';
import { quote, slugifyDslId } from '../text';
import type { DslToken } from '../tokenize';
import type { Family, FamilyContext, FamilyScene } from './types';

// The `wireframe` family, in Koboyo's syntax so their text compiles unchanged:
//
//   wireframe
//   screen Login [phone] {
//     heading: Welcome back
//     input: Email [half]
//     toggle: Dark mode [on]
//   }
//
// A screen is a preset frame; a control is a widget. Controls stack down the
// screen's column; `half`, `third` and `two-thirds` share a row while their
// fractions fit. A tab bar pins to the bottom and a FAB floats above it.

/** A family compiles before any page exists; the nodes only need a layer list. */
const SCRATCH_PAGE: ScenePage = {
  id: 'dsl', name: 'dsl', diagramKind: 'wireframe',
  layers: [{ id: 'default', name: 'Layer 1', visible: true, locked: false }],
  nodes: [], connectors: [], metadata: {}, extensions: {},
};

type Width = 'full' | 'half' | 'third' | 'two-thirds';
const WIDTH_FRACTION: Readonly<Record<Width, number>> = { full: 1, half: 1 / 2, third: 1 / 3, 'two-thirds': 2 / 3 };
const WIDTH_WORDS: Readonly<Record<string, Width>> = {
  full: 'full', half: 'half', third: 'third', 'two-thirds': 'two-thirds', '1/2': 'half', '1/3': 'third', '2/3': 'two-thirds',
};

const PAD = 16;
const GAP = 12;
const SCREEN_GAP = 80;
const MARGIN = 24;

interface Control {
  readonly widget: WidgetKind;
  readonly label: string;
  readonly width: Width;
  readonly checked?: boolean;
  readonly value?: number;
  readonly active?: number;
  readonly variant?: WidgetVariant;
  readonly line: number;
}

interface Screen {
  readonly name: string;
  readonly preset: FramePreset;
  readonly controls: Control[];
  readonly line: number;
}

const fallbackToken = (segment: DslSegment): DslToken =>
  segment.tokens[0] ?? { kind: 'word', value: '', line: segment.line, col: segment.col, endCol: segment.endCol };

/** `kind: label [attrs]` → the label tokens and the attribute tokens, split at the trailing `[…]`. */
function splitAttributes(tokens: readonly DslToken[]): { body: readonly DslToken[]; attrs: readonly DslToken[] | null } {
  if (tokens.at(-1)?.value !== ']') return { body: tokens, attrs: null };
  let depth = 0;
  for (let index = tokens.length - 1; index >= 0; index -= 1) {
    if (tokens[index]!.kind !== 'string' && tokens[index]!.value === ']') depth += 1;
    if (tokens[index]!.kind !== 'string' && tokens[index]!.value === '[') depth -= 1;
    if (depth === 0) return { body: tokens.slice(0, index), attrs: tokens.slice(index + 1, -1) };
  }
  return { body: tokens, attrs: null };
}

/**
 * Label text exactly as written: joining tokens would space out `9:41` into
 * `9 : 41`. A lone quoted string is its unquoted value.
 */
function labelText(tokens: readonly DslToken[], lines: readonly string[]): string {
  const first = tokens[0];
  const last = tokens.at(-1);
  if (!first || !last) return '';
  if (tokens.length === 1 && first.kind === 'string') return first.value;
  if (first.line !== last.line) return joinTokens(tokens);
  return (lines[first.line - 1] ?? '').slice(first.col - 1, last.endCol - 1).trim();
}

function parseControl(segment: DslSegment, diagnostics: DslDiagnostic[], lines: readonly string[]): Control | null {
  const { body, attrs } = splitAttributes(segment.tokens);
  const word = body[0]?.value.toLowerCase() ?? '';
  if (!isWidgetKind(word)) {
    diagnostics.push(tokenDiagnostic('W141', 'warning', fallbackToken(segment),
      `Unknown wireframe control "${body[0]?.value ?? ''}"`, WIDGET_KINDS.join(', ')));
    return null;
  }
  const label = labelText(body.slice(body[1]?.value === ':' ? 2 : 1), lines);
  let control: Control = { widget: word, label, width: 'full', line: segment.line };
  for (const part of attrs ? splitOnCommas(attrs) : []) {
    const text = joinTokens(part).replace(/\s*:\s*/, ': ').trim();
    const lower = text.toLowerCase();
    const keyed = lower.match(/^(active|value): (.+)$/);
    const amount = (keyed?.[1] === 'value' ? keyed[2]! : lower).match(/^(\d+(?:\.\d+)?)(%?)$/);
    if (!text) continue;
    if (WIDTH_WORDS[lower]) control = { ...control, width: WIDTH_WORDS[lower]! };
    else if (lower === 'on' || lower === 'checked') control = { ...control, checked: true };
    else if (lower === 'off') control = { ...control, checked: false };
    else if (lower === 'primary' || (WIDGET_SEVERITIES as readonly string[]).includes(lower)) {
      control = { ...control, variant: lower as WidgetVariant };
    } else if (keyed?.[1] === 'active' && /^\d+$/.test(keyed[2]!)) control = { ...control, active: Number(keyed[2]) };
    else if (amount) {
      const value = Number(amount[1]) / (amount[2] || Number(amount[1]) > 1 ? 100 : 1);
      control = { ...control, value: Math.min(1, Math.max(0, value)) };
    } else {
      diagnostics.push(tokenDiagnostic('W142', 'warning', part[0] ?? fallbackToken(segment),
        `Unknown wireframe attribute "${text}"`, 'half, third, two-thirds, on, off, 60%, active: 1, primary, info, success, warning, error'));
    }
  }
  return control;
}

function parseScreens(segments: readonly DslSegment[], diagnostics: DslDiagnostic[], lines: readonly string[]): Screen[] {
  const screens: Screen[] = [];
  let open: Screen | null = null;
  for (const segment of segments) {
    if (segment.tokens[0]?.kind === 'comment') continue;
    if (segment.closes) {
      open = null;
      continue;
    }
    if (segment.tokens[0]?.value === 'screen') {
      const { body, attrs } = splitAttributes(segment.tokens.slice(1));
      const word = attrs ? joinTokens(attrs).toLowerCase() : 'phone';
      if (!isFramePreset(word)) {
        diagnostics.push(tokenDiagnostic('W143', 'warning', attrs?.[0] ?? fallbackToken(segment),
          `Unknown screen frame "${word}"; phone used`, FRAME_PRESETS.join(', ')));
      }
      const screen: Screen = {
        name: labelText(body, lines) || `Screen ${screens.length + 1}`,
        preset: isFramePreset(word) ? word : 'phone', controls: [], line: segment.line,
      };
      screens.push(screen);
      open = segment.opens ? screen : null;
      continue;
    }
    if (segment.tokens.length === 0) continue;
    // Controls outside a screen still render: they collect into one phone.
    if (!open) {
      open = { name: 'Screen', preset: 'phone', controls: [], line: segment.line };
      screens.push(open);
    }
    const control = parseControl(segment, diagnostics, lines);
    if (control) open.controls.push(control);
  }
  return screens;
}

/** A control's height: its default, or what its items or text need. */
function controlHeight(control: Control, width: number): number {
  const items = Math.max(1, widgetItems(control.label).length);
  const base = WIDGETS[control.widget].size.height;
  switch (control.widget) {
    case 'list': return items * 40;
    case 'menu': return items * 36 + 12;
    case 'sidebar': return Math.max(base, items * 36 + 24);
    case 'accordion': return items * 40 + (control.active === undefined ? 0 : 72);
    case 'paragraph': return Math.max(19, wrapText(control.label, width, 13, 99).length * 19);
    default: return base;
  }
}

interface Placed { readonly control: Control; readonly x: number; readonly y: number; readonly size: Size2d }

/** Stack a screen's controls; returns local rects and the screen size. */
function layoutScreen(screen: Screen): { placed: Placed[]; size: Size2d } {
  const spec = FRAME_PRESET_SPECS[screen.preset];
  const width = spec.size.width;
  const column = width - PAD * 2;
  const bottomInset = frameBottomInset(screen.preset);
  const placed: Placed[] = [];
  const flow = screen.controls.filter(({ widget }) => widget !== 'tabbar' && widget !== 'fab');
  let y = frameChromeInset(screen.preset) + PAD;
  for (let start = 0; start < flow.length;) {
    let used = 0;
    let end = start;
    while (end < flow.length && used + WIDTH_FRACTION[flow[end]!.width] <= 1 + 1e-6) used += WIDTH_FRACTION[flow[end++]!.width];
    const row = flow.slice(start, end);
    const cells = row.map((control) => {
      const cell = WIDTH_FRACTION[control.width] * (column + GAP) - GAP;
      const spec = WIDGETS[control.widget];
      const w = spec.intrinsic ? Math.min(spec.size.width, cell) : cell;
      return { control, cell, size: { width: w, height: controlHeight(control, w) } };
    });
    const rowHeight = Math.max(...cells.map(({ size }) => size.height));
    let x = PAD;
    for (const { control, cell, size } of cells) {
      placed.push({ control, x, y: y + (rowHeight - size.height) / 2, size });
      x += cell + GAP;
    }
    y += rowHeight + GAP;
    start = end;
  }
  const tabbar = screen.controls.find(({ widget }) => widget === 'tabbar');
  const tabbarHeight = tabbar ? WIDGETS.tabbar.size.height : 0;
  const height = Math.max(spec.size.height, y - GAP + PAD + tabbarHeight + bottomInset);
  if (tabbar) placed.push({ control: tabbar, x: 0, y: height - bottomInset - tabbarHeight, size: { width, height: tabbarHeight } });
  for (const fab of screen.controls.filter(({ widget }) => widget === 'fab')) {
    const size = WIDGETS.fab.size;
    placed.push({ control: fab, x: width - size.width - PAD, y: height - bottomInset - tabbarHeight - size.height - PAD, size });
  }
  return { placed, size: { width, height } };
}

function uniqueId(base: string, used: Set<string>): string {
  let id = base;
  for (let copy = 2; used.has(id); copy += 1) id = `${base}-${copy}`;
  used.add(id);
  return id;
}

export const wireframeFamily: Family = {
  name: 'wireframe',

  async compile(segments, context: FamilyContext): Promise<FamilyScene> {
    const screens = parseScreens(segments, context.diagnostics, context.text.replace(/\r\n?/g, '\n').split('\n'));
    const top = (context.title ? CONTAINER_TITLE_HEIGHT : 0) + FRAME_NAME_OFFSET + MARGIN;
    const used = new Set<string>();
    const nodes: SceneNode[] = [];
    let x = MARGIN;
    let bottom = top;
    for (const screen of screens) {
      const { placed, size } = layoutScreen(screen);
      const screenId = uniqueId(`screen-${slugifyDslId(screen.name)}`, used);
      const frame = createPresetFrame(SCRATCH_PAGE, { id: screenId, preset: screen.preset, at: { x, y: top }, size, label: screen.name });
      nodes.push({ ...frame, metadata: { dsl: { line: screen.line } } });
      placed.forEach(({ control, x: left, y, size: controlSize }, index) => {
        const node = createWidgetNode(SCRATCH_PAGE, {
          id: `${screenId}-${index + 1}`, widget: control.widget, at: { x: left, y }, size: controlSize, parentId: screenId,
        });
        // The text states exactly what the widget shows: no insert-time defaults.
        const content: JsonObject = {
          widget: control.widget, label: control.label,
          ...(control.checked === undefined ? {} : { checked: control.checked }),
          ...(control.value === undefined ? {} : { value: control.value }),
          ...(control.active === undefined ? {} : { active: control.active }),
          ...(control.variant === undefined ? {} : { variant: control.variant }),
        };
        nodes.push({ ...node, content, metadata: { dsl: { line: control.line, ...(control.width === 'full' ? {} : { width: control.width }) } } });
      });
      x += size.width + SCREEN_GAP;
      bottom = Math.max(bottom, top + size.height);
    }
    return {
      nodes,
      connectors: [],
      size: { width: Math.max(x - SCREEN_GAP + MARGIN, 160), height: bottom + MARGIN },
    };
  },

  serialize(scene: DslFrameScene): string[] {
    const screens = [...(scene.groups ?? [])]
      .filter((node) => framePresetOf(node))
      .sort((a, b) => a.transform.translation.x - b.transform.translation.x || a.transform.translation.y - b.transform.translation.y);
    return screens.flatMap((screen) => {
      const name = typeof screen.content.label === 'string' && screen.content.label ? screen.content.label : 'Screen';
      const controls = scene.nodes
        .filter((node) => node.parentId === screen.id && node.kind === 'widget')
        .sort((a, b) => a.transform.translation.y - b.transform.translation.y || a.transform.translation.x - b.transform.translation.x);
      return [
        `screen ${quote(name)} [${framePresetOf(screen)}] {`,
        ...controls.flatMap((node) => {
          const widget = resolveWidgetPresentation(node);
          return widget ? [`  ${controlText(node, widget)}`] : [];
        }),
        '}',
      ];
    });
  },
};

function controlText(node: SceneNode, widget: NonNullable<ReturnType<typeof resolveWidgetPresentation>>): string {
  const dsl = node.metadata.dsl as { width?: unknown } | undefined;
  const width = typeof dsl?.width === 'string' && dsl.width in WIDTH_FRACTION ? dsl.width : null;
  const content = node.content;
  const attrs = [
    ...(width ? [width] : []),
    ...(content.checked === true ? [widget.widget === 'toggle' ? 'on' : 'checked'] : content.checked === false ? ['off'] : []),
    ...(typeof content.value === 'number' ? [`${Math.round(widget.value * 100)}%`] : []),
    ...(typeof content.active === 'number' ? [`active: ${widget.active}`] : []),
    ...(widget.variant ? [widget.variant] : []),
  ];
  return `${widget.widget}${widget.label ? `: ${quote(widget.label)}` : ''}${attrs.length ? ` [${attrs.join(', ')}]` : ''}`;
}
