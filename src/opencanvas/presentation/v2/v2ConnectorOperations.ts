import {
  moveConnectorHandle,
  reconnectConnector,
  type ConnectorEditHandle,
} from '../../domain/connectors/editing';
import { nearestAcceptedPortEndpoint } from '../../domain/connectors/portAuthoring';
import type { SceneConnector, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';

export interface V2ConnectorOperation {
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
): V2ConnectorOperation {
  return { kind: 'connector-edit', pointerId, page, before: connector, handle, preview: connector };
}

export function updateConnectorOperation(
  operation: V2ConnectorOperation,
  pointer: Point2d,
  reconnectNodeId: string | null
): V2ConnectorOperation {
  if (operation.handle.kind !== 'endpoint') {
    return {
      ...operation,
      preview: moveConnectorHandle(operation.page, operation.before, operation.handle, pointer),
    };
  }
  const endpoint = reconnectNodeId
    ? nearestAcceptedPortEndpoint(
        operation.page, reconnectNodeId, operation.handle.role, pointer
      )
    : { nodeId: null, portId: null, anchor: null, point: pointer };
  return {
    ...operation,
    preview: reconnectConnector(operation.before, operation.handle.role, endpoint),
  };
}

export function connectorEditLabel(handle: ConnectorEditHandle): string {
  switch (handle.kind) {
    case 'endpoint': return `Reconnect ${handle.role}`;
    case 'waypoint': return 'Move connector waypoint';
    case 'segment': return 'Move connector segment';
    case 'control': return 'Shape connector curve';
  }
}
