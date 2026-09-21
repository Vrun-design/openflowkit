// Command builders for every v2 editor operation. The toolbar, keyboard and
// agent actions all build records here so their history entries match.
// Pure: no session, no store, no React.
import type {
  BatchDocumentCommand,
  DocumentCommand,
  InsertConnectorCommand,
  InsertNodeCommand,
  RemoveConnectorCommand,
  RemoveNodeCommand,
  SetNodeCommand,
} from './types';
import type {
  ConnectorEndpoint,
  SceneConnector,
  SceneNode,
  ScenePage,
} from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import {
  createTransformCommand,
  createTransformSnapshot,
  moveTransform,
} from '../transforms/transformSelection';

import {
  createShapeNode, nextNodeZIndex, DEFAULT_SHAPE_SIZE, DEFAULT_TEXT_SIZE, type ShapeKind,
} from '../nodes/shapeNode';
import { planQuickCreate } from '../connectors/quickCreate';
import { measurePortableText } from '../text/measurement';
import { DEFAULT_NODE_CONTENT_LAYOUT } from '../node-layout/model';
import type { ConnectSide } from '../connectors/connectHandles';

export const V2_DEFAULT_SHAPE_SIZE = DEFAULT_SHAPE_SIZE;
export const V2_DEFAULT_TEXT_SIZE = DEFAULT_TEXT_SIZE;

export type V2ShapeKind = ShapeKind;

export interface V2CreateShapeOptions {
  readonly kind: V2ShapeKind;
  readonly id: string;
  readonly at: Point2d;
  readonly size?: Size2d;
  readonly label?: string;
}

// I-03: click or drag creates at the theme default size; one history entry on
// pointer-up; Escape mid-drag commits nothing (the caller drops the command).
export function buildInsertShapeCommand(
  page: ScenePage,
  options: V2CreateShapeOptions
): InsertNodeCommand {
  const node = createShapeNode(page, options);
  return {
    kind: 'insert-node',
    id: `create-node:${node.id}`,
    label: `Create ${options.kind}`,
    pageId: page.id,
    index: page.nodes.length,
    node,
  };
}

// Free-standing text hugs its content (tldraw/Excalidraw): the box is the
// text, never a frame around it. Same font metrics the renderer uses.
export function textNodeSize(label: string): Size2d {
  const { padding } = DEFAULT_NODE_CONTENT_LAYOUT;
  const measured = measurePortableText(label || ' ', { fontSize: 14, fontWeight: 600 });
  return {
    width: Math.max(24, Math.ceil(measured.width) + padding.left + padding.right),
    height: Math.max(24, Math.ceil(measured.height) + padding.top + padding.bottom),
  };
}

// I-06: completion commits exactly one set-node; empty string is a valid label.
export function buildSetNodeLabelCommand(
  page: ScenePage,
  nodeId: string,
  label: string
): SetNodeCommand {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new RangeError(`Node "${nodeId}" was not found.`);
  return {
    kind: 'set-node',
    id: `edit-label:${nodeId}`,
    label: 'Edit label',
    pageId: page.id,
    before: node,
    after: {
      ...node,
      content: { ...node.content, label },
      size: node.kind === 'text' ? textNodeSize(label) : node.size,
    },
  };
}

// Keyboard nudge and drag-move share one commit shape: snapshot, move, command.
export function buildMoveNodesCommand(
  page: ScenePage,
  nodeIds: readonly string[],
  delta: Point2d
): DocumentCommand {
  const snapshot = createTransformSnapshot(page, nodeIds);
  const result = moveTransform(snapshot, delta, { snap: false });
  return createTransformCommand(page.id, snapshot.nodes, result.nodes, 'Move selection');
}

function removeNodeCommands(
  page: ScenePage,
  nodeIds: ReadonlySet<string>
): RemoveNodeCommand[] {
  return page.nodes
    .map((node, index) => ({ node, index }))
    .filter(({ node }) => nodeIds.has(node.id))
    .sort((left, right) => right.index - left.index)
    .map(({ node, index }) => ({
      kind: 'remove-node' as const,
      id: `delete-node:${node.id}`,
      label: 'Delete node',
      pageId: page.id,
      index,
      node,
    }));
}

function attachedConnectorIds(page: ScenePage, nodeIds: ReadonlySet<string>): Set<string> {
  const attached = new Set<string>();
  for (const connector of page.connectors) {
    if (
      (connector.source.nodeId && nodeIds.has(connector.source.nodeId)) ||
      (connector.target.nodeId && nodeIds.has(connector.target.nodeId))
    ) {
      attached.add(connector.id);
    }
  }
  return attached;
}

