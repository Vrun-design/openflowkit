import type { SceneConnector, SceneNode, ScenePage } from '../document/types';
import { resolveNodeStyle } from '../nodes/nodeStyle';
import { buildNodeStateMap } from './nodeState';
import { buildNodeWorldMatrices, nodeWorldBounds } from './worldGeometry';

// What the Inspect panel shows for a selection: plain rows, no React. The panel
// renders whatever sections come back, so a new field is one line here.

export interface InspectRow {
  readonly label: string;
  readonly value: string;
  /** A colour to draw beside the value. */
  readonly swatch?: string;
}

export interface InspectSection {
  readonly title: string;
  readonly rows: readonly InspectRow[];
}

export interface InspectLink {
  readonly direction: 'in' | 'out';
  /** The node at the other end; null for a free endpoint. */
  readonly nodeId: string | null;
  readonly name: string;
  readonly label: string;
}

export interface InspectCode {
  /** The diagram frame whose source holds the line. */
  readonly frameId: string;
  /** 1-based, as the DSL records it. */
  readonly line: number;
  readonly text: string;
}

export type InspectReport =
  | { readonly kind: 'empty' }
  | { readonly kind: 'many'; readonly items: readonly { readonly id: string; readonly name: string }[] }
  | {
    readonly kind: 'node' | 'connector';
    readonly id: string;
    readonly title: string;
    readonly subtitle: string;
    readonly sections: readonly InspectSection[];
    readonly connections: readonly InspectLink[];
    readonly code: InspectCode | null;
    /** Set when the node is a placed C4 model element. */
    readonly elementId: string | null;
  };

const text = (value: unknown): string => (typeof value === 'string' ? value : '');
const human = (id: string): string => {
  const words = id.replace(/[-_]+/g, ' ').trim();
  return words ? words[0]!.toUpperCase() + words.slice(1) : id;
};
const round = (value: number): string => String(Math.round(value));
const record = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' && !Array.isArray(value) ? (value as Record<string, unknown>) : {};

function nodeName(node: SceneNode | undefined): string {
  if (!node) return 'Free point';
  return text(node.content.label).split('\n')[0] || human(text(node.content.shape) || node.kind);
}

function nodeKind(node: SceneNode): string {
  const family = text(record(node.metadata.dsl).family);
  if (node.kind === 'frame' && family) return `${human(family)} diagram`;
  return human(text(node.content.shape) || node.kind);
}

/** The line of DSL that made this node or connector, read from the nearest diagram frame's source. */
export function inspectCode(page: ScenePage, line: unknown, startNodeId: string | null): InspectCode | null {
  if (typeof line !== 'number' || !Number.isInteger(line) || line < 1) return null;
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const seen = new Set<string>();
  for (let id = startNodeId; id !== null && !seen.has(id);) {
    seen.add(id);
    const node = byId.get(id);
    if (!node) return null;
    const source = record(node.metadata.dsl).source;
    if (node.kind === 'frame' && typeof source === 'string') {
      const lineText = source.split('\n')[line - 1];
      return lineText === undefined ? null : { frameId: node.id, line, text: lineText.trim() };
    }
    id = node.parentId;
  }
  return null;
}

function connectorName(connector: SceneConnector, byId: ReadonlyMap<string, SceneNode>): string {
  const from = connector.source.nodeId ? byId.get(connector.source.nodeId) : undefined;
  const to = connector.target.nodeId ? byId.get(connector.target.nodeId) : undefined;
  return `${nodeName(from)} → ${nodeName(to)}`;
}

const ROUTE_NAMES: Record<string, string> = { orthogonal: 'Elbow', direct: 'Straight', bezier: 'Curve', polyline: 'Path' };

