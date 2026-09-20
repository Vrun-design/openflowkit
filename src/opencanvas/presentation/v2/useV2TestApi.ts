import { useEffect, type RefObject } from 'react';
import { isRolloutFlagEnabled } from '../../../config/rolloutFlags';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { CanvasSelection } from '../../application/selection/selection';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import type { V2Tool } from './V2CreationToolbar';
import type { V2SaveStatus } from './useV2Autosave';

interface V2TestApiOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly toolRef: RefObject<V2Tool>;
  readonly selectedConnectorId: string | null;
  readonly document: SceneDocumentV1 | null;
  readonly revision: number;
  readonly saveStatus: V2SaveStatus;
}

// Read-only handle for the Playwright gate and deterministic evaluations
// (create→…→reload→export). Mounted only with the v2Editor flag, alongside
// the route itself; it exposes document state and geometry, never writes.
export function useV2TestApi(options: V2TestApiOptions) {
  const {
    hostRef, selectionRef, toolRef, selectedConnectorId, document, revision, saveStatus,
  } = options;
  useEffect(() => {
    if (!isRolloutFlagEnabled('v2Editor')) return;
    const api = {
      getState: () => ({
        revision,
        save: saveStatus.state,
        nodes: document?.pages[0]?.nodes.map((node) => node.id) ?? [],
        connectors: document?.pages[0]?.connectors.map((connector) => connector.id) ?? [],
        selectedNodes: selectionRef.current.nodeIds,
        selectedConnector: selectedConnectorId,
        tool: toolRef.current,
      }),
      getDocument: () => document,
      getNodeRect: (nodeId: string) => {
        const bounds = hostRef.current?.getNodeScreenBounds(nodeId);
        return bounds
          ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
          : null;
      },
    };
    (window as unknown as { __V2__?: typeof api }).__V2__ = api;
  });
}
