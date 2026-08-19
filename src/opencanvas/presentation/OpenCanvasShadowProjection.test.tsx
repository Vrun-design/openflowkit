import { act, render } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import type { FlowEdge, FlowNode, FlowTab } from '@/lib/types';
import type { FlowDocument } from '@/services/storage/flowDocumentModel';

const storeState = vi.hoisted(() => ({
  nodes: [] as FlowNode[],
  edges: [] as FlowEdge[],
  documents: [] as FlowDocument[],
  activeDocumentId: '',
  tabs: [] as FlowTab[],
  activeTabId: '',
}));

vi.mock('@/store', () => ({
  useFlowStore: (selector: (state: typeof storeState) => unknown) => selector(storeState),
}));

import {
  OPEN_CANVAS_SHADOW_RESULT_EVENT,
  OpenCanvasShadowProjection,
} from './OpenCanvasShadowProjection';

function configureActiveGraph(): void {
  const page: FlowTab = {
    id: 'page-1',
    name: 'Page',
    diagramType: 'flowchart',
    nodes: [],
    edges: [],
    history: { past: [], future: [] },
  };
  storeState.nodes = [{
    id: 'node-1',
    type: 'process',
    position: { x: 0, y: 0 },
    data: { label: 'Live' },
  }] as FlowNode[];
  storeState.edges = [];
  storeState.activeDocumentId = 'document-1';
  storeState.activeTabId = page.id;
  storeState.tabs = [page];
  storeState.documents = [{
    id: 'document-1',
    name: 'Document',
    createdAt: '2026-08-13T00:00:00.000Z',
    updatedAt: '2026-08-13T00:00:00.000Z',
    activePageId: page.id,
    pages: [page],
  }];
}

describe('OpenCanvas shadow projection runtime', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    configureActiveGraph();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('emits bounded parity telemetry after the quiet period', () => {
    const details: unknown[] = [];
    const listener = (event: Event) => details.push((event as CustomEvent).detail);
    window.addEventListener(OPEN_CANVAS_SHADOW_RESULT_EVENT, listener);

    render(<OpenCanvasShadowProjection />);
    act(() => vi.advanceTimersByTime(119));
    expect(details).toEqual([]);
    act(() => vi.advanceTimersByTime(1));

    expect(details).toHaveLength(1);
    expect(details[0]).toMatchObject({
      status: 'passed',
      documentId: 'document-1',
      pageId: 'page-1',
      nodeCount: 1,
      connectorCount: 0,
    });
    expect(details[0]).not.toHaveProperty('document');
    window.removeEventListener(OPEN_CANVAS_SHADOW_RESULT_EVENT, listener);
  });

  it('cancels stale work when the graph changes before projection', () => {
    const details: Array<{ nodeCount: number }> = [];
    const listener = (event: Event) => details.push((event as CustomEvent).detail);
    window.addEventListener(OPEN_CANVAS_SHADOW_RESULT_EVENT, listener);

    const view = render(<OpenCanvasShadowProjection />);
    storeState.nodes = [
      ...storeState.nodes,
      {
        id: 'node-2',
        type: 'process',
        position: { x: 200, y: 0 },
        data: { label: 'Latest' },
      } as FlowNode,
    ];
    view.rerender(<OpenCanvasShadowProjection />);
    act(() => vi.advanceTimersByTime(120));

    expect(details).toEqual([expect.objectContaining({ nodeCount: 2 })]);
    window.removeEventListener(OPEN_CANVAS_SHADOW_RESULT_EVENT, listener);
  });
});
