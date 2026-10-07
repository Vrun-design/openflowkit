import type {
  ConnectorEndpoint,
  SceneAnchor,
  SceneConnector,
  SceneNode,
  ScenePage,
} from '../document/types';
import { applyMatrixToPoint, invertMatrix } from '../geometry/matrix';
import { dedupePolyline, pointAtPolylineRatio } from '../geometry/polyline';
import { distanceBetweenPoints } from '../geometry/point';
import type { Bounds2d, Matrix2d, Point2d } from '../geometry/types';
import { createBounds2d, intersectsBounds } from '../geometry/bounds';
import { connectorLabelPlate } from './labelStyle';
import { transformBounds } from '../geometry/matrix';
import { nodeOutline } from '../nodes/nodeLabelBounds';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from '../scene/worldGeometry';
import { resolveConnectorPresentation } from './presentation';
import { dropCollinear, routeOrthogonalBetweenSides } from './obstacleRouting';
import { facingSide, sideAnchor, type ConnectSide } from './connectHandles';
import type { ConnectorPathCommand, ProjectedConnector } from './types';

/** Where an automatic orthogonal end meets its node: the side, and how far off its middle. */
interface SpreadEnd {
  readonly side: ConnectSide;
  readonly offset: number;
}

interface ConnectorProjectionContext {
  readonly nodesById: ReadonlyMap<string, SceneNode>;
  readonly matrices: ReadonlyMap<string, Matrix2d>;
  readonly lateralByConnectorId: ReadonlyMap<string, number>;
  /** Keyed `${connectorId}:source|target`. */
  readonly spreadByEnd: ReadonlyMap<string, SpreadEnd>;
  /** Nodes a label must not cover: every node but the containers, which a label may sit inside. */
  readonly labelObstacles: () => readonly Bounds2d[];
}

const SEQUENCE_PARTICIPANT_HEADER_HEIGHT = 48;
const SEQUENCE_ACTOR_HEIGHT = 40;
const SEQUENCE_MESSAGE_OFFSET = 20;
const SEQUENCE_MESSAGE_SPACING = 52;

function createConnectorProjectionContext(page: ScenePage): ConnectorProjectionContext {
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const matrices = buildNodeWorldMatrices(page);
  let labelObstacles: readonly Bounds2d[] | null = null;
  return {
    nodesById, matrices,
    lateralByConnectorId: parallelLateralOffsets(page.connectors),
    spreadByEnd: spreadEnds(page.connectors, nodesById, matrices),
    labelObstacles: () => {
      if (labelObstacles) return labelObstacles;
      const parents = new Set(page.nodes.map((node) => node.parentId));
      labelObstacles = page.nodes.filter((node) => !parents.has(node.id) && matrices.has(node.id))
        .map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
      return labelObstacles;
    },
  };
}

/**
 * The box edges meet: the painted silhouette's (an icon node's 72 px plate, not the
 * caption box around it). With `toBottom` it runs down to the node's bottom, where a
 * downward edge leaves so it never cuts through a caption under the plate.
 */
function connectWorldBounds(node: SceneNode, matrix: Matrix2d, toBottom = true): Bounds2d {
  const outline = nodeOutline(node);
  const left = Math.min(...outline.map((point) => point.x));
  const top = Math.min(...outline.map((point) => point.y));
  const right = Math.max(...outline.map((point) => point.x));
  const bottom = toBottom ? node.size.height : Math.max(...outline.map((point) => point.y));
  return transformBounds(matrix, createBounds2d(left, top, right - left, bottom - top));
}

const SPREAD_STEP_PX = 24;

/**
 * Where a line in from `side`, `along` px off its middle, first meets the outline
 * (node-local): a diamond's slanted edge, a parallelogram's lean, a circle's rim.
 */
