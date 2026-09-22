import { FONT_STACKS, resolveNodeStyle, type NodeStyle } from '../../domain/nodes/nodeStyle';
import { resolveAnnotationVisualStyle, resolveTextVisualStyle } from '@/theme';
import { nodePaletteName } from '../../domain/nodes/nodePalette';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { boundsFromPoints } from '../../domain/geometry/bounds';
import { boundsCorners } from '../../domain/geometry/bounds';
import type { Bounds2d, Matrix2d, Point2d, Size2d } from '../../domain/geometry/types';
import { resolveBasicNodePresentation, type BasicNodeShape } from '../../domain/nodes/basicNodePresentation';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import { basicNodeDecorations } from '../../domain/nodes/basicNodeDecorations';
import { resolveChartPresentation } from '../../domain/nodes/chartNodePresentation';
import type { ConnectorMarkerGlyph, ProjectedConnector } from '../../domain/connectors/types';
import { connectorMarkerShapes, type MarkerShape } from '../../domain/connectors/markers';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import {
  resolveFreeformNodePresentation,
  type AnnotationNodePresentation,
  type ImageNodePresentation,
  type StrokeNodePresentation,
  type TextNodePresentation,
} from '../../domain/nodes/freeformNodePresentation';
import { pressureTiltSegmentWidth } from '../../domain/nodes/strokeInput';
import { smoothStroke } from '../../domain/nodes/strokeGeometry';
import { projectPageConnectors } from '../../domain/connectors/routeProjection';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { buildNodeStateMap } from '../../domain/scene/nodeState';
import { resolveNodeSizingPolicy } from '../../domain/node-sizing/model';
import { cameraFitMatrix } from '../../domain/animation/camera';
import { PULSE_DASH } from '../../domain/animation/frame';
import type { ElementFrameState, FrameState } from '../../domain/animation/types';

export const SVG_BACKGROUND = { light: '#ffffff', dark: '#020617' } as const;

/** One CSS animation on an exported element; the keyframes live in `<style>`. */
export interface CssAnimation {
  readonly name: string;
  readonly durationMs: number;
  readonly delayMs: number;
  /** `both` holds the final keyframe; `backwards` reverts to the base look. */
  readonly fill?: 'both' | 'backwards' | 'none';
  readonly timing?: string;
  readonly iterationCount?: number | 'infinite';
}

export interface ElementAnimations {
  readonly group?: CssAnimation;
  /** Connector draw-on / travelling dash: needs `pathLength="1"` and a unit dash. */
  readonly path?: CssAnimation & { readonly dash: string };
}

export interface CanonicalSvgExportOptions {
  readonly pageId?: string;
  readonly selectedNodeIds?: readonly string[];
  readonly theme?: 'light' | 'dark' | 'print';
  readonly padding?: number;
  readonly pixelRatio?: number;
  /** Omit the background rectangle (transparent PNG / SVG). */
  readonly transparent?: boolean;
  /** Pause the export at one timeline frame; absent keeps the static output. */
  readonly frame?: FrameState;
  /** Per-element CSS animations, for the animated export. */
  readonly animations?: (kind: 'node' | 'connector', id: string) => ElementAnimations | undefined;
  /** Camera glide on the root group, for the animated walkthrough. */
  readonly cameraAnimation?: CssAnimation;
  /** Extra CSS inserted as the first child, before any artwork. */
  readonly styleSheet?: string;
}

export const ANIMATED_CLASS = 'ofk-anim';

function number(value: number): string {
  return Number(value.toFixed(3)).toString();
}

function xml(value: unknown): string {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&apos;',
  })[character]!);
}

