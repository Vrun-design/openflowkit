import type { ConnectorEndpointRole } from './editing';
import type { ConnectorEndpoint, SceneAnchor, SceneNode, ScenePage, ScenePort } from '../document/types';
import { applyMatrixToPoint } from '../geometry/matrix';
import { distanceBetweenPoints } from '../geometry/point';
import type { Point2d } from '../geometry/types';
import { buildNodeWorldMatrices } from '../scene/worldGeometry';

export type SidePort = 'top' | 'right' | 'bottom' | 'left';

export function createSidePort(side: SidePort): ScenePort {
  return {
    id: side,
    anchor: { kind: 'side', side, ratio: 0.5 },
    accepts: ['source', 'target'],
    metadata: {},
  };
}

export function portAcceptsRole(port: ScenePort, role: ConnectorEndpointRole): boolean {
  return port.accepts.length === 0
    || port.accepts.includes('connector')
    || port.accepts.includes(role);
}

export function ensureNodeSidePort(
  node: SceneNode,
  side: SidePort,
  role: ConnectorEndpointRole
): { readonly node: SceneNode; readonly port: ScenePort; readonly changed: boolean } {
  const existing = node.ports.find((port) => port.id === side);
  if (existing) {
    if (!portAcceptsRole(existing, role)) {
      throw new RangeError(`Port "${side}" on node "${node.id}" does not accept ${role} connectors.`);
    }
    return { node, port: existing, changed: false };
  }
  const port = createSidePort(side);
  return { node: { ...node, ports: [...node.ports, port] }, port, changed: true };
}

function localAnchorPoint(node: SceneNode, anchor: SceneAnchor): Point2d {
  if (anchor.kind === 'center') return { x: node.size.width / 2, y: node.size.height / 2 };
  if (anchor.kind === 'normalized') {
    return { x: node.size.width * anchor.x, y: node.size.height * anchor.y };
  }
  switch (anchor.side) {
    case 'top': return { x: node.size.width * anchor.ratio, y: 0 };
    case 'right': return { x: node.size.width, y: node.size.height * anchor.ratio };
    case 'bottom': return { x: node.size.width * anchor.ratio, y: node.size.height };
    case 'left': return { x: 0, y: node.size.height * anchor.ratio };
  }
}

export function nearestAcceptedPortEndpoint(
  page: ScenePage,
  nodeId: string,
  role: ConnectorEndpointRole,
  pointer: Point2d
): ConnectorEndpoint {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new RangeError(`Node "${nodeId}" was not found.`);
  const matrix = buildNodeWorldMatrices(page).get(nodeId)!;
  const candidates = node.ports
    .filter((port) => portAcceptsRole(port, role))
    .map((port) => ({
      port,
      distance: distanceBetweenPoints(
        applyMatrixToPoint(matrix, localAnchorPoint(node, port.anchor)),
        pointer
      ),
    }))
    .sort((left, right) => left.distance - right.distance || left.port.id.localeCompare(right.port.id));
  return { nodeId, portId: candidates[0]?.port.id ?? null, anchor: null };
}