function outlineHit(outline: readonly Point2d[], side: ConnectSide, along: number): Point2d | null {
  const vertical = side === 'top' || side === 'bottom';
  let best: Point2d | null = null;
  outline.forEach((from, index) => {
    const to = outline[(index + 1) % outline.length]!;
    const [a, b] = vertical ? [from.x, to.x] : [from.y, to.y];
    if ((a - along) * (b - along) > 0 || a === b) return;
    const t = (along - a) / (b - a);
    const hit = vertical ? { x: along, y: from.y + t * (to.y - from.y) } : { x: from.x + t * (to.x - from.x), y: along };
    const better = !best || (side === 'top' ? hit.y < best.y : side === 'bottom' ? hit.y > best.y : side === 'left' ? hit.x < best.x : hit.x > best.x);
    if (better) best = hit;
  });
  return best;
}

/**
 * An automatic end's point: `offset` px along `side` from its middle, on the painted
 * outline. A downward end under an icon plate leaves below the caption instead.
 * ponytail: rotated or flipped nodes meet their box side; project onto the outline there too if one shows up.
 */
function outlinePoint(node: SceneNode, matrix: Matrix2d, side: ConnectSide, offset: number): Point2d {
  const outline = nodeOutline(node);
  const xs = outline.map((point) => point.x);
  const ys = outline.map((point) => point.y);
  const box = createBounds2d(Math.min(...xs), Math.min(...ys), Math.max(...xs) - Math.min(...xs), Math.max(...ys) - Math.min(...ys));
  const vertical = side === 'top' || side === 'bottom';
  if (matrix.b !== 0 || matrix.c !== 0 || matrix.a <= 0 || matrix.d <= 0) {
    const middle = sideAnchor(connectWorldBounds(node, matrix, side === 'bottom'), side);
    return vertical ? { x: middle.x + offset, y: middle.y } : { x: middle.x, y: middle.y + offset };
  }
  const along = vertical ? box.x + box.width / 2 + offset / matrix.a : box.y + box.height / 2 + offset / matrix.d;
  const caption = side === 'bottom' && node.size.height > box.y + box.height + 0.5;
  const local = caption ? { x: along, y: node.size.height }
    : outlineHit(outline, side, along) ?? sideAnchor(box, side);
  return applyMatrixToPoint(matrix, local);
}

/**
 * Automatic orthogonal ends that meet the same flat side spread along it, ordered
 * by where their other ends sit, so no two edges share a point or a final run (the
 * "bracket" a fan-in drew when every end took the side's middle).
 */
function spreadEnds(
  connectors: readonly SceneConnector[],
  nodesById: ReadonlyMap<string, SceneNode>,
  matrices: ReadonlyMap<string, Matrix2d>
): ReadonlyMap<string, SpreadEnd> {
  const bounds = new Map<string, Bounds2d>();
  const boundsOf = (node: SceneNode): Bounds2d => {
    const known = bounds.get(node.id);
    if (known) return known;
    const fresh = connectWorldBounds(node, matrices.get(node.id)!);
    bounds.set(node.id, fresh);
    return fresh;
  };
  const sides = new Map<string, { key: string; node: SceneNode; side: ConnectSide; along: number }[]>();
  for (const connector of connectors) {
    const { source, target } = connector;
    if (connector.route.kind !== 'orthogonal' || connector.waypoints.length > 0 || connector.metadata.hidden === true) continue;
    if (typeof connector.semantics.seqMessageKind === 'string' || !source.nodeId || !target.nodeId || source.nodeId === target.nodeId) continue;
    const sourceNode = nodesById.get(source.nodeId);
    const targetNode = nodesById.get(target.nodeId);
    if (!sourceNode || !targetNode || !matrices.has(sourceNode.id) || !matrices.has(targetNode.id)) continue;
    for (const [end, self, other, which] of [[source, sourceNode, targetNode, 'source'], [target, targetNode, sourceNode, 'target']] as const) {
      if (endAnchor(end, self)) continue;
      const side = facingSide(boundsOf(self), boundsOf(other));
      const otherBounds = boundsOf(other);
      const along = side === 'top' || side === 'bottom' ? otherBounds.x + otherBounds.width / 2 : otherBounds.y + otherBounds.height / 2;
      const group = `${self.id}:${side}`;
      sides.set(group, [...(sides.get(group) ?? []), { key: `${connector.id}:${which}`, node: self, side, along }]);
    }
  }
  const spread = new Map<string, SpreadEnd>();
  for (const ends of sides.values()) {
    const { node, side } = ends[0]!;
    if (ends.length < 2) continue;
    const box = boundsOf(node);
    const length = side === 'top' || side === 'bottom' ? box.width : box.height;
    const step = Math.min(SPREAD_STEP_PX, (length * 0.6) / (ends.length - 1));
    [...ends].sort((a, b) => a.along - b.along).forEach((end, index) => {
      spread.set(end.key, { side, offset: (index - (ends.length - 1) / 2) * step });
    });
  }
  return spread;
}

