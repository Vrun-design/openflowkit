import { describe, expect, it } from 'vitest';
import type { FlowNode } from '@/lib/types';
import type { FlowDocument } from './flowDocumentModel';
import {
  buildPreDeleteDocumentBackup,
  buildPreDeleteSnapshotBackup,
  buildPreDeleteWorkspaceBackup,
} from './destructiveActionBackup';

function documentWith(node: FlowNode): FlowDocument {
  return {
    id: 'document-1',
    name: 'Risky / Document',
    createdAt: '2026-08-25T00:00:00.000Z',
    updatedAt: '2026-08-25T01:00:00.000Z',
    activePageId: 'page-2',
    pages: [
      { id: 'page-1', name: 'One', nodes: [], edges: [], history: { past: [], future: [] } },
      {
        id: 'page-2',
        name: 'Two',
        nodes: [node],
        edges: [],
        history: { past: [], future: [] },
      },
    ],
  };
}

describe('destructive-action document backup', () => {
  it('creates a validated portable whole-document canonical backup', async () => {
    const backup = await buildPreDeleteDocumentBackup(
      documentWith({
        id: 'node-1',
        type: 'process',
        position: { x: 10, y: 20 },
        data: { label: 'Keep me' },
      } as FlowNode)
    );

    const parsed = JSON.parse(backup.json) as {
      id: string;
      pages: Array<{ id: string; nodes: Array<{ content: { label: string } }> }>;
    };
    expect(backup.fileName).toBe('risky-document-pre-delete-backup.json');
    expect(parsed.id).toBe('document-1');
    expect(parsed.pages.map((page) => page.id)).toEqual(['page-1', 'page-2']);
    expect(parsed.pages[1].nodes[0].content.label).toBe('Keep me');
  });

  it('fails closed when canonical projection cannot preserve the document', async () => {
    await expect(
      buildPreDeleteDocumentBackup(
        documentWith({
          id: 'invalid',
          type: 'process',
          position: { x: Number.NaN, y: 0 },
          data: { label: 'invalid' },
        } as FlowNode)
      )
    ).rejects.toThrow('Cannot safely back up');
  });

  it('creates a validated portable snapshot backup', async () => {
    const backup = await buildPreDeleteSnapshotBackup({
      id: 'snapshot-1',
      name: 'Before migration',
      timestamp: '2026-08-25T02:00:00.000Z',
      kind: 'manual',
      nodes: [
        {
          id: 'node-1',
          type: 'process',
          position: { x: 1, y: 2 },
          data: { label: 'Snapshot node' },
        } as FlowNode,
      ],
      edges: [],
    });

    const parsed = JSON.parse(backup.json) as {
      id: string;
      pages: Array<{ nodes: Array<{ content: { label: string } }> }>;
    };
    expect(backup.fileName).toBe('before-migration-pre-delete-backup.json');
    expect(parsed.id).toBe('snapshot:snapshot-1');
    expect(parsed.pages[0].nodes[0].content.label).toBe('Snapshot node');
  });

  it('rejects a snapshot whose references cannot be preserved', async () => {
    await expect(
      buildPreDeleteSnapshotBackup({
        id: 'snapshot-invalid',
        name: 'Invalid',
        timestamp: '2026-08-25T02:00:00.000Z',
        kind: 'manual',
        nodes: [
          {
            id: 'node-1',
            type: 'process',
            position: { x: 1, y: 2 },
            data: { label: 'Snapshot node' },
          } as FlowNode,
        ],
        edges: [{ id: 'edge-1', source: 'missing', target: 'node-1' }],
      })
    ).rejects.toThrow();
  });

  it('bundles multiple validated canonical documents into one workspace backup', async () => {
    const first = documentWith({
      id: 'node-1',
      type: 'process',
      position: { x: 1, y: 2 },
      data: { label: 'First' },
    } as FlowNode);
    const second = {
      ...documentWith({
        id: 'node-2',
        type: 'process',
        position: { x: 3, y: 4 },
        data: { label: 'Second' },
      } as FlowNode),
      id: 'document-2',
      name: 'Second document',
    };

    const backup = await buildPreDeleteWorkspaceBackup([first, second], '2026-08-25T03:00:00.000Z');
    const parsed = JSON.parse(backup.json) as {
      format: string;
      exportedAt: string;
      documents: Array<{ id: string }>;
    };
    expect(backup.fileName).toBe('openflowkit-workspace-pre-delete-backup.json');
    expect(parsed.format).toBe('openflowkit-canonical-workspace-bundle');
    expect(parsed.exportedAt).toBe('2026-08-25T03:00:00.000Z');
    expect(parsed.documents.map((document) => document.id)).toEqual(['document-1', 'document-2']);
  });

  it('fails the whole workspace backup when any selected document is unsafe', async () => {
    const valid = documentWith({
      id: 'node-1',
      type: 'process',
      position: { x: 1, y: 2 },
      data: { label: 'Valid' },
    } as FlowNode);
    const invalid = {
      ...documentWith({
        id: 'node-2',
        type: 'process',
        position: { x: 1, y: 2 },
        data: { label: 'Invalid' },
      } as FlowNode),
      id: 'document-invalid',
      pages: [],
    };

    await expect(buildPreDeleteWorkspaceBackup([valid, invalid])).rejects.toThrow();
  });
});