function safeColor(value: unknown, fallback: string): string {
  return typeof value === 'string' && /^(?:#[0-9a-f]{3,8}|[a-z]{3,20})$/i.test(value)
    ? value : fallback;
}

function matrixAttribute(matrix: Matrix2d): string {
  return `matrix(${number(matrix.a)} ${number(matrix.b)} ${number(matrix.c)} ${number(matrix.d)} ${number(matrix.tx)} ${number(matrix.ty)})`;
}

/**
 * The same matrix as a CSS `transform` value. One formatter for the still and
 * the animated keyframes: identical strings, identical rendering.
 */
export function matrixCss(matrix: Matrix2d): string {
  return `matrix(${number(matrix.a)}, ${number(matrix.b)}, ${number(matrix.c)}, ${number(matrix.d)}, ${number(matrix.tx)}, ${number(matrix.ty)})`;
}

function cssAnimation(animation: CssAnimation): string {
  const iteration = animation.iterationCount === undefined ? '1' : String(animation.iterationCount);
  return `animation:${animation.name} ${number(animation.durationMs)}ms ${animation.timing ?? 'linear'} ${number(animation.delayMs)}ms ${iteration} ${animation.fill ?? 'both'}`;
}

/**
 * Scale about a point, as a CSS transform list. The wrapper sits inside the
 * node's group, so the point is node-local — no reference box, no origin
 * property, and the node's stroke is never clipped by a layer.
 */
export function scaleAbout(center: Point2d, scale: number): string {
  return `translate(${number(center.x)}px,${number(center.y)}px) scale(${number(scale)}) translate(${number(-center.x)}px,${number(-center.y)}px)`;
}

/**
 * The visible state of one element at a paused frame, as CSS on a wrapper
 * group. The animated export animates the same properties on the same group,
 * so a still and the animated SVG paused at the same time cannot drift.
 */
function elementFrameStyle(
  kind: 'node' | 'connector',
  id: string,
  state: ElementFrameState | undefined,
  size: Size2d | undefined,
  animations: CanonicalSvgExportOptions['animations']
): { readonly className: string; readonly style: string } | null {
  const animation = animations?.(kind, id)?.group;
  const declarations: string[] = [];
  if (animation) declarations.push(cssAnimation(animation));
  if (state && state.opacity < 1) declarations.push(`opacity:${number(state.opacity)}`);
  if (kind === 'node' && (animation || (state && state.scale !== 1))) {
    declarations.push('transform-origin:0 0');
  }
  if (kind === 'node' && state && state.scale !== 1 && size) {
    declarations.push(`transform:${scaleAbout({ x: size.width / 2, y: size.height / 2 }, state.scale)}`);
  }
  if (declarations.length === 0) return null;
  return {
    className: animation ? ` class="${ANIMATED_CLASS}"` : '',
    style: ` style="${declarations.join(';')}"`,
  };
}

/** Dash state a paused frame needs on the connector path, if any. */
function connectorPathDash(state: ElementFrameState | undefined): string {
  if (!state) return '';
  if (state.pulsePhase !== undefined) {
    return ` pathLength="1" stroke-dasharray="${PULSE_DASH}" stroke-dashoffset="${number(-state.pulsePhase)}"`;
  }
  if (state.drawProgress < 1) {
    return ` pathLength="1" stroke-dasharray="1" stroke-dashoffset="${number(1 - state.drawProgress)}"`;
  }
  return '';
}

function pathData(points: readonly Point2d[]): string {
  return points.map((point, index) => `${index ? 'L' : 'M'}${number(point.x)} ${number(point.y)}`).join(' ') + ' Z';
}

function openPathData(points: readonly Point2d[]): string {
  return points
    .map((point, index) => `${index ? 'L' : 'M'}${number(point.x)} ${number(point.y)}`)
    .join(' ');
}

function strokePath(
  data: string,
  color: string,
  width: number,
  opacity: number
): string {
  return `<path d="${data}" fill="none" stroke="${color}" stroke-width="${number(width)}" opacity="${number(opacity)}" stroke-linecap="round" stroke-linejoin="round"/>`;
}

function arrowHeadPath(presentation: StrokeNodePresentation): string {
  if (presentation.kind !== 'arrow') return '';
  const end = presentation.points.at(-1);
  const previous = presentation.points.at(-2);
  if (!end || !previous) return '';
  const angle = Math.atan2(end.y - previous.y, end.x - previous.x);
  const length = Math.max(8, presentation.width * 3);
  const left = {
    x: end.x - Math.cos(angle - Math.PI / 6) * length,
    y: end.y - Math.sin(angle - Math.PI / 6) * length,
  };
  const right = {
    x: end.x - Math.cos(angle + Math.PI / 6) * length,
    y: end.y - Math.sin(angle + Math.PI / 6) * length,
  };
  return `M${number(left.x)} ${number(left.y)} L${number(end.x)} ${number(end.y)} L${number(right.x)} ${number(right.y)}`;
}

/** Node group with the paused-frame wrapper inside it, so CSS animates the art
 *  while the world transform stays a plain attribute. */
function nodeGroup(attributes: string, body: string, frame: { readonly className: string; readonly style: string } | null): string {
  return frame
    ? `<g ${attributes}><g${frame.className}${frame.style}>${body}</g></g>`
    : `<g ${attributes}>${body}</g>`;
}

function exportStrokeNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: StrokeNodePresentation,
  frame: { readonly className: string; readonly style: string } | null
): string {
  const color = safeColor(presentation.color, '#334155');
  const inputSamples = presentation.inputSamples;
  const smoothed = inputSamples || (presentation.kind !== 'pen' && presentation.kind !== 'highlighter')
    ? presentation.points : smoothStroke(presentation.points);
  const paths = inputSamples
    ? presentation.points.slice(1).map((point, index) => strokePath(
        openPathData([presentation.points[index], point]),
        color,
        pressureTiltSegmentWidth(
          presentation.width,
          inputSamples[index],
          inputSamples[index + 1]
        ),
        presentation.opacity
      )).join('')
    : strokePath(
        openPathData(smoothed),
        color,
        presentation.width,
        presentation.opacity
      );
  const arrowHead = arrowHeadPath({ ...presentation, points: smoothed });
  return nodeGroup(
    `data-node-id="${xml(node.id)}" data-node-kind="${presentation.kind}" transform="${matrixAttribute(matrix)}"`,
    paths + (arrowHead ? strokePath(arrowHead, color, presentation.width, presentation.opacity) : ''),
    frame
  );
}

