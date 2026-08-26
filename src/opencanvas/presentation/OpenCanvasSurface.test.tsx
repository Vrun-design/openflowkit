import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const setCamera = vi.fn();
const setPage = vi.fn();
const resize = vi.fn();
const destroy = vi.fn();
const setSelection = vi.fn();
const setMarquee = vi.fn();
const pickNode = vi.fn((): string | null => null);
const pickNodesInScreenBounds = vi.fn((): readonly string[] => []);
const screenToWorld = vi.fn((point: { x: number; y: number }) => point);
const setNodes = vi.fn();
const setSelectedNodeId = vi.fn();
const getContentBounds = vi.fn(() => null as null | {
  x: number; y: number; width: number; height: number;
});
const mount = vi.fn(async () => document.createElement('canvas'));
const constructed: { onStatusChange?: (status: string) => void }[] = [];

vi.mock('@/config/rolloutFlags', () => ({
  ROLLOUT_FLAGS: {
    openCanvasConnectorsV1: true, openCanvasNodeLayoutV1: true,
    openCanvasBasicNodesV1: true, openCanvasFreeformNodesV1: true,
    openCanvasArchitectureNodesV1: true, openCanvasContainerNodesV1: true,
    openCanvasClassEntityNodesV1: true, openCanvasMindmapJourneyNodesV1: true,
    openCanvasSequenceNodesV1: true, openCanvasWireframeNodesV1: true,
  },
}));

const { detectWebGlCapability } = vi.hoisted(() => ({
  detectWebGlCapability: vi.fn(() => ({ supported: true })),
}));
vi.mock('../infrastructure/pixi/capabilities', () => ({ detectWebGlCapability }));

const { projectActiveDocument } = vi.hoisted(() => ({
  projectActiveDocument: vi.fn((): unknown => ({
    status: 'ready',
    document: {
      id: 'doc',
      pages: [{ id: 'page-1', nodes: [], connectors: [], layers: [] }],
    },
  })),
}));
vi.mock('../application/active-document/activeDocumentProjection', () => ({
  projectActiveDocument,
}));

