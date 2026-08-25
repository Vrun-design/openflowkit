import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import type { LoadedDocument, PersistedDocument } from './persistenceTypes';
import { inspectPersistedWorkspace } from './persistedWorkspaceRepair';

function documentWithReferences(): PersistedDocument {
  const node = {
    id: 'child',
    type: 'process',
    parentId: 'missing-parent',
    extent: 'parent',
    position: { x: 10, y: 20 },
    data: { label: 'Child', layerId: 'missing-layer' },
  } as FlowNode;
  return {
    id: 'document-1',
    name: 'Repair me',
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T01:00:00.000Z',
    activePageId: 'page-1',
    deletedAt: null,
    pages: [
      {
        id: 'page-1',
        name: 'Page 1',
        content: {
          nodes: [node],
          edges: [{ id: 'orphan', source: 'child', target: 'missing-target' }],
          layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
        },
      },
    ],
  };
}

function loaded(document = documentWithReferences()): LoadedDocument {
  return {
    document,
    documents: [document],
    workspaceMeta: {
      id: 'workspace',
      activeDocumentId: document.id,
      documentOrder: [document.id],
      lastOpenedAt: '2026-08-25T01:00:00.000Z',
    },
  };
}

describe('persisted workspace repair', () => {
  it('plans deterministic minimal reference repairs without mutating source', () => {
    const source = loaded();
    const report = inspectPersistedWorkspace(source, '2026-08-25T02:00:00.000Z');
    expect(report.status).toBe('repairable');
    if (report.status !== 'repairable') return;

    expect(report.plan.actions.map((action) => action.kind)).toEqual([
      'reset-layer',
      'detach-parent',
      'remove-connector',
    ]);
    const content = report.plan.repairedDocuments[0]?.pages?.[0]?.content;
    expect(content?.nodes[0]).not.toHaveProperty('parentId');
    expect(content?.nodes[0]).not.toHaveProperty('extent');
    expect(content?.nodes[0]?.data.layerId).toBe('default');
    expect(content?.edges).toEqual([]);
    expect(source.documents[0]?.pages?.[0]?.content.edges).toHaveLength(1);
    expect(
      inspectPersistedWorkspace({
        ...source,
        document: report.plan.repairedDocuments[0] ?? null,
        documents: [...report.plan.repairedDocuments],
      }).status
    ).toBe('healthy');
  });

  it('builds an exact pre-repair workspace backup', () => {
    const source = loaded();
    const report = inspectPersistedWorkspace(source, '2026-08-25T02:00:00.000Z');
    expect(report.status).toBe('repairable');
    if (report.status !== 'repairable') return;

    const backup = JSON.parse(report.plan.backup.json) as {
      format: string;
      exportedAt: string;
      documents: PersistedDocument[];
    };
    expect(report.plan.backup.fileName).toBe('openflowkit-workspace-before-repair.json');
    expect(backup.format).toBe('openflowkit-persisted-workspace-backup');
    expect(backup.exportedAt).toBe('2026-08-25T02:00:00.000Z');
    expect(backup.documents).toEqual(source.documents);
  });

  it('reports healthy data without allocating a repair plan', () => {
    const document = documentWithReferences();
    const page = document.pages?.[0];
    if (!page) throw new Error('Expected page fixture.');
    const healthy: PersistedDocument = {
      ...document,
      pages: [
        {
          ...page,
          content: {
            ...page.content,
            nodes: [
              {
                ...page.content.nodes[0],
                parentId: undefined,
                extent: undefined,
                data: { ...page.content.nodes[0]?.data, layerId: 'default' },
              } as FlowNode,
            ],
            edges: [],
          },
        },
      ],
    };
    expect(inspectPersistedWorkspace(loaded(healthy)).status).toBe('healthy');
  });

  it('fails closed for structurally invalid persisted documents', () => {
    const document = { ...documentWithReferences(), pages: [], content: undefined };
    const report = inspectPersistedWorkspace(loaded(document));
    expect(report.status).toBe('unrepairable');
    if (report.status === 'unrepairable') {
      expect(report.issues[0]).toContain('missing page content');
    }
  });
});