function textElement(
  value: string,
  x: number,
  y: number,
  attributes: string,
  lineHeight: number
): string {
  const lines = value.split(/\r?\n/).slice(0, 32);
  const spans = lines.map((line, index) => (
    `<tspan x="${number(x)}" dy="${index === 0 ? 0 : number(lineHeight)}">${xml(line)}</tspan>`
  )).join('');
  return `<text x="${number(x)}" y="${number(y)}" ${attributes}>${spans}</text>`;
}

function exportTextNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: TextNodePresentation,
  theme: 'light' | 'dark' | 'print',
  frame: { readonly className: string; readonly style: string } | null
): string {
  const colors = resolveTextVisualStyle(
    presentation.colorKey,
    'subtle',
    presentation.customColor,
    'slate',
    nodePaletteName(node)
  );
  const background = presentation.backgroundColor
    ? `<rect width="${number(node.size.width)}" height="${number(node.size.height)}" rx="8" fill="${safeColor(presentation.backgroundColor, '#ffffff')}" stroke="${safeColor(colors.border, '#94a3b8')}"/>`
    : '';
  const color = safeColor(
    node.content.textColor,
    theme === 'dark' && !presentation.backgroundColor ? '#f8fafc' : colors.text
  );
  const text = textElement(
    presentation.label,
    node.size.width / 2,
    node.size.height / 2,
    `text-anchor="middle" dominant-baseline="middle" fill="${color}" font-family="${xml(presentation.fontFamily)}" font-size="${number(presentation.fontSizePx)}" font-weight="${xml(presentation.fontWeight)}" font-style="${xml(presentation.fontStyle)}"`,
    presentation.fontSizePx * 1.25
  );
  return nodeGroup(
    `data-node-id="${xml(node.id)}" data-node-kind="text" transform="${matrixAttribute(matrix)}"`,
    background + text,
    frame
  );
}

function exportImageNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: ImageNodePresentation,
  theme: 'light' | 'dark' | 'print',
  frame: { readonly className: string; readonly style: string } | null
): string {
  const background = theme === 'dark' ? '#1e293b' : '#fff7ed';
  const media = presentation.sourceUrl
    ? `<image href="${xml(presentation.sourceUrl)}" width="${number(node.size.width)}" height="${number(node.size.height)}" opacity="${number(presentation.opacity)}" preserveAspectRatio="xMidYMid meet"/>`
    : textElement(
        presentation.label || 'No Image',
        node.size.width / 2,
        node.size.height / 2,
        `text-anchor="middle" dominant-baseline="middle" fill="${theme === 'dark' ? '#f8fafc' : '#9a3412'}" font-family="system-ui,sans-serif" font-size="12" font-weight="600"`,
        15
      );
  return nodeGroup(
    `data-node-id="${xml(node.id)}" data-node-kind="image" transform="${matrixAttribute(matrix)}"`,
    `<rect width="${number(node.size.width)}" height="${number(node.size.height)}" rx="8" fill="${background}" stroke="#e95420"/>${media}`,
    frame
  );
}

function exportAnnotationNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: AnnotationNodePresentation,
  frame: { readonly className: string; readonly style: string } | null
): string {
  const colors = resolveAnnotationVisualStyle(
    presentation.colorKey,
    'subtle',
    presentation.customColor,
    nodePaletteName(node)
  );
  const foldSize = Math.min(28, node.size.width / 4, node.size.height / 3);
  const fold = pathData([
    { x: node.size.width - foldSize, y: node.size.height },
    { x: node.size.width, y: node.size.height - foldSize },
    { x: node.size.width, y: node.size.height },
  ]);
  const title = presentation.title
    ? textElement(
        presentation.title,
        12,
        22,
        `fill="${safeColor(colors.titleText, '#713f12')}" font-family="system-ui,sans-serif" font-size="14" font-weight="700"`,
        17
      )
    : '';
  const body = textElement(
    presentation.body,
    12,
    presentation.title ? 46 : 24,
    `fill="${safeColor(colors.bodyText, '#854d0e')}" font-family="system-ui,sans-serif" font-size="12" font-weight="500"`,
    15
  );
  return nodeGroup(
    `data-node-id="${xml(node.id)}" data-node-kind="${presentation.kind}" transform="${matrixAttribute(matrix)}"`,
    `<rect width="${number(node.size.width)}" height="${number(node.size.height)}" rx="8" fill="${safeColor(colors.containerBg, '#fef9c3')}" stroke="${safeColor(colors.containerBorder, '#eab308')}" stroke-width="1.5"/><path d="${fold}" fill="${safeColor(colors.foldBg, '#fef08a')}" stroke="${safeColor(colors.foldBorder, '#ca8a04')}"/>${title}${body}`,
    frame
  );
}

function connectorPathData(commands: ReturnType<typeof projectPageConnectors>[number]['commands']): string {
  return commands.map((command) => command.kind === 'cubic'
    ? `C${number(command.control1.x)} ${number(command.control1.y)} ${number(command.control2.x)} ${number(command.control2.y)} ${number(command.point.x)} ${number(command.point.y)}`
    : `${command.kind === 'move' ? 'M' : 'L'}${number(command.point.x)} ${number(command.point.y)}`
  ).join(' ');
}

function labelElement(style: NodeStyle, size: Size2d, label: string, subLabel: string, clipId: string | null): string {
  const padding = style.textPadding;
  const x = style.textAlign === 'start' ? padding : style.textAlign === 'end' ? size.width - padding : size.width / 2;
  const anchor = style.textAlign === 'start' ? 'start' : style.textAlign === 'end' ? 'end' : 'middle';
  const baseline = style.textVerticalAlign === 'top' ? 'hanging' : style.textVerticalAlign === 'bottom' ? 'auto' : 'middle';
  const y = style.textVerticalAlign === 'top' ? padding
    : style.textVerticalAlign === 'bottom' ? size.height - padding
      : size.height / 2;
  const common = `fill="${style.textColor}" font-family="${xml(FONT_STACKS[style.fontFamily])}" font-size="${number(style.fontSize)}" font-weight="${style.fontWeight}"`;
  const decoration = style.textDecoration === 'none' ? '' : ` text-decoration="${style.textDecoration}"`;
  const styleAttr = style.fontStyle === 'normal' ? common : `${common} font-style="italic"`;
  const spacing = style.letterSpacing === 0 ? '' : ` letter-spacing="${number(style.letterSpacing * style.fontSize)}"`;
  const stretch = clipId ? ` clip-path="url(#${clipId})"` : '';
  return `<g${stretch}>`
    + `<text x="${number(x)}" y="${number(y)}" text-anchor="${anchor}" dominant-baseline="${baseline}" ${styleAttr}${decoration}${spacing}>${xml(label)}</text>`
    + (subLabel ? `<text x="${number(x)}" y="${number(y + style.fontSize * 1.5)}" text-anchor="${anchor}" dominant-baseline="${baseline}" ${styleAttr} opacity="0.72">${xml(subLabel)}</text>` : '')
    + '</g>';
}

function outlineMarkup(
  outline: readonly Point2d[],
  style: NodeStyle,
  filter: string
): string {
  const fill = style.fill;
  const stroke = style.strokeWidth > 0 ? style.stroke : 'none';
  const dash = style.dash.length ? ` stroke-dasharray="${style.dash.map(number).join(' ')}"` : '';
  const rect = outline.length === 4 ? plainRect(outline) : null;
  const shape = rect
    ? `<rect x="${number(rect.x)}" y="${number(rect.y)}" width="${number(rect.width)}" height="${number(rect.height)}"${style.cornerRadius > 0 ? ` rx="${number(style.cornerRadius)}"` : ''} fill="${fill}" stroke="${stroke}" stroke-width="${number(style.strokeWidth)}"${dash}${filter}/>`
    : `<path d="${pathData(outline)}" fill="${fill}" stroke="${stroke}" stroke-width="${number(style.strokeWidth)}"${dash}${filter}/>`;
  return shape;
}

