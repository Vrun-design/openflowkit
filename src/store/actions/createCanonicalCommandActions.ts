import type { DocumentCommand } from '@/opencanvas/domain/commands/types';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { applyDocumentCommand } from '@/opencanvas/domain/commands/execute';
import { projectActiveDocument } from '@/opencanvas/application/active-document/activeDocumentProjection';
import { projectSceneDocumentToReactFlow } from '@/opencanvas/infrastructure/reactflow/toReactFlow';
import type { SetFlowState } from '../actionFactory';
import type { FlowState } from '../types';
import { syncTabNodesEdges } from './syncTabNodesEdges';
import {
  buildHistorySnapshot,
  findActiveTabIndex,
  trimPastSnapshots,
} from './createHistoryActions';

export type CanonicalCommandBuilder = (
  document: SceneDocumentV1,
  pageId: string
) => DocumentCommand | null;

export function createCanonicalCommandActions(
  set: SetFlowState
): Pick<FlowState, 'applyCanonicalCommand'> {
  return {
    /**
     * The one write path for canonical edits: project the active page, let the
     * caller build a command against it, apply it, and write the legacy
     * projection plus one history entry in a single store update. A builder
     * that returns null (or throws) leaves the store untouched.
     */
    applyCanonicalCommand: (build) => {
      let changed = false;
      set((state) => {
        const activeTabIndex = findActiveTabIndex(state);
        if (activeTabIndex < 0) return {};
        const projection = projectActiveDocument(
          { ...state, pages: state.tabs, activePageId: state.activeTabId },
          new Date().toISOString()
        );
        if (projection.status !== 'ready') return {};
        const command = build(projection.document, state.activeTabId);
        if (!command) return {};
        const nextDocument: SceneDocumentV1 = {
          ...applyDocumentCommand(projection.document, command).document,
          updatedAt: new Date().toISOString(),
        };
        const next = projectSceneDocumentToReactFlow(nextDocument, state.activeTabId);
        // Legacy records carry no transient flags; keep the selection the user has.
        const selectedIds = new Set(state.nodes.filter((node) => node.selected).map(({ id }) => id));
        const nodes = next.nodes.map((node) =>
          selectedIds.has(node.id) ? { ...node, selected: true } : node
        );
        const selectedEdgeIds = new Set(state.edges.filter((edge) => edge.selected).map(({ id }) => id));
        const edges = next.edges.map((edge) =>
          selectedEdgeIds.has(edge.id) ? { ...edge, selected: true } : edge
        );

        const activeTab = state.tabs[activeTabIndex];
        const tabs = syncTabNodesEdges(state.tabs, state.activeTabId, nodes, edges);
        tabs[activeTabIndex] = {
          ...tabs[activeTabIndex],
          history: {
            past: trimPastSnapshots([...activeTab.history.past, buildHistorySnapshot(state)]),
            future: [],
          },
        };
        changed = true;
        return { nodes, edges, tabs };
      });
      return changed;
    },
  };
}
