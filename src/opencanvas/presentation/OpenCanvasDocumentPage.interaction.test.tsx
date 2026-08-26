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
const setTransformPreview = vi.fn();
const setFreeformPreview = vi.fn();
const setMarquee = vi.fn();
const pickNodesInScreenBounds = vi.fn(() => ['node-1'] as readonly string[]);
const screenToWorld = vi.fn((point: { x: number; y: number }) => point);
const getContentBounds = vi.fn(() => null as null | {
  x: number; y: number; width: number; height: number;
});
const getSelectionWorldBounds = vi.fn(() => null as null | {
  x: number; y: number; width: number; height: number;
});
const setConnectorSelection = vi.fn();
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
    openCanvasA11yV1: true, openCanvasNodeInsertionV1: true,
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
    getContentBounds = getContentBounds;
    getSelectionWorldBounds = getSelectionWorldBounds;
    getViewportSize() { return { width: 800, height: 600 }; }
    getNodeScreenBounds() { return { x: 20, y: 30, width: 100, height: 50 }; }
    setCamera = setCamera;
    setSelection = setSelection;
    setConnectorSelection = setConnectorSelection;
    setConnectorPreview = setConnectorPreview;
    setFreeformPreview = setFreeformPreview;
    setMarquee = setMarquee;
    pickNodesInScreenBounds = pickNodesInScreenBounds;
    pickNode = pickNode;
    pickConnector() { return null; }
    pickConnectorHandle = pickConnectorHandle;
    pickTransformHandle() { return null; }
    screenToWorld = screenToWorld;
    setTransformPreview = setTransformPreview;
  },
}));

