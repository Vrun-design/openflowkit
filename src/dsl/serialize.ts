import type { SceneConnector, SceneNode } from '../opencanvas/domain/document/types';
import { paletteKeyForFill } from '../opencanvas/domain/nodes/nodePalette';
import { dslConnectorMeta, dslFrameMeta, dslNodeMeta, type CanonicalAttribute } from './sceneMeta';
import {
  COLOR_WORD_FOR_KEY, DSL_FAMILY_DIRECTION, dslShapeWord, isHexColor, isIconWord, sortAttributes,
} from './vocabulary';
import { compile, slugifyDslId } from './compile';

export interface DslFrameScene {
  frame: SceneNode;
  nodes: readonly SceneNode[];
  groups?: readonly SceneNode[];
  connectors: readonly SceneConnector[];
}

const RESERVED_LABELS = new Set([
  'group', 'note', 'title', 'direction', 'autonumber', 'legend', 'align', 'flowchart', 'architecture',
  'sequence', 'state', 'erd', 'class', 'mindmap', 'gitgraph', 'bpmn', 'org', 'gantt', 'wireframe',
  'chart', 'sankey', 'journey', 'timeline', 'model', 'views', 'view', 'flow', 'step', 'participant',
  'commit', 'branch', 'checkout', 'switch', 'merge', 'state', 'fork', 'join', 'choice',
]);

export function quote(value: string): string {
  // Keywords are case-sensitive lowercase (grammar §2.5), so `Join` needs no quotes.
  const mustQuote = RESERVED_LABELS.has(value) || /(?:->|-->|<->|<-->|<-|<--|:|=|,|\[|\]|\{|\}|\/\/|;)/.test(value);
  return mustQuote ? `"${value.replace(/\\/g, '\\\\').replace(/"/g, '\\"').replace(/\n/g, '\\n')}"` : value;
}

const KEY_TO_COLOR_WORD = COLOR_WORD_FOR_KEY;

interface ColorInfo {
  word?: string;
  fill?: 'bold' | 'outline';
}

function colorInfoFor(node: SceneNode): ColorInfo {
  const content = node.content;
  const appearance = node.appearance;
  if (node.kind === 'architecture' || node.kind === 'frame') {
    const custom = typeof content.customColor === 'string' && isHexColor(content.customColor) ? content.customColor.toLowerCase() : undefined;
    if (custom) return { word: custom, ...(content.colorMode === 'filled' ? { fill: 'bold' as const } : {}) };
    const key = typeof content.color === 'string' ? content.color : undefined;
    const word = key ? KEY_TO_COLOR_WORD[key] : undefined;
    return { ...(word ? { word } : {}), ...(content.colorMode === 'filled' ? { fill: 'bold' as const } : {}) };
  }
  const fill = typeof appearance.fill === 'string' ? appearance.fill.toLowerCase() : undefined;
  if (fill === 'transparent') {
    const key = typeof appearance.stroke === 'string' ? paletteKeyForFill(appearance.stroke)?.key : undefined;
    return { ...(key && KEY_TO_COLOR_WORD[key] ? { word: KEY_TO_COLOR_WORD[key] } : {}), fill: 'outline' };
  }
  if (fill && isHexColor(fill)) {
    const snap = paletteKeyForFill(fill);
    if (snap) return { ...(KEY_TO_COLOR_WORD[snap.key] ? { word: KEY_TO_COLOR_WORD[snap.key] } : {}), ...(snap.mode === 'solid' ? { fill: 'bold' as const } : {}) };
    return { word: fill };
  }
  return {};
}

function nodeOrder(node: SceneNode): readonly [number, number, number, string] {
  const line = dslNodeMeta(node).line;
  return [line === Number.MAX_SAFE_INTEGER ? 1 : 0, line, node.transform.translation.y * 1000 + node.transform.translation.x, node.id];
}

function compareNodes(a: SceneNode, b: SceneNode): number {
  const left = nodeOrder(a);
  const right = nodeOrder(b);
  return left[0] - right[0] || left[1] - right[1] || left[2] - right[2] || left[3].localeCompare(right[3]);
}

function nodeLabel(node: SceneNode): string {
  return typeof node.content.label === 'string' && node.content.label.length > 0 ? node.content.label : node.id;
}

function nodeReference(node: SceneNode): string {
  return dslNodeMeta(node).name ?? nodeLabel(node);
}

function nodeName(node: SceneNode): string {
  const reference = nodeReference(node);
  const shown = quote(reference);
  return slugifyDslId(reference) === node.id ? shown : `${node.id} = ${shown}`;
}

