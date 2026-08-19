import { connectorEditHandles, type ConnectorEditHandle } from '../../domain/connectors/editing';
import { projectConnector } from '../../domain/connectors/routeProjection';
import type { ScenePage } from '../../domain/document/types';
import { worldToScreen } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { Point2d } from '../../domain/geometry/types';

export interface ConnectorEditDebugSnapshot {
  readonly connectorId: string | null;
  readonly activeHandle: ConnectorEditHandle['kind'] | null;
  readonly routeKind: string | null;
  readonly ownership: string | null;
  readonly waypointCount: number;
  readonly waypoints: readonly Point2d[];
  readonly sourceNodeId: string | null;
  readonly targetNodeId: string | null;
}

export type ConnectorHandleScreenPoint = ConnectorEditHandle & {
  readonly x: number;
  readonly y: number;
};

export function inspectConnectorEdit(
  page: ScenePage | null,
  connectorId: string | null,
  activeHandle: ConnectorEditHandle | null
): ConnectorEditDebugSnapshot {
  const connector = page?.connectors.find(({ id }) => id === connectorId);
  return {
    connectorId: connector?.id ?? null,
    activeHandle: activeHandle?.kind ?? null,
    routeKind: connector?.route.kind ?? null,
    ownership: connector?.route.ownership ?? null,
    waypointCount: connector?.waypoints.length ?? 0,
    waypoints: connector?.waypoints ?? [],
    sourceNodeId: connector?.source.nodeId ?? null,
    targetNodeId: connector?.target.nodeId ?? null,
  };
}

export function inspectConnectorSamples(
  page: ScenePage | null,
  connectorId: string
): readonly Point2d[] | null {
  const connector = page?.connectors.find(({ id }) => id === connectorId);
  return page && connector ? (projectConnector(page, connector)?.samples ?? null) : null;
}

export function inspectConnectorHandleScreenPoints(
  page: ScenePage | null,
  connectorId: string | null,
  camera: CanvasCamera
): readonly ConnectorHandleScreenPoint[] {
  const connector = page?.connectors.find(({ id }) => id === connectorId);
  if (!page || !connector) return [];
  return connectorEditHandles(page, connector).map((handle) => {
    const screen = worldToScreen(camera, handle.point);
    return { ...handle, x: screen.x, y: screen.y };
  });
}
