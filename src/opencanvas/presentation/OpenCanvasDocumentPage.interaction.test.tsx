import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setCamera = vi.fn();
const setSelection = vi.fn();
const pickNode = vi.fn(() => 'node-1');
const pickConnectorHandle = vi.fn(() => null as null | {
  kind: 'waypoint'; index: number; point: { x: number; y: number };
});
const setConnectorPreview = vi.fn();
const setNodes = vi.fn();
const setEdges = vi.fn();
const setGraph = vi.fn();
const setGraphAndLayers = vi.fn();
const replacePageWorkspace = vi.fn();
const recordHistoryV2 = vi.fn();
const undoV2 = vi.fn();
const redoV2 = vi.fn();

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    openCanvasConnectorsV1: true, openCanvasNodeLayoutV1: true,
    openCanvasBasicNodesV1: true, openCanvasFreeformNodesV1: true,
    openCanvasArchitectureNodesV1: true, openCanvasContainerNodesV1: true,
    openCanvasClassEntityNodesV1: true, openCanvasMindmapJourneyNodesV1: true,
    openCanvasSequenceNodesV1: true, openCanvasWireframeNodesV1: true,
    openCanvasA11yV1: true,
  },
}));
const { projectProductionTransform } = vi.hoisted(() => ({
  projectProductionTransform: vi.fn((..._args: unknown[]) => ({ nodes: [{ id: 'node-1' }] })),
}));
const { projectProductionConnectorEdit } = vi.hoisted(() => ({
  projectProductionConnectorEdit: vi.fn((..._args: unknown[]) => ({
    changed: true,
    projection: { edges: [{ id: 'edge-1', target: 'node-1' }] },
  })),
}));
const { applyProductionNodeMutation } = vi.hoisted(() => ({
  applyProductionNodeMutation: vi.fn((...args: unknown[]) => {
    const mutation = args[2] as { kind: string; nodeId?: string };
    return {
      changed: true,
      selectedNodeId: mutation.kind === 'delete' ? null : mutation.nodeId ?? 'new-node',
      projection: { nodes: [{ id: 'updated-node' }], edges: [{ id: 'edge-1' }] },
    };
  }),
}));

vi.mock('../application/active-document/productionTransformBridge', () => ({
  projectProductionTransform,
}));
vi.mock('../application/active-document/productionConnectorBridge', () => ({
  projectProductionConnectorEdit,
}));
vi.mock('../application/active-document/productionNodeBridge', async (importOriginal) => {
  const original = await importOriginal<typeof import('../application/active-document/productionNodeBridge')>();
  return { ...original, applyProductionNodeMutation };
});

vi.mock('@/store', () => ({
  useFlowStore: (selector: (state: Record<string, unknown>) => unknown) => selector({
    nodes: [], edges: [], documents: [], activeDocumentId: 'document-1', tabs: [], activeTabId: 'page-1',
    layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
    setNodes, setEdges, setGraph, setGraphAndLayers, replacePageWorkspace,
    setActiveTabId: vi.fn(), recordHistoryV2, undoV2, redoV2,
    canUndoV2: () => true, canRedoV2: () => true,
  }),
}));
vi.mock('../application/active-document/activeDocumentProjection', () => ({
  projectActiveDocument: () => ({
    status: 'ready',
    document: { pages: [{
      id: 'page-1',
      name: 'Page 1', diagramKind: 'flowchart', metadata: {}, extensions: {},
      layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
      nodes: [{
        id: 'node-1', kind: 'process', parentId: null, layerId: 'default', zIndex: 0,
        transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        size: { width: 100, height: 50 }, content: { label: 'Node' }, appearance: {},
        ports: [], metadata: {}, extensions: {},
      }],
      connectors: [{
        id: 'edge-1',
        source: { nodeId: 'node-1', portId: null, anchor: null },
        target: { nodeId: 'node-1', portId: null, anchor: null },
        route: { kind: 'polyline', ownership: 'manual' },
        waypoints: [{ x: 50, y: 25 }],
        labels: [{ id: 'label', text: 'loops', pathRatio: 0.5, offset: { x: 0, y: 0 }, metadata: {} }],
        appearance: {}, semantics: {}, metadata: {}, extensions: {},
      }],
    }] },
  }),
}));
vi.mock('../infrastructure/pixi/capabilities', () => ({
  detectWebGlCapability: () => ({ supported: true, version: 2, reason: null }),
}));
vi.mock('../infrastructure/pixi/PixiRendererHost', () => ({
  PixiRendererHost: class {
    private readonly onStatusChange?: (status: string) => void;
    constructor(options: { onStatusChange?: (status: string) => void }) {
      this.onStatusChange = options.onStatusChange;
    }
    async mount(container: HTMLElement) {
      const canvas = document.createElement('canvas');
      container.appendChild(canvas);
      this.onStatusChange?.('ready');
      return canvas;
    }
    destroy() {}
    resize() {}
    setPage() {}
    getContentBounds() { return null; }
    getViewportSize() { return { width: 800, height: 600 }; }
    setCamera = setCamera;
    setSelection = setSelection;
    setConnectorSelection() {}
    setConnectorPreview = setConnectorPreview;
    pickNode = pickNode;
    pickConnector() { return null; }
    pickConnectorHandle = pickConnectorHandle;
    pickTransformHandle() { return null; }
    screenToWorld(point: { x: number; y: number }) { return point; }
    setTransformPreview() {}
  },
}));