/**
 * Where a label sits clear of every node: the asked-for point if it is, else the
 * midpoint of the longest clear run, else the asked-for point after all. Labels
 * the user placed (an offset) never come here.
 */
export function clearLabelPoint(
  text: string,
  pathRatio: number,
  samples: readonly Point2d[],
  obstacles: readonly Bounds2d[],
  plate: (text: string, point: Point2d) => Bounds2d
): Point2d | null {
  const preferred = pointAtPolylineRatio(samples, pathRatio);
  if (!preferred) return null;
  const runs = samples.slice(1).map((point, index) => ({ from: samples[index]!, to: point }))
    .sort((a, b) => distanceBetweenPoints(b.from, b.to) - distanceBetweenPoints(a.from, a.to))
    .map(({ from, to }) => ({ x: (from.x + to.x) / 2, y: (from.y + to.y) / 2 }));
  const clear = (point: Point2d) => !obstacles.some((bounds) => intersectsBounds(bounds, plate(text, point)));
  return [preferred, ...runs].find(clear) ?? preferred;
}

function endAnchor(endpoint: ConnectorEndpoint, node: SceneNode): SceneAnchor | null {
  return endpoint.anchor
    ?? node.ports.find((port) => port.id === endpoint.portId)?.anchor
    ?? sideAnchorForDanglingPort(endpoint.portId);
}

// Parallel (and reverse) edges between the same node pair fan out so none
// hides behind another: member i rides (i-(n-1)/2)×12 px off the lane,
// endpoints pinned to their ports. Free ends never group.
export const PARALLEL_EDGE_OFFSET_PX = 12;

function parallelLateralOffsets(connectors: readonly SceneConnector[]): ReadonlyMap<string, number> {
  const groups = new Map<string, SceneConnector[]>();
  for (const connector of connectors) {
    if (!connector.source.nodeId || !connector.target.nodeId) continue;
    // Sequence messages already sit on their own rows; fanning them bends each into a V.
    if (typeof connector.semantics.seqMessageKind === 'string') continue;
    const key = [connector.source.nodeId, connector.target.nodeId].sort().join('→');
    const group = groups.get(key);
    if (group) group.push(connector);
    else groups.set(key, [connector]);
  }
  const offsets = new Map<string, number>();
  for (const group of groups.values()) {
    if (group.length < 2) continue;
    group.forEach((connector, index) => {
      offsets.set(connector.id, (index - (group.length - 1) / 2) * PARALLEL_EDGE_OFFSET_PX);
    });
  }
  return offsets;
}

