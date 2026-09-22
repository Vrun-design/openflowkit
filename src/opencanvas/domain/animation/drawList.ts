import type { SceneNode, ScenePage } from '../document/types';
import type { Bounds2d, Matrix2d, Point2d } from '../geometry/types';
import type { ConnectorMarkerGlyph, ConnectorPathCommand, ProjectedConnector } from '../connectors/types';
import { multiplyMatrices } from '../geometry/matrix';
import { polylineLength } from '../geometry/polyline';
import { buildNodeStateMap } from '../scene/nodeState';
import { buildNodeWorldMatrices } from '../scene/worldGeometry';
import { projectPageConnectors } from '../connectors/routeProjection';
import { connectorMarkerShapes, type MarkerShape } from '../connectors/markers';
import { resolveBasicNodePresentation } from '../nodes/basicNodePresentation';
import { basicNodeDecorations } from '../nodes/basicNodeDecorations';
import { basicNodeOutlinePoints } from '../nodes/basicNodeOutline';
import { isContainerNodeKind } from '../nodes/containerNodePresentation';
import { resolveNodeSizingPolicy } from '../node-sizing/model';
import { FONT_STACKS, resolveNodeStyle, type NodeStyle } from '../nodes/nodeStyle';
import { cameraFitMatrix } from './camera';
import { PULSE_DASH } from './frame';
import type { ElementFrameState, FrameState } from './types';

/**
 * One frame as an ordered, renderer-neutral draw list: what the SVG exporter
 * would emit for `frameAt(timeline, t)`, in the order it emits it, with every
 * transform resolved. The motion worker paints it into its own canvas, so a
 * video frame never touches the main thread's SVG rasteriser. Nothing here
 * invents geometry — shapes, outlines, decorations, markers, colours and fonts
 * all come from the resolvers the Pixi renderer and `canonicalSvg` read.
 *
 * A visible node the canvas cannot draw (chart, ink, image, annotation, the
 * architecture/wireframe/sequence families) marks the whole frame `fallback`:
 * one rule, no per-kind negotiation.
 *
 * ponytail: one chart or ink stroke in a page sends every frame back to the
 * SVG raster — upgrade = a per-node raster cache for the exotic kinds only.
 */

export type DrawTheme = 'light' | 'dark' | 'print';

export interface DrawPaint {
  readonly color: string;
  readonly alpha: number;
}

export interface DrawShadow {
  readonly color: string;
  readonly alpha: number;
  /** Canvas blur radius: `feDropShadow` stdDeviation 2.5 × 2. */
  readonly blur: number;
  readonly offsetX: number;
  readonly offsetY: number;
}

interface DrawOpBase {
  /** Local space → world; the walkthrough camera is already folded in. */
  readonly transform: Matrix2d;
  readonly opacity: number;
  /** Node-local polygon the op is clipped to (sizing `clipContent`). */
  readonly clip: readonly Point2d[] | null;
}

export interface DrawRectOp extends DrawOpBase {
  readonly kind: 'rect';
  readonly x: number;
  readonly y: number;
  readonly width: number;
  readonly height: number;
  readonly radius: number;
  readonly fill: DrawPaint | null;
  readonly stroke: DrawPaint | null;
  readonly strokeWidth: number;
}

export interface DrawPathOp extends DrawOpBase {
  readonly kind: 'path';
  readonly commands: readonly ConnectorPathCommand[];
  readonly closed: boolean;
  readonly fill: DrawPaint | null;
  readonly stroke: DrawPaint | null;
  readonly strokeWidth: number;
  readonly dash: readonly number[];
  readonly dashOffset: number;
  readonly lineJoin: 'miter' | 'round';
  readonly shadow: DrawShadow | null;
}

export interface DrawTextOp extends DrawOpBase {
  readonly kind: 'text';
  readonly text: string;
  readonly x: number;
  readonly y: number;
  readonly fontSize: number;
  readonly fontFamily: string;
  readonly fontWeight: string | number;
  readonly fontStyle: 'normal' | 'italic';
  /** Pixels; the exporter emits `letterSpacing × fontSize`. */
  readonly letterSpacing: number;
  readonly align: 'start' | 'center' | 'end';
  readonly baseline: 'hanging' | 'middle' | 'alphabetic';
  readonly color: string;
  /** Rule under or through the text, in local coordinates. */
  readonly decoration: { readonly y: number; readonly thickness: number } | null;
}

/** Any visible node the canvas renderer does not cover; the frame goes to SVG. */
export interface DrawFallbackOp {
  readonly kind: 'fallback';
}

