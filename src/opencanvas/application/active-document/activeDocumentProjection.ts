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

interface PageProjectionCacheEntry {
  readonly nodes: unknown;
  readonly edges: unknown;
  readonly layers: unknown;
  readonly extensions: unknown;
  readonly page: SceneDocumentV1['pages'][number];
  /** Whole document, kept only for the active page (it owns the snapshot). */
  readonly document: SceneDocumentV1 | null;
}

/**
 * Projection that only re-projects pages whose inputs changed by reference.
 * The active page's inputs are the live `nodes`/`edges`; other pages come
 * from their tab snapshots, which rarely change. Every consumer that reads
 * the canonical document from the store should go through one instance so
 * they share the same object identity per state.
 */
export function createActiveDocumentProjector(): (
  state: ActiveDocumentProjectionState
) => ActiveDocumentProjectionResult {
  const pageCache = new Map<string, PageProjectionCacheEntry>();
  let last: { readonly state: ActiveDocumentProjectionState; readonly result: ActiveDocumentProjectionResult } | null = null;

  const sameInputs = (left: ActiveDocumentProjectionState, right: ActiveDocumentProjectionState): boolean =>
    left.nodes === right.nodes && left.edges === right.edges && left.pages === right.pages
    && left.documents === right.documents && left.activeDocumentId === right.activeDocumentId
    && left.activePageId === right.activePageId && left.layers === right.layers;

  return (state) => {
    if (last && sameInputs(last.state, state)) return last.result;
    const activeDocument = state.documents.find((document) => document.id === state.activeDocumentId);
    const activePage = state.pages.find((page) => page.id === state.activePageId);
    if (!activeDocument || !activePage) {
      last = { state, result: { status: 'empty' } };
      return last.result;
    }
    const now = new Date().toISOString();
    try {
      const context = (page: FlowTab, layers: readonly SceneLayer[] | undefined) => ({
        documentId: activeDocument.id,
        pageId: page.id,
        pageName: page.name,
        name: activeDocument.name,
        diagramType: page.diagramType ?? 'flowchart',
        now,
        createdAt: activeDocument.createdAt,
        layers,
        pageExtensions: (page.canvasExtensions ?? {}) as JsonObject,
      });
      // The active page projection is the document: it carries the legacy
      // snapshot the reverse projection needs as its baseline.
      const activeLayers = activePage.layers ?? state.layers;
      const activeCached = pageCache.get(activePage.id);
      const activeDocumentProjection =
        activeCached && activeCached.document && activeCached.nodes === state.nodes
        && activeCached.edges === state.edges && activeCached.layers === activeLayers
        && activeCached.extensions === (activePage.canvasExtensions ?? null)
        && activeCached.page.name === activePage.name
          ? activeCached.document
          : projectReactFlowToSceneDocument(
              { nodes: state.nodes, edges: state.edges }, context(activePage, activeLayers)
            );
      pageCache.set(activePage.id, {
        nodes: state.nodes, edges: state.edges, layers: activeLayers,
        extensions: activePage.canvasExtensions ?? null,
        page: activeDocumentProjection.pages[0], document: activeDocumentProjection,
      });
      const pages = state.pages.map((page) => {
        if (page.id === activePage.id) return activeDocumentProjection.pages[0];
        const nodes = page.nodes;
        const edges = page.edges;
        const layers = page.layers;
        const extensions = page.canvasExtensions ?? null;
        const cached = pageCache.get(page.id);
        if (
          cached && cached.nodes === nodes && cached.edges === edges
          && cached.layers === layers && cached.extensions === extensions
          && cached.page.name === page.name
        ) {
          return cached.page;
        }
        const projected = projectReactFlowToSceneDocument(
          { nodes, edges }, context(page, layers)
        ).pages[0];
        pageCache.set(page.id, { nodes, edges, layers, extensions, page: projected, document: null });
        return projected;
      });
      for (const id of [...pageCache.keys()]) {
        if (!state.pages.some((page) => page.id === id)) pageCache.delete(id);
      }
      last = {
        state,
        result: { status: 'ready', document: { ...activeDocumentProjection, pages } },
      };
    } catch {
      last = { state, result: { status: 'invalid', code: 'CANONICAL_PROJECTION_FAILED' } };
    }
    return last.result;
  };
}

/** Shared projector for production consumers (surface, store commands). */
export const projectActiveDocumentMemoized = createActiveDocumentProjector();