function shiftInteriorOrthogonal(
  samples: readonly Point2d[],
  offset: number,
  flipNormal: boolean
): readonly Point2d[] {
  if (samples.length < 2 || offset === 0) return samples;
  const first = samples[0];
  const last = samples[samples.length - 1];
  const dx = last.x - first.x;
  const dy = last.y - first.y;
  const length = Math.hypot(dx, dy);
  if (!(length > 1e-9)) return samples;
  const sign = flipNormal ? -1 : 1;
  const shift = { x: (-dy / length) * offset * sign, y: (dx / length) * offset * sign };
  if (samples.length === 2) {
    return [first, { x: (first.x + last.x) / 2 + shift.x, y: (first.y + last.y) / 2 + shift.y }, last];
  }
  return samples.map((point, index) =>
    index === 0 || index === samples.length - 1
      ? point
      : { x: point.x + shift.x, y: point.y + shift.y }
  );
}

function anchorLocalPoint(node: SceneNode, anchor: SceneAnchor): Point2d {
  if (anchor.kind === 'center') return { x: node.size.width / 2, y: node.size.height / 2 };
  if (anchor.kind === 'normalized') {
    return { x: node.size.width * anchor.x, y: node.size.height * anchor.y };
  }
  const ratio = anchor.ratio;
  switch (anchor.side) {
    case 'top':
      return { x: node.size.width * ratio, y: 0 };
    case 'right':
      return { x: node.size.width, y: node.size.height * ratio };
    case 'bottom':
      return { x: node.size.width * ratio, y: node.size.height };
    case 'left':
      return { x: 0, y: node.size.height * ratio };
  }
}

function automaticBoundaryPoint(
  node: SceneNode,
  matrix: Matrix2d,
  towardWorldPoint: Point2d
): Point2d {
  const inverse = invertMatrix(matrix);
  if (!inverse) return nodeWorldCenter(node, matrix);
  const toward = applyMatrixToPoint(inverse, towardWorldPoint);
  const center = { x: node.size.width / 2, y: node.size.height / 2 };
  const delta = { x: toward.x - center.x, y: toward.y - center.y };
  if (Math.abs(delta.x) < 1e-9 && Math.abs(delta.y) < 1e-9) {
    return applyMatrixToPoint(matrix, center);
  }
  const scaleX = delta.x === 0 ? Number.POSITIVE_INFINITY : center.x / Math.abs(delta.x);
  const scaleY = delta.y === 0 ? Number.POSITIVE_INFINITY : center.y / Math.abs(delta.y);
  const scale = Math.min(scaleX, scaleY);
  return applyMatrixToPoint(matrix, {
    x: center.x + delta.x * scale,
    y: center.y + delta.y * scale,
  });
}

function endpointPoint(
  endpoint: ConnectorEndpoint,
  node: SceneNode,
  matrix: Matrix2d,
  toward: Point2d
): Point2d {
  const portAnchor = node.ports.find((port) => port.id === endpoint.portId)?.anchor
    ?? sideAnchorForDanglingPort(endpoint.portId);
  const anchor = endpoint.anchor ?? portAnchor;
  return anchor
    ? applyMatrixToPoint(matrix, anchorLocalPoint(node, anchor))
    : automaticBoundaryPoint(node, matrix, toward);
}

// A side-named portId resolves even when the node record lacks the port
// (bound live mid-drag, ports commit with the gesture): side anchors are
// positional, so synthesis is exact. Anything else falls back to dynamic.
function sideAnchorForDanglingPort(portId: string | null): SceneAnchor | null {
  return portId === 'top' || portId === 'right' || portId === 'bottom' || portId === 'left'
    ? { kind: 'side', side: portId, ratio: 0.5 }
    : null;
}