export type DrawOp = DrawRectOp | DrawPathOp | DrawTextOp | DrawFallbackOp;

const IDENTITY: Matrix2d = { a: 1, b: 0, c: 0, d: 1, tx: 0, ty: 0 };

const BACKGROUNDS: Readonly<Record<DrawTheme, string>> = {
  light: '#ffffff', dark: '#020617', print: '#ffffff',
};
const CONNECTOR_STROKES: Readonly<Record<DrawTheme, string>> = {
  light: '#475569', dark: '#cbd5e1', print: '#475569',
};
const CONNECTOR_LABELS: Readonly<Record<DrawTheme, string>> = {
  light: '#0f172a', dark: '#f8fafc', print: '#0f172a',
};
const SHADOW: DrawShadow = { color: '#0f172a', alpha: 0.18, blur: 5, offsetX: 0, offsetY: 2 };

/** Mirrors `canonicalSvg.safeColor`: user JSON can hold any string, and a bad
 *  one silently poisons a canvas style for every later op. */
function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^(?:#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(value)
    ? value
    : fallback;
}

function paint(color: string, alpha = 1): DrawPaint {
  return { color, alpha };
}

/** `M`/`L` per subpath, the same path data `openPathData`/`pathData` build. */
function subpathCommands(subpaths: readonly (readonly Point2d[])[]): readonly ConnectorPathCommand[] {
  return subpaths.flatMap((points) => points.map((point, index) => ({
    kind: index === 0 ? ('move' as const) : ('line' as const),
    point,
  })));
}

function popAbout(center: Point2d, scale: number): Matrix2d {
  return { a: scale, b: 0, c: 0, d: scale, tx: center.x * (1 - scale), ty: center.y * (1 - scale) };
}

/** The `text-decoration` rule, offset from the alphabetic baseline the chosen
 *  baseline implies — canvas has no native decoration. */
function decorationOf(style: NodeStyle, baselineY: number): DrawTextOp['decoration'] {
  if (style.textDecoration === 'none') return null;
  return {
    y: style.textDecoration === 'underline'
      ? baselineY + style.fontSize * 0.1
      : baselineY - style.fontSize * 0.28,
    thickness: Math.max(1, style.fontSize / 14),
  };
}

/** One label line, placed exactly as `labelElement` places it. */
function labelOp(
  transform: Matrix2d, style: NodeStyle, size: { readonly width: number; readonly height: number },
  text: string, opacity: number, clip: readonly Point2d[] | null,
): DrawTextOp {
  const x = style.textAlign === 'start' ? style.textPadding
    : style.textAlign === 'end' ? size.width - style.textPadding
      : size.width / 2;
  const baseline: DrawTextOp['baseline'] = style.textVerticalAlign === 'top' ? 'hanging'
    : style.textVerticalAlign === 'bottom' ? 'alphabetic'
      : 'middle';
  const y = style.textVerticalAlign === 'top' ? style.textPadding
    : style.textVerticalAlign === 'bottom' ? size.height - style.textPadding
      : size.height / 2;
  const baselineY = baseline === 'alphabetic' ? y
    : baseline === 'hanging' ? y + style.fontSize * 0.8
      : y + style.fontSize * 0.3;
  return {
    kind: 'text', transform, opacity, clip,
    text: text.replace(/\s+/g, ' ').trim(),
    x, y, baseline,
    fontSize: style.fontSize,
    fontFamily: FONT_STACKS[style.fontFamily],
    fontWeight: style.fontWeight,
    fontStyle: style.fontStyle,
    letterSpacing: style.letterSpacing * style.fontSize,
    align: style.textAlign === 'start' ? 'start' : style.textAlign === 'end' ? 'end' : 'center',
    color: style.textColor,
    decoration: decorationOf(style, baselineY),
  };
}

function outlineOf(node: SceneNode): readonly Point2d[] {
  const basic = resolveBasicNodePresentation(node);
  if (basic) {
    const customPath = typeof node.content.customSvgPath === 'string' ? node.content.customSvgPath : undefined;
    return basicNodeOutlinePoints(basic.shape, node.size, customPath);
  }
  return [
    { x: 0, y: 0 }, { x: node.size.width, y: 0 },
    { x: node.size.width, y: node.size.height }, { x: 0, y: node.size.height },
  ];
}