function nodeAttributes(node: SceneNode): CanonicalAttribute[] {
  const meta = dslNodeMeta(node);
  const entries: CanonicalAttribute[] = [];
  const shape = dslShapeWord(node.kind, node.content.shape, meta.shape);
  if (shape && shape !== 'rect') entries.push({ value: shape });
  const color = colorInfoFor(node);
  if (color.word) entries.push({ value: color.word });
  if (color.fill && color.fill !== 'bold') entries.push({ value: color.fill });
  if (node.appearance.shadow === true) entries.push({ value: 'shadow' });
  const icon = typeof node.content.icon === 'string' && node.content.icon ? node.content.icon : meta.icon;
  if (icon) entries.push(isIconWord(icon) ? { value: icon } : { key: 'icon', value: icon });
  const label = nodeLabel(node);
  if (label !== nodeReference(node)) entries.push({ key: 'label', value: label });
  entries.push(...(meta.attrs ?? []));
  return sortAttributes(entries);
}

function attributeText(attributes: readonly CanonicalAttribute[]): string {
  if (attributes.length === 0) return '';
  return ` [${attributes.map((attribute) => {
    const value = /[,;[\]]/.test(attribute.value) || attribute.value !== attribute.value.trim()
      ? quote(attribute.value) : attribute.value;
    return attribute.key ? `${attribute.key}: ${value}` : value;
  }).join(', ')}]`;
}