function inspectNode(page: ScenePage, node: SceneNode): InspectReport {
  const byId = new Map(page.nodes.map((candidate) => [candidate.id, candidate]));
  const matrix = buildNodeWorldMatrices(page).get(node.id);
  const bounds = matrix ? nodeWorldBounds(node, matrix) : null;
  const style = resolveNodeStyle(node);
  const state = buildNodeStateMap(page).get(node.id);
  const layer = page.layers.find((candidate) => candidate.id === node.layerId);
  const parent = node.parentId ? byId.get(node.parentId) : undefined;
  const dash = style.strokeStyle === 'solid' ? 'solid' : style.strokeStyle;

  const layout: InspectRow[] = [
    ...(bounds ? [
      { label: 'X', value: round(bounds.x) }, { label: 'Y', value: round(bounds.y) },
      { label: 'W', value: round(bounds.width) }, { label: 'H', value: round(bounds.height) },
    ] : []),
    { label: 'Rotation', value: `${round((node.transform.rotationRadians * 180) / Math.PI)}°` },
    ...(parent ? [{ label: 'Parent', value: nodeName(parent) }] : []),
    { label: 'Layer', value: `${layer?.name ?? node.layerId} · z ${node.zIndex}` },
    { label: 'Locked', value: state?.locked ? 'Yes' : 'No' },
  ];
  const styleRows: InspectRow[] = [
    { label: 'Fill', value: style.fill, swatch: style.fill },
    { label: 'Stroke', value: `${style.stroke} · ${style.strokeWidth} · ${dash}`, swatch: style.stroke },
    ...(style.cornerRadius ? [{ label: 'Corner', value: String(style.cornerRadius) }] : []),
    { label: 'Text', value: `${human(style.fontFamily)} ${style.fontSize} / ${style.fontWeight}`, swatch: style.textColor },
    ...(style.opacity < 1 ? [{ label: 'Opacity', value: `${Math.round(style.opacity * 100)}%` }] : []),
  ];
  const content: InspectRow[] = [
    { label: 'Label', value: text(node.content.label) },
    ...(text(node.content.subLabel) ? [{ label: 'Description', value: text(node.content.subLabel) }] : []),
    ...(text(node.content.icon) ? [{ label: 'Icon', value: text(node.content.icon) }] : []),
  ];
  const connections: InspectLink[] = page.connectors.flatMap((connector): InspectLink[] => {
    const label = connector.labels.map((entry) => entry.text).join(' · ');
    const out = connector.source.nodeId === node.id;
    const into = connector.target.nodeId === node.id;
    if (!out && !into) return [];
    const otherId = out ? connector.target.nodeId : connector.source.nodeId;
    return [{ direction: out ? 'out' : 'in', nodeId: otherId, name: nodeName(otherId ? byId.get(otherId) : undefined), label }];
  });
  const elementId = text(record(node.metadata.model).elementId) || null;
  return {
    kind: 'node', id: node.id, title: nodeName(node), subtitle: elementId ? `${nodeKind(node)} · C4 element` : nodeKind(node),
    sections: [
      { title: 'Layout', rows: layout },
      { title: 'Style', rows: styleRows },
      { title: 'Content', rows: content },
    ],
    connections, code: inspectCode(page, record(node.metadata.dsl).line, node.parentId), elementId,
  };
}

function inspectConnector(page: ScenePage, connector: SceneConnector): InspectReport {
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  const appearance = connector.appearance;
  const end = (side: 'source' | 'target') => connector[side].nodeId;
  const rows: InspectRow[] = [
    { label: 'From', value: nodeName(end('source') ? byId.get(end('source')!) : undefined) },
    { label: 'To', value: nodeName(end('target') ? byId.get(end('target')!) : undefined) },
    { label: 'Route', value: ROUTE_NAMES[connector.route.kind] ?? connector.route.kind },
    { label: 'Line', value: text(appearance.dashPattern) || text(appearance.strokeStyle) || 'solid' },
    { label: 'Arrows', value: `${text(appearance.markerStart) || 'none'} → ${text(appearance.markerEnd) || 'none'}` },
    ...(text(appearance.stroke) ? [{ label: 'Stroke', value: text(appearance.stroke), swatch: text(appearance.stroke) }] : []),
  ];
  const label = connector.labels.map((entry) => entry.text).filter(Boolean).join(' · ');
  return {
    kind: 'connector', id: connector.id, title: label || connectorName(connector, byId), subtitle: 'Connector',
    sections: [{ title: 'Connector', rows: label ? [...rows, { label: 'Label', value: label }] : rows }],
    connections: [], code: inspectCode(page, record(connector.metadata.dsl).line, end('source')),
    elementId: null,
  };
}

/** One node or connector gets the full report; more than one gets a list. */
export function inspectSelection(page: ScenePage, nodeIds: readonly string[], connectorIds: readonly string[]): InspectReport {
  const nodes = page.nodes.filter((node) => nodeIds.includes(node.id));
  const connectors = page.connectors.filter((connector) => connectorIds.includes(connector.id));
  if (nodes.length + connectors.length === 0) return { kind: 'empty' };
  if (nodes.length === 1 && connectors.length === 0) return inspectNode(page, nodes[0]!);
  if (connectors.length === 1 && nodes.length === 0) return inspectConnector(page, connectors[0]!);
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  return {
    kind: 'many',
    items: [
      ...nodes.map((node) => ({ id: node.id, name: nodeName(node) })),
      ...connectors.map((connector) => ({ id: connector.id, name: connectorName(connector, byId) })),
    ],
  };
}