function sequenceMessageEndpoints(
  connector: SceneConnector,
  sourceNode: SceneNode,
  targetNode: SceneNode,
  sourceMatrix: Matrix2d,
  targetMatrix: Matrix2d
): { readonly start: Point2d; readonly end: Point2d } | null {
  if (
    sourceNode.kind !== 'sequence_participant' ||
    targetNode.kind !== 'sequence_participant' ||
    typeof connector.semantics.seqMessageKind !== 'string'
  ) {
    return null;
  }
  // A row (fractional: notes above it take room) wins over the bare message order.
  const row = connector.semantics.seqMessageRow;
  const sequenceOrder = typeof row === 'number' && Number.isFinite(row) ? Math.max(0, row)
    : typeof connector.semantics.seqMessageOrder === 'number' &&
    Number.isFinite(connector.semantics.seqMessageOrder)
      ? Math.max(0, Math.floor(connector.semantics.seqMessageOrder))
      : 0;
  const sourceHeaderHeight =
    SEQUENCE_PARTICIPANT_HEADER_HEIGHT +
    (sourceNode.content.seqParticipantKind === 'actor' ? SEQUENCE_ACTOR_HEIGHT : 0);
  const targetHeaderHeight =
    SEQUENCE_PARTICIPANT_HEADER_HEIGHT +
    (targetNode.content.seqParticipantKind === 'actor' ? SEQUENCE_ACTOR_HEIGHT : 0);
  const sourceHeader = applyMatrixToPoint(sourceMatrix, {
    x: sourceNode.size.width / 2,
    y: sourceHeaderHeight,
  });
  const targetHeader = applyMatrixToPoint(targetMatrix, {
    x: targetNode.size.width / 2,
    y: targetHeaderHeight,
  });
  const y =
    Math.max(sourceHeader.y, targetHeader.y) +
    SEQUENCE_MESSAGE_OFFSET +
    sequenceOrder * SEQUENCE_MESSAGE_SPACING;
  return {
    start: { x: sourceHeader.x, y },
    end: { x: targetHeader.x, y },
  };
}

interface OrthogonalEnd {
  readonly point: Point2d;
  readonly side: ConnectSide | null;
}

function pointBounds(point: Point2d): Bounds2d {
  return { x: point.x, y: point.y, width: 0, height: 0 };
}

// Where an orthogonal route meets its end. An authored side anchor pins the
// side; anything else faces whatever comes next on the path (first waypoint,
// or the other end), so a node dragged around its partner re-picks its side
// every frame. Free ends are just their point.
function orthogonalEnd(
  endpoint: ConnectorEndpoint,
  node: SceneNode | undefined,
  matrix: Matrix2d | undefined,
  toward: Bounds2d,
  spread: SpreadEnd | undefined
): OrthogonalEnd | null {
  if (endpoint.point) return { point: endpoint.point, side: null };
  if (!node || !matrix) return null;
  const bounds = connectWorldBounds(node, matrix);
  const anchor = endAnchor(endpoint, node);
  if (anchor) {
    return {
      point: applyMatrixToPoint(matrix, anchorLocalPoint(node, anchor)),
      side: anchor.kind === 'side' ? anchor.side : facingSide(bounds, toward),
    };
  }
  const side = spread?.side ?? facingSide(bounds, toward);
  return { point: outlinePoint(node, matrix, side, spread?.offset ?? 0), side };
}

// Hybrid routes keep the user's corners and re-link both ends every frame:
// a diagonal hop between consecutive points gets one elbow, chosen so the
// segment touching a node stays perpendicular to that node's side.
function linkOrthogonal(
  start: OrthogonalEnd,
  waypoints: readonly Point2d[],
  end: OrthogonalEnd
): readonly Point2d[] {
  const points = [start.point, ...waypoints, end.point];
  const linked: Point2d[] = [points[0]];
  for (let index = 1; index < points.length; index += 1) {
    const from = points[index - 1];
    const to = points[index];
    if (from.x !== to.x && from.y !== to.y) {
      const verticalFirst = index === 1
        ? start.side === 'top' || start.side === 'bottom'
        : index === points.length - 1
          ? end.side === 'left' || end.side === 'right'
          : false;
      linked.push(verticalFirst ? { x: from.x, y: to.y } : { x: to.x, y: from.y });
    }
    linked.push(to);
  }
  return dropCollinear(dedupePolyline(linked));
}

