import { describe, expect, it } from 'vitest';
import type { FlowNode, FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';
import { projectActiveDocument } from './activeDocumentProjection';

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
});
