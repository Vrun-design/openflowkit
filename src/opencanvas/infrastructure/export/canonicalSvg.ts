import { resolveAnnotationVisualStyle, resolveTextVisualStyle } from '@/theme';
import type { SceneDocumentV1, SceneNode, ScenePage } from '../../domain/document/types';
import { boundsFromPoints } from '../../domain/geometry/bounds';
import { boundsCorners } from '../../domain/geometry/bounds';
import type { Matrix2d, Point2d } from '../../domain/geometry/types';
import { resolveBasicNodePresentation } from '../../domain/nodes/basicNodePresentation';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import {
  resolveFreeformNodePresentation,
  type AnnotationNodePresentation,
  type ImageNodePresentation,
  type StrokeNodePresentation,
  type TextNodePresentation,
} from '../../domain/nodes/freeformNodePresentation';
import { pressureTiltSegmentWidth } from '../../domain/nodes/strokeInput';
import { projectPageConnectors } from '../../domain/connectors/routeProjection';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { resolveNodeSizingPolicy } from '../../domain/node-sizing/model';

export interface CanonicalSvgExportOptions {
  readonly pageId?: string;
  readonly selectedNodeIds?: readonly string[];
  readonly theme?: 'light' | 'dark' | 'print';
  readonly padding?: number;
  readonly pixelRatio?: number;
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
        openPathData(presentation.points),
        color,
        presentation.width,
        presentation.opacity
      );
  const arrowHead = arrowHeadPath(presentation);
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
    'slate'
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
    presentation.customColor
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

function exportNode(node: SceneNode, matrix: Matrix2d, theme: 'light' | 'dark' | 'print'): string {
  const freeform = resolveFreeformNodePresentation(node);
  if (freeform && (freeform.kind === 'pen' || freeform.kind === 'highlighter'
    || freeform.kind === 'line' || freeform.kind === 'arrow')) {
    return exportStrokeNode(node, matrix, freeform);
  }
  if (freeform?.kind === 'text') return exportTextNode(node, matrix, freeform, theme);
  if (freeform?.kind === 'image') return exportImageNode(node, matrix, freeform, theme);
  if (freeform && (freeform.kind === 'annotation' || freeform.kind === 'sticky'
    || freeform.kind === 'callout')) return exportAnnotationNode(node, matrix, freeform);
  const basic = resolveBasicNodePresentation(node);
  const fillFallback = theme === 'dark' ? '#1e293b' : '#ffffff';
  const strokeFallback = theme === 'dark' ? '#94a3b8' : '#64748b';
  const textFallback = theme === 'dark' ? '#f8fafc' : '#0f172a';
  const fill = safeColor(node.appearance.fill ?? node.content.backgroundColor, fillFallback);
  const stroke = safeColor(node.appearance.stroke ?? node.content.borderColor, strokeFallback);
  const text = safeColor(node.appearance.textColor ?? node.content.textColor, textFallback);
  const outline = basic
    ? basicNodeOutlinePoints(basic.shape, node.size,
      typeof node.content.customSvgPath === 'string' ? node.content.customSvgPath : undefined)
    : [{ x: 0, y: 0 }, { x: node.size.width, y: 0 },
      { x: node.size.width, y: node.size.height }, { x: 0, y: node.size.height }];
  const label = typeof node.content.label === 'string' ? node.content.label : node.id;
  const subLabel = typeof node.content.subLabel === 'string' ? node.content.subLabel : '';
  const sizing = resolveNodeSizingPolicy(node);
  const clipId = `clip-${node.id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
  return `<g data-node-id="${xml(node.id)}" transform="${matrixAttribute(matrix)}">`
    + (sizing.clipContent ? `<defs><clipPath id="${clipId}"><path d="${pathData(outline)}"/></clipPath></defs>` : '')
    + `<path d="${pathData(outline)}" fill="${fill}" stroke="${stroke}" stroke-width="1.5"/>`
    + `<g${sizing.clipContent ? ` clip-path="url(#${clipId})"` : ''}>`
    + `<text x="${number(node.size.width / 2)}" y="${number(node.size.height / 2)}" text-anchor="middle" dominant-baseline="middle" fill="${text}" font-family="system-ui,sans-serif" font-size="14" font-weight="600">${xml(label)}</text>`
    + (subLabel ? `<text x="${number(node.size.width / 2)}" y="${number(node.size.height / 2 + 20)}" text-anchor="middle" fill="${text}" opacity="0.72" font-family="system-ui,sans-serif" font-size="11">${xml(subLabel)}</text>` : '')
    + '</g></g>';
}

function selectedPage(page: ScenePage, selectedNodeIds?: readonly string[]): ScenePage {
  const visibleLayers = new Set(page.layers.filter(({ visible }) => visible).map(({ id }) => id));
  const selected = selectedNodeIds ? new Set(selectedNodeIds) : null;
  const nodes = page.nodes.filter((node) => visibleLayers.has(node.layerId) && (!selected || selected.has(node.id)));
  const ids = new Set(nodes.map(({ id }) => id));
  return { ...page, nodes, connectors: page.connectors.filter(({ source, target }) =>
    ids.has(source.nodeId) && ids.has(target.nodeId)) };
}

export function exportCanonicalSvg(
  document: SceneDocumentV1, options: CanonicalSvgExportOptions = {}
): string {
  const source = options.pageId
    ? document.pages.find(({ id }) => id === options.pageId)
    : document.pages[0];
  if (!source) throw new RangeError('SVG export page was not found.');
  const page = selectedPage(source, options.selectedNodeIds);
  if (page.nodes.length === 0) throw new TypeError('SVG export requires at least one visible node.');
  const matrices = buildNodeWorldMatrices(source);
  const connectors = projectPageConnectors({ ...source, connectors: page.connectors });
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
      + connector.labels.map((label) => `<text x="${number(label.point.x)}" y="${number(label.point.y)}" text-anchor="middle" fill="${theme === 'dark' ? '#f8fafc' : '#0f172a'}" font-family="system-ui,sans-serif" font-size="11">${xml(label.text)}</text>`).join('') + '</g>';
  }).join('');
  const nodeMarkup = [...page.nodes].sort((a, b) => a.zIndex - b.zIndex || a.id.localeCompare(b.id))
    .map((node) => exportNode(node, matrices.get(node.id)!, theme)).join('');
  return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${number(x)} ${number(y)} ${number(width)} ${number(height)}" width="${number(width * pixelRatio)}" height="${number(height * pixelRatio)}" data-openflowkit-document="${xml(document.id)}" data-page="${xml(page.id)}" data-theme="${theme}" data-pixel-ratio="${number(pixelRatio)}"><rect x="${number(x)}" y="${number(y)}" width="${number(width)}" height="${number(height)}" fill="${background}"/>${connectorMarkup}${nodeMarkup}</svg>`;
}