/** Axis-aligned rectangle when the outline is one, so `rx` can round it. */
function plainRect(outline: readonly Point2d[]): { x: number; y: number; width: number; height: number } | null {
  const xs = [...new Set(outline.map(({ x }) => Math.round(x * 1000) / 1000))].sort((a, b) => a - b);
  const ys = [...new Set(outline.map(({ y }) => Math.round(y * 1000) / 1000))].sort((a, b) => a - b);
  if (xs.length !== 2 || ys.length !== 2) return null;
  return { x: xs[0]!, y: ys[0]!, width: xs[1]! - xs[0]!, height: ys[1]! - ys[0]! };
}

// Charts draw exactly what the presentation says, in the same order as Pixi.
function exportChartNode(
  node: SceneNode,
  matrix: Matrix2d,
  theme: 'light' | 'dark' | 'print',
  frame: { readonly className: string; readonly style: string } | null
): string | null {
  const presentation = resolveChartPresentation(node);
  if (!presentation) return null;
  const style = resolveNodeStyle(node, theme === 'dark' ? SVG_BACKGROUND.dark : SVG_BACKGROUND.light);
  const textColor = style.textColor === 'transparent' ? '#334155' : style.textColor;
  const parts: string[] = [];
  // Points are already in world space, so the card is drawn there too and the
  // group carries no transform.
  const corners = [
    { x: 0, y: 0 }, { x: node.size.width, y: 0 },
    { x: node.size.width, y: node.size.height }, { x: 0, y: node.size.height },
  ].map((point) => applyMatrixToPoint(matrix, point));
  const cardStroke = style.strokeWidth > 0 && style.stroke !== 'transparent'
    ? ` stroke="${xml(style.stroke)}" stroke-width="${number(style.strokeWidth)}"` : '';
  parts.push(`<path d="${pathData(corners)}" fill="${xml(style.fill)}"${cardStroke}/>`);
  for (const mark of presentation.marks) {
    const points = mark.points.map((point) => applyMatrixToPoint(matrix, point));
    if (mark.kind === 'bar' || mark.kind === 'cell' || mark.kind === 'swatch') {
      const [first, second] = points;
      if (!first || !second) continue;
      parts.push(`<rect x="${number(first.x)}" y="${number(first.y)}" width="${number(second.x - first.x)}" height="${number(second.y - first.y)}"${mark.kind === 'swatch' ? ' rx="2"' : ''} fill="${xml(mark.color)}" fill-opacity="${number(mark.opacity)}"${mark.kind === 'cell' ? ` stroke="${xml(style.fill)}" stroke-opacity="0.6"` : ''}/>`);
    } else if (mark.kind === 'point') {
      for (const point of points) {
        parts.push(`<circle cx="${number(point.x)}" cy="${number(point.y)}" r="3.5" fill="${xml(mark.color)}" fill-opacity="${number(mark.opacity)}"/>`);
      }
    } else if (mark.kind === 'line') {
      parts.push(`<path d="${openPathData(points)}" fill="none" stroke="${xml(mark.color)}" stroke-width="2" stroke-opacity="${number(mark.opacity)}" stroke-linejoin="round"/>`);
    } else {
      parts.push(`<path d="${pathData(points)}" fill="${xml(mark.color)}" fill-opacity="${number(mark.opacity)}"${mark.kind === 'area' ? ` stroke="${xml(mark.color)}" stroke-width="1.5"` : ''}/>`);
    }
  }
  for (const rule of presentation.rules) {
    parts.push(`<path d="${openPathData(rule.map((point) => applyMatrixToPoint(matrix, point)))}" fill="none" stroke="${xml(textColor)}" stroke-opacity="0.2" stroke-width="1"/>`);
  }
  if (presentation.table) {
    const { columns, rows } = presentation.table;
    const top = rows[0]!;
    const bottom = rows[rows.length - 1]!;
    const left = columns[0]!;
    const right = columns[columns.length - 1]!;
    const line = (x1: number, y1: number, x2: number, y2: number) =>
      `<path d="${openPathData([applyMatrixToPoint(matrix, { x: x1, y: y1 }), applyMatrixToPoint(matrix, { x: x2, y: y2 })])}" stroke="${xml(textColor)}" stroke-opacity="0.2" stroke-width="1" fill="none"/>`;
    for (const x of columns) parts.push(line(x, top, x, bottom));
    for (const y of rows) parts.push(line(left, y, right, y));
    const header = applyMatrixToPoint(matrix, { x: left, y: top });
    const headerCorner = applyMatrixToPoint(matrix, { x: right, y: rows[1]! });
    parts.push(`<rect x="${number(header.x)}" y="${number(header.y)}" width="${number(headerCorner.x - header.x)}" height="${number(headerCorner.y - header.y)}" fill="${xml(textColor)}" fill-opacity="0.06"/>`);
  }
  for (const label of presentation.labels) {
    if (!label.text) continue;
    const at = applyMatrixToPoint(matrix, label.at);
    const anchor = label.anchor === 'start' ? 'start' : label.anchor === 'end' ? 'end' : 'middle';
    const size = label.role === 'title' ? style.fontSize + 2 : 11;
    parts.push(`<text x="${number(at.x)}" y="${number(at.y)}" text-anchor="${anchor}" dominant-baseline="middle" fill="${xml(label.color ?? textColor)}" font-family="system-ui,sans-serif" font-size="${number(size)}">${xml(label.text)}</text>`);
  }
  return nodeGroup(`data-node-id="${xml(node.id)}" data-node-kind="chart"`, parts.join(''), frame);
}

