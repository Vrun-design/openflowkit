import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import type { SceneDocumentV1, SceneLayer } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
import { projectReactFlowToSceneDocument } from '../../infrastructure/reactflow/fromReactFlow';

export interface ActiveDocumentProjectionState {
  readonly nodes: readonly FlowNode[];
  readonly edges: readonly FlowEdge[];
  readonly documents: readonly FlowDocument[];
  readonly activeDocumentId: string;
  readonly pages: readonly FlowTab[];
  readonly activePageId: string;
  readonly layers?: readonly SceneLayer[];
}

export type ActiveDocumentProjectionResult =
  | { readonly status: 'ready'; readonly document: SceneDocumentV1 }
  | { readonly status: 'empty' }
  | { readonly status: 'invalid'; readonly code: 'CANONICAL_PROJECTION_FAILED' };

export function projectActiveDocument(
  state: ActiveDocumentProjectionState,
  now: string
): ActiveDocumentProjectionResult {
  const activeDocument = state.documents.find(
    (document) => document.id === state.activeDocumentId
  );
  const activePage = state.pages.find((page) => page.id === state.activePageId);
  if (!activeDocument || !activePage) return { status: 'empty' };

  try {
    const projectedPages = state.pages.map((page) => {
      const active = page.id === state.activePageId;
      const graph = active
        ? { nodes: state.nodes, edges: state.edges }
        : { nodes: page.nodes, edges: page.edges };
      return projectReactFlowToSceneDocument(
        graph,
        {
          documentId: activeDocument.id,
          pageId: page.id,
          pageName: page.name,
          name: activeDocument.name,
          diagramType: page.diagramType ?? 'flowchart',
          now,
          createdAt: activeDocument.createdAt,
          layers: page.layers ?? (active ? state.layers : undefined),
          pageExtensions: (page.canvasExtensions ?? {}) as JsonObject,
        }
      ).pages[0];
    });
    const activeProjection = projectReactFlowToSceneDocument(
      { nodes: state.nodes, edges: state.edges },
      {
        documentId: activeDocument.id,
        pageId: activePage.id,
        pageName: activePage.name,
        name: activeDocument.name,
        diagramType: activePage.diagramType ?? 'flowchart',
        now,
        createdAt: activeDocument.createdAt,
        layers: activePage.layers ?? state.layers,
        pageExtensions: (activePage.canvasExtensions ?? {}) as JsonObject,
      }
    );
    return {
      status: 'ready',
      document: { ...activeProjection, pages: projectedPages },
    };
  } catch {
    return { status: 'invalid', code: 'CANONICAL_PROJECTION_FAILED' };
  }
}
