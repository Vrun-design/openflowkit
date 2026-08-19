import {
  moveConnectorHandle,
  reconnectConnector,
  type ConnectorEditHandle,
} from '../domain/connectors/editing';
import type { SceneConnector, ScenePage } from '../domain/document/types';
import type { Point2d } from '../domain/geometry/types';
import { nearestAcceptedPortEndpoint } from '../domain/connectors/portAuthoring';

export interface ConnectorPointerOperation {
  readonly kind: 'connector-edit';
  readonly pointerId: number;
  readonly page: ScenePage;
  readonly before: SceneConnector;
  readonly handle: ConnectorEditHandle;
  readonly preview: SceneConnector;
}

export function beginConnectorOperation(
  pointerId: number,
  page: ScenePage,
  connector: SceneConnector,
  handle: ConnectorEditHandle
): ConnectorPointerOperation {
  return { kind: 'connector-edit', pointerId, page, before: connector, handle, preview: connector };
}

export function updateConnectorOperation(
  operation: ConnectorPointerOperation,
  pointer: Point2d,
  reconnectNodeId: string | null
): ConnectorPointerOperation {
  if (operation.handle.kind === 'endpoint') {
    if (!reconnectNodeId) return { ...operation, preview: operation.before };
    return {
      ...operation,
      preview: reconnectConnector(
        operation.before,
        operation.handle.role,
        nearestAcceptedPortEndpoint(
          operation.page, reconnectNodeId, operation.handle.role, pointer
        )
      ),
    };
  }
  return {
    ...operation,
    preview: moveConnectorHandle(operation.page, operation.before, operation.handle, pointer),
  };
}

export function connectorEditLabel(handle: ConnectorEditHandle): string {
  switch (handle.kind) {
    case 'endpoint':
      return `Reconnect ${handle.role}`;
    case 'waypoint':
      return 'Move connector waypoint';
    case 'segment':
      return 'Move connector segment';
    case 'control':
      return 'Shape connector curve';
  }
}

export function cycleConnectorId(
  page: ScenePage,
  currentId: string | null,
  direction: 1 | -1
): string | null {
  if (page.connectors.length === 0) return null;
  const currentIndex = page.connectors.findIndex(({ id }) => id === currentId);
  let nextIndex: number;
  if (currentIndex >= 0) {
    nextIndex = (currentIndex + direction + page.connectors.length) % page.connectors.length;
  } else {
    nextIndex = direction === 1 ? 0 : page.connectors.length - 1;
  }
  return page.connectors[nextIndex].id;
}
