import type { SceneConnector, SceneNode } from '../opencanvas/domain/document/types';
import {
  paletteKeyForFillIn, paletteKeyForStrokeIn, paletteSwatch, type SwatchResolver,
} from '../opencanvas/domain/nodes/nodePalette';
import { dslConnectorMeta, dslNodeMeta, type CanonicalAttribute } from './sceneMeta';
import { COLOR_WORD_FOR_KEY, dslShapeWord, isHexColor, isIconWord, sortAttributes } from './vocabulary';

/** Labels that must be quoted so a statement is never read as a keyword (grammar §2.4). */
const RESERVED_LABELS = new Set([
  'group', 'note', 'title', 'direction', 'autonumber', 'legend', 'align', 'flowchart', 'architecture',
  'sequence', 'state', 'erd', 'class', 'mindmap', 'gitgraph', 'bpmn', 'org', 'gantt', 'wireframe',
  'chart', 'sankey', 'journey', 'timeline', 'model', 'views', 'view', 'flow', 'step', 'participant',
  'activate', 'deactivate', 'loop', 'alt', 'else', 'opt', 'par', 'and', 'break', 'critical', 'box',
  'commit', 'branch', 'checkout', 'switch', 'merge', 'cherry-pick', 'fork', 'join', 'choice', 'central',
]);

export function slugifyDslId(label: string): string {
  return label.normalize('NFKD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'n';
}

export function quote(value: string): string {
  // Keywords are case-sensitive lowercase (grammar §2.5), so `Join` needs no quotes.
  const mustQuote = RESERVED_LABELS.has(value) || /(?:->|-->|<->|<-->|<-|<--|:|=|,|\[|\]|\{|\}|\/\/|;)/.test(value);
  return mustQuote ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"` : value;
}

export function nodeLabel(node: SceneNode): string {
  return typeof node.content.label === 'string' && node.content.label.length > 0 ? node.content.label : node.id;
}

export function nodeReference(node: SceneNode): string {
  return dslNodeMeta(node).name ?? nodeLabel(node);
}

/** `Name`, or `id = Name` when the id is not the slug of the name (grammar §6.2). */
export function nodeName(node: SceneNode): string {
  const reference = nodeReference(node);
  const shown = quote(reference);
  return slugifyDslId(reference) === node.id ? shown : `${node.id} = ${shown}`;
}

interface ColorInfo {
  word?: string;
  fill?: 'bold' | 'outline';
}

/** Snap a node's scene colour back to DSL vocabulary; canvas edits win over stale text. */
export function colorInfoFor(node: SceneNode, swatchOf: SwatchResolver = paletteSwatch): ColorInfo {
  const content = node.content;
  const appearance = node.appearance;
  if (node.kind === 'architecture' || node.kind === 'frame' || node.kind === 'class' || node.kind === 'er_entity') {
    const custom = typeof content.customColor === 'string' && isHexColor(content.customColor) ? content.customColor.toLowerCase() : undefined;
    if (custom) return { word: custom, ...(content.colorMode === 'filled' ? { fill: 'bold' as const } : {}) };
    const key = typeof content.color === 'string' ? content.color : undefined;
    const word = key ? COLOR_WORD_FOR_KEY[key] : undefined;
    return { ...(word ? { word } : {}), ...(content.colorMode === 'filled' ? { fill: 'bold' as const } : {}) };
  }
  const fill = typeof appearance.fill === 'string' ? appearance.fill.toLowerCase() : undefined;
  if (fill === 'transparent') {
    const key = typeof appearance.stroke === 'string' ? paletteKeyForStrokeIn(appearance.stroke, swatchOf) : null;
    return { ...(key && COLOR_WORD_FOR_KEY[key] ? { word: COLOR_WORD_FOR_KEY[key] } : {}), fill: 'outline' };
  }
  if (fill && isHexColor(fill)) {
    const snap = paletteKeyForFillIn(fill, swatchOf);
    if (snap) return { ...(COLOR_WORD_FOR_KEY[snap.key] ? { word: COLOR_WORD_FOR_KEY[snap.key] } : {}), ...(snap.mode === 'solid' ? { fill: 'bold' as const } : {}) };
    return { word: fill };
  }
  return {};
}

/** Visual attributes derived from the scene (shape, colour, fill, shadow, icon) plus kept metadata attrs. */
export function nodeAttributes(node: SceneNode, swatchOf: SwatchResolver = paletteSwatch): CanonicalAttribute[] {
  const meta = dslNodeMeta(node);
  const entries: CanonicalAttribute[] = [];
  const shape = dslShapeWord(node.kind, node.content.shape, meta.shape);
  if (shape && shape !== 'rect') entries.push({ value: shape });
  const color = colorInfoFor(node, swatchOf);
  if (color.word) entries.push({ value: color.word });
  if (color.fill) entries.push({ value: color.fill });
  if (node.appearance.shadow === true) entries.push({ value: 'shadow' });
  const icon = typeof node.content.icon === 'string' && node.content.icon ? node.content.icon : meta.icon;
  if (icon) entries.push(isIconWord(icon) ? { value: icon } : { key: 'icon', value: icon });
  const label = nodeLabel(node);
  if (label !== nodeReference(node)) entries.push({ key: 'label', value: label });
  entries.push(...(meta.attrs ?? []));
  return sortAttributes(entries);
}

export function attributeText(attributes: readonly CanonicalAttribute[]): string {
  if (attributes.length === 0) return '';
  return ` [${attributes.map((attribute) => {
    const value = /[,;[\]]/.test(attribute.value) || attribute.value !== attribute.value.trim()
      ? quote(attribute.value) : attribute.value;
    return attribute.key ? `${attribute.key}: ${value}` : value;
  }).join(', ')}]`;
}

export function commentLines(comments: readonly string[] | undefined, indent: string): string[] {
  return (comments ?? []).map((text) => `${indent}//${text ? ` ${text}` : ''}`);
}

export function nodeOrder(node: SceneNode): readonly [number, number, number, string] {
  const line = dslNodeMeta(node).line;
  return [line === Number.MAX_SAFE_INTEGER ? 1 : 0, line, node.transform.translation.y * 1000 + node.transform.translation.x, node.id];
}

export function compareNodes(a: SceneNode, b: SceneNode): number {
  const left = nodeOrder(a);
  const right = nodeOrder(b);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2] || left[3].localeCompare(right[3]);
}

