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
const pickTransformHandle = vi.fn((): string | null => null);
const setTransformPreview = vi.fn();
const recordHistoryV2 = vi.fn();
const pickConnector = vi.fn((): string | null => null);
const pickConnectorHandle = vi.fn((): unknown => null);
const setConnectorSelection = vi.fn();
const setConnectorPreview = vi.fn();
const getNodeScreenBounds = vi.fn((): unknown => ({ x: 10, y: 20, width: 160, height: 60 }));
const setGraph = vi.fn();
const setEdges = vi.fn();
const setSelectedEdgeId = vi.fn();
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

const { projectProductionTransform } = vi.hoisted(() => ({
  projectProductionTransform: vi.fn(() => ({ nodes: [{ id: 'moved' }] })),
}));
vi.mock('../application/active-document/productionTransformBridge', () => ({
  projectProductionTransform,
}));

const { applyProductionNodeMutation } = vi.hoisted(() => ({
  applyProductionNodeMutation: vi.fn((..._args: unknown[]) => ({
    changed: true, selectedNodeId: 'node-1',
    projection: { nodes: [{ id: 'renamed' }], edges: [] },
  })),
}));
vi.mock('../application/active-document/productionNodeBridge', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  applyProductionNodeMutation,
}));

const { projectProductionConnectorEdit } = vi.hoisted(() => ({
  projectProductionConnectorEdit: vi.fn(() => ({
    changed: true, projection: { edges: [{ id: 'rerouted' }] },
  })),
}));
vi.mock('../application/active-document/productionConnectorBridge', async (original) => ({
  ...(await original<Record<string, unknown>>()),
  projectProductionConnectorEdit,
}));

const { detectWebGlCapability } = vi.hoisted(() => ({
  detectWebGlCapability: vi.fn(() => ({ supported: true })),
}));
vi.mock('../infrastructure/pixi/capabilities', () => ({ detectWebGlCapability }));

const { projectActiveDocument } = vi.hoisted(() => ({
  projectActiveDocument: vi.fn((): unknown => ({
    status: 'ready',
    document: { id: 'doc', pages: [scenePage] },
  })),
}));
vi.mock('../application/active-document/activeDocumentProjection', () => ({
  projectActiveDocument,
}));

const scenePage = {
  id: 'page-1',
  name: 'Page',
  diagramKind: 'flowchart',
  layers: [{ id: 'default', name: 'Default', visible: true, locked: false }],
  nodes: [
    createProductionSceneNode('process', 'node-1', { x: 0, y: 0 }, 'default'),
    createProductionSceneNode('process', 'node-2', { x: 400, y: 0 }, 'default'),
  ],
  connectors: [createProductionConnector('edge-1', 'node-1', 'node-2')],
  extensions: {},
};

const storeNodes = [
  { id: 'node-1', type: 'process', position: { x: 0, y: 0 }, data: { label: 'One' } },
  { id: 'node-2', type: 'process', position: { x: 0, y: 0 }, data: { label: 'Two' } },
];

