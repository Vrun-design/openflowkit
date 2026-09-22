import { useEffect, type RefObject } from 'react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { CanvasSelection } from '../../application/selection/selection';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import type { AnimationPreset } from '../../domain/animation/types';
import { animatedSvgFor, motionFrameSvgFor, motionTimeline, timelineDuration } from './v2Motion';
import type { V2Tool } from './V2CreationToolbar';
import type { V2SaveStatus } from './useV2Autosave';
import type { useV2Proposal } from './useV2Proposal';

interface V2TestApiOptions {
  readonly hostRef: RefObject<PixiRendererHost | null>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly toolRef: RefObject<V2Tool>;
  readonly selectedConnectorIds: readonly string[];
  readonly document: SceneDocumentV1 | null;
  readonly revision: number;
  readonly saveStatus: V2SaveStatus;
  readonly proposal: ReturnType<typeof useV2Proposal>;
}

// Read-only handle for the Playwright gate and deterministic evaluations
// (create→…→reload→export). Mounted with the editor route; it exposes
// document state and geometry, never writes.
export function useV2TestApi(options: V2TestApiOptions) {
  const {
    hostRef, selectionRef, toolRef, selectedConnectorIds, document, revision, saveStatus, proposal,
  } = options;
  useEffect(() => {
    const api = {
      getState: () => ({
        revision,
        save: saveStatus.state,
        nodes: document?.pages[0]?.nodes.map((node) => node.id) ?? [],
        connectors: document?.pages[0]?.connectors.map((connector) => connector.id) ?? [],
        selectedNodes: selectionRef.current.nodeIds,
        selectedConnector: selectedConnectorIds.length === 1 ? selectedConnectorIds[0]! : null,
        selectedConnectors: selectedConnectorIds,
        tool: toolRef.current,
      }),
      getDocument: () => document,
      getProposal: () => ({
        phase: proposal.phase, stale: proposal.stale, id: proposal.proposal?.id ?? null,
        baseRevision: proposal.proposal?.baseRevision ?? null,
        changeIds: proposal.changes.map(({ id }) => id), decisions: proposal.decisions,
        error: proposal.error,
      }),
      getRenderDiagnostics: () => hostRef.current?.getRenderDiagnostics(),      getNodeDebugSnapshot: () => hostRef.current?.getNodeDebugSnapshot(),
      getConnectorDebugSnapshot: () => hostRef.current?.getConnectorDebugSnapshot(),
      getLiveConnectorSamples: (connectorId: string) =>
        hostRef.current?.getLiveConnectorSamples(connectorId) ?? null,
      getConnectorScreenSamples: (connectorId: string) => {
        const host = hostRef.current;
        return host?.getLiveConnectorSamples(connectorId)?.map((point) => host.worldToScreen(point)) ?? null;
      },
      getNodeRect: (nodeId: string) => {
        const bounds = hostRef.current?.getNodeScreenBounds(nodeId);
        return bounds
          ? { x: bounds.x, y: bounds.y, width: bounds.width, height: bounds.height }
          : null;
      },
      // Animated-export parity probe: the animated SVG and the still at any t
      // come from the same timeline, so the gate can pixel-compare them.
      getMotionExport: (preset: AnimationPreset = 'build', pageId?: string) => {
        if (!document) return null;
        const target = pageId ?? document.pages[0]?.id;
        if (!target) return null;
        const request = { document, pageId: target, preset };
        const timeline = motionTimeline(request);
        return {
          durationMs: timelineDuration(timeline),
          steps: timeline.steps.length,
          animatedSvg: animatedSvgFor({ ...request, timeline }),
          stillAt: (tMs: number) => motionFrameSvgFor({ ...request, timeline }, tMs),
        };
      },
    };
    (window as unknown as { __V2__?: typeof api }).__V2__ = api;
  });
}