export type MarkerName = 'arrow' | 'circle' | 'cross';

export function markerName(value: unknown): MarkerName | undefined {
  if (typeof value === 'string') {
    const text = value.toLowerCase();
    if (text.includes('arrow')) return 'arrow';
    if (text.includes('dot') || text.includes('circle')) return 'circle';
    if (text.includes('cross')) return 'cross';
  }
  if (value && typeof value === 'object' && !Array.isArray(value)) {
    const type = (value as Record<string, unknown>).type;
    if (typeof type === 'string' && type.toLowerCase().includes('arrow')) return 'arrow';
  }
  return undefined;
}

export function connectorDashed(connector: SceneConnector): boolean {
  const dashShape = connector.appearance.strokeDasharray;
  if (typeof dashShape === 'string' && dashShape.split(/[ ,]+/).some((value) => Number(value) > 0)) return true;
  return connector.appearance.dashPattern === 'dashed';
}

/** `from:`/`to:` sides written by compile; the router honours matching anchors. */
export function sideOf(endpoint: SceneConnector['source']): string | undefined {
  return endpoint.anchor && endpoint.anchor.kind === 'side' && endpoint.anchor.ratio === 0.5 ? endpoint.anchor.side : undefined;
}

export function connectorAttrs(connector: SceneConnector, extra: readonly CanonicalAttribute[] = []): CanonicalAttribute[] {
  const entries: CanonicalAttribute[] = [...extra];
  if (typeof connector.appearance.strokeWidth === 'number' && connector.appearance.strokeWidth >= 2.25) entries.push({ value: 'thick' });
  if (connector.appearance.opacity === 0) entries.push({ value: 'invisible' });
  const from = sideOf(connector.source);
  const to = sideOf(connector.target);
  if (from) entries.push({ key: 'from', value: from });
  if (to) entries.push({ key: 'to', value: to });
  entries.push(...(dslConnectorMeta(connector).attrs ?? []));
  return sortAttributes(entries);
}
