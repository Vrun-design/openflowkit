import { afterEach, describe, expect, it } from 'vitest';
import type { FlowNode, FlowTab } from '@/lib/types';
import { useFlowStore } from '@/store';
import { registerActiveCanvas, resetActiveCanvasForTests } from '@/canvas/activeCanvas';
import { captureActiveCanvas, CanvasCaptureError } from './activeCanvasCapture';

const nodes: FlowNode[] = [
  { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Hello' } },
];

function seedStore(withNodes: boolean): void {
  const tab: FlowTab = {
    id: 'page-1', name: 'Page 1', diagramType: 'flowchart',
    nodes: withNodes ? nodes : [], edges: [], history: { past: [], future: [] },
  };
  useFlowStore.setState({
    nodes: withNodes ? nodes : [], edges: [], tabs: [tab], activeTabId: tab.id,
    documents: [{ id: 'doc', name: 'Doc', tabs: [tab], activeTabId: tab.id }] as never,
    activeDocumentId: 'doc',
  });
}

afterEach(() => resetActiveCanvasForTests());

describe('captureActiveCanvas', () => {
  it('exports the canonical SVG when the OpenCanvas surface is active', async () => {
    seedStore(true);
    registerActiveCanvas({
      fitView: () => {}, zoomIn: () => {}, zoomOut: () => {}, setViewport: () => {},
      getViewport: () => ({ x: 0, y: 0, zoom: 1 }),
      screenToFlowPosition: (p) => p, flowToScreenPosition: (p) => p,
    });
    const dataUrl = await captureActiveCanvas([], null, 'svg');
    expect(dataUrl.startsWith('data:image/svg+xml')).toBe(true);
    const svg = decodeURIComponent(dataUrl.split(',')[1]);
    expect(svg).toContain('data-page="page-1"');
    expect(svg).toContain('Hello');
  });

  it('reports a readable error when React Flow is not mounted', async () => {
    seedStore(true);
    await expect(captureActiveCanvas(nodes, null, 'png')).rejects.toBeInstanceOf(CanvasCaptureError);
  });
});