function removeConnectorCommands(
  page: ScenePage,
  connectorIds: ReadonlySet<string>
): RemoveConnectorCommand[] {
  return page.connectors
    .map((connector, index) => ({ connector, index }))
    .filter(({ connector }) => connectorIds.has(connector.id))
    .sort((left, right) => right.index - left.index)
    .map(({ connector, index }) => ({
      kind: 'remove-connector' as const,
      id: `delete-connector:${connector.id}`,
      label: 'Delete connector',
      pageId: page.id,
      index,
      connector,
    }));
}

// Delete removes nodes plus connectors attached only to deleted nodes (I-09
// basic); surviving connectors keep their other endpoint. Undo restores all.
export function buildDeleteSelectionCommand(
  page: ScenePage,
  nodeIds: readonly string[],
  connectorIds: readonly string[]
): BatchDocumentCommand {
  const nodes = new Set(nodeIds);
  const connectors = new Set(connectorIds);
  for (const attached of attachedConnectorIds(page, nodes)) connectors.add(attached);
  const commands: DocumentCommand[] = [
    ...removeConnectorCommands(page, connectors),
    ...removeNodeCommands(page, nodes),
  ];
  if (commands.length === 0) throw new RangeError('Delete selection is empty.');
  return { kind: 'batch', id: 'delete-selection', label: 'Delete selection', commands };
}

// Duplicate remaps IDs and internal bindings atomically (I-08 basic); edges to
// omitted nodes are excluded. Offset keeps the copy visible next to the source.
export function buildDuplicateSelectionCommand(
  page: ScenePage,
  nodeIds: readonly string[],
  connectorIds: readonly string[],
  mintId: (prefix: string) => string,
  offset: Point2d = { x: 20, y: 20 }
): BatchDocumentCommand {
  const selectedNodes = new Set(nodeIds);
  const selectedConnectors = new Set(connectorIds);
  const idMap = new Map<string, string>();
  for (const id of selectedNodes) idMap.set(id, mintId('node'));
  const commands: DocumentCommand[] = [];
  let nodeIndex = page.nodes.length;
  let zIndex = nextNodeZIndex(page);
  for (const node of page.nodes) {
    const copyId = idMap.get(node.id);
    if (!copyId) continue;
    const copy: SceneNode = {
      ...node,
      id: copyId,
      parentId: (node.parentId && idMap.get(node.parentId)) || null,
      zIndex: zIndex++,
      transform: {
        ...node.transform,
        translation: {
          x: node.transform.translation.x + offset.x,
          y: node.transform.translation.y + offset.y,
        },
      },
      content: { ...node.content },
      appearance: { ...node.appearance },
      ports: node.ports.map((port) => ({ ...port })),
      metadata: { ...node.metadata },
      extensions: { ...node.extensions },
    };
    commands.push({
      kind: 'insert-node',
      id: `duplicate-node:${copyId}`,
      label: 'Duplicate node',
      pageId: page.id,
      index: nodeIndex,
      node: copy,
    });
    nodeIndex += 1;
  }
  let connectorIndex = page.connectors.length;
  for (const connector of page.connectors) {
    if (!selectedConnectors.has(connector.id)) continue;
    const sourceId = connector.source.nodeId;
    const targetId = connector.target.nodeId;
    if (!sourceId || !targetId || !idMap.has(sourceId) || !idMap.has(targetId)) continue;
    const copyId = mintId('connector');
    const copy: SceneConnector = {
      ...connector,
      id: copyId,
      source: { ...connector.source, nodeId: idMap.get(sourceId)! },
      target: { ...connector.target, nodeId: idMap.get(targetId)! },
      waypoints: connector.waypoints.map((point) => ({ ...point })),
      labels: connector.labels.map((label) => ({ ...label })),
      appearance: { ...connector.appearance },
      semantics: { ...connector.semantics },
      metadata: { ...connector.metadata },
      extensions: { ...connector.extensions },
    };
    commands.push({
      kind: 'insert-connector',
      id: `duplicate-connector:${copyId}`,
      label: 'Duplicate connector',
      pageId: page.id,
      index: connectorIndex,
      connector: copy,
    });
    connectorIndex += 1;
  }
  if (commands.length === 0) throw new RangeError('Duplicate selection is empty.');
  return { kind: 'batch', id: 'duplicate-selection', label: 'Duplicate selection', commands };
}

