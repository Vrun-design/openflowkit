import { FONT_STACKS, resolveNodeStyle, type NodeStyle } from '../../domain/nodes/nodeStyle';
import { resolveAnnotationVisualStyle, resolveTextVisualStyle } from '@/theme';
import { nodePaletteName } from '../../domain/nodes/nodePalette';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { boundsFromPoints } from '../../domain/geometry/bounds';
import { boundsCorners } from '../../domain/geometry/bounds';
import type { Matrix2d, Point2d, Size2d } from '../../domain/geometry/types';
import { resolveBasicNodePresentation, type BasicNodeShape } from '../../domain/nodes/basicNodePresentation';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import { basicNodeDecorations } from '../../domain/nodes/basicNodeDecorations';
import { resolveChartPresentation } from '../../domain/nodes/chartNodePresentation';
import type { ConnectorMarkerGlyph, ProjectedConnector } from '../../domain/connectors/types';
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

export const SVG_BACKGROUND = { light: '#ffffff', dark: '#020617' } as const;

export interface CanonicalSvgExportOptions {
  readonly pageId?: string;
  readonly selectedNodeIds?: readonly string[];
  readonly theme?: 'light' | 'dark' | 'print';
  readonly padding?: number;
  readonly pixelRatio?: number;
  /** Omit the background rectangle (transparent PNG / SVG). */
  readonly transparent?: boolean;
}

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

function exportStrokeNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: StrokeNodePresentation
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
  return `<g data-node-id="${xml(node.id)}" data-node-kind="${presentation.kind}" transform="${matrixAttribute(matrix)}">${paths}${
    arrowHead ? strokePath(arrowHead, color, presentation.width, presentation.opacity) : ''
  }</g>`;
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
  theme: 'light' | 'dark' | 'print'
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
  return `<g data-node-id="${xml(node.id)}" data-node-kind="text" transform="${matrixAttribute(matrix)}">${background}${text}</g>`;
}

function exportImageNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: ImageNodePresentation,
  theme: 'light' | 'dark' | 'print'
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
  return `<g data-node-id="${xml(node.id)}" data-node-kind="image" transform="${matrixAttribute(matrix)}"><rect width="${number(node.size.width)}" height="${number(node.size.height)}" rx="8" fill="${background}" stroke="#e95420"/>${media}</g>`;
}

