import { projectLegacyDocument } from '@/opencanvas/domain/document/legacyProjection';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import { validateSceneDocumentV1 } from '@/opencanvas/domain/document/validation';
import { normalizeJsonObject } from '@/opencanvas/infrastructure/reactflow/jsonNormalization';
import { projectSceneDocumentToReactFlow } from '@/opencanvas/infrastructure/reactflow/toReactFlow';
import { resolveLegacyNodeSize } from '@/opencanvas/infrastructure/reactflow/legacyNodeSize';
import type { FlowTab } from '@/lib/types';
import { createEmptyFlowHistory } from '@/store/historyState';
import { createFlowDocumentFromPersistedDocument } from './flowDocumentModel';
import type { PersistedDocument } from './persistenceTypes';

/** Every page of a persisted document as one canonical scene document. */
export function projectPersistedDocument(document: PersistedDocument): SceneDocumentV1 {
  const flowDocument = createFlowDocumentFromPersistedDocument(document);
  const projectedPages = flowDocument.pages.map((page) => {
    const envelope = normalizeJsonObject({
      version: '1.1',
      name: flowDocument.name,
      diagramType: page.diagramType ?? 'flowchart',
      nodes: page.nodes,
      edges: page.edges,
      createdAt: flowDocument.createdAt,
    });
    return projectLegacyDocument(envelope, {
      documentId: flowDocument.id,
      pageId: page.id,
      pageName: page.name,
      now: flowDocument.updatedAt,
      layers: page.layers,
      pageExtensions: normalizeJsonObject(page.canvasExtensions ?? {}),
      resolveNodeSize: resolveLegacyNodeSize,
    }).pages[0];
  });
  const firstPage = projectedPages[0];
  if (!firstPage) {
    throw new TypeError(`Persisted document "${document.id}" has no projectable page.`);
  }

  const base = projectLegacyDocument(
    normalizeJsonObject({
      version: '1.1',
      name: flowDocument.name,
      diagramType: firstPage.diagramKind,
      nodes: [],
      edges: [],
      createdAt: flowDocument.createdAt,
    }),
    {
      documentId: flowDocument.id,
      pageId: firstPage.id,
      pageName: firstPage.name,
      now: flowDocument.updatedAt,
    }
  );
  return { ...base, pages: projectedPages };
}

/**
 * A6 slice d1: every save also carries the validated canonical document, so
 * the durable format the MCP server opens is the one the app writes. Load
 * still reads the legacy pages; a document whose projection fails is saved
 * without `canonical` rather than not at all.
 */
export function withCanonical(document: PersistedDocument): PersistedDocument {
  try {
    const canonical = projectPersistedDocument(document);
    return validateSceneDocumentV1(canonical).success ? { ...document, canonical } : document;
  } catch {
    return document;
  }
}

/** Tabs for the editor from the canonical document alone (d2 load path). */
export function createFlowTabsFromCanonical(canonical: SceneDocumentV1): FlowTab[] {
  return canonical.pages.map((page) => {
    const projection = projectSceneDocumentToReactFlow(canonical, page.id);
    return {
      id: page.id,
      name: page.name,
      diagramType: page.diagramKind as FlowTab['diagramType'],
      updatedAt: canonical.updatedAt,
      nodes: projection.nodes,
      edges: projection.edges,
      history: createEmptyFlowHistory(),
      layers: page.layers.map((layer) => ({ ...layer })),
    };
  });
}