import { OpenCanvasDocumentPage } from './OpenCanvasDocumentPage';

describe('OpenCanvas production canary interaction', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    setCamera.mockClear();
    setSelection.mockClear();
    pickNode.mockClear();
    pickConnectorHandle.mockReset();
    pickConnectorHandle.mockReturnValue(null);
    setConnectorPreview.mockClear();
  });

  it('selects a picked node, supports additive toggle, and clears with Escape', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    const viewport = await screen.findByTestId('opencanvas-document-viewport');
    Object.assign(viewport, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    });
    await waitFor(() => expect(screen.getByText(/· ready · write canary/)).toBeInTheDocument());

    fireEvent.pointerDown(viewport, { pointerId: 1, button: 0, clientX: 40, clientY: 50 });
    fireEvent.pointerUp(viewport, { pointerId: 1, button: 0, clientX: 40, clientY: 50 });
    expect(setSelection).toHaveBeenLastCalledWith(['node-1'], 'node-1');
    expect(screen.getByText('1 node selected.')).toBeInTheDocument();

    fireEvent.pointerDown(viewport, { pointerId: 2, button: 0, clientX: 40, clientY: 50, shiftKey: true });
    fireEvent.pointerUp(viewport, { pointerId: 2, button: 0, clientX: 40, clientY: 50 });
    expect(setSelection).toHaveBeenLastCalledWith([], null);

    fireEvent.keyDown(viewport, { key: 'Escape' });
    expect(screen.getByText('Canvas selection cleared.')).toBeInTheDocument();
  });

  it('applies pointer-anchored wheel zoom to the renderer host', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    const viewport = await screen.findByTestId('opencanvas-document-viewport');
    await waitFor(() => expect(screen.getByText(/· ready · write canary/)).toBeInTheDocument());
    setCamera.mockClear();
    fireEvent.wheel(viewport, { clientX: 100, clientY: 100, deltaY: -240 });
    expect(setCamera).toHaveBeenCalledTimes(1);
    expect(setCamera.mock.calls[0][0].zoom).toBeGreaterThan(1);
  });

  it('records history and writes projected nodes after a canonical drag transform', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    const viewport = await screen.findByTestId('opencanvas-document-viewport');
    Object.assign(viewport, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    });
    await waitFor(() => expect(screen.getByText(/· ready · write canary/)).toBeInTheDocument());
    setNodes.mockClear();
    recordHistoryV2.mockClear();
    projectProductionTransform.mockClear();

    fireEvent.pointerDown(viewport, { pointerId: 3, button: 0, clientX: 40, clientY: 50 });
    fireEvent.pointerMove(viewport, { pointerId: 3, buttons: 1, clientX: 90, clientY: 80 });
    fireEvent.pointerUp(viewport, { pointerId: 3, button: 0, clientX: 90, clientY: 80 });

    expect(projectProductionTransform).toHaveBeenCalledTimes(1);
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setNodes).toHaveBeenCalledWith([{ id: 'node-1' }]);
  });

  it('exposes semantic nodes and commits keyboard nudges through the same bridge', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    await screen.findByTestId('opencanvas-document-viewport');
    const nodeButton = await screen.findByRole('button', { name: 'Select Node' });
    fireEvent.click(nodeButton);
    projectProductionTransform.mockClear();
    setNodes.mockClear();
    recordHistoryV2.mockClear();

    fireEvent.keyDown(nodeButton, { key: 'ArrowRight', shiftKey: true });

    expect(projectProductionTransform).toHaveBeenCalledTimes(1);
    const result = projectProductionTransform.mock.calls[0][2] as {
      nodes: { transform: { translation: { x: number } } }[];
    };
    expect(result.nodes[0].transform.translation.x).toBe(10);
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setNodes).toHaveBeenCalledTimes(1);
  });

  it('commits a canonical connector-handle edit into store history', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    const viewport = await screen.findByTestId('opencanvas-document-viewport');
    Object.assign(viewport, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture: vi.fn(),
    });
    fireEvent.click(await screen.findByRole('button', { name: 'Select connector loops' }));
    pickConnectorHandle.mockReturnValue({ kind: 'waypoint', index: 0, point: { x: 50, y: 25 } });
    projectProductionConnectorEdit.mockClear();
    recordHistoryV2.mockClear();
    setEdges.mockClear();

    fireEvent.pointerDown(viewport, { pointerId: 4, button: 0, clientX: 50, clientY: 25 });
    fireEvent.pointerMove(viewport, { pointerId: 4, buttons: 1, clientX: 80, clientY: 45 });
    fireEvent.pointerUp(viewport, { pointerId: 4, button: 0, clientX: 80, clientY: 45 });

    expect(setConnectorPreview).toHaveBeenCalled();
    expect(projectProductionConnectorEdit).toHaveBeenCalledTimes(1);
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setEdges).toHaveBeenCalledWith([{ id: 'edge-1', target: 'node-1' }]);
  });

  it('exposes a keyboard-accessible connector route reset', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    projectProductionConnectorEdit.mockClear();
    recordHistoryV2.mockClear();
    setEdges.mockClear();

    fireEvent.click(await screen.findByRole('button', { name: 'Reset route for connector loops' }));

    expect(projectProductionConnectorEdit).toHaveBeenCalledTimes(1);
    const after = projectProductionConnectorEdit.mock.calls[0][3] as {
      route: { ownership: string };
      waypoints: unknown[];
    };
    expect(after.route.ownership).toBe('automatic');
    expect(after.waypoints).toEqual([]);
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setEdges).toHaveBeenCalledTimes(1);
  });

  it('renames and cascade-deletes nodes through an atomic graph write', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    applyProductionNodeMutation.mockClear();
    recordHistoryV2.mockClear();
    setGraph.mockClear();

    const labelInput = await screen.findByRole('textbox', { name: 'Label for Node' });
    fireEvent.change(labelInput, { target: { value: 'Renamed node' } });
    fireEvent.click(screen.getByRole('button', { name: 'Rename Node' }));
    expect(applyProductionNodeMutation.mock.calls[0][2]).toEqual({
      kind: 'rename', nodeId: 'node-1', label: 'Renamed node',
    });
    expect(setGraph).toHaveBeenLastCalledWith([{ id: 'updated-node' }], [{ id: 'edge-1' }]);

    fireEvent.click(screen.getByRole('button', { name: 'Delete Node' }));
    expect(applyProductionNodeMutation.mock.calls[1][2]).toEqual({
      kind: 'delete', nodeId: 'node-1',
    });
    expect(recordHistoryV2).toHaveBeenCalledTimes(2);
    expect(setGraph).toHaveBeenCalledTimes(2);
  });

  it('exposes production undo and redo through buttons and keyboard shortcuts', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    undoV2.mockClear();
    redoV2.mockClear();
    fireEvent.click(await screen.findByRole('button', { name: 'Undo' }));
    fireEvent.click(screen.getByRole('button', { name: 'Redo' }));
    const viewport = screen.getByTestId('opencanvas-document-viewport');
    fireEvent.keyDown(viewport, { key: 'z', ctrlKey: true });
    fireEvent.keyDown(viewport, { key: 'z', ctrlKey: true, shiftKey: true });
    expect(undoV2).toHaveBeenCalledTimes(2);
    expect(redoV2).toHaveBeenCalledTimes(2);
  });

  it('keeps semantic focus in the scene during spatial keyboard navigation', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    const node = await screen.findByRole('button', { name: 'Select Node' });
    node.focus();
    fireEvent.keyDown(node, { key: 'ArrowRight' });
    expect(node).toHaveFocus();
    expect(setSelection).toHaveBeenLastCalledWith(['node-1'], 'node-1');
  });
});
