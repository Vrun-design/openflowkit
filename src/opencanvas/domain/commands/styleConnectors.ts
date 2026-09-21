import type { SetConnectorCommand } from './types';
import type { ConnectorRouteKind, ScenePage } from '../document/types';
import type { JsonValue } from '../document/json';
import { areStructurallyEqual } from './equality';

export type ConnectorMarkerEnd = 'none' | 'arrow' | 'dot';
export type ConnectorDashStyle = 'solid' | 'dashed';

export interface ConnectorStylePatch {
  readonly color?: string;
  readonly strokeWidth?: number;
  readonly dash?: ConnectorDashStyle;
  readonly markerStart?: ConnectorMarkerEnd;
  readonly markerEnd?: ConnectorMarkerEnd;
  /** Path shape; switching it drops manual bends and goes back to automatic. */
  readonly route?: Exclude<ConnectorRouteKind, 'polyline'>;
}

// One appearance patch over a single connector as one set-connector; no-op
// patches commit nothing. Shared by the v2 connector style bar.
export function buildStyleConnectorCommand(
  page: ScenePage,
  connectorId: string,
  patch: ConnectorStylePatch
): SetConnectorCommand | null {
  const before = page.connectors.find((connector) => connector.id === connectorId);
  if (!before) throw new RangeError(`Connector "${connectorId}" was not found.`);
  const appearance: Record<string, JsonValue> = { ...before.appearance };
  if (patch.color !== undefined) appearance.stroke = patch.color;
  if (patch.strokeWidth !== undefined) appearance.strokeWidth = patch.strokeWidth;
  if (patch.dash !== undefined) {
    if (patch.dash === 'solid') {
      delete appearance.dashPattern;
      delete appearance.strokeDasharray;
    } else {
      appearance.dashPattern = patch.dash;
    }
  }
  if (patch.markerStart !== undefined) appearance.markerStart = patch.markerStart;
  if (patch.markerEnd !== undefined) appearance.markerEnd = patch.markerEnd;
  const after = patch.route !== undefined && patch.route !== before.route.kind
    ? { ...before, appearance, route: { kind: patch.route, ownership: 'automatic' as const }, waypoints: [] }
    : { ...before, appearance };
  if (areStructurallyEqual(after, before)) return null;
  return {
    kind: 'set-connector',
    id: `style-connector:${connectorId}`,
    label: 'Style connector',
    pageId: page.id,
    before,
    after,
  };
}