function exportNode(
  node: SceneNode,
  matrix: Matrix2d,
  theme: 'light' | 'dark' | 'print',
  frame: ElementFrameState | undefined,
  animations: CanonicalSvgExportOptions['animations']
): string {
  const wrapper = elementFrameStyle('node', node.id, frame, node.size, animations);
  const chart = exportChartNode(node, matrix, theme, wrapper);
  if (chart) return chart;
  const freeform = resolveFreeformNodePresentation(node);
  if (freeform && (freeform.kind === 'pen' || freeform.kind === 'highlighter'
    || freeform.kind === 'line' || freeform.kind === 'arrow')) {
    return exportStrokeNode(node, matrix, freeform, wrapper);
  }
  if (freeform?.kind === 'text') return exportTextNode(node, matrix, freeform, theme, wrapper);
  if (freeform?.kind === 'image') return exportImageNode(node, matrix, freeform, theme, wrapper);
  if (freeform && (freeform.kind === 'annotation' || freeform.kind === 'sticky'
    || freeform.kind === 'callout')) return exportAnnotationNode(node, matrix, freeform, wrapper);
  const background = theme === 'dark' ? SVG_BACKGROUND.dark : SVG_BACKGROUND.light;
  // One resolver for every node kind: the renderer, the label editor and the
  // exporter cannot drift. Legacy content keys are its fallbacks, not ours.
  const style = resolveNodeStyle(node, background);
  const basic = resolveBasicNodePresentation(node);
  const outline = basic
    ? basicNodeOutlinePoints(basic.shape, node.size,
      typeof node.content.customSvgPath === 'string' ? node.content.customSvgPath : undefined)
    : [{ x: 0, y: 0 }, { x: node.size.width, y: 0 },
      { x: node.size.width, y: node.size.height }, { x: 0, y: node.size.height }];
  const label = typeof node.content.label === 'string' ? node.content.label : node.id;
  const subLabel = typeof node.content.subLabel === 'string' ? node.content.subLabel : '';
  const clip = resolveNodeSizingPolicy(node).clipContent
    ? `clip-${node.id.replace(/[^A-Za-z0-9_-]/g, '-')}`
    : null;
  const shadowId = `shadow-${node.id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  const filter = style.shadow ? ` filter="url(#${shadowId})"` : '';
  const defs = (style.shadow
    ? `<filter id="${shadowId}" x="-20%" y="-20%" width="140%" height="140%"><feDropShadow dx="0" dy="2" stdDeviation="2.5" flood-color="#0f172a" flood-opacity="0.18"/></filter>`
    : '')
    + (clip ? `<clipPath id="${clip}"><path d="${pathData(outline)}"/></clipPath>` : '');
  return nodeGroup(
    `data-node-id="${xml(node.id)}" transform="${matrixAttribute(matrix)}"${style.opacity < 1 ? ` opacity="${number(style.opacity)}"` : ''}`,
    (defs ? `<defs>${defs}</defs>` : '')
      + outlineMarkup(outline, style, filter)
      + (basic ? decorationMarkup(basic.shape, node.size, style) : '')
      + labelElement(style, node.size, label, subLabel, clip),
    wrapper
  );
}

/** Inner lines (venn lens, target rings, note fold) in the node's stroke. */
function decorationMarkup(shape: BasicNodeShape, size: Size2d, style: NodeStyle): string {
  if (style.strokeWidth <= 0) return '';
  const stroke = style.stroke === 'transparent' || !style.stroke ? 'none' : style.stroke;
  if (stroke === 'none') return '';
  const dash = style.dash.length ? ` stroke-dasharray="${style.dash.map(number).join(' ')}"` : '';
  // Node space: the enclosing <g> already carries the node's transform.
  return basicNodeDecorations(shape, size).map((line) => {
    const [first, ...rest] = line;
    if (!first) return '';
    return `<path d="M ${number(first.x)} ${number(first.y)}`
      + rest.map((point) => ` L ${number(point.x)} ${number(point.y)}`).join('')
      + `" fill="none" stroke="${stroke}" stroke-width="${number(style.strokeWidth)}"${dash}/>`;
  }).join('');
}

