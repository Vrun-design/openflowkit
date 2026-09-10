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
const pickConnectHandle = vi.fn((): string | null => null);
const setConnectionPreview = vi.fn();
const setFreeformPreview = vi.fn();
const getNodesWorldBounds = vi.fn((ids: readonly string[]) =>
  ids.length ? { x: 0, y: 0, width: 100, height: 50 } : null);
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

const clearPendingNodeLabelEditRequest = vi.fn();
const storeState = {
  nodes: storeNodes,
  pendingNodeLabelEditRequest: null as null | { nodeId: string; seedText?: string; replaceExisting?: boolean },
  selectedNodeId: null as string | null,
  selectedEdgeId: null as string | null,
  viewSettings: { drawingTool: null as string | null },
  activeLayerId: 'default',
  setViewSettings: vi.fn(),
  edges: [] as Array<{ id: string; source: string; target: string; selected?: boolean }>,
  documents: [{ id: 'doc' }], activeDocumentId: 'doc',
  tabs: [{ id: 'page-1' }], activeTabId: 'page-1', layers: [],
  setNodes, setSelectedNodeId, recordHistoryV2, setEdges, setSelectedEdgeId, setGraph,
};

vi.mock('@/store', () => ({
  useFlowStore: Object.assign(
    (selector: (state: unknown) => unknown) => selector(storeState),
    { getState: () => storeState }
  ),
}));

const operations = {
  copySelection: vi.fn(), pasteSelection: vi.fn(), duplicateNode: vi.fn(), deleteNode: vi.fn(),
  deleteEdge: vi.fn(), updateNodeZIndex: vi.fn(), updateNodeType: vi.fn(), updateNodeData: vi.fn(),
  fitSectionToContents: vi.fn(), releaseFromSection: vi.fn(), handleBringContentsIntoSection: vi.fn(),
  handleAlignNodes: vi.fn(), handleDistributeNodes: vi.fn(), handleGroupNodes: vi.fn(),
  handleWrapInSection: vi.fn(), onConnect: vi.fn(), handleAddAndConnect: vi.fn(),
  handleAddDomainLibraryItemAndConnect: vi.fn(), handleAddImage: vi.fn(), handleAddNode: vi.fn(),
};
vi.mock('@/hooks/useFlowOperations', () => ({ useFlowOperations: () => operations }));
const externalInput = { onDragOver: vi.fn(), onDrop: vi.fn(), onPasteCapture: vi.fn() };
vi.mock('@/components/flow-canvas/useCanvasExternalInput', () => ({
  useCanvasExternalInput: () => externalInput,
}));
vi.mock('@/store/selectionHooks', () => ({
  usePendingNodeLabelEditRequest: () => storeState.pendingNodeLabelEditRequest,
  useNodeLabelEditRequestActions: () => ({ clearPendingNodeLabelEditRequest }),
}));