function cubicPoint(
  start: Point2d,
  control1: Point2d,
  control2: Point2d,
  end: Point2d,
  ratio: number
): Point2d {
  const inverse = 1 - ratio;
  return {
    x:
      inverse ** 3 * start.x +
      3 * inverse ** 2 * ratio * control1.x +
      3 * inverse * ratio ** 2 * control2.x +
      ratio ** 3 * end.x,
    y:
      inverse ** 3 * start.y +
      3 * inverse ** 2 * ratio * control1.y +
      3 * inverse * ratio ** 2 * control2.y +
      ratio ** 3 * end.y,
  };
}

function bezierPath(
  start: Point2d,
  end: Point2d,
  authoredControls: readonly Point2d[]
): {
  commands: readonly ConnectorPathCommand[];
  samples: readonly Point2d[];
} {
  const distance = distanceBetweenPoints(start, end);
  const reach = Math.min(180, Math.max(40, distance * 0.4));
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const direction = horizontal
    ? { x: Math.sign(end.x - start.x) || 1, y: 0 }
    : { x: 0, y: Math.sign(end.y - start.y) || 1 };
  const control1 = authoredControls[0] ?? {
    x: start.x + direction.x * reach,
    y: start.y + direction.y * reach,
  };
  const control2 = authoredControls[1] ?? {
    x: end.x - direction.x * reach,
    y: end.y - direction.y * reach,
  };
  return {
    commands: [
      { kind: 'move', point: start },
      { kind: 'cubic', control1, control2, point: end },
    ],
    samples: Array.from({ length: 25 }, (_, index) =>
      cubicPoint(start, control1, control2, end, index / 24)
    ),
  };
}

function linearPath(points: readonly Point2d[]): {
  commands: readonly ConnectorPathCommand[];
  samples: readonly Point2d[];
} {
  const samples = dedupePolyline(points);
  return {
    commands: samples.map((point, index) => ({ kind: index === 0 ? 'move' : 'line', point })),
    samples,
  };
}

function selfLoopPath(
  connector: SceneConnector,
  node: SceneNode,
  matrix: Matrix2d
): ReturnType<typeof linearPath> {
  const sourcePort = node.ports.find((port) => port.id === connector.source.portId);
  const targetPort = node.ports.find((port) => port.id === connector.target.portId);
  const sourceAnchor = connector.source.anchor ?? sourcePort?.anchor
    ?? { kind: 'side', side: 'right', ratio: 0.3 } as const;
  const targetAnchor = connector.target.anchor ?? targetPort?.anchor
    ?? { kind: 'side', side: 'right', ratio: 0.7 } as const;
  const start = anchorLocalPoint(node, sourceAnchor);
  const end = anchorLocalPoint(node, targetAnchor);
  const margin = 48;
  // Both ends on one side: a bump out of that side and back, never across the node.
  if (sourceAnchor.kind === 'side' && targetAnchor.kind === 'side' && sourceAnchor.side === targetAnchor.side) {
    const out = { right: { x: 1, y: 0 }, left: { x: -1, y: 0 }, top: { x: 0, y: -1 }, bottom: { x: 0, y: 1 } }[sourceAnchor.side];
    const bump = (point: Point2d) => ({ x: point.x + out.x * margin, y: point.y + out.y * margin });
    return linearPath([start, bump(start), bump(end), end].map((point) => applyMatrixToPoint(matrix, point)));
  }
  return linearPath([
    start,
    { x: node.size.width + margin, y: start.y },
    { x: node.size.width + margin, y: -margin },
    { x: -margin, y: -margin },
    { x: -margin, y: end.y },
    end,
  ].map((point) => applyMatrixToPoint(matrix, point)));
}

function connectorPath(
  connector: SceneConnector,
  start: Point2d,
  end: Point2d
): ReturnType<typeof linearPath> {
  switch (connector.route.kind) {
    case 'direct':
      return linearPath([start, end]);
    case 'polyline':
      return linearPath([start, ...connector.waypoints, end]);
    case 'orthogonal':
      return linearPath([start, ...connector.waypoints, end]);
    case 'bezier':
      return bezierPath(start, end, connector.waypoints);
  }
}