/** Arrowheads and end glyphs, with the exact geometry the Pixi renderer uses. */
function markerMarkup(connector: ProjectedConnector, stroke: string): string {
  const { samples, presentation } = connector;
  if (samples.length < 2) return '';
  const first = samples[0]!;
  const last = samples[samples.length - 1]!;
  const width = presentation.stroke.width;
  const glyph = (value: ConnectorMarkerGlyph, endpoint: Point2d, outward: Point2d, index: number) =>
    connectorMarkerShapes(value, endpoint, outward, index * 9)
      .map((shape) => markerShapeMarkup(shape, stroke, width, presentation.stroke.opacity)).join('');
  const start = presentation.sourceMarkers
    .map((value, index) => glyph(value, first, directionBetween(samples[1]!, first), index)).join('');
  const end = presentation.targetMarkers
    .map((value, index) => glyph(value, last, directionBetween(samples[samples.length - 2]!, last), index)).join('');
  return start + end;
}

function directionBetween(from: Point2d, to: Point2d): Point2d {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const length = Math.hypot(dx, dy);
  return length > 1e-9 ? { x: dx / length, y: dy / length } : { x: 1, y: 0 };
}

function markerShapeMarkup(shape: MarkerShape, stroke: string, width: number, opacity: number): string {
  const strokeAttrs = `fill="none" stroke="${stroke}" stroke-width="${number(width)}" opacity="${number(opacity)}"`;
  if (shape.kind === 'circle') {
    return `<circle cx="${number(shape.center.x)}" cy="${number(shape.center.y)}" r="${number(shape.radius)}" fill="none" ${strokeAttrs}/>`;
  }
  const data = shape.subpaths
    .map((points) => points.map((point, index) => `${index ? 'L' : 'M'}${number(point.x)} ${number(point.y)}`).join(' '))
    .join(' ') + (shape.closed ? ' Z' : '');
  if (shape.filled) return `<path d="${data}" fill="${stroke}" opacity="${number(opacity)}"/>`;
  return `<path d="${data}" ${strokeAttrs}${shape.round ? ' stroke-linejoin="round"' : ''}/>`;
}

function selectedPage(page: ScenePage, selectedNodeIds?: readonly string[]): ScenePage {
  const states = buildNodeStateMap(page);
  const selected = selectedNodeIds ? new Set(selectedNodeIds) : null;
  const nodes = page.nodes.filter((node) => states.get(node.id)?.visible && (!selected || selected.has(node.id)));
  const ids = new Set(nodes.map(({ id }) => id));
  return { ...page, nodes, connectors: page.connectors.filter(({ source, target }) =>
    (source.nodeId === null ? !selected : ids.has(source.nodeId))
    && (target.nodeId === null ? !selected : ids.has(target.nodeId))) };
}

interface PageExport {
  readonly source: ScenePage;
  readonly page: ScenePage;
  readonly matrices: ReadonlyMap<string, Matrix2d>;
  readonly connectors: ReturnType<typeof projectPageConnectors>;
  readonly viewBox: Bounds2d;
}

