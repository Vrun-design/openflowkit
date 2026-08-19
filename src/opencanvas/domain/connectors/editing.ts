import type { ConnectorEndpoint, SceneConnector, ScenePage } from '../document/types';
import { areStructurallyEqual } from '../commands/equality';
import type { SetConnectorCommand } from '../commands/types';
import { closestPointOnPolyline, dedupePolyline } from '../geometry/polyline';
import { distanceBetweenPoints } from '../geometry/point';
import type { Point2d } from '../geometry/types';
import { projectConnector } from './routeProjection';
import type { ConnectorPathCommand } from './types';

export type ConnectorEndpointRole = 'source' | 'target';

export type ConnectorEditHandle =
  | { readonly kind: 'endpoint'; readonly role: ConnectorEndpointRole; readonly point: Point2d }
  | { readonly kind: 'waypoint'; readonly index: number; readonly point: Point2d }
  | { readonly kind: 'segment'; readonly index: number; readonly point: Point2d }
  | { readonly kind: 'control'; readonly index: 0 | 1; readonly point: Point2d };

function cubicCommand(commands: readonly ConnectorPathCommand[]) {
  return commands.find(
    (command): command is Extract<ConnectorPathCommand, { kind: 'cubic' }> =>
      command.kind === 'cubic'
  );
}

function midpoint(start: Point2d, end: Point2d): Point2d {
  return { x: (start.x + end.x) / 2, y: (start.y + end.y) / 2 };
}

export function connectorEditHandles(
  page: ScenePage,
  connector: SceneConnector
): readonly ConnectorEditHandle[] {
  const projected = projectConnector(page, connector);
  if (!projected || projected.samples.length < 2) return [];
  const first = projected.samples[0];
  const last = projected.samples.at(-1)!;
  const handles: ConnectorEditHandle[] = [
    { kind: 'endpoint', role: 'source', point: first },
    { kind: 'endpoint', role: 'target', point: last },
  ];
  if (connector.route.kind === 'bezier') {
    const cubic = cubicCommand(projected.commands);
    if (cubic) {
      handles.push(
        { kind: 'control', index: 0, point: cubic.control1 },
        { kind: 'control', index: 1, point: cubic.control2 }
      );
    }
    return handles;
  }
  connector.waypoints.forEach((point, index) => handles.push({ kind: 'waypoint', index, point }));
  for (let index = 0; index < projected.samples.length - 1; index += 1) {
    handles.push({
      kind: 'segment',
      index,
      point: midpoint(projected.samples[index], projected.samples[index + 1]),
    });
  }
  return handles;
}

export function pickConnectorAtPoint(
  page: ScenePage,
  point: Point2d,
  tolerance: number
): string | null {
  for (const connector of [...page.connectors].reverse()) {
    const projected = projectConnector(page, connector);
    const closest = projected && closestPointOnPolyline(projected.samples, point);
    if (closest && closest.distance <= tolerance) return connector.id;
  }
  return null;
}

export function pickConnectorEditHandle(
  handles: readonly ConnectorEditHandle[],
  point: Point2d,
  tolerance: number
): ConnectorEditHandle | null {
  const ordered = [...handles].sort((left, right) => {
    const priority = { endpoint: 0, waypoint: 1, control: 2, segment: 3 } as const;
    return priority[left.kind] - priority[right.kind];
  });
  return ordered.find((handle) => distanceBetweenPoints(handle.point, point) <= tolerance) ?? null;
}

function manualConnector(
  connector: SceneConnector,
  waypoints: readonly Point2d[],
  kind = connector.route.kind
): SceneConnector {
  return {
    ...connector,
    route: { kind, ownership: 'manual' },
    waypoints: dedupePolyline(waypoints),
  };
}