vi.mock('@/store', () => ({
  useFlowStore: (selector: (state: unknown) => unknown) => selector({
    nodes: storeNodes,
    edges: [], documents: [{ id: 'doc' }], activeDocumentId: 'doc',
    tabs: [{ id: 'page-1' }], activeTabId: 'page-1', layers: [],
    setNodes, setSelectedNodeId, recordHistoryV2, setEdges, setSelectedEdgeId, setGraph,
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
    pickTransformHandle = pickTransformHandle;
    setTransformPreview = setTransformPreview;
    pickConnector = pickConnector;
    pickConnectorHandle = pickConnectorHandle;
    setConnectorSelection = setConnectorSelection;
    setConnectorPreview = setConnectorPreview;
    getNodeScreenBounds = getNodeScreenBounds;
    getContentBounds = getContentBounds;
    getViewportSize() { return { width: 800, height: 600 }; }
  },
}));

import { DEFAULT_CANVAS_CAMERA } from '../domain/camera/camera';
import { createProductionSceneNode } from '../application/active-document/productionNodeCatalog';
import { createProductionConnector } from '../application/active-document/productionConnectorBridge';
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
      setNodes, setSelectedNodeId, setTransformPreview, recordHistoryV2,
      setConnectorSelection, setConnectorPreview, setEdges, setSelectedEdgeId, setGraph,
    ].forEach((spy) => spy.mockClear());
    getNodeScreenBounds.mockReset();
    getNodeScreenBounds.mockReturnValue({ x: 10, y: 20, width: 160, height: 60 });
    applyProductionNodeMutation.mockClear();
    applyProductionNodeMutation.mockReturnValue({
      changed: true, selectedNodeId: 'node-1',
      projection: { nodes: [{ id: 'renamed' }], edges: [] },
    });
    pickConnector.mockReset();
    pickConnector.mockReturnValue(null);
    pickConnectorHandle.mockReset();
    pickConnectorHandle.mockReturnValue(null);
    pickTransformHandle.mockReset();
    pickTransformHandle.mockReturnValue(null);
    projectProductionTransform.mockClear();
    projectProductionTransform.mockReturnValue({ nodes: [{ id: 'moved' }] });
    projectProductionConnectorEdit.mockClear();
    projectProductionConnectorEdit.mockReturnValue({
      changed: true, projection: { edges: [{ id: 'rerouted' }] },
    });
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
      document: { id: 'doc', pages: [scenePage] },
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
    expect(setSelection).toHaveBeenLastCalledWith(['node-1', 'node-2'], 'node-2');
    fireEvent.pointerUp(surface, { pointerId: 3, clientX: 20, clientY: 20 });
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
    fireEvent.pointerUp(surface, { pointerId: 3, clientX: 10, clientY: 10 });
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

  it('commits a drag as one move transform with a single history entry', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 90, clientY: 70 });
    expect(setTransformPreview.mock.calls.at(-1)?.[0]).not.toBeNull();

    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 90, clientY: 70 });
    expect(projectProductionTransform).toHaveBeenCalledTimes(1);
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setNodes).toHaveBeenLastCalledWith([{ id: 'moved' }]);
    expect(setTransformPreview).toHaveBeenLastCalledWith(null);
  });

  it('resizes from a transform handle and rotates from the rotate handle', async () => {
    pickTransformHandle.mockReturnValue('bottom-right');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    // No node was picked, so the handle drag acts on the existing selection only.
    expect(pickNode).not.toHaveBeenCalled();

    pickNode.mockReturnValue('node-1');
    pickTransformHandle.mockReturnValue(null);
    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(surface, { pointerId: 2, clientX: 10, clientY: 10 });

    pickTransformHandle.mockReturnValue('rotate');
    fireEvent.pointerDown(surface, { pointerId: 3, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { pointerId: 3, clientX: 200, clientY: 200 });
    const preview = setTransformPreview.mock.calls.at(-1)?.[0];
    expect(preview?.nodes?.[0]?.transform?.rotationRadians).not.toBe(0);
  });

  it('suppresses snapping while Alt is held', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 7, clientY: 0, altKey: true });
    const unsnapped = setTransformPreview.mock.calls.at(-1)?.[0];
    expect(unsnapped?.nodes[0].transform.translation.x).toBe(7);

    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 7, clientY: 0 });
    const snapped = setTransformPreview.mock.calls.at(-1)?.[0];
    expect(snapped?.nodes[0].transform.translation.x).not.toBe(7);
  });

  it('cancels a drag exactly on Escape without committing or recording history', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 90, clientY: 70 });
    fireEvent.keyDown(window, { key: 'Escape' });

    expect(setTransformPreview).toHaveBeenLastCalledWith(null);
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 90, clientY: 70 });
    expect(projectProductionTransform).not.toHaveBeenCalled();
    expect(recordHistoryV2).not.toHaveBeenCalled();
    // The selection write on press is expected; the transform write is not.
    expect(setNodes).not.toHaveBeenCalledWith([{ id: 'moved' }]);
  });

  it('writes nothing when a press produces no movement', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(projectProductionTransform).not.toHaveBeenCalled();
    expect(recordHistoryV2).not.toHaveBeenCalled();
  });

  it('falls back to React Flow when a transform commit throws', async () => {
    pickNode.mockReturnValue('node-1');
    projectProductionTransform.mockImplementation(() => { throw new Error('rejected'); });
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 90, clientY: 70 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 90, clientY: 70 });

    await waitFor(() => expect(screen.getByTestId('react-flow-fallback')).toBeTruthy());
    expect(recordHistoryV2).not.toHaveBeenCalled();
  });

  async function withSelectedConnector(surface: HTMLElement) {
    pickConnector.mockReturnValue('edge-1');
    fireEvent.pointerDown(surface, { pointerId: 9, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerUp(surface, { pointerId: 9, clientX: 50, clientY: 50 });
    pickConnector.mockReturnValue(null);
  }

  it('selects a clicked connector and clears the node selection', async () => {
    const surface = await mounted();
    await withSelectedConnector(surface);

    expect(setConnectorSelection).toHaveBeenLastCalledWith('edge-1', null);
    expect(setSelectedEdgeId).toHaveBeenLastCalledWith('edge-1');
    expect(setSelection).toHaveBeenLastCalledWith([], null);
  });

  it('clears the connector selection when a node is clicked', async () => {
    const surface = await mounted();
    await withSelectedConnector(surface);
    setSelectedEdgeId.mockClear();

    pickNode.mockReturnValue('node-1');
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    expect(setSelectedEdgeId).toHaveBeenLastCalledWith(null);
  });

  it('does not pick a handle while no connector is selected', async () => {
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    expect(pickConnectorHandle).not.toHaveBeenCalled();
  });

  it('reroutes a waypoint handle and commits once with one history entry', async () => {
    const surface = await mounted();
    await withSelectedConnector(surface);
    pickConnectorHandle.mockReturnValue({ kind: 'waypoint', index: 0, point: { x: 0, y: 0 } });
    recordHistoryV2.mockClear();

    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 120, clientY: 90 });
    expect(setConnectorPreview.mock.calls.at(-1)?.[0]).toBeTruthy();

    fireEvent.pointerUp(surface, { pointerId: 2, clientX: 120, clientY: 90 });
    expect(projectProductionConnectorEdit).toHaveBeenCalledTimes(1);
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setEdges).toHaveBeenLastCalledWith([{ id: 'rerouted' }]);
    expect(setConnectorPreview).toHaveBeenLastCalledWith(null);
  });

  it('reconnects an endpoint to the node under the pointer and leaves it alone over empty space', async () => {
    const surface = await mounted();
    await withSelectedConnector(surface);
    pickConnectorHandle.mockReturnValue({ kind: 'endpoint', role: 'target' });

    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 50, clientY: 50 });
    pickNode.mockReturnValue('node-1');
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 60, clientY: 60 });
    expect(setConnectorPreview.mock.calls.at(-1)?.[0].target.nodeId).toBe('node-1');

    pickNode.mockReturnValue(null);
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 900, clientY: 900 });
    expect(setConnectorPreview.mock.calls.at(-1)?.[0].target.nodeId).toBe('node-2');
  });

  it('writes nothing when the connector commit reports no change', async () => {
    projectProductionConnectorEdit.mockReturnValue({ changed: false, projection: { edges: [] } });
    const surface = await mounted();
    await withSelectedConnector(surface);
    pickConnectorHandle.mockReturnValue({ kind: 'waypoint', index: 0, point: { x: 0, y: 0 } });
    recordHistoryV2.mockClear();
    setEdges.mockClear();

    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 120, clientY: 90 });
    fireEvent.pointerUp(surface, { pointerId: 2, clientX: 120, clientY: 90 });
    expect(recordHistoryV2).not.toHaveBeenCalled();
    expect(setEdges).not.toHaveBeenCalled();
  });

  it('cancels a connector drag exactly on Escape', async () => {
    const surface = await mounted();
    await withSelectedConnector(surface);
    pickConnectorHandle.mockReturnValue({ kind: 'waypoint', index: 0, point: { x: 0, y: 0 } });
    recordHistoryV2.mockClear();

    fireEvent.pointerDown(surface, { pointerId: 2, button: 0, clientX: 50, clientY: 50 });
    fireEvent.pointerMove(surface, { pointerId: 2, clientX: 120, clientY: 90 });
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(setConnectorPreview).toHaveBeenLastCalledWith(null);

    fireEvent.pointerUp(surface, { pointerId: 2, clientX: 120, clientY: 90 });
    expect(projectProductionConnectorEdit).not.toHaveBeenCalled();
    expect(recordHistoryV2).not.toHaveBeenCalled();
  });

  it('opens the text editor over a double-clicked node with its current label', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });

    const editor = screen.getByRole('textbox', { name: 'Edit node label' }) as HTMLTextAreaElement;
    expect(editor.value).toBe('Process');
    expect(editor.style.left).toBe('10px');
    expect(editor.style.width).toBe('160px');
  });

  it('commits a rename on Enter with one history entry', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });

    const editor = screen.getByRole('textbox', { name: 'Edit node label' });
    fireEvent.change(editor, { target: { value: 'Renamed' } });
    fireEvent.keyDown(editor, { key: 'Enter' });

    expect(applyProductionNodeMutation.mock.calls.at(-1)?.[2]).toEqual({
      kind: 'rename', nodeId: 'node-1', label: 'Renamed',
    });
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setGraph).toHaveBeenLastCalledWith([{ id: 'renamed' }], []);
    expect(screen.queryByRole('textbox', { name: 'Edit node label' })).toBeNull();
  });

  it('commits nothing on Escape or on a blank value', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();

    fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });
    fireEvent.keyDown(screen.getByRole('textbox', { name: 'Edit node label' }), { key: 'Escape' });
    expect(applyProductionNodeMutation).not.toHaveBeenCalled();

    fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });
    const editor = screen.getByRole('textbox', { name: 'Edit node label' });
    fireEvent.change(editor, { target: { value: '   ' } });
    fireEvent.keyDown(editor, { key: 'Enter' });
    expect(applyProductionNodeMutation).not.toHaveBeenCalled();
  });

  it('opens nothing on empty space or for a node on a locked layer', async () => {
    const surface = await mounted();
    pickNode.mockReturnValue(null);
    fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });
    expect(screen.queryByRole('textbox', { name: 'Edit node label' })).toBeNull();

    scenePage.layers[0].locked = true;
    try {
      pickNode.mockReturnValue('node-1');
      fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });
      expect(screen.queryByRole('textbox', { name: 'Edit node label' })).toBeNull();
    } finally {
      scenePage.layers[0].locked = false;
    }
  });

  it('keeps the open editor pinned to the node while panning', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.doubleClick(surface, { clientX: 10, clientY: 10 });

    getNodeScreenBounds.mockReturnValue({ x: 70, y: 60, width: 160, height: 60 });
    fireEvent.pointerDown(surface, { pointerId: 1, button: 1, clientX: 0, clientY: 0 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 60, clientY: 40 });

    expect((screen.getByRole('textbox', { name: 'Edit node label' }) as HTMLTextAreaElement)
      .style.left).toBe('70px');
  });
});