function shapeNodeOps(
  node: SceneNode, matrix: Matrix2d, state: ElementFrameState | undefined, theme: DrawTheme,
): readonly DrawOp[] {
  const style = resolveNodeStyle(node, BACKGROUNDS[theme]);
  const transform = state?.scale === undefined || state.scale === 1
    ? matrix
    : multiplyMatrices(matrix, popAbout({ x: node.size.width / 2, y: node.size.height / 2 }, state.scale));
  const opacity = (state?.opacity ?? 1) * style.opacity;
  const basic = resolveBasicNodePresentation(node);
  const outline = outlineOf(node);
  const ops: DrawOp[] = [{
    kind: 'path', transform, opacity, clip: null,
    commands: subpathCommands([outline]), closed: true,
    fill: style.fill === 'transparent' ? null : paint(style.fill),
    stroke: style.strokeWidth > 0 ? paint(style.stroke) : null,
    strokeWidth: style.strokeWidth,
    dash: style.dash, dashOffset: 0, lineJoin: 'miter',
    shadow: style.shadow ? SHADOW : null,
  }];
  if (basic && style.strokeWidth > 0 && style.stroke !== 'transparent') {
    for (const decoration of basicNodeDecorations(basic.shape, node.size)) {
      ops.push({
        kind: 'path', transform, opacity, clip: null,
        commands: subpathCommands([decoration]), closed: false,
        fill: null, stroke: paint(style.stroke), strokeWidth: style.strokeWidth,
        dash: style.dash, dashOffset: 0, lineJoin: 'miter', shadow: null,
      });
    }
  }
  const label = typeof node.content.label === 'string' ? node.content.label : node.id;
  const clip = resolveNodeSizingPolicy(node).clipContent ? outline : null;
  ops.push(labelOp(transform, style, node.size, label, opacity, clip));
  const subLabel = typeof node.content.subLabel === 'string' ? node.content.subLabel : '';
  if (subLabel) {
    const sub = labelOp(transform, style, node.size, subLabel, opacity * 0.72, clip);
    ops.push({ ...sub, y: sub.y + style.fontSize * 1.5, decoration: null });
  }
  return ops;
}

function directionBetween(from: Point2d, to: Point2d): Point2d {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > 1e-9 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
}

function markerOps(connector: ProjectedConnector, opacity: number, color: string): readonly DrawOp[] {
  const { samples, presentation } = connector;
  if (samples.length < 2) return [];
  const { width } = presentation.stroke;
  const stroke = paint(color, presentation.stroke.opacity);
  const shapeOp = (shape: MarkerShape): DrawOp => shape.kind === 'circle'
    ? {
      kind: 'rect', transform: IDENTITY, opacity, clip: null,
      x: shape.center.x - shape.radius, y: shape.center.y - shape.radius,
      width: shape.radius * 2, height: shape.radius * 2, radius: shape.radius,
      fill: null, stroke, strokeWidth: width,
    }
    : {
      kind: 'path', transform: IDENTITY, opacity, clip: null,
      commands: subpathCommands(shape.subpaths), closed: shape.closed,
      fill: shape.filled ? stroke : null,
      stroke: shape.filled ? null : stroke,
      strokeWidth: width, dash: [], dashOffset: 0,
      lineJoin: shape.round ? 'round' : 'miter', shadow: null,
    };
  const glyphs = (
    values: readonly ConnectorMarkerGlyph[], endpoint: Point2d, outward: Point2d,
  ): readonly DrawOp[] => values.flatMap((glyph, index) =>
    connectorMarkerShapes(glyph, endpoint, outward, index * 9).map(shapeOp));
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  return [
    ...glyphs(presentation.sourceMarkers, first, directionBetween(samples[1]!, first)),
    ...glyphs(presentation.targetMarkers, last, directionBetween(samples[samples.length - 2]!, last)),
  ];
}

/** The dash the frame state needs: pulse's travelling light, or draw-on. */
function connectorDash(
  connector: ProjectedConnector, state: ElementFrameState | undefined,
): { readonly dash: readonly number[]; readonly dashOffset: number } {
  const length = polylineLength(connector.samples);
  if (state?.pulsePhase !== undefined) {
    const [on, off] = PULSE_DASH.split(' ').map(Number);
    return { dash: [on! * length, off! * length], dashOffset: -state.pulsePhase * length };
  }
  if (state && state.drawProgress < 1) {
    return { dash: [length, length], dashOffset: (1 - state.drawProgress) * length };
  }
  return { dash: connector.presentation.stroke.dash, dashOffset: 0 };
}

