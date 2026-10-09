import { useEffect, useRef, type RefObject } from 'react';
import { mapFocus } from '../../../application/map/mapFocus';
import type { ScenePage } from '../../../domain/document/types';
import type { PixiRendererHost } from '../../../infrastructure/pixi/PixiRendererHost';

/**
 * The focus is the selection, drawn by the host: the box or arrow, what it talks to, the rest dimmed. Only a focus set here is
 * cleared here (Canvas has its own, flow playback and perspectives). A scene change recomputes it: a box just opened brings its arrows with it.
 */
export function useMapFocus(
  hostRef: RefObject<PixiRendererHost | null>,
  mapPage: ScenePage | null,
  nodeId: string | null,
  connectorId: string | null,
): void {
  const focusing = useRef(false);
  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    const focus = mapPage ? mapFocus(mapPage, { nodeId, connectorId }) : null;
    if (focus) { host.setFocus({ ...focus, tone: 'selection' }); focusing.current = true; } else if (focusing.current) { host.setFocus(null); focusing.current = false; }
  }, [mapPage, nodeId, connectorId, hostRef]);
}
