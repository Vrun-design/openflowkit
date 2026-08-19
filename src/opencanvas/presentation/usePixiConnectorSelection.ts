import { useCallback, useRef, useState, type RefObject } from 'react';
import { clearSelection, type CanvasSelection } from '../application/selection/selection';
import type { ConnectorEditHandle } from '../domain/connectors/editing';
import type { PixiRendererHost } from '../infrastructure/pixi/PixiRendererHost';

interface ConnectorSelectionOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly applyNodeSelection: (selection: CanvasSelection) => void;
}

export function usePixiConnectorSelection(options: ConnectorSelectionOptions) {
  const selectedConnectorIdRef = useRef<string | null>(null);
  const activeConnectorHandleRef = useRef<ConnectorEditHandle | null>(null);
  const [selectedConnectorId, setSelectedConnectorId] = useState<string | null>(null);
  const [activeConnectorHandle, setActiveConnectorHandle] = useState<ConnectorEditHandle | null>(
    null
  );

  const applyConnectorSelection = useCallback(
    (connectorId: string | null, handle: ConnectorEditHandle | null = null) => {
      selectedConnectorIdRef.current = connectorId;
      activeConnectorHandleRef.current = handle;
      setSelectedConnectorId(connectorId);
      setActiveConnectorHandle(handle);
      if (connectorId) options.applyNodeSelection(clearSelection());
      options.hostRef.current?.setConnectorSelection(connectorId, handle);
    },
    [options]
  );

  return {
    selectedConnectorId,
    activeConnectorHandle,
    selectedConnectorIdRef,
    activeConnectorHandleRef,
    applyConnectorSelection,
  };
}
