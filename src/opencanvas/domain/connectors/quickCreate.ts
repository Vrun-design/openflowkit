import { createShapeNode, type ShapeKind } from '../nodes/shapeNode';
import type { SceneConnector, SceneNode, ScenePage } from '../document/types';
import type { Point2d } from '../geometry/types';
import type { ConnectSide } from './connectHandles';
import { createSidePort, ensureNodeSidePort } from './portAuthoring';

export function oppositeSide(side: ConnectSide): ConnectSide {
  switch (side) {
    case 'top': return 'bottom';
    case 'right': return 'left';
    case 'bottom': return 'top';
    case 'left': return 'right';
  }
}

function sourceShapeKind(node: SceneNode): ShapeKind {
  if (node.kind === 'text') return 'text';
  return node.content.shape === 'ellipse' ? 'ellipse' : 'rectangle';
}

export interface QuickCreatePlan {
  /** Source with its drag-side port ensured (identical record when present). */
  readonly sourceNode: SceneNode;
  /** New node: same kind and size, blank label, facing-side port included. */
  readonly node: SceneNode;
  readonly connector: SceneConnector;
}

// Release on empty canvas: the drop point only chose the drag side (fixed at
// grab time). Placement is deterministic — centred on the drag axis, one full
// node size past the source edge (the tldraw gap).
export function quickCreateOrigin(source: SceneNode, side: ConnectSide): Point2d {
  const { x, y } = source.transform.translation;
  const { width, height } = source.size;
  switch (side) {
    case 'right': return { x: x + width * 2, y };
    case 'left': return { x: x - width * 2, y };
    case 'bottom': return { x, y: y + height * 2 };
    case 'top': return { x, y: y - height * 2 };
  }
}

export function planQuickCreate(
  page: ScenePage,
  sourceNodeId: string,
  sourceSide: ConnectSide,
  newNodeId: string,
  connectorId: string
): QuickCreatePlan {
  const source = page.nodes.find((node) => node.id === sourceNodeId);
  if (!source) throw new RangeError(`Node "${sourceNodeId}" was not found.`);
  const targetSide = oppositeSide(sourceSide);
  const base = createShapeNode(page, {
    kind: sourceShapeKind(source),
    id: newNodeId,
    at: quickCreateOrigin(source, sourceSide),
    size: { ...source.size },
  });
  const node: SceneNode = {
    ...base,
    kind: source.kind,
    content: { ...source.content, label: '' },
    appearance: { ...source.appearance },
    ports: [createSidePort(targetSide)],
  };
  return {
    sourceNode: ensureNodeSidePort(source, sourceSide, 'source').node,
    node,
    connector: {
      id: connectorId,
      source: { nodeId: source.id, portId: sourceSide, anchor: null, point: null },
      target: { nodeId: newNodeId, portId: targetSide, anchor: null, point: null },
      route: { kind: 'direct', ownership: 'automatic' },
      waypoints: [],
      labels: [],
      appearance: { markerEnd: 'arrow' },
      semantics: {},
      metadata: {},
      extensions: {},
    },
  };
}