function orthogonalPath(
  connector: SceneConnector,
  sourceNode: SceneNode | undefined,
  sourceMatrix: Matrix2d | undefined,
  targetNode: SceneNode | undefined,
  targetMatrix: Matrix2d | undefined,
  context: ConnectorProjectionContext
): readonly Point2d[] | null {
  const sourceBounds = sourceNode && sourceMatrix ? connectWorldBounds(sourceNode, sourceMatrix)
    : connector.source.point ? pointBounds(connector.source.point) : null;
  const targetBounds = targetNode && targetMatrix ? connectWorldBounds(targetNode, targetMatrix)
    : connector.target.point ? pointBounds(connector.target.point) : null;
  if (!sourceBounds || !targetBounds) return null;
  const first = connector.waypoints[0];
  const last = connector.waypoints.at(-1);
  const start = orthogonalEnd(connector.source, sourceNode, sourceMatrix, first ? pointBounds(first) : targetBounds,
    context.spreadByEnd.get(`${connector.id}:source`));
  const end = orthogonalEnd(connector.target, targetNode, targetMatrix, last ? pointBounds(last) : sourceBounds,
    context.spreadByEnd.get(`${connector.id}:target`));
  if (!start || !end) return null;
  if (connector.waypoints.length > 0) return linkOrthogonal(start, connector.waypoints, end);
  // Every node is an obstacle, the endpoints' own included: that is what
  // keeps a lane from doubling back through the shape it just left.
  const obstacles: Bounds2d[] = [];
  for (const node of context.nodesById.values()) {
    obstacles.push(nodeWorldBounds(node, context.matrices.get(node.id)!));
  }
  return routeOrthogonalBetweenSides(start.point, start.side, end.point, end.side, obstacles,
    midShift(start, end, context.spreadByEnd.get(`${connector.id}:source`), context.spreadByEnd.get(`${connector.id}:target`)));
}

/**
 * Where a Z's middle run sits off centre, along the route. Ends spread along a side
 * turn in nested order: the exit farthest from where its partner lies turns farthest
 * from its own node, so the L shapes nest instead of sharing a run or crossing.
 */
function midShift(start: OrthogonalEnd, end: OrthogonalEnd, source: SpreadEnd | undefined, target: SpreadEnd | undefined): number {
  const across = (side: ConnectSide | null) => (side === 'left' || side === 'right' ? 'y' : 'x');
  const toward = (from: Point2d, to: Point2d, side: ConnectSide | null) => Math.sign(to[across(side)] - from[across(side)]);
  const along = start.side === 'left' || start.side === 'right' ? 'x' : 'y';
  const shift = -(source?.offset ?? 0) * toward(start.point, end.point, start.side)
    + (target?.offset ?? 0) * toward(end.point, start.point, end.side);
  // `shift` runs from start to end; the router wants a coordinate offset.
  return end.point[along] >= start.point[along] ? shift : -shift;
}