const storeNodes = [
  { id: 'node-1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'One' } },
  { id: 'node-2', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Two' } },
];

vi.mock('@/store', () => ({
  useFlowStore: (selector: (state: unknown) => unknown) => selector({
    nodes: storeNodes,
    edges: [], documents: [{ id: 'doc' }], activeDocumentId: 'doc',
    tabs: [{ id: 'page-1' }], activeTabId: 'page-1', layers: [],
    setNodes, setSelectedNodeId,
  }),
}));

vi.mock('../infrastructure/pixi/PixiRendererHost', () => ({
  PixiRendererHost: class {
    constructor(options: { onStatusChange?: (status: string) => void }) {
      constructed.push(options);
      queueMicrotask(() => options.onStatusChange?.('ready'));
    }
    mount = mount;
    destroy = destroy;
    resize = resize;
    setPage = setPage;
    setCamera = setCamera;
    setSelection = setSelection;
    setMarquee = setMarquee;
    pickNode = pickNode;
    pickNodesInScreenBounds = pickNodesInScreenBounds;
    screenToWorld = screenToWorld;
    getContentBounds = getContentBounds;
    getViewportSize() { return { width: 800, height: 600 }; }
  },
}));

import { DEFAULT_CANVAS_CAMERA } from '../domain/camera/camera';
import { OpenCanvasSurface } from './OpenCanvasSurface';

const FALLBACK = <div data-testid="react-flow-fallback" />;

describe('OpenCanvas editor surface', () => {
  beforeEach(() => {
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    constructed.length = 0;
    [setCamera, setPage, resize, destroy, mount, setSelection, setMarquee,
      setNodes, setSelectedNodeId].forEach((spy) => spy.mockClear());
    pickNode.mockReset();
    pickNode.mockReturnValue(null);
    pickNodesInScreenBounds.mockReset();
    pickNodesInScreenBounds.mockReturnValue([]);
    screenToWorld.mockReset();
    // A true inverse of the fitted camera, so marquee bounds anchored in world
    // space come back as the screen rectangle the pointer actually swept.
    screenToWorld.mockImplementation((point) => ({
      x: (point.x - DEFAULT_CANVAS_CAMERA.x) / DEFAULT_CANVAS_CAMERA.zoom,
      y: (point.y - DEFAULT_CANVAS_CAMERA.y) / DEFAULT_CANVAS_CAMERA.zoom,
    }));
    mount.mockImplementation(async () => document.createElement('canvas'));
    detectWebGlCapability.mockReturnValue({ supported: true });
    getContentBounds.mockReturnValue(null);
    projectActiveDocument.mockReturnValue({
      status: 'ready',
      document: { id: 'doc', pages: [{ id: 'page-1', nodes: [], connectors: [], layers: [] }] },
    });
  });

  it('draws the projected active page and fits the camera once', async () => {
    getContentBounds.mockReturnValue({ x: 0, y: 0, width: 400, height: 300 });
    render(<OpenCanvasSurface fallback={FALLBACK} />);

    expect(screen.getByTestId('opencanvas-surface')).toBeTruthy();
    expect(screen.queryByTestId('react-flow-fallback')).toBeNull();
    await waitFor(() => expect(setPage).toHaveBeenCalled());
    expect(setPage.mock.calls[0][0]).toMatchObject({ id: 'page-1' });
    expect(setCamera).toHaveBeenCalled();
    expect(constructed[0]).toMatchObject({ basicNodesEnabled: true, wireframeNodesEnabled: true });
  });

  it('renders the React Flow fallback when WebGL is unavailable', () => {
    detectWebGlCapability.mockReturnValue({ supported: false });
    render(<OpenCanvasSurface fallback={FALLBACK} />);
    expect(screen.getByTestId('react-flow-fallback')).toBeTruthy();
    expect(screen.queryByTestId('opencanvas-surface')).toBeNull();
    expect(constructed).toHaveLength(0);
  });

  it('renders the React Flow fallback when the canonical projection is invalid', () => {
    projectActiveDocument.mockReturnValue({
      status: 'invalid', code: 'CANONICAL_PROJECTION_FAILED',
    });
    render(<OpenCanvasSurface fallback={FALLBACK} />);
    expect(screen.getByTestId('react-flow-fallback')).toBeTruthy();
    expect(constructed).toHaveLength(0);
  });

  it('falls back and destroys the host when the renderer fails to mount', async () => {
    mount.mockImplementation(async () => { throw new Error('no context'); });
    render(<OpenCanvasSurface fallback={FALLBACK} />);
    await waitFor(() => expect(screen.getByTestId('react-flow-fallback')).toBeTruthy());
    expect(destroy).toHaveBeenCalled();
  });

  it('falls back and destroys the host when the WebGL context is lost', async () => {
    render(<OpenCanvasSurface fallback={FALLBACK} />);
    await waitFor(() => expect(constructed).toHaveLength(1));
    constructed[0].onStatusChange?.('context-lost');
    await waitFor(() => expect(screen.getByTestId('react-flow-fallback')).toBeTruthy());
    expect(destroy).toHaveBeenCalled();
  });

  it('pans on middle-drag and zooms on wheel through the host camera', async () => {
    render(<OpenCanvasSurface fallback={FALLBACK} />);
    const surface = screen.getByTestId('opencanvas-surface');
    surface.setPointerCapture = vi.fn();
    await waitFor(() => expect(setPage).toHaveBeenCalled());

    const before = setCamera.mock.calls.at(-1)?.[0] ?? DEFAULT_CANVAS_CAMERA;
    fireEvent.pointerDown(surface, { pointerId: 1, button: 1, clientX: 100, clientY: 100 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 160, clientY: 140 });
    expect(setCamera.mock.calls.at(-1)?.[0]).toMatchObject({
      x: before.x + 60, y: before.y + 40,
    });

    fireEvent.pointerUp(surface, { pointerId: 1 });
    setCamera.mockClear();
    fireEvent.wheel(surface, { clientX: 0, clientY: 0, deltaY: -120 });
    expect(setCamera.mock.calls.at(-1)?.[0].zoom).toBeGreaterThan(1);
  });

  async function mounted() {
    render(<OpenCanvasSurface fallback={FALLBACK} />);
    const surface = screen.getByTestId('opencanvas-surface');
    surface.setPointerCapture = vi.fn();
    await waitFor(() => expect(setPage).toHaveBeenCalled());
    setSelection.mockClear();
    setNodes.mockClear();
    setSelectedNodeId.mockClear();
    return surface;
  }

  it('selects a clicked node in the renderer and in the store', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    expect(setSelection).toHaveBeenLastCalledWith(['node-1'], 'node-1');
    expect(setNodes.mock.calls.at(-1)?.[0].map((node: { selected?: boolean }) =>
      Boolean(node.selected))).toEqual([true, false]);
    expect(setSelectedNodeId).toHaveBeenLastCalledWith('node-1');
  });

  it('adds to the selection on shift-click and toggles the same node back out', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    pickNode.mockReturnValue('node-2');
    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 20, clientY: 20, shiftKey: true });
    expect(setSelection).toHaveBeenLastCalledWith(['node-1', 'node-2'], 'node-2');

    fireEvent.pointerDown(surface, { pointerId: 3, button: 0, clientX: 20, clientY: 20, metaKey: true });
    expect(setSelection).toHaveBeenLastCalledWith(['node-1'], 'node-1');
  });

  it('marquee-selects swept nodes and clears the overlay on release', async () => {
    pickNodesInScreenBounds.mockReturnValue(['node-1', 'node-2']);
    const surface = await mounted();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 120, clientY: 90 });
    expect(setMarquee.mock.calls.at(-1)?.[0]).toMatchObject({ width: 120, height: 90 });

    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 120, clientY: 90 });
    expect(setMarquee).toHaveBeenLastCalledWith(null);
    expect(setSelection).toHaveBeenLastCalledWith(['node-1', 'node-2'], 'node-2');
  });

  it('clears the selection on an empty click and on Escape', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });

    pickNode.mockReturnValue(null);
    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 40, clientY: 40 });
    fireEvent.pointerUp(surface, { pointerId: 2, clientX: 40, clientY: 40 });
    expect(setSelection).toHaveBeenLastCalledWith([], null);
    expect(setSelectedNodeId).toHaveBeenLastCalledWith(null);

    pickNode.mockReturnValue('node-2');
    fireEvent.pointerDown(surface, { pointerId: 3, button: 0, clientX: 10, clientY: 10 });
    expect(setSelection).toHaveBeenLastCalledWith(['node-2'], 'node-2');
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setSelection).toHaveBeenLastCalledWith([], null);
  });

  it('pans instead of selecting while Space is held', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.keyDown(window, { code: 'Space' });
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 70, clientY: 50 });
    expect(setSelection).not.toHaveBeenCalled();
    expect(setCamera).toHaveBeenCalled();
    fireEvent.keyUp(window, { code: 'Space' });
  });

  it('restates the selection after the page is rebuilt', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    setSelection.mockClear();
    fireEvent.wheel(surface, { clientX: 0, clientY: 0, deltaY: -120 });
    await waitFor(() => expect(setPage).toHaveBeenCalled());
    expect(setSelection.mock.calls.every(([ids]) => ids.length === 1)).toBe(true);
  });
});