function moveSegment(
  page: ScenePage,
  connector: SceneConnector,
  segmentIndex: number,
  pointer: Point2d
): SceneConnector {
  const projected = projectConnector(page, connector);
  const samples = projected?.samples;
  if (!samples || segmentIndex < 0 || segmentIndex >= samples.length - 1) return connector;
  const start = samples[segmentIndex];
  const end = samples[segmentIndex + 1];
  const horizontal = Math.abs(end.x - start.x) >= Math.abs(end.y - start.y);
  const shiftedStart = horizontal ? { x: start.x, y: pointer.y } : { x: pointer.x, y: start.y };
  const shiftedEnd = horizontal ? { x: end.x, y: pointer.y } : { x: pointer.x, y: end.y };
  let points: readonly Point2d[];
  if (segmentIndex === 0) {
    points = [start, shiftedStart, shiftedEnd, ...samples.slice(2)];
  } else if (segmentIndex === samples.length - 2) {
    points = [...samples.slice(0, segmentIndex), shiftedStart, shiftedEnd, end];
  } else {
    points = [
      ...samples.slice(0, segmentIndex),
      shiftedStart,
      shiftedEnd,
      ...samples.slice(segmentIndex + 2),
    ];
  }
  const kind = connector.route.kind === 'orthogonal' ? 'orthogonal' : 'polyline';
  return manualConnector(connector, dedupePolyline(points).slice(1, -1), kind);
}

function moveBezierControl(
  page: ScenePage,
  connector: SceneConnector,
  index: 0 | 1,
  pointer: Point2d
): SceneConnector {
  const projected = projectConnector(page, connector);
  const cubic = projected && cubicCommand(projected.commands);
  if (!cubic) return connector;
  const controls = [cubic.control1, cubic.control2];
  controls[index] = pointer;
  return manualConnector(connector, controls, 'bezier');
}

export function moveConnectorHandle(
  page: ScenePage,
  connector: SceneConnector,
  handle: ConnectorEditHandle,
  pointer: Point2d
): SceneConnector {
  switch (handle.kind) {
    case 'endpoint':
      return connector;
    case 'waypoint': {
      if (!connector.waypoints[handle.index]) return connector;
      const waypoints = [...connector.waypoints];
      waypoints[handle.index] = pointer;
      return manualConnector(connector, waypoints);
    }
    case 'segment':
      return moveSegment(page, connector, handle.index, pointer);
    case 'control':
      return moveBezierControl(page, connector, handle.index, pointer);
  }
}

export function addConnectorWaypoint(
  page: ScenePage,
  connector: SceneConnector,
  pointer: Point2d
): SceneConnector {
  const projected = projectConnector(page, connector);
  const closest = projected && closestPointOnPolyline(projected.samples, pointer);
  if (!projected || !closest || connector.route.kind === 'bezier') return connector;
  const points = [...projected.samples];
  points.splice(closest.segmentIndex + 1, 0, pointer);
  const kind = connector.route.kind === 'orthogonal' ? 'orthogonal' : 'polyline';
  return manualConnector(connector, dedupePolyline(points).slice(1, -1), kind);
}

export function removeConnectorWaypoint(
  connector: SceneConnector,
  waypointIndex: number
): SceneConnector {
  if (!connector.waypoints[waypointIndex]) return connector;
  const waypoints = connector.waypoints.filter((_, index) => index !== waypointIndex);
  if (waypoints.length === 0) return resetConnectorRoute(connector);
  return manualConnector(connector, waypoints);
}

export function resetConnectorRoute(connector: SceneConnector): SceneConnector {
  return {
    ...connector,
    route: { ...connector.route, ownership: 'automatic' },
    waypoints: [],
  };
}

export function setPrimaryConnectorLabel(
  connector: SceneConnector,
  text: string
): SceneConnector {
  const normalized = text.trim();
  if (!normalized) return { ...connector, labels: connector.labels.slice(1) };
  const current = connector.labels[0];
  const label = current
    ? { ...current, text: normalized }
    : {
        id: `${connector.id}:label`, text: normalized, pathRatio: 0.5,
        offset: { x: 0, y: -14 }, metadata: {},
      };
  return { ...connector, labels: [label, ...connector.labels.slice(1)] };
}

export function reconnectConnector(
  connector: SceneConnector,
  role: ConnectorEndpointRole,
  endpoint: ConnectorEndpoint
): SceneConnector {
  return {
    ...resetConnectorRoute(connector),
    [role]: endpoint,
  };
}

export function createConnectorEditCommand(
  pageId: string,
  before: SceneConnector,
  after: SceneConnector,
  label: string
): SetConnectorCommand | null {
  if (areStructurallyEqual(before, after)) return null;
  return {
    kind: 'set-connector',
    id: `connector-edit:${before.id}`,
    label,
    pageId,
    before,
    after,
  };
}