/** Everything an SVG export reads off a page, viewBox included. */
function pageExport(document: SceneDocumentV1, options: CanonicalSvgExportOptions): PageExport {
  const source = options.pageId
    ? document.pages.find(({ id }) => id === options.pageId)
    : document.pages[0];
  if (!source) throw new RangeError('SVG export page was not found.');
  const page = selectedPage(source, options.selectedNodeIds);
  const matrices = buildNodeWorldMatrices(source);
  const connectors = projectPageConnectors({ ...source, connectors: page.connectors });
  if (page.nodes.length === 0 && connectors.length === 0) throw new TypeError('SVG export requires at least one visible node or connector.');
  const points: Point2d[] = [];
  for (const node of page.nodes) {
    const matrix = matrices.get(node.id)!;
    points.push(...boundsCorners(nodeWorldBounds(node, matrix)));
  }
  for (const connector of connectors) points.push(...connector.samples);
  const bounds = boundsFromPoints(points)!;
  const padding = Math.max(0, options.padding ?? 24);
  return {
    source, page, matrices, connectors,
    viewBox: {
      x: bounds.x - padding, y: bounds.y - padding,
      width: bounds.width + padding * 2, height: bounds.height + padding * 2,
    },
  };
}

/** The viewBox `exportCanonicalSvg` frames; the animated export fits cameras to it. */
export function svgViewBox(document: SceneDocumentV1, options: CanonicalSvgExportOptions = {}): Bounds2d {
  return pageExport(document, options).viewBox;
}

export function exportCanonicalSvg(
  document: SceneDocumentV1, options: CanonicalSvgExportOptions = {}
): string {
  const { page, matrices, connectors, viewBox } = pageExport(document, options);
  const { x, y, width, height } = viewBox;
  const pixelRatio = Math.min(4, Math.max(1, options.pixelRatio ?? 1));
  const theme = options.theme ?? 'light';
  const background = theme === 'dark' ? '#020617' : '#ffffff';
  const connectorMarkup = connectors.map((connector) => {
    const stroke = safeColor(connector.presentation.stroke.color, theme === 'dark' ? '#cbd5e1' : '#475569');
    const state = options.frame?.connectors[connector.id];
    const animation = options.animations?.('connector', connector.id);
    const pathAnimation = animation?.path ? ` style="${cssAnimation(animation.path)}"` : '';
    const dash = animation?.path
      ? ` pathLength="1" stroke-dasharray="${animation.path.dash}"`
      : connectorPathDash(state);
    const group = elementFrameStyle('connector', connector.id, state, undefined, options.animations);
    return `<g data-connector-id="${xml(connector.id)}"${group?.className ?? ''}${group?.style ?? ''}><path d="${connectorPathData(connector.commands)}"${pathAnimation} fill="none" stroke="${stroke}" stroke-width="${number(connector.presentation.stroke.width)}" opacity="${number(connector.presentation.stroke.opacity)}"${dash}${connector.presentation.stroke.dash.length && !dash ? ` stroke-dasharray="${connector.presentation.stroke.dash.map(number).join(' ')}"` : ''}/>`
      + connector.labels.map((label) => `<text x="${number(label.point.x)}" y="${number(label.point.y)}" text-anchor="middle" fill="${theme === 'dark' ? '#f8fafc' : '#0f172a'}" font-family="system-ui,sans-serif" font-size="11">${xml(label.text)}</text>`).join('')
      + markerMarkup(connector, stroke)
      + '</g>';
  }).join('');
  const nodeMarkup = [...page.nodes].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))
    .map((node) => exportNode(node, matrices.get(node.id)!, theme, options.frame?.nodes[node.id], options.animations)).join('');
  // Camera glide lives on a root group: CSS cannot animate `viewBox` inside an
  // `<img>`. The still path applies the same matrix, so both stay in step.
  const cameraMatrix = options.frame?.camera ? cameraFitMatrix(options.frame.camera, viewBox) : null;
  const cameraStyle = [
    'transform-box:view-box',
    'transform-origin:0 0',
    ...(options.cameraAnimation ? [cssAnimation(options.cameraAnimation)] : []),
    ...(cameraMatrix ? [`transform:${matrixCss(cameraMatrix)}`] : []),
  ].join(';');
  const content = options.cameraAnimation || cameraMatrix
    ? `<g${options.cameraAnimation ? ` class="${ANIMATED_CLASS}"` : ''} style="${cameraStyle}">${connectorMarkup}${nodeMarkup}</g>`
    : `${connectorMarkup}${nodeMarkup}`;
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${number(x)} ${number(y)} ${number(width)} ${number(height)}" width="${number(width * pixelRatio)}" height="${number(height * pixelRatio)}" data-openflowkit-document="${xml(document.id)}" data-page="${xml(page.id)}" data-theme="${theme}" data-pixel-ratio="${number(pixelRatio)}">${options.styleSheet ? `<style>${options.styleSheet}</style>` : ''}${options.transparent ? '' : `<rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" fill="${background}"/>`}${content}</svg>`;
}