function projectConnectorWithContext(
  connector: SceneConnector,
  context: ConnectorProjectionContext
): ProjectedConnector | null {
  if (connector.metadata.hidden === true) return null;
  const sourceNode =
    connector.source.nodeId === null ? undefined : context.nodesById.get(connector.source.nodeId);
  const targetNode =
    connector.target.nodeId === null ? undefined : context.nodesById.get(connector.target.nodeId);
  const sourceMatrix = sourceNode ? context.matrices.get(sourceNode.id) : undefined;
  const targetMatrix = targetNode ? context.matrices.get(targetNode.id) : undefined;
  if (sourceNode && !sourceMatrix) return null;
  if (targetNode && !targetMatrix) return null;
  // Free ends resolve to their page-space point; bound ends resolve against
  // the opposite center exactly as before. Missing data yields no geometry.
  const sourceCenter =
    sourceNode && sourceMatrix ? nodeWorldCenter(sourceNode, sourceMatrix) : null;
  const targetCenter =
    targetNode && targetMatrix ? nodeWorldCenter(targetNode, targetMatrix) : null;
  const sourceToward = targetCenter ?? connector.target.point;
  const targetToward = sourceCenter ?? connector.source.point;
  if (!sourceToward || !targetToward) return null;
  const sequenceEndpoints =
    sourceNode && targetNode && sourceMatrix && targetMatrix
      ? sequenceMessageEndpoints(connector, sourceNode, targetNode, sourceMatrix, targetMatrix)
      : null;
  const start =
    sequenceEndpoints?.start ??
    connector.source.point ??
    (sourceNode && sourceMatrix
      ? endpointPoint(connector.source, sourceNode, sourceMatrix, sourceToward)
      : null);
  const end =
    sequenceEndpoints?.end ??
    connector.target.point ??
    (targetNode && targetMatrix
      ? endpointPoint(connector.target, targetNode, targetMatrix, targetToward)
      : null);
  if (!start || !end) return null;
  const orthogonal = connector.route.kind === 'orthogonal' && !sequenceEndpoints
    && !(sourceNode && targetNode && sourceNode.id === targetNode.id)
    ? orthogonalPath(connector, sourceNode, sourceMatrix, targetNode, targetMatrix, context)
    : null;
  const path = orthogonal ? linearPath(orthogonal) :
    sequenceEndpoints && sourceNode && targetNode && sourceNode.id === targetNode.id
      ? linearPath([
          start,
          { x: start.x + 56, y: start.y },
          { x: start.x + 56, y: start.y + 28 },
          { x: start.x, y: start.y + 28 },
        ])
      : sourceNode && sourceMatrix && targetNode && sourceNode.id === targetNode.id
          && connector.route.ownership === 'automatic'
          && connector.waypoints.length === 0
        ? selfLoopPath(connector, sourceNode, sourceMatrix)
        : connectorPath(connector, start, end);
  const lateral = context.lateralByConnectorId.get(connector.id) ?? 0;
  // Reverse edges fan with the group: canonical normal runs from the
  // lexicographically smaller endpoint, regardless of edge direction.
  const flipNormal = !!connector.source.nodeId && !!connector.target.nodeId
    && connector.source.nodeId > connector.target.nodeId;
  const samples = shiftInteriorOrthogonal(path.samples, lateral, flipNormal);
  const presentation = resolveConnectorPresentation(connector);
  // An automatic route's label steps off any node it would cover; a placed one stays put.
  const automaticLabels = orthogonal !== null && connector.waypoints.length === 0;
  const labels = connector.labels.map((label) => {
    const point = (automaticLabels && label.offset.x === 0 && label.offset.y === 0
      ? clearLabelPoint(label.text, label.pathRatio, samples, context.labelObstacles(),
        (text, at) => connectorLabelPlate(text, presentation.label, at))
      : pointAtPolylineRatio(samples, label.pathRatio)) ?? start;
    return {
      id: label.id,
      text: label.text,
      point: { x: point.x + label.offset.x, y: point.y + label.offset.y },
    };
  });
  return {
    id: connector.id,
    commands: path.commands,
    samples,
    labels,
    presentation,
  };
}

export function projectConnector(
  page: ScenePage,
  connector: SceneConnector
): ProjectedConnector | null {
  return projectConnectorWithContext(connector, createConnectorProjectionContext(page));
}

export function projectPageConnectors(page: ScenePage): readonly ProjectedConnector[] {
  return projectConnectors(page, page.connectors);
}

/** Some of a page's connectors, sharing one projection context. */
export function projectConnectors(page: ScenePage, connectors: readonly SceneConnector[]): readonly ProjectedConnector[] {
  const context = createConnectorProjectionContext(page);
  return connectors
    .map((connector) => projectConnectorWithContext(connector, context))
    .filter((connector): connector is ProjectedConnector => connector !== null);
}