function markerName(value: unknown): 'arrow' | 'circle' | 'cross' | undefined {
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

function connectorDashed(connector: SceneConnector): boolean {
  const dashShape = connector.appearance.strokeDasharray;
  if (typeof dashShape === 'string' && dashShape.split(/[ ,]+/).some((value) => Number(value) > 0)) return true;
  return connector.appearance.dashPattern === 'dashed';
}

function edgeAttributes(connector: SceneConnector, dashed: boolean, head: string, tail: string): CanonicalAttribute[] {
  const entries: CanonicalAttribute[] = [];
  if (dashed && head === 'none' && tail === 'none') entries.push({ value: 'dashed' });
  if (typeof connector.appearance.strokeWidth === 'number' && connector.appearance.strokeWidth >= 2.25) entries.push({ value: 'thick' });
  if (connector.appearance.opacity === 0) entries.push({ value: 'invisible' });
  if (head !== 'arrow' && head !== 'none') entries.push({ key: 'head', value: head });
  if (tail !== 'none' && tail !== 'arrow') entries.push({ key: 'tail', value: tail });
  const side = (endpoint: SceneConnector['source']): string | undefined => (
    endpoint.anchor && endpoint.anchor.kind === 'side' && endpoint.anchor.ratio === 0.5 ? endpoint.anchor.side : undefined
  );
  const from = side(connector.source);
  const to = side(connector.target);
  if (from) entries.push({ key: 'from', value: from });
  if (to) entries.push({ key: 'to', value: to });
  entries.push(...(dslConnectorMeta(connector).attrs ?? []));
  return sortAttributes(entries);
}

function commentLines(comments: readonly string[] | undefined, indent: string): string[] {
  return (comments ?? []).map((text) => `${indent}//${text ? ` ${text}` : ''}`);
}

/** Serializes frame content deterministically; canvas geometry only orders statements without a parsed line. */
export function serialize(scene: DslFrameScene): string {
  const frame = scene.frame;
  const meta = dslFrameMeta(frame);
  const family = meta.family;
  const defaultDirection = DSL_FAMILY_DIRECTION[family] ?? 'down';
  const direction = meta.direction && meta.direction !== defaultDirection ? meta.direction : undefined;
  const title = typeof frame.content.label === 'string' && frame.content.label.length > 0 ? frame.content.label : meta.title;
  const groups = [...(scene.groups ?? [])];
  const nodes = [...scene.nodes].filter((node) => !dslNodeMeta(node).noteFor);
  const noteCarriers = nodes.filter((node) => (dslNodeMeta(node).notes ?? []).length > 0);
  const byId = new Map([...nodes, ...groups].map((node) => [node.id, node]));
  const groupIds = new Set(groups.map((group) => group.id));
  const connected = new Set(scene.connectors.flatMap((connector) => [connector.source.nodeId, connector.target.nodeId].filter((id): id is string => !!id)));
  const lines: string[] = ['%% ofk 1', `${family}${direction ? ` ${direction}` : ''}`];
  if (title) lines.push(`title: ${title}`);
  lines.push('');

  const chainOf = (nodeId: string): string[] => {
    const chain: string[] = [];
    let current = byId.get(nodeId);
    while (current) {
      if (current.parentId && groupIds.has(current.parentId)) chain.unshift(current.parentId);
      current = byId.get(current.parentId ?? '');
    }
    return chain;
  };
  const deepestCommon = (a: string, b: string): string | null => {
    const left = chainOf(a);
    const right = chainOf(b);
    let common: string | null = null;
    for (let index = 0; index < Math.min(left.length, right.length); index += 1) {
      if (left[index] === right[index]) common = left[index]!;
    }
    return common;
  };
  const edgeLine = (connector: SceneConnector): string | undefined => {
    const source = connector.source.nodeId ? byId.get(connector.source.nodeId) : undefined;
    const target = connector.target.nodeId ? byId.get(connector.target.nodeId) : undefined;
    if (!source || !target) return undefined;
    const dashed = connectorDashed(connector);
    const start = markerName(connector.appearance.markerStart);
    const end = markerName(connector.appearance.markerEnd);
    const head = end ?? 'none';
    const tail = start ?? 'none';
    const both = head === 'arrow' && tail === 'arrow';
    const forward = head === 'arrow' || tail !== 'arrow' || Boolean(connector.labels.length);
    const arrow = both ? (dashed ? '<-->' : '<->') : forward ? (head === 'arrow' ? (dashed ? '-->' : '->') : '--') : (dashed ? '-->' : '->');
    const from = forward ? source : target;
    const to = forward ? target : source;
    const label = connector.labels[0]?.text;
    const attrs = forward || both ? edgeAttributes(connector, dashed, head, tail) : [];
    return [
      ...commentLines(dslConnectorMeta(connector).comments, ''),
      `${nodeName(from)} ${arrow} ${nodeName(to)}${label ? ` : ${quote(label)}` : ''}${attributeText(attrs)}`,
    ].join('\n');
  };

  const emitNode = (node: SceneNode, indent: string) => {
    lines.push(...commentLines(dslNodeMeta(node).comments, indent));
    lines.push(`${indent}${nodeName(node)}${attributeText(nodeAttributes(node))}`);
  };
  const nodeEmitted = new Set<string>();
  const edges = scene.connectors
    .map((connector) => ({ connector, line: edgeLine(connector), depth: deepestCommon(connector.source.nodeId ?? '', connector.target.nodeId ?? '') }))
    .filter((entry): entry is { connector: SceneConnector; line: string; depth: string | null } => Boolean(entry.line))
    // Stable sort on the parsed line keeps chains and fans in author order.
    .sort((a, b) => dslConnectorMeta(a.connector).line - dslConnectorMeta(b.connector).line);

  const emitGroup = (group: SceneNode, indent: string) => {
    lines.push(...commentLines(dslNodeMeta(group).comments, indent));
    lines.push(`${indent}group ${nodeName(group)}${attributeText(nodeAttributes(group))} {`);
    const members = nodes.filter((node) => node.parentId === group.id).sort(compareNodes);
    for (const member of members) {
      emitNode(member, `${indent}  `);
      nodeEmitted.add(member.id);
    }
    for (const child of groups.filter((candidate) => candidate.parentId === group.id).sort(compareNodes)) emitGroup(child, `${indent}  `);
    for (const { connector, line } of edges) {
      if (line && deepestCommon(connector.source.nodeId ?? '', connector.target.nodeId ?? '') === group.id) lines.push(`${indent}  ${line.split('\n').join(`\n${indent}  `)}`);
    }
    lines.push(`${indent}}`);
  };

  for (const node of nodes.filter((node) => node.parentId === frame.id).sort(compareNodes)) {
    const hasAttributes = nodeAttributes(node).length > 0;
    const needsName = dslNodeMeta(node).name !== undefined || slugifyDslId(nodeReference(node)) !== node.id;
    if (hasAttributes || needsName || !connected.has(node.id)) {
      emitNode(node, '');
      nodeEmitted.add(node.id);
    }
  }
  for (const group of groups.filter((group) => group.parentId === frame.id).sort(compareNodes)) emitGroup(group, '');
  const insideGroup = new Set(edges.filter((entry) => entry.depth !== null).map((entry) => entry.connector.id));
  for (const { connector, line } of edges) {
    if (!line || insideGroup.has(connector.id)) continue;
    lines.push(...line.split('\n'));
  }
  const frameDsl = frame.metadata.dsl as { align?: unknown; reserved?: unknown } | undefined;
  if (Array.isArray(frameDsl?.align)) lines.push(...frameDsl.align.filter((item): item is string => typeof item === 'string'));
  for (const node of noteCarriers) {
    for (const note of dslNodeMeta(node).notes ?? []) lines.push(`note ${quote(nodeReference(node))} : ${note}`);
  }
  if (Array.isArray(frameDsl?.reserved)) lines.push(...frameDsl.reserved.filter((item): item is string => typeof item === 'string'));
  lines.push(...commentLines(meta.comments, ''));
  while (lines.length > 0 && lines.at(-1) === '') lines.pop();
  return `${lines.join('\n')}\n`;
}

export async function format(text: string): Promise<string> {
  return serialize(await compile(text));
}