// `]` / `[`: the selection moves above or below everything else, keeping
// its own internal order. One batch, one undo.
export function buildReorderCommand(
  page: ScenePage,
  nodeIds: readonly string[],
  direction: 'front' | 'back'
): BatchDocumentCommand {
  const selected = new Set(nodeIds);
  const others = page.nodes.filter((node) => !selected.has(node.id)).map((node) => node.zIndex);
  const chosen = page.nodes.filter((node) => selected.has(node.id))
    .sort((left, right) => left.zIndex - right.zIndex);
  if (chosen.length === 0) throw new RangeError('Reorder selection is empty.');
  const base = direction === 'front'
    ? Math.max(-1, ...others) + 1
    : Math.min(0, ...others) - chosen.length;
  const commands: SetNodeCommand[] = chosen.flatMap((node, index) =>
    node.zIndex === base + index ? [] : [{
      kind: 'set-node' as const, id: `reorder:${node.id}`, label: 'Reorder',
      pageId: page.id, before: node, after: { ...node, zIndex: base + index },
    }]);
  return { kind: 'batch', id: `reorder-${direction}`, label: direction === 'front' ? 'Bring to front' : 'Send to back', commands };
}

// ⌘L: lock when any selected node is unlocked, else unlock all. Locked
// nodes stay selectable (that is how they get unlocked) but never move.
export function buildToggleLockCommand(
  page: ScenePage,
  nodeIds: readonly string[]
): BatchDocumentCommand {
  const nodes = page.nodes.filter((node) => nodeIds.includes(node.id));
  if (nodes.length === 0) throw new RangeError('Lock selection is empty.');
  const lock = nodes.some((node) => node.content.sectionLocked !== true);
  return {
    kind: 'batch', id: lock ? 'lock-selection' : 'unlock-selection', label: lock ? 'Lock' : 'Unlock',
    commands: nodes.map((node) => ({
      kind: 'set-node' as const, id: `lock:${node.id}`, label: lock ? 'Lock' : 'Unlock',
      pageId: page.id, before: node,
      after: { ...node, content: { ...node.content, sectionLocked: lock } },
    })),
  };
}

/** A connector end: bound to a shape, or a free page-space point (ADR-001). */
export type V2ConnectorEnd = { readonly nodeId: string } | { readonly point: Point2d };

export interface V2ConnectorOptions {
  readonly id: string;
  readonly source: V2ConnectorEnd;
  readonly target: V2ConnectorEnd;
}

function connectorEndpoint(page: ScenePage, end: V2ConnectorEnd): ConnectorEndpoint {
  if ('point' in end) return { nodeId: null, portId: null, anchor: null, point: { ...end.point } };
  if (!page.nodes.some((node) => node.id === end.nodeId)) {
    throw new RangeError(`Connector end "${end.nodeId}" was not found.`);
  }
  return { nodeId: end.nodeId, portId: null, anchor: null, point: null };
}

// I-13 basic: arrow with an automatic orthogonal route and a target arrowhead.
// Ports, markers UI and labels arrive in V2-06.
export function buildInsertConnectorCommand(
  page: ScenePage,
  options: V2ConnectorOptions
): InsertConnectorCommand {
  return {
    kind: 'insert-connector',
    id: `create-connector:${options.id}`,
    label: 'Connect',
    pageId: page.id,
    index: page.connectors.length,
    connector: {
      id: options.id,
      source: connectorEndpoint(page, options.source),
      target: connectorEndpoint(page, options.target),
      route: { kind: 'orthogonal', ownership: 'automatic' },
      waypoints: [],
      labels: [],
      appearance: { markerEnd: 'arrow' },
      semantics: {},
      metadata: {},
      extensions: {},
    },
  };
}

export interface QuickCreateOptions {
  readonly sourceNodeId: string;
  readonly sourceSide: ConnectSide;
  readonly newNodeId: string;
  readonly connectorId: string;
}

// Handle-drag released on empty canvas: new same-kind node at the fixed gap
// plus the side-bound connector as one undo step.
export function buildQuickCreateCommand(
  page: ScenePage,
  options: QuickCreateOptions
): BatchDocumentCommand {
  const plan = planQuickCreate(
    page, options.sourceNodeId, options.sourceSide, options.newNodeId, options.connectorId
  );
  return {
    kind: 'batch', id: `quick-create:${plan.node.id}`, label: 'Quick create',
    commands: [
      {
        kind: 'insert-node', id: `create-node:${plan.node.id}`, label: 'Quick create',
        pageId: page.id, index: page.nodes.length, node: plan.node,
      },
      {
        kind: 'insert-connector', id: `create-connector:${plan.connector.id}`, label: 'Quick create',
        pageId: page.id, index: page.connectors.length, connector: plan.connector,
      },
    ],
  };
}