function exportAnnotationNode(
  node: SceneNode,
  matrix: Matrix2d,
  presentation: AnnotationNodePresentation
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
  return `<g data-node-id="${xml(node.id)}" data-node-kind="${presentation.kind}" transform="${matrixAttribute(matrix)}"><rect width="${number(node.size.width)}" height="${number(node.size.height)}" rx="8" fill="${safeColor(colors.containerBg, '#fef9c3')}" stroke="${safeColor(colors.containerBorder, '#eab308')}" stroke-width="1.5"/><path d="${fold}" fill="${safeColor(colors.foldBg, '#fef08a')}" stroke="${safeColor(colors.foldBorder, '#ca8a04')}"/>${title}${body}</g>`;
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
function exportChartNode(node: SceneNode, matrix: Matrix2d, theme: 'light' | 'dark' | 'print'): string | null {
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
  return `<g data-node-id="${xml(node.id)}" data-node-kind="chart">${parts.join('')}</g>`;
}

function exportNode(node: SceneNode, matrix: Matrix2d, theme: 'light' | 'dark' | 'print'): string {
  const chart = exportChartNode(node, matrix, theme);
  if (chart) return chart;
  const freeform = resolveFreeformNodePresentation(node);
  if (freeform && (freeform.kind === 'pen' || freeform.kind === 'highlighter'
    || freeform.kind === 'line' || freeform.kind === 'arrow')) {
    return exportStrokeNode(node, matrix, freeform);
  }
  if (freeform?.kind === 'text') return exportTextNode(node, matrix, freeform, theme);
  if (freeform?.kind === 'image') return exportImageNode(node, matrix, freeform, theme);
  if (freeform && (freeform.kind === 'annotation' || freeform.kind === 'sticky'
    || freeform.kind === 'callout')) return exportAnnotationNode(node, matrix, freeform);
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
  return `<g data-node-id="${xml(node.id)}" transform="${matrixAttribute(matrix)}"${style.opacity < 1 ? ` opacity="${number(style.opacity)}"` : ''}>`
    + (defs ? `<defs>${defs}</defs>` : '')
    + outlineMarkup(outline, style, filter)
    + (basic ? decorationMarkup(basic.shape, node.size, style) : '')
    + labelElement(style, node.size, label, subLabel, clip)
    + '</g>';
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
    markerPath(value, endpoint, outward, index * 9, stroke, width, presentation.stroke.opacity);
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

function offsetPoint(point: Point2d, direction: Point2d, distance: number): Point2d {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

function markerPath(
  glyph: ConnectorMarkerGlyph,
  endpoint: Point2d,
  outward: Point2d,
  offset: number,
  stroke: string,
  width: number,
  opacity: number
): string {
  const tip = offsetPoint(endpoint, outward, -offset);
  const normal = { x: -outward.y, y: outward.x };
  const strokeAttrs = `fill="none" stroke="${stroke}" stroke-width="${number(width)}" opacity="${number(opacity)}"`;
  const polygon = (points: readonly Point2d[], filled: boolean) => {
    const data = points.map((point, index) => `${index ? 'L' : 'M'}${number(point.x)} ${number(point.y)}`).join(' ') + ' Z';
    return filled
      ? `<path d="${data}" fill="${stroke}" opacity="${number(opacity)}"/>`
      : `<path d="${data}" ${strokeAttrs}/>`;
  };
  if (glyph === 'arrow' || glyph === 'triangle-open' || glyph === 'triangle-filled') {
    const back = offsetPoint(tip, outward, -9);
    const points = [tip, offsetPoint(back, normal, 4.5), offsetPoint(back, normal, -4.5)];
    if (glyph === 'arrow') {
      return `<path d="M${number(points[1]!.x)} ${number(points[1]!.y)} L${number(points[0]!.x)} ${number(points[0]!.y)} L${number(points[2]!.x)} ${number(points[2]!.y)}" ${strokeAttrs} stroke-linejoin="round"/>`;
    }
    return polygon(points, glyph === 'triangle-filled');
  }
  if (glyph === 'diamond-open' || glyph === 'diamond-filled') {
    const far = offsetPoint(tip, outward, -14);
    const middle = offsetPoint(tip, outward, -7);
    return polygon([tip, offsetPoint(middle, normal, 4.5), far, offsetPoint(middle, normal, -4.5)],
      glyph === 'diamond-filled');
  }
  if (glyph === 'circle') {
    const center = offsetPoint(tip, outward, -5);
    return `<circle cx="${number(center.x)}" cy="${number(center.y)}" r="4" fill="none" ${strokeAttrs}/>`;
  }
  if (glyph === 'bar') {
    const center = offsetPoint(tip, outward, -3);
    return `<path d="M${number(offsetPoint(center, normal, 5).x)} ${number(offsetPoint(center, normal, 5).y)} L${number(offsetPoint(center, normal, -5).x)} ${number(offsetPoint(center, normal, -5).y)}" ${strokeAttrs}/>`;
  }
  if (glyph === 'cross') {
    const center = offsetPoint(tip, outward, -5);
    const a = offsetPoint(offsetPoint(center, normal, 4.5), outward, 4.5);
    const b = offsetPoint(offsetPoint(center, normal, -4.5), outward, -4.5);
    const c = offsetPoint(offsetPoint(center, normal, 4.5), outward, -4.5);
    const d = offsetPoint(offsetPoint(center, normal, -4.5), outward, 4.5);
    return `<path d="M${number(a.x)} ${number(a.y)} L${number(b.x)} ${number(b.y)} M${number(c.x)} ${number(c.y)} L${number(d.x)} ${number(d.y)}" ${strokeAttrs}/>`;
  }
  return '';
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

export function exportCanonicalSvg(
  document: SceneDocumentV1, options: CanonicalSvgExportOptions = {}
): string {
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
  const pixelRatio = Math.min(4, Math.max(1, options.pixelRatio ?? 1));
  const x = bounds.x - padding; const y = bounds.y - padding;
  const width = bounds.width + padding * 2; const height = bounds.height + padding * 2;
  const theme = options.theme ?? 'light';
  const background = theme === 'dark' ? '#020617' : '#ffffff';
  const connectorMarkup = connectors.map((connector) => {
    const stroke = safeColor(connector.presentation.stroke.color, theme === 'dark' ? '#cbd5e1' : '#475569');
    return `<g data-connector-id="${xml(connector.id)}"><path d="${connectorPathData(connector.commands)}" fill="none" stroke="${stroke}" stroke-width="${number(connector.presentation.stroke.width)}" opacity="${number(connector.presentation.stroke.opacity)}"${connector.presentation.stroke.dash.length ? ` stroke-dasharray="${connector.presentation.stroke.dash.map(number).join(' ')}"` : ''}/>`
      + connector.labels.map((label) => `<text x="${number(label.point.x)}" y="${number(label.point.y)}" text-anchor="middle" fill="${theme === 'dark' ? '#f8fafc' : '#0f172a'}" font-family="system-ui,sans-serif" font-size="11">${xml(label.text)}</text>`).join('')
      + markerMarkup(connector, stroke)
      + '</g>';
  }).join('');
  const nodeMarkup = [...page.nodes].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))
    .map((node) => exportNode(node, matrices.get(node.id)!, theme)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${number(x)} ${number(y)} ${number(width)} ${number(height)}" width="${number(width * pixelRatio)}" height="${number(height * pixelRatio)}" data-openflowkit-document="${xml(document.id)}" data-page="${xml(page.id)}" data-theme="${theme}" data-pixel-ratio="${number(pixelRatio)}">${options.transparent ? '' : `<rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" fill="${background}"/>`}${connectorMarkup}${nodeMarkup}</svg>`;
}