vi.mock('@/lib/reactflowCompat', async (importOriginal) => ({
  ...(await importOriginal<typeof import('@/lib/reactflowCompat')>()),
  useReactFlow: () => ({}),
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
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
    pickConnectHandle = pickConnectHandle;
    setConnectionPreview = setConnectionPreview;
    setFreeformPreview = setFreeformPreview;
    getNodesWorldBounds = getNodesWorldBounds;
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
import { getActiveCanvasApi } from '@/canvas/activeCanvas';

const FALLBACK = <div data-testid="react-flow-fallback" />;
const recordHistory = vi.fn();

describe('OpenCanvas editor surface', () => {
  beforeEach(() => {
    storeState.nodes = storeNodes;
    storeState.edges = [];
    storeState.selectedNodeId = null;
    storeState.viewSettings = { drawingTool: null };
    pickConnector.mockReturnValue(null);
    pickConnectHandle.mockReturnValue(null);
    vi.stubGlobal('ResizeObserver', class {
      observe() {}
      disconnect() {}
    });
    constructed.length = 0;
    [setCamera, setPage, resize, destroy, mount, setSelection, setMarquee,
      setNodes, setSelectedNodeId, setTransformPreview, recordHistoryV2,
      setConnectorSelection, setConnectorPreview, setEdges, setSelectedEdgeId, setGraph,
    ].forEach((spy) => spy.mockClear());
    Object.values(operations).forEach((spy) => spy.mockClear());
    storeState.pendingNodeLabelEditRequest = null;
    getNodeScreenBounds.mockReset();
    getNodeScreenBounds.mockReturnValue({ x: 10, y: 20, width: 160, height: 60 });
    applyProductionNodeMutation.mockClear();
    applyProductionNodeMutation.mockReturnValue({
      changed: true, selectedNodeId: 'node-1',
      projection: { nodes: [{ id: 'renamed' }], edges: [] },
    });
    pickConnector.mockReset();
    pickConnector.mockReturnValue(null);
    pickConnectHandle.mockReturnValue(null);
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
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);

    expect(screen.getByTestId('opencanvas-surface')).toBeTruthy();
    expect(screen.queryByTestId('react-flow-fallback')).toBeNull();
    await waitFor(() => expect(setPage).toHaveBeenCalled());
    expect(setPage.mock.calls[0][0]).toMatchObject({ id: 'page-1' });
    expect(setCamera).toHaveBeenCalled();
    expect(constructed[0]).toMatchObject({ basicNodesEnabled: true, wireframeNodesEnabled: true });
  });

  it('renders the React Flow fallback when WebGL is unavailable', () => {
    detectWebGlCapability.mockReturnValue({ supported: false });
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    expect(screen.getByTestId('react-flow-fallback')).toBeTruthy();
    expect(screen.queryByTestId('opencanvas-surface')).toBeNull();
    expect(constructed).toHaveLength(0);
  });

  it('renders the React Flow fallback when the canonical projection is invalid', () => {
    projectActiveDocument.mockReturnValue({
      status: 'invalid', code: 'CANONICAL_PROJECTION_FAILED',
    });
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    expect(screen.getByTestId('react-flow-fallback')).toBeTruthy();
    expect(constructed).toHaveLength(0);
  });

  it('falls back and destroys the host when the renderer fails to mount', async () => {
    mount.mockImplementation(async () => { throw new Error('no context'); });
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    await waitFor(() => expect(screen.getByTestId('react-flow-fallback')).toBeTruthy());
    expect(destroy).toHaveBeenCalled();
  });

  it('falls back and destroys the host when the WebGL context is lost', async () => {
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    await waitFor(() => expect(constructed).toHaveLength(1));
    constructed[0].onStatusChange?.('context-lost');
    await waitFor(() => expect(screen.getByTestId('react-flow-fallback')).toBeTruthy());
    expect(destroy).toHaveBeenCalled();
  });

  it('pans on middle-drag and zooms on wheel through the host camera', async () => {
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
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
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
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
    pickConnectHandle.mockReturnValue(null);
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
    // The projected record has no `selected`; the surface restates it.
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

  it('opens the node context menu on right-click and selects an unselected node', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();
    fireEvent.contextMenu(surface, { clientX: 30, clientY: 40 });

    expect(setSelection).toHaveBeenLastCalledWith(['node-1'], 'node-1');
    expect(screen.getByRole('menu', { name: 'Canvas context menu' })).toBeTruthy();
    expect(screen.getByRole('menuitem', { name: 'common.delete' })).toBeTruthy();
  });

  it('opens the canvas menu on empty space and pastes at the pointer in world space', async () => {
    pickNode.mockReturnValue(null);
    const surface = await mounted();
    fireEvent.contextMenu(surface, { clientX: 300, clientY: 400 });
    const menu = screen.getByRole('menu', { name: 'Canvas context menu' });
    expect(menu).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'common.paste' }));
    expect(operations.pasteSelection).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.any(Number), y: expect.any(Number),
    }));
    expect(screen.queryByRole('menu', { name: 'Canvas context menu' })).toBeNull();
  });

  it('opens the edge menu on a connector and deletes that edge', async () => {
    pickNode.mockReturnValue(null);
    pickConnector.mockReturnValue('edge-1');
    storeState.edges = [{ id: 'edge-1', source: 'node-1', target: 'node-2' }];
    const surface = await mounted();
    fireEvent.contextMenu(surface, { clientX: 30, clientY: 40 });
    expect(setConnectorSelection).toHaveBeenLastCalledWith('edge-1', null);
    expect(screen.getByRole('menuitem', { name: 'common.reverseDirection' })).toBeTruthy();
    fireEvent.click(screen.getByRole('menuitem', { name: 'common.deleteConnection' }));
    expect(operations.deleteEdge).toHaveBeenCalledWith('edge-1');
    expect(operations.deleteNode).not.toHaveBeenCalled();
  });

  it('runs delete, duplicate, and z-order actions on the right node and closes', async () => {
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();

    for (const [name, spy, args] of [
      ['common.delete', operations.deleteNode, ['node-1']],
      ['common.duplicate', operations.duplicateNode, ['node-1']],
      ['common.sendToBack', operations.updateNodeZIndex, ['node-1', 'back']],
    ] as const) {
      fireEvent.contextMenu(surface, { clientX: 30, clientY: 40 });
      fireEvent.click(screen.getByRole('menuitem', { name }));
      expect(spy).toHaveBeenLastCalledWith(...args);
      expect(screen.queryByRole('menu', { name: 'Canvas context menu' })).toBeNull();
    }
  });

  it('shows the multi-selection menu when several nodes are selected', async () => {
    pickNode.mockReturnValue('node-1');
    storeState.nodes = storeNodes.map((node) => ({ ...node, selected: true }));
    const surface = await mounted();
    fireEvent.contextMenu(surface, { clientX: 30, clientY: 40 });
    fireEvent.click(screen.getByRole('menuitem', { name: /common.delete/ }));
    expect(operations.deleteNode).toHaveBeenCalledTimes(2);
  });

  it('opens the label editor for a pending store request and clears it', async () => {
    storeState.pendingNodeLabelEditRequest = { nodeId: 'node-1', seedText: 'Q', replaceExisting: true };
    await mounted();
    await waitFor(() => expect(clearPendingNodeLabelEditRequest).toHaveBeenCalled());
    expect((screen.getByRole('textbox', { name: 'Edit node label' }) as HTMLTextAreaElement)
      .defaultValue).toBe('Q');
  });

  it('registers itself as the active canvas and unregisters on unmount', async () => {
    const view = render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    await waitFor(() => expect(getActiveCanvasApi()).not.toBeNull());
    setCamera.mockClear();
    getActiveCanvasApi()!.zoomIn();
    expect(setCamera.mock.calls.at(-1)?.[0].zoom).toBeCloseTo(1.2);
    getContentBounds.mockReturnValue({ x: 0, y: 0, width: 400, height: 300 });
    getActiveCanvasApi()!.fitView({ padding: 0 });
    expect(setCamera.mock.calls.at(-1)?.[0].zoom).toBeCloseTo(2);
    view.unmount();
    expect(getActiveCanvasApi()).toBeNull();
  });

  it('does not register when it falls back to React Flow', () => {
    detectWebGlCapability.mockReturnValue({ supported: false });
    render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    expect(getActiveCanvasApi()).toBeNull();
  });

  it('mirrors selection made elsewhere in the editor onto the surface', async () => {
    const view = render(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    await waitFor(() => expect(setPage).toHaveBeenCalled());
    setSelection.mockClear();
    storeState.nodes = storeNodes.map((node) => ({ ...node, selected: true }));
    storeState.selectedNodeId = 'node-2';
    view.rerender(<OpenCanvasSurface fallback={FALLBACK} recordHistory={recordHistory} />);
    expect(setSelection).toHaveBeenLastCalledWith(['node-1', 'node-2'], 'node-2');
  });

  it('drags from a connect handle onto another node and connects them', async () => {
    storeState.nodes = storeNodes.map((node) => ({ ...node, selected: node.id === 'node-1' }));
    storeState.selectedNodeId = 'node-1';
    pickConnectHandle.mockReturnValue('right');
    const surface = await mounted();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 122, clientY: 25 });
    expect(pickNode).not.toHaveBeenCalled();
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 200, clientY: 60 });
    expect(setConnectionPreview).toHaveBeenLastCalledWith({
      from: { x: 100, y: 25 }, to: expect.any(Object),
    });
    pickNode.mockReturnValue('node-2');
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 200, clientY: 60 });
    expect(setConnectionPreview).toHaveBeenLastCalledWith(null);
    expect(operations.onConnect).toHaveBeenCalledWith({
      source: 'node-1', target: 'node-2', sourceHandle: 'right', targetHandle: expect.any(String),
    });
  });

  it('drops a new connector on empty space and offers the connect menu', async () => {
    storeState.nodes = storeNodes.map((node) => ({ ...node, selected: node.id === 'node-1' }));
    storeState.selectedNodeId = 'node-1';
    pickConnectHandle.mockReturnValue('bottom');
    const surface = await mounted();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 50, clientY: 72 });
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 60, clientY: 200 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 60, clientY: 200 });
    expect(operations.onConnect).not.toHaveBeenCalled();
    expect(screen.getByRole('menu', { name: 'Connect node menu' })).toBeTruthy();
  });

  it('treats a click on a connect handle without movement as nothing', async () => {
    storeState.nodes = storeNodes.map((node) => ({ ...node, selected: node.id === 'node-1' }));
    pickConnectHandle.mockReturnValue('left');
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 5, clientY: 25 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 6, clientY: 25 });
    expect(operations.onConnect).not.toHaveBeenCalled();
    expect(screen.queryByRole('menu', { name: 'Connect node menu' })).toBeNull();
  });

  it('routes drops and pastes through the shared external-input hook', async () => {
    const surface = await mounted();
    fireEvent.drop(surface);
    expect(externalInput.onDrop).toHaveBeenCalled();
    fireEvent.paste(surface);
    expect(externalInput.onPasteCapture).toHaveBeenCalled();
  });

  it('adds a node on double-click over empty space at the pointer', async () => {
    pickNode.mockReturnValue(null);
    const surface = await mounted();
    fireEvent.doubleClick(surface, { clientX: 300, clientY: 200 });
    expect(operations.handleAddNode).toHaveBeenCalledWith(expect.objectContaining({
      x: expect.any(Number), y: expect.any(Number),
    }));
  });

  it('draws a pen stroke with the armed tool and inserts it as one history entry', async () => {
    storeState.viewSettings = { drawingTool: 'pen' };
    pickNode.mockReturnValue('node-1');
    const surface = await mounted();

    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    // The armed tool wins over node hit-testing.
    expect(setSelection).not.toHaveBeenCalledWith(['node-1'], 'node-1');
    fireEvent.pointerMove(surface, { pointerId: 1, clientX: 60, clientY: 40 });
    expect(setFreeformPreview).toHaveBeenLastCalledWith(expect.objectContaining({
      confirmed: expect.any(Array), width: 3,
    }));
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 60, clientY: 40 });
    expect(setFreeformPreview).toHaveBeenLastCalledWith(null);
    expect(applyProductionNodeMutation).toHaveBeenCalledWith(
      expect.anything(), 'page-1',
      expect.objectContaining({ kind: 'insert', node: expect.objectContaining({ kind: 'pen' }) }),
      expect.any(String)
    );
    expect(recordHistoryV2).toHaveBeenCalledTimes(1);
    expect(setGraph).toHaveBeenCalled();
  });

  it('discards a stroke that never moved', async () => {
    storeState.viewSettings = { drawingTool: 'line' };
    const surface = await mounted();
    fireEvent.pointerDown(surface, { pointerId: 1, button: 0, clientX: 10, clientY: 10 });
    fireEvent.pointerUp(surface, { pointerId: 1, clientX: 10, clientY: 10 });
    expect(applyProductionNodeMutation).not.toHaveBeenCalled();
  });

  it('Escape disarms the drawing tool when nothing is in progress', async () => {
    storeState.viewSettings = { drawingTool: 'pen' };
    await mounted();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(storeState.setViewSettings).toHaveBeenCalledWith({ drawingTool: null });
  });
});
