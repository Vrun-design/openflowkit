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
import type { Matrix2d, Point2d } from '../geometry/types';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from '../scene/worldGeometry';
import { resolveConnectorPresentation } from './presentation';
import { routeOrthogonalAroundObstacles } from './obstacleRouting';
import type { ConnectorPathCommand, ProjectedConnector } from './types';

interface ConnectorProjectionContext {
  readonly nodesById: ReadonlyMap<string, SceneNode>;
  readonly matrices: ReadonlyMap<string, Matrix2d>;
}

const SEQUENCE_PARTICIPANT_HEADER_HEIGHT = 48;
const SEQUENCE_ACTOR_HEIGHT = 40;
const SEQUENCE_MESSAGE_OFFSET = 20;
const SEQUENCE_MESSAGE_SPACING = 52;

function createConnectorProjectionContext(page: ScenePage): ConnectorProjectionContext {
  return {
    nodesById: new Map(page.nodes.map((node) => [node.id, node])),
    matrices: buildNodeWorldMatrices(page),
  };
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
  const portAnchor = node.ports.find((port) => port.id === endpoint.portId)?.anchor;
  const anchor = endpoint.anchor ?? portAnchor;
  return anchor
    ? applyMatrixToPoint(matrix, anchorLocalPoint(node, anchor))
    : automaticBoundaryPoint(node, matrix, toward);
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
  const sequenceOrder =
    typeof connector.semantics.seqMessageOrder === 'number' &&
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

function orthogonalPoints(start: Point2d, end: Point2d): readonly Point2d[] {
  const dx = Math.abs(end.x - start.x);
  const dy = Math.abs(end.y - start.y);
  if (dx >= dy) {
    const x = (start.x + end.x) / 2;
    return dedupePolyline([start, { x, y: start.y }, { x, y: end.y }, end]);
  }
  const y = (start.y + end.y) / 2;
  return dedupePolyline([start, { x: start.x, y }, { x: end.x, y }, end]);
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
      return linearPath(
        connector.waypoints.length > 0
          ? [start, ...connector.waypoints, end]
          : orthogonalPoints(start, end)
      );
    case 'bezier':
      return bezierPath(start, end, connector.waypoints);
  }
}

function projectConnectorWithContext(
  connector: SceneConnector,
  context: ConnectorProjectionContext
): ProjectedConnector | null {
  const sourceNode = context.nodesById.get(connector.source.nodeId);
  const targetNode = context.nodesById.get(connector.target.nodeId);
  const sourceMatrix = sourceNode && context.matrices.get(sourceNode.id);
  const targetMatrix = targetNode && context.matrices.get(targetNode.id);
  if (!sourceNode || !targetNode || !sourceMatrix || !targetMatrix) return null;
  const sourceCenter = nodeWorldCenter(sourceNode, sourceMatrix);
  const targetCenter = nodeWorldCenter(targetNode, targetMatrix);
  const sequenceEndpoints = sequenceMessageEndpoints(
    connector,
    sourceNode,
    targetNode,
    sourceMatrix,
    targetMatrix
  );
  const start =
    sequenceEndpoints?.start ??
    endpointPoint(connector.source, sourceNode, sourceMatrix, targetCenter);
  const end =
    sequenceEndpoints?.end ??
    endpointPoint(connector.target, targetNode, targetMatrix, sourceCenter);
  const path =
    sequenceEndpoints && sourceNode.id === targetNode.id
      ? linearPath([
          start,
          { x: start.x + 56, y: start.y },
          { x: start.x + 56, y: start.y + 28 },
          { x: start.x, y: start.y + 28 },
        ])
      : sourceNode.id === targetNode.id
        && connector.route.ownership === 'automatic'
        && connector.waypoints.length === 0
        ? selfLoopPath(connector, sourceNode, sourceMatrix)
        : connector.route.kind === 'orthogonal'
          && connector.route.ownership === 'automatic'
          && connector.waypoints.length === 0
          ? linearPath(routeOrthogonalAroundObstacles(
              start,
              end,
              [...context.nodesById.values()]
                .filter((node) => node.id !== sourceNode.id && node.id !== targetNode.id)
                .map((node) => nodeWorldBounds(node, context.matrices.get(node.id)!))
            ))
          : connectorPath(connector, start, end);
  const labels = connector.labels.map((label) => {
    const point = pointAtPolylineRatio(path.samples, label.pathRatio) ?? start;
    return {
      id: label.id,
      text: label.text,
      point: { x: point.x + label.offset.x, y: point.y + label.offset.y },
    };
  });
  return {
    id: connector.id,
    commands: path.commands,
    samples: path.samples,
    labels,
    presentation: resolveConnectorPresentation(connector),
  };
}

export function projectConnector(
  page: ScenePage,
  connector: SceneConnector
): ProjectedConnector | null {
  return projectConnectorWithContext(connector, createConnectorProjectionContext(page));
}

export function projectPageConnectors(page: ScenePage): readonly ProjectedConnector[] {
  const context = createConnectorProjectionContext(page);
  return page.connectors
    .map((connector) => projectConnectorWithContext(connector, context))
    .filter((connector): connector is ProjectedConnector => connector !== null);
}
