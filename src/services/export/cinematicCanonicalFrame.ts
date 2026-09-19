import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import type { CinematicRenderState } from './cinematicRenderState';

function opacityFor(
  id: string, visible: ReadonlySet<string>, activeId: string | null, progress: number, current: unknown
): number {
  const base = typeof current === 'number' && Number.isFinite(current) ? current : 1;
  if (id === activeId) return base * Math.min(1, Math.max(0, progress));
  return visible.has(id) ? base : 0;
}

/**
 * The canonical document as one cinematic frame: hidden objects at opacity 0
 * (kept, so the export bounds never move between frames), the active node or
 * edge fading in by its progress. Renderer-independent; the SVG exporter
 * honours appearance.opacity on nodes and connectors.
 */
export function applyCinematicRenderState(
  document: SceneDocumentV1, pageId: string, state: CinematicRenderState
): SceneDocumentV1 {
  return {
    ...document,
    pages: document.pages.map((page) => page.id !== pageId ? page : {
      ...page,
      nodes: page.nodes.map((node) => ({
        ...node,
        appearance: {
          ...node.appearance,
          opacity: opacityFor(node.id, state.visibleNodeIds, state.activeNodeId, state.activeNodeProgress, node.appearance.opacity),
        },
      })),
      connectors: page.connectors.map((connector) => ({
        ...connector,
        appearance: {
          ...connector.appearance,
          opacity: opacityFor(connector.id, state.visibleEdgeIds, state.activeEdgeId, state.activeEdgeProgress, connector.appearance.opacity),
        },
      })),
    }),
  };
}
