import { useEffect } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useFlowStore } from '@/store';
import { runOpenCanvasShadowProjection } from '../infrastructure/reactflow/shadowProjection';

export const OPEN_CANVAS_SHADOW_RESULT_EVENT = 'openflowkit:opencanvas-shadow-result';

interface ShadowEventDetail {
  readonly status: 'passed' | 'failed';
  readonly code?: 'CANONICAL_PROJECTION_FAILED' | 'ROUND_TRIP_MISMATCH';
  readonly documentId: string;
  readonly pageId: string;
  readonly nodeCount: number;
  readonly connectorCount: number;
  readonly durationMs: number;
}

export function OpenCanvasShadowProjection(): null {
  const state = useFlowStore(
    useShallow((current) => ({
      nodes: current.nodes,
      edges: current.edges,
      documents: current.documents,
      activeDocumentId: current.activeDocumentId,
      tabs: current.tabs,
      activeTabId: current.activeTabId,
    }))
  );

  useEffect(() => {
    const activeDocument = state.documents.find(
      (document) => document.id === state.activeDocumentId
    );
    const activePage = state.tabs.find((page) => page.id === state.activeTabId);
    if (!activeDocument || !activePage) return;

    const timeout = window.setTimeout(() => {
      const result = runOpenCanvasShadowProjection(
        { nodes: state.nodes, edges: state.edges },
        {
          documentId: activeDocument.id,
          pageId: activePage.id,
          name: activeDocument.name,
          diagramType: activePage.diagramType ?? 'flowchart',
          now: new Date().toISOString(),
          createdAt: activeDocument.createdAt,
        }
      );
      const detail: ShadowEventDetail = {
        status: result.status,
        ...(result.status === 'failed' ? { code: result.code } : {}),
        documentId: activeDocument.id,
        pageId: activePage.id,
        nodeCount: result.nodeCount,
        connectorCount: result.connectorCount,
        durationMs: result.durationMs,
      };
      window.dispatchEvent(new CustomEvent(OPEN_CANVAS_SHADOW_RESULT_EVENT, { detail }));
    }, 120);

    return () => window.clearTimeout(timeout);
  }, [state]);

  return null;
}
