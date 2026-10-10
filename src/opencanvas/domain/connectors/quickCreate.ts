import { createShapeNode, defaultShapeSize, type ShapeKind } from '../nodes/shapeNode';
import type { SceneConnector, SceneNode, ScenePage } from '../document/types';
import type { Point2d } from '../geometry/types';
import type { ConnectSide } from './connectHandles';
import { applyMatrixToPoint, invertMatrix } from '../geometry/matrix';
import { buildNodeWorldMatrices } from '../scene/worldGeometry';

export function oppositeSide(side: ConnectSide): ConnectSide {
  switch (side) {
    case 'top': return 'bottom';
    case 'right': return 'left';
    case 'bottom': return 'top';
    case 'left': return 'right';
  }
}

/** A decision leads to a step: ⊕ from a diamond makes the default box, not another question. */
function isDecision(node: SceneNode): boolean {
  return node.kind === 'decision' || node.content.shape === 'diamond';
}

function sourceShapeKind(node: SceneNode): ShapeKind {
  if (node.kind === 'text') return 'text';
  return node.content.shape === 'ellipse' ? 'ellipse' : 'rectangle';
}

export interface QuickCreatePlan {
  /** New node: same kind and size, blank label. */
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
  connectorId: string,
  /** World point a handle drag was released at; the new node centres on it. Absent: the fixed gap. */
  dropAt?: Point2d
): QuickCreatePlan {
  const source = page.nodes.find((node) => node.id === sourceNodeId);
  if (!source) throw new RangeError(`Node "${sourceNodeId}" was not found.`);
  // The new node lives beside its source, in the same container: translations are parent-local.
  const parentMatrix = source.parentId ? buildNodeWorldMatrices(page).get(source.parentId) : undefined;
  const drop = dropAt && parentMatrix ? applyMatrixToPoint(invertMatrix(parentMatrix), dropAt) : dropAt;
  const decision = isDecision(source);
  const size = decision ? defaultShapeSize('rectangle') : source.size;
  // Centred where a same-size copy would sit, so a smaller box stays on the drag axis.
  const origin = quickCreateOrigin(source, sourceSide);
  const centre = drop ?? { x: origin.x + source.size.width / 2, y: origin.y + source.size.height / 2 };
  const base = createShapeNode(page, {
    kind: decision ? 'rectangle' : sourceShapeKind(source),
    id: newNodeId,
    at: { x: centre.x - size.width / 2, y: centre.y - size.height / 2 },
    size: { ...size },
  });
  const node: SceneNode = {
    ...base,
    parentId: source.parentId,
    ...(decision ? {} : { kind: source.kind, content: { ...source.content, label: '' } }),
    appearance: { ...source.appearance },
  };
  // Sides are not pinned: the drag side only placed the node. Routing picks
  // the facing sides live, so the pair can be rearranged freely afterwards.
  return {
    node,
    connector: {
      id: connectorId,
      source: { nodeId: source.id, portId: null, anchor: null, point: null },
      target: { nodeId: newNodeId, portId: null, anchor: null, point: null },
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
