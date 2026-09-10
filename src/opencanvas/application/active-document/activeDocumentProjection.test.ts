import { describe, expect, it } from 'vitest';
import type { FlowNode, FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import { createActiveDocumentProjector, projectActiveDocument } from './activeDocumentProjection';
import { projectSceneDocumentToReactFlow } from '../../infrastructure/reactflow/toReactFlow';

const page: FlowTab = {
  id: 'page-1',
  name: 'Page',
  diagramType: 'architecture',
  nodes: [],
  edges: [],
  history: { past: [], future: [] },
};
const document: FlowDocument = {
  id: 'document-1',
  name: 'Production document',
  createdAt: '2026-08-13T00:00:00.000Z',
  updatedAt: '2026-08-13T01:00:00.000Z',
  activePageId: page.id,
  pages: [page],
};

describe('active OpenCanvas document projection', () => {
  it('projects live active arrays through renderer-neutral canonical contracts', () => {
    const node = {
      id: 'node-1',
      type: 'architecture',
      position: { x: 20, y: 30 },
      data: { label: 'API' },
    } as FlowNode;

    const result = projectActiveDocument(
      {
        nodes: [node],
        edges: [],
        documents: [document],
        activeDocumentId: document.id,
        pages: [page],
        activePageId: page.id,
      },
      '2026-08-13T02:00:00.000Z'
    );

    expect(result.status).toBe('ready');
    expect(result.status === 'ready' && result.document.id).toBe(document.id);
    expect(result.status === 'ready' && result.document.pages[0].id).toBe(page.id);
    expect(result.status === 'ready' && result.document.pages[0].nodes[0].content.label).toBe('API');
  });

  it('projects every tab as an ordered canonical page with page-owned layers', () => {
    const second: FlowTab = {
      ...page,
      id: 'page-2',
      name: 'Second',
      nodes: [{
        id: 'node-2', type: 'process', position: { x: 1, y: 2 },
        data: { label: 'Second', layerId: 'notes' },
      } as FlowNode],
      layers: [{ id: 'notes', name: 'Notes', visible: true, locked: true }],
    };
    const result = projectActiveDocument({
      nodes: [], edges: [], documents: [document], activeDocumentId: document.id,
      pages: [page, second], activePageId: page.id,
      layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
    }, '2026-08-13T02:00:00.000Z');

    expect(result.status).toBe('ready');
    if (result.status !== 'ready') return;
    expect(result.document.pages.map((candidate) => candidate.id)).toEqual(['page-1', 'page-2']);
    expect(result.document.pages[1].nodes[0].content.label).toBe('Second');
    expect(result.document.pages[1].layers).toEqual(second.layers);
  });

  it('returns empty until route synchronization resolves active records', () => {
    expect(projectActiveDocument({
      nodes: [],
      edges: [],
      documents: [],
      activeDocumentId: '',
      pages: [],
      activePageId: '',
    }, '2026-08-13T02:00:00.000Z')).toEqual({ status: 'empty' });
  });

  it('contains invalid graph details behind a safe failure code', () => {
    const invalidNode = {
      id: 'node-1',
      type: 'process',
      position: { x: Number.NaN, y: 0 },
      data: { label: 'Invalid', secret: 'not exposed' },
    } as FlowNode;
    const result = projectActiveDocument({
      nodes: [invalidNode],
      edges: [],
      documents: [document],
      activeDocumentId: document.id,
      pages: [page],
      activePageId: page.id,
    }, '2026-08-13T02:00:00.000Z');

    expect(result).toEqual({ status: 'invalid', code: 'CANONICAL_PROJECTION_FAILED' });
    expect(JSON.stringify(result)).not.toContain('secret');
  });

  it('memoises per page and keeps the legacy snapshot baseline', () => {
    const project = createActiveDocumentProjector();
    const second: FlowTab = {
      ...page, id: 'page-2', name: 'Second',
      nodes: [{ id: 'node-2', type: 'process', position: { x: 1, y: 2 }, data: { label: 'Second' } } as FlowNode],
    };
    const node = {
      id: 'node-1', type: 'process', position: { x: 20, y: 30 },
      data: { label: 'API', color: 'blue' }, style: { width: 200, height: 80 },
    } as FlowNode;
    const base = {
      nodes: [node], edges: [], documents: [document], activeDocumentId: document.id,
      pages: [page, second], activePageId: page.id,
    };
    const first = project(base);
    expect(project(base)).toBe(first);
    expect(first.status).toBe('ready');
    if (first.status !== 'ready') return;

    // Only the active page changes: page-2's projection is reused by identity.
    const moved = { ...node, position: { x: 99, y: 30 } };
    const next = project({ ...base, nodes: [moved] });
    expect(next.status).toBe('ready');
    if (next.status !== 'ready') return;
    expect(next).not.toBe(first);
    expect(next.document.pages[1]).toBe(first.document.pages[1]);
    expect(next.document.pages[0].nodes[0].transform.translation.x).toBe(99);

    // The reverse projection still finds the original record as its baseline,
    // so an unchanged node comes back byte-identical.
    const back = projectSceneDocumentToReactFlow(next.document, page.id);
    expect(back.nodes[0]).toEqual(moved);
  });
});
