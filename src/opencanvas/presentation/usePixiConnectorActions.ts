import { useCallback, type RefObject } from 'react';
import type { DocumentHistoryState } from '../application/history/types';
import {
  addConnectorWaypoint,
  connectorEditHandles,
  moveConnectorHandle,
  removeConnectorWaypoint,
  resetConnectorRoute,
  type ConnectorEditHandle,
} from '../domain/connectors/editing';
import type { SceneConnector, ScenePage } from '../domain/document/types';
import { pointAtPolylineRatio } from '../domain/geometry/polyline';
import type { Point2d } from '../domain/geometry/types';
import type { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';
import { arrowNudgeDelta } from './pixiPointerOperations';

type CommitConnector = (
  page: ScenePage,
  before: SceneConnector,
  after: SceneConnector,
  label: string
) => void;

interface ConnectorActionsOptions {
  readonly historyRef: RefObject<DocumentHistoryState>;
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly selectedConnectorIdRef: RefObject<string | null>;
  readonly activeConnectorHandleRef: RefObject<ConnectorEditHandle | null>;
  readonly applyConnectorSelection: (
    connectorId: string | null,
    handle?: ConnectorEditHandle | null
  ) => void;
  readonly commitConnector: CommitConnector;
}

export function usePixiConnectorActions(options: ConnectorActionsOptions) {
  const currentConnector = useCallback((): SceneConnector | null => {
    const id = options.selectedConnectorIdRef.current;
    return id
      ? (options.historyRef.current.present.pages[0].connectors.find(
          (connector) => connector.id === id
        ) ?? null)
      : null;
  }, [options.historyRef, options.selectedConnectorIdRef]);

  const addBend = useCallback(
    (connectorId = options.selectedConnectorIdRef.current, point?: Point2d): void => {
      const page = options.historyRef.current.present.pages[0];
      const connector = page.connectors.find(({ id }) => id === connectorId);
      if (!connector) return;
      const samples = options.hostRef.current?.getConnectorSamples(connector.id);
      const placement = point ?? (samples && pointAtPolylineRatio(samples, 0.5));
      if (!placement) return;
      const edited = addConnectorWaypoint(page, connector, placement);
      options.commitConnector(page, connector, edited, 'Add connector waypoint');
      const previewPage = {
        ...page,
        connectors: page.connectors.map((item) => (item.id === edited.id ? edited : item)),
      };
      const nextHandle = connectorEditHandles(previewPage, edited).find(
        (handle) => handle.kind === 'waypoint' && handle.index === edited.waypoints.length - 1
      );
      options.applyConnectorSelection(connector.id, nextHandle ?? null);
    },
    [options]
  );

  const removeActiveBend = useCallback((): void => {
    const page = options.historyRef.current.present.pages[0];
    const connector = currentConnector();
    const handle = options.activeConnectorHandleRef.current;
    if (!connector || !handle || handle.kind !== 'waypoint') return;
    options.commitConnector(
      page,
      connector,
      removeConnectorWaypoint(connector, handle.index),
      'Remove connector waypoint'
    );
    options.applyConnectorSelection(connector.id);
  }, [currentConnector, options]);

  const resetRoute = useCallback((): void => {
    const page = options.historyRef.current.present.pages[0];
    const connector = currentConnector();
    if (!connector) return;
    options.commitConnector(
      page,
      connector,
      resetConnectorRoute(connector),
      'Reset connector route'
    );
    options.applyConnectorSelection(connector.id);
  }, [currentConnector, options]);

  const nudgeActiveHandle = useCallback(
    (key: string, amount: number): boolean => {
      const page = options.historyRef.current.present.pages[0];
      const connector = currentConnector();
      const handle = options.activeConnectorHandleRef.current;
      if (!connector || !handle || handle.kind === 'endpoint') return false;
      const delta = arrowNudgeDelta(key, amount);
      const point = { x: handle.point.x + delta.x, y: handle.point.y + delta.y };
      const edited = moveConnectorHandle(page, connector, handle, point);
      options.commitConnector(page, connector, edited, 'Nudge connector handle');
      options.applyConnectorSelection(connector.id, { ...handle, point });
      return true;
    },
    [currentConnector, options]
  );

  return { currentConnector, addBend, removeActiveBend, resetRoute, nudgeActiveHandle };
}