function connectorOps(
  connector: ProjectedConnector, state: ElementFrameState | undefined, theme: DrawTheme,
): readonly DrawOp[] {
  const { presentation } = connector;
  const opacity = state?.opacity ?? 1;
  const { dash, dashOffset } = connectorDash(connector, state);
  const color = safeColor(presentation.stroke.color, CONNECTOR_STROKES[theme]);
  const ops: DrawOp[] = [{
    kind: 'path', transform: IDENTITY, opacity, clip: null,
    commands: connector.commands, closed: false,
    fill: null,
    stroke: paint(color, presentation.stroke.opacity),
    strokeWidth: presentation.stroke.width,
    dash, dashOffset, lineJoin: 'miter', shadow: null,
  }, ...markerOps(connector, opacity, color)];
  for (const label of connector.labels) {
    if (!label.text) continue;
    ops.push({
      kind: 'text', transform: IDENTITY, opacity, clip: null,
      text: label.text, x: label.point.x, y: label.point.y,
      fontSize: 11, fontFamily: 'system-ui,sans-serif', fontWeight: '400', fontStyle: 'normal',
      letterSpacing: 0, align: 'center', baseline: 'alphabetic',
      color: CONNECTOR_LABELS[theme], decoration: null,
    });
  }
  return ops;
}

/**
 * The canvas draws what the exporter's plain-node branch draws: basic shapes
 * (the shape library included) and containers. A text node is not drawable:
 * its font key resolves through the document's webfonts, which an
 * `<img>`-rendered SVG cannot see, so the canvas and the file would pick
 * different typefaces.
 *
 * ponytail: one text node sends the page back to the SVG raster with every
 * other exotic kind — upgrade = resolve font keys to a stack and emit that
 * stack from the exporter, so both sides read one font.
 */
function isCanvasDrawable(node: SceneNode): boolean {
  return isContainerNodeKind(node.kind) || resolveBasicNodePresentation(node) !== null;
}

function withCamera(op: DrawOp, camera: Matrix2d | null): DrawOp {
  if (op.kind === 'fallback' || !camera) return op;
  return { ...op, transform: multiplyMatrices(camera, op.transform) };
}

interface ProjectedPage {
  readonly nodes: readonly SceneNode[];
  readonly connectors: ReturnType<typeof projectPageConnectors>;
}

// Routing every connector around every node is the one expensive step in a
// frame, and it depends on the page alone — the frame only changes opacity,
// pop and dash. A page is immutable, so its identity is the cache key.
const projectionCache = new WeakMap<ScenePage, ProjectedPage>();

function projectPage(page: ScenePage): ProjectedPage {
  const cached = projectionCache.get(page);
  if (cached) return cached;
  const states = buildNodeStateMap(page);
  const nodes = page.nodes.filter((node) => states.get(node.id)?.visible === true);
  const visible = new Set(nodes.map((node) => node.id));
  const connectors = page.connectors.filter((connector) =>
    (connector.source.nodeId === null || visible.has(connector.source.nodeId))
    && (connector.target.nodeId === null || visible.has(connector.target.nodeId)));
  const projected = { nodes, connectors: projectPageConnectors({ ...page, connectors }) };
  projectionCache.set(page, projected);
  return projected;
}

/**
 * The frame's ops in paint order: background, connectors, nodes (zIndex then
 * id — the exporter's own order). The walkthrough camera is folded into every
 * op's transform except the background's, exactly like the SVG's root camera
 * group, so strokes scale with the glide the way the file does.
 */
export function frameDrawList(
  page: ScenePage, frame: FrameState, theme: DrawTheme, viewBox: Bounds2d,
): readonly DrawOp[] {
  const { nodes, connectors } = projectPage(page);
  if (nodes.some((node) => !isCanvasDrawable(node))) return [{ kind: 'fallback' }];
  const camera = frame.camera ? cameraFitMatrix(frame.camera, viewBox) : null;
  const ops: DrawOp[] = [{
    kind: 'rect', transform: IDENTITY, opacity: 1, clip: null,
    x: viewBox.x, y: viewBox.y, width: viewBox.width, height: viewBox.height, radius: 0,
    fill: paint(BACKGROUNDS[theme]), stroke: null, strokeWidth: 0,
  }];
  for (const connector of connectors) {
    ops.push(...connectorOps(connector, frame.connectors[connector.id], theme)
      .map((op) => withCamera(op, camera)));
  }
  const matrices = buildNodeWorldMatrices(page);
  const ordered = [...nodes].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id));
  for (const node of ordered) {
    const matrix = matrices.get(node.id);
    if (!matrix) continue;
    ops.push(...shapeNodeOps(node, matrix, frame.nodes[node.id], theme)
      .map((op) => withCamera(op, camera)));
  }
  return ops;
}
