import { buildVariantExportFileName } from '@/lib/exportFileName';
import { projectActiveDocument } from '@/opencanvas/application/active-document/activeDocumentProjection';
import { serializeCanonicalJson } from '@/opencanvas/infrastructure/export/canonicalJson';
import type { FlowDocument, FlowPage } from './flowDocumentModel';
import { inlineNodeAssetsForTransfer } from './assetInlining';
import type { FlowSnapshot } from '@/lib/types';
import { projectReactFlowToSceneDocument } from '@/opencanvas/infrastructure/reactflow/fromReactFlow';

export interface DestructiveActionBackup {
  readonly fileName: string;
  readonly json: string;
}

async function makePagePortable(page: FlowPage): Promise<FlowPage> {
  return {
    ...page,
    nodes: await inlineNodeAssetsForTransfer(page.nodes),
  };
}

export async function buildPreDeleteDocumentBackup(
  document: FlowDocument
): Promise<DestructiveActionBackup> {
  const pages = await Promise.all(document.pages.map(makePagePortable));
  const activePage = pages.find((page) => page.id === document.activePageId) ?? pages[0];
  if (!activePage) {
    throw new TypeError('Cannot back up a document without a page.');
  }

  const portableDocument: FlowDocument = {
    ...document,
    activePageId: activePage.id,
    pages,
  };
  const projection = projectActiveDocument(
    {
      nodes: activePage.nodes,
      edges: activePage.edges,
      documents: [portableDocument],
      activeDocumentId: portableDocument.id,
      pages,
      activePageId: activePage.id,
      layers: activePage.layers,
    },
    document.updatedAt
  );

  if (projection.status !== 'ready') {
    throw new TypeError('Cannot safely back up this document before deletion.');
  }

  return {
    fileName: buildVariantExportFileName(document.name, 'pre-delete-backup', 'json'),
    json: serializeCanonicalJson(projection.document),
  };
}

export async function buildPreDeleteSnapshotBackup(
  snapshot: FlowSnapshot
): Promise<DestructiveActionBackup> {
  const nodes = await inlineNodeAssetsForTransfer(snapshot.nodes);
  const document = projectReactFlowToSceneDocument(
    { nodes, edges: snapshot.edges },
    {
      documentId: `snapshot:${snapshot.id}`,
      pageId: 'snapshot-page',
      pageName: snapshot.name,
      name: snapshot.name,
      diagramType: 'flowchart',
      now: snapshot.timestamp,
      createdAt: snapshot.timestamp,
    }
  );

  return {
    fileName: buildVariantExportFileName(snapshot.name, 'pre-delete-backup', 'json'),
    json: serializeCanonicalJson(document),
  };
}

export async function buildPreDeleteWorkspaceBackup(
  documents: readonly FlowDocument[],
  exportedAt = new Date().toISOString()
): Promise<DestructiveActionBackup> {
  if (documents.length === 0) {
    throw new TypeError('Cannot back up an empty workspace selection.');
  }
  const backups = await Promise.all(documents.map(buildPreDeleteDocumentBackup));
  return {
    fileName: 'openflowkit-workspace-pre-delete-backup.json',
    json: JSON.stringify(
      {
        format: 'openflowkit-canonical-workspace-bundle',
        schemaVersion: 1,
        exportedAt,
        documents: backups.map((backup) => JSON.parse(backup.json) as unknown),
      },
      null,
      2
    ),
  };
}

export function downloadDestructiveActionBackup(backup: DestructiveActionBackup): void {
  const url = URL.createObjectURL(new Blob([backup.json], { type: 'application/json' }));
  try {
    const link = document.createElement('a');
    link.download = backup.fileName;
    link.href = url;
    link.click();
  } finally {
    URL.revokeObjectURL(url);
  }
}