import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
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
    setFreeformPreview.mockClear();
    setMarquee.mockClear();
    pickNodesInScreenBounds.mockReset();
    pickNodesInScreenBounds.mockReturnValue(['node-1']);
    screenToWorld.mockReset();
    screenToWorld.mockImplementation((point) => point);
    setTransformPreview.mockClear();
    setConnectorSelection.mockClear();
    applyProductionNodeMutation.mockClear();
    getContentBounds.mockReset();
    getContentBounds.mockReturnValue(null);
    getSelectionWorldBounds.mockReset();
    getSelectionWorldBounds.mockReturnValue(null);
  });

  it('fits page/selection, resets zoom, and recalls previous view from controls', async () => {
    vi.stubGlobal('matchMedia', vi.fn(() => ({ matches: true })));
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
    getContentBounds.mockReturnValue({ x: 0, y: 0, width: 400, height: 200 });
    fireEvent.wheel(viewport, { clientX: 400, clientY: 300, deltaY: -200 });
    const zoomed = setCamera.mock.calls.at(-1)?.[0];

    fireEvent.click(screen.getByRole('button', { name: 'Fit page' }));
    expect(setCamera).toHaveBeenLastCalledWith({ x: 48, y: 124, zoom: 1.76 });
    expect(screen.getByRole('button', { name: 'Previous view' })).toBeEnabled();
    fireEvent.click(screen.getByRole('button', { name: 'Previous view' }));
    expect(setCamera).toHaveBeenLastCalledWith(zoomed);

    fireEvent.click(screen.getByRole('button', { name: '100%' }));
    expect(setCamera.mock.calls.at(-1)?.[0].zoom).toBe(1);

    fireEvent.pointerDown(viewport, { pointerId: 8, button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerUp(viewport, { pointerId: 8, button: 0, clientX: 20, clientY: 20 });
    getSelectionWorldBounds.mockReturnValue({ x: 10, y: 20, width: 100, height: 50 });
    fireEvent.keyDown(viewport, { key: '@', code: 'Digit2', shiftKey: true });
    expect(getSelectionWorldBounds).toHaveBeenCalled();
    expect(setCamera).toHaveBeenLastCalledWith({ x: 160, y: 120, zoom: 4 });
  });

  it('routes trackpad deltas to pan and supports Space-drag with Shift axis lock', async () => {
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
    fireEvent.wheel(viewport, {
      clientX: 100, clientY: 100, deltaX: 4, deltaY: 12, deltaMode: 0,
    });
    expect(setCamera).toHaveBeenLastCalledWith({ x: 60, y: 52, zoom: 1 });

    setSelection.mockClear();
    setTransformPreview.mockClear();
    fireEvent.keyDown(viewport, { code: 'Space', key: ' ' });
    fireEvent.pointerDown(viewport, { pointerId: 51, button: 0, clientX: 20, clientY: 20 });
    fireEvent.pointerMove(viewport, {
      pointerId: 51, button: 0, clientX: 60, clientY: 30, shiftKey: true,
    });
    fireEvent.pointerUp(viewport, { pointerId: 51, button: 0, clientX: 60, clientY: 30 });
    fireEvent.keyUp(viewport, { code: 'Space', key: ' ' });

    expect(setCamera).toHaveBeenLastCalledWith({ x: 100, y: 52, zoom: 1 });
    expect(setTransformPreview).not.toHaveBeenCalled();
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('routes touch pointers through pan, pinch, and jump-free single-touch handoff', async () => {
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
    const dispatchTouch = (
      type: string,
      pointerId: number,
      clientX: number,
      clientY: number,
      timeStamp: number
    ): void => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, {
        pointerType: { value: 'touch' },
        pointerId: { value: pointerId },
        button: { value: 0 },
        clientX: { value: clientX },
        clientY: { value: clientY },
        timeStamp: { value: timeStamp },
      });
      viewport.dispatchEvent(event);
    };

    setSelection.mockClear();
    dispatchTouch('pointerdown', 61, 100, 100, 10);
    dispatchTouch('pointermove', 61, 120, 100, 20);
    expect(setCamera).toHaveBeenLastCalledWith({ x: 84, y: 64, zoom: 1 });
    dispatchTouch('pointerdown', 62, 220, 100, 20);
    dispatchTouch('pointermove', 62, 320, 100, 30);
    expect(setCamera.mock.calls.at(-1)?.[0].zoom).toBe(2);

    const pinchedCamera = setCamera.mock.calls.at(-1)?.[0];
    dispatchTouch('pointerup', 62, 320, 100, 40);
    dispatchTouch('pointermove', 61, 140, 100, 50);
    expect(setCamera).toHaveBeenLastCalledWith({ ...pinchedCamera, x: pinchedCamera.x + 20 });
    expect(setSelection).not.toHaveBeenCalled();
  });

  it('edge-scrolls the camera and refreshes transform preview on the same frame', async () => {
    let frame: FrameRequestCallback | null = null;
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frame = callback;
        return 101;
      });
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
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
    setCamera.mockClear();
    setTransformPreview.mockClear();

    fireEvent.pointerDown(viewport, { pointerId: 64, button: 0, clientX: 40, clientY: 50 });
    fireEvent.pointerMove(viewport, {
      pointerId: 64, button: 0, clientX: 790, clientY: 300,
    });
    expect(requestFrame).toHaveBeenCalledTimes(1);
    const previewCountBeforeFrame = setTransformPreview.mock.calls.length;
    frame?.(performance.now() + 16);

    expect(setCamera.mock.calls.at(-1)?.[0].x).toBeLessThan(64);
    expect(setTransformPreview.mock.calls.length).toBeGreaterThan(previewCountBeforeFrame);
    fireEvent.pointerUp(viewport, { pointerId: 64, button: 0, clientX: 790, clientY: 300 });
    expect(cancelFrame).toHaveBeenCalledWith(101);
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });

  it('edge-scrolls an anchored marquee and commits its spatial selection', async () => {
    let frame: FrameRequestCallback | null = null;
    const requestFrame = vi.spyOn(globalThis, 'requestAnimationFrame')
      .mockImplementation((callback) => {
        frame = callback;
        return 102;
      });
    const cancelFrame = vi.spyOn(globalThis, 'cancelAnimationFrame').mockImplementation(() => {});
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
    pickNode.mockReturnValueOnce(null);
    pickNodesInScreenBounds.mockReturnValue(['node-1']);
    screenToWorld.mockImplementation((point) => ({ x: point.x - 64, y: point.y - 64 }));
    setCamera.mockClear();
    setSelection.mockClear();

    fireEvent.pointerDown(viewport, { pointerId: 65, button: 0, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(viewport, {
      pointerId: 65, button: 0, clientX: 790, clientY: 300,
    });
    expect(setMarquee).toHaveBeenCalledWith({ x: 100, y: 100, width: 690, height: 200 });
    frame?.(performance.now() + 16);
    expect(setCamera.mock.calls.at(-1)?.[0].x).toBeLessThan(64);
    expect(setMarquee.mock.calls.at(-1)?.[0].width).toBeGreaterThan(690);

    fireEvent.pointerUp(viewport, { pointerId: 65, button: 0, clientX: 790, clientY: 300 });
    expect(pickNodesInScreenBounds).toHaveBeenCalled();
    expect(setSelection).toHaveBeenCalledWith(['node-1'], 'node-1');
    expect(setMarquee).toHaveBeenLastCalledWith(null);
    expect(cancelFrame).toHaveBeenCalledWith(102);
    requestFrame.mockRestore();
    cancelFrame.mockRestore();
  });

  it('renders pointer prediction transiently and commits only confirmed freehand samples', async () => {
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
    fireEvent.click(screen.getByRole('button', { name: 'Draw pen' }));
    fireEvent.pointerDown(viewport, { pointerId: 41, button: 0, clientX: 10, clientY: 10 });

    const move = new Event('pointermove', { bubbles: true });
    Object.defineProperties(move, {
      pointerId: { value: 41 },
      clientX: { value: 20 },
      clientY: { value: 20 },
      getCoalescedEvents: { value: () => [{ clientX: 20, clientY: 20 }] },
      getPredictedEvents: { value: () => [{ clientX: 30, clientY: 30 }] },
    });
    viewport.dispatchEvent(move);

    expect(setFreeformPreview).toHaveBeenLastCalledWith(expect.objectContaining({
      confirmed: [{ x: 10, y: 10 }, { x: 20, y: 20 }],
      predicted: [{ x: 30, y: 30 }],
    }));
    fireEvent.pointerUp(viewport, { pointerId: 41, button: 0, clientX: 20, clientY: 20 });
    expect(setFreeformPreview).toHaveBeenLastCalledWith(null);
    expect(applyProductionNodeMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        kind: 'insert',
        node: expect.objectContaining({
          content: expect.objectContaining({
            points: [{ x: 0, y: 0 }, { x: 10, y: 10 }],
          }),
        }),
      }),
      expect.any(String)
    );
  });

  it('persists stylus pressure/tilt and rejects palm touch during pen drawing', async () => {
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
    const dispatchPointer = (
      type: string,
      values: Record<string, unknown>
    ): void => {
      const event = new Event(type, { bubbles: true });
      Object.defineProperties(event, Object.fromEntries(
        Object.entries(values).map(([key, value]) => [key, { value }])
      ));
      viewport.dispatchEvent(event);
    };

    fireEvent.click(screen.getByRole('button', { name: 'Draw pen' }));
    applyProductionNodeMutation.mockClear();
    setCamera.mockClear();
    dispatchPointer('pointerdown', {
      pointerId: 71, pointerType: 'pen', button: 0, clientX: 10, clientY: 10,
      pressure: 0.2, tiltX: 10, tiltY: -20, twist: 30,
    });
    dispatchPointer('pointerdown', {
      pointerId: 72, pointerType: 'touch', button: 0, clientX: 50, clientY: 50,
    });
    expect(setCamera).not.toHaveBeenCalled();
    dispatchPointer('pointermove', {
      pointerId: 71, pointerType: 'pen', clientX: 30, clientY: 30,
      pressure: 0.8, tiltX: 40, tiltY: -50, twist: 60,
      getCoalescedEvents: () => [{
        clientX: 30, clientY: 30, pressure: 0.8, tiltX: 40, tiltY: -50, twist: 60,
      }],
    });
    dispatchPointer('pointerup', {
      pointerId: 71, pointerType: 'pen', button: 0, clientX: 30, clientY: 30,
    });

    expect(applyProductionNodeMutation).toHaveBeenCalledWith(
      expect.anything(),
      expect.anything(),
      expect.objectContaining({
        kind: 'insert',
        node: expect.objectContaining({
          content: expect.objectContaining({
            inputSamples: [
              { pressure: 0.2, tiltX: 10, tiltY: -20, twist: 30 },
              { pressure: 0.8, tiltX: 40, tiltY: -50, twist: 60 },
            ],
          }),
        }),
      }),
      expect.any(String)
    );
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

  it('cancels an active transform exactly on Escape without committing', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    const viewport = await screen.findByTestId('opencanvas-document-viewport');
    const releasePointerCapture = vi.fn();
    Object.assign(viewport, {
      setPointerCapture: vi.fn(),
      hasPointerCapture: vi.fn(() => true),
      releasePointerCapture,
    });
    projectProductionTransform.mockClear();

    fireEvent.pointerDown(viewport, { pointerId: 30, button: 0, clientX: 40, clientY: 50 });
    fireEvent.pointerMove(viewport, { pointerId: 30, buttons: 1, clientX: 90, clientY: 80 });
    fireEvent.keyDown(viewport, { key: 'Escape' });

    expect(setTransformPreview).toHaveBeenLastCalledWith(null);
    expect(releasePointerCapture).toHaveBeenCalledWith(30);
    expect(projectProductionTransform).not.toHaveBeenCalled();
    expect(setSelection).toHaveBeenLastCalledWith([], null);
    expect(screen.getByText('Gesture canceled. Document unchanged.')).toBeInTheDocument();
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

  it('edits a selected node label in a camera-synchronized DOM overlay', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    await screen.findByTestId('opencanvas-document-viewport');
    const nodeButton = await screen.findByRole('button', { name: 'Select Node' });
    fireEvent.click(nodeButton);
    applyProductionNodeMutation.mockClear();

    fireEvent.keyDown(nodeButton, { key: 'F2' });
    const editor = screen.getByRole('textbox', { name: 'Edit node label' });
    expect(editor).toHaveStyle({ left: '20px', top: '30px', width: '100px', height: '50px' });
    fireEvent.change(editor, { target: { value: 'Renamed inline' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    expect(applyProductionNodeMutation).toHaveBeenCalledWith(
      expect.anything(),
      'page-1',
      { kind: 'rename', nodeId: 'node-1', label: 'Renamed inline' },
      expect.any(String)
    );
    expect(screen.queryByRole('textbox', { name: 'Edit node label' })).not.toBeInTheDocument();
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

    fireEvent.click(await screen.findByRole('button', { name: 'Inspector' }));
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

    fireEvent.click(await screen.findByRole('button', { name: 'Inspector' }));
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

  it('inserts any catalog family through the same node mutation bridge', async () => {
    render(
      <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
        <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
      </MemoryRouter>
    );
    applyProductionNodeMutation.mockClear();

    fireEvent.change(await screen.findByRole('combobox', { name: 'Node to insert' }), {
      target: { value: 'swimlane' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Insert node' }));

    const mutation = applyProductionNodeMutation.mock.calls[0][2] as {
      kind: string; node: { kind: string; size: { width: number } };
    };
    expect(mutation.kind).toBe('insert');
    expect(mutation.node.kind).toBe('swimlane');
    expect(mutation.node.size.width).toBe(640);
  });

  it('hides the insertion catalog when its flag is off', async () => {
    ROLLOUT_FLAGS.openCanvasNodeInsertionV1 = false;
    try {
      render(
        <MemoryRouter initialEntries={['/flow/document-1?renderer=opencanvas']}>
          <Routes><Route path="/flow/:flowId" element={<OpenCanvasDocumentPage />} /></Routes>
        </MemoryRouter>
      );
      expect(await screen.findByRole('button', { name: 'Add process node' })).toBeTruthy();
      expect(screen.queryByRole('combobox', { name: 'Node to insert' })).toBeNull();
      expect(screen.queryByRole('button', { name: 'Insert node' })).toBeNull();
    } finally {
      ROLLOUT_FLAGS.openCanvasNodeInsertionV1 = true;
    }
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
