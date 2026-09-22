import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { clearSelection, replaceSelection } from '../../application/selection/selection';
import type { Bounds2d } from '../../domain/geometry/types';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { useV2Pointer } from './useV2Pointer';
import { DEFAULT_TOOL_CONFIG } from './v2ToolCatalog';

function setup(
  extraNodes: ReturnType<typeof createTestNode>[] = [],
  extraConnectors: ReturnType<typeof createTestConnector>[] = []
) {
  const page = createTestDocument({
    nodes: [createTestNode('a'), ...extraNodes],
    connectors: extraConnectors,
  }).pages[0];
  const section = document.createElement('section');
  const canvas = document.createElement('canvas');
  section.append(canvas);
  section.setPointerCapture = vi.fn();
  section.releasePointerCapture = vi.fn();
  const selectionRef = { current: clearSelection() };
  const host = {
    screenToWorld: (point: { x: number; y: number }) => point,
    pickNode: vi.fn((_point: { x: number; y: number }): string | null => 'a'),
    pickConnector: vi.fn((): string | null => null),
    getSelectedConnectorId: vi.fn((): string | null => null),
    pickConnectorHandle: vi.fn(() => null),
    pickTransformHandle: vi.fn((): 'south-east' | null => null),
    pickConnectHandle: vi.fn(() => null),
    setMarquee: vi.fn(), setTransformPreview: vi.fn(), setAlignmentGuides: vi.fn(), setConnectionPreview: vi.fn(),
    setConnectorSelection: vi.fn(), setConnectorPreview: vi.fn(),
    setHover: vi.fn(), getNodesWorldBounds: vi.fn((_ids: readonly string[]): Bounds2d | null => null),
    pickNodesInScreenBounds: vi.fn((_bounds: Bounds2d): readonly string[] => []),
  };
  const commit = vi.fn();
  const applyConnectorSelection = vi.fn();
  const openEditor = vi.fn();
  const { result } = renderHook(() => useV2Pointer({
    hostRef: { current: host as unknown as PixiRendererHost },
    cameraRef: { current: { x: 0, y: 0, zoom: 1 } }, pageRef: { current: page },
    selectionRef, toolRef: { current: 'select' }, toolConfigRef: { current: DEFAULT_TOOL_CONFIG },
    spacePanRef: { current: false },
    readOnlyRef: { current: false }, gestureApiRef: { current: null }, commit,
    applySelection: (next) => { selectionRef.current = next; }, applyConnectorSelection,
    updateCamera: vi.fn(), openEditor, openConnectorEditor: vi.fn(), onToolChange: vi.fn(), mintId: () => 'new',
  }));
  function event(x: number, y: number, target: HTMLElement = canvas): ReactPointerEvent<HTMLElement> {
    return { currentTarget: section, target, clientX: x, clientY: y, button: 0,
      pointerId: 1, preventDefault: vi.fn() } as unknown as ReactPointerEvent<HTMLElement>;
  }
  return { result, host, commit, page, selectionRef, applyConnectorSelection, openEditor, event };
}

async function flushFrame(): Promise<void> {
  await act(async () => {
    await new Promise((resolve) => setTimeout(resolve, 50));
  });
}

describe('V2 direct manipulation', () => {
  it('selects on first press; sub-threshold jitter creates no history', () => {
    const { result, event, selectionRef, commit, host } = setup();
    act(() => result.current.handlePointerDown(event(100, 100)));
    expect(selectionRef.current.nodeIds).toEqual(['a']);
    act(() => result.current.handlePointerMove(event(102, 101)));
    act(() => result.current.handlePointerUp(event(102, 101)));
    expect(commit).not.toHaveBeenCalled();
    expect(host.setTransformPreview).not.toHaveBeenCalledWith(expect.objectContaining({ nodes: expect.anything() }));
  });

  it('moves without default snapping and commits final release coordinates once', () => {
    const { result, event, commit, page } = setup();
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(113, 107)));
    act(() => result.current.handlePointerUp(event(117, 109)));
    expect(commit).toHaveBeenCalledOnce();
    const command = commit.mock.calls[0][0];
    expect(command.after.transform.translation).toEqual({
      x: page.nodes[0].transform.translation.x + 17,
      y: page.nodes[0].transform.translation.y + 9,
    });
  });

  it('snaps a move onto another node and shows the guide; Alt bypasses; guide clears on release', async () => {
    const other = createTestNode('b', {
      size: { width: 200, height: 50 },
      transform: { translation: { x: 300, y: 300 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const { result, event, host, commit, page } = setup([other]);
    const start = page.nodes[0].transform.translation;
    // Drag so a's left edge lands 4px right of b's left edge (300) → snaps to 300.
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(100 + 304 - start.x, 100)));
    await flushFrame();
    expect(host.setAlignmentGuides).toHaveBeenLastCalledWith({ x: 300, y: null });
    expect(host.setTransformPreview.mock.calls.at(-1)?.[0].bounds.x).toBe(300);
    act(() => result.current.handlePointerMove({ ...event(100 + 304 - start.x, 100), metaKey: true }));
    await flushFrame();
    expect(host.setAlignmentGuides).toHaveBeenLastCalledWith(null);
    expect(host.setTransformPreview.mock.calls.at(-1)?.[0].bounds.x).toBe(304);
    act(() => result.current.handlePointerUp(event(100 + 304 - start.x, 100)));
    expect(host.setAlignmentGuides).toHaveBeenLastCalledWith(null);
    expect(commit.mock.calls[0][0].after.transform.translation.x).toBe(300);
  });

  it('collapses a coalesced burst to its latest point with one preview per frame', async () => {
    const { result, event, host } = setup();
    act(() => result.current.handlePointerDown(event(100, 100)));
    const burst = (x: number, y: number) => ({
      ...event(x, y),
      nativeEvent: {
        getCoalescedEvents: () => [{ clientX: x - 30, clientY: y }, { clientX: x, clientY: y }],
      } as unknown as PointerEvent,
    });
    act(() => {
      result.current.handlePointerMove(burst(150, 120));
      result.current.handlePointerMove(burst(170, 130));
      result.current.handlePointerMove(burst(190, 140));
    });
    expect(host.setTransformPreview).not.toHaveBeenCalled();
    await flushFrame();
    // One preview for the whole burst, at the latest coalesced point (+90/+40).
    expect(host.setTransformPreview).toHaveBeenCalledOnce();
    expect(host.setTransformPreview.mock.calls[0][0].bounds.x).toBe(90);
    expect(host.setTransformPreview.mock.calls[0][0].bounds.y).toBe(40);
  });

  it('Escape mid-drag cancels the queued frame and commits nothing', async () => {
    const { result, event, host, commit, page } = setup();
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(190, 140)));
    act(() => result.current.handlePointerCancel());
    await flushFrame();
    expect(host.setTransformPreview).toHaveBeenLastCalledWith(null);
    expect(host.setTransformPreview).toHaveBeenCalledTimes(1);
    expect(commit).not.toHaveBeenCalled();
    expect(page.nodes[0].transform.translation).toEqual({ x: 0, y: 0 });
  });

  it('finishes a drag from a window pointerup after the browser drops capture', () => {
    const { result, event, commit, page } = setup();
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(130, 120)));
    // Chrome releases mouse capture early on trackpads; the up then lands
    // on whatever is under the pointer, or outside the section entirely.
    act(() => {
      window.dispatchEvent(new PointerEvent('pointerup', { pointerId: 1, clientX: 150, clientY: 130, bubbles: true }));
    });
    expect(commit).toHaveBeenCalledOnce();
    expect(commit.mock.calls[0][0].after.transform.translation).toEqual({
      x: page.nodes[0].transform.translation.x + 50,
      y: page.nodes[0].transform.translation.y + 30,
    });
    act(() => result.current.handlePointerUp(event(150, 130)));
    expect(commit).toHaveBeenCalledOnce();
  });

  it('ignores floating controls and cancels preview without committing', () => {
    const { result, event, host, commit, selectionRef } = setup();
    act(() => result.current.handlePointerDown(event(100, 100, document.createElement('button'))));
    expect(selectionRef.current.nodeIds).toEqual([]);
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(130, 120)));
    act(() => result.current.handlePointerCancel());
    act(() => result.current.handlePointerUp(event(140, 140)));
    expect(host.setTransformPreview).toHaveBeenLastCalledWith(null);
    expect(commit).not.toHaveBeenCalled();
  });

  it('picks resize handles before the shape body', () => {
    const { result, event, host, selectionRef, commit } = setup();
    selectionRef.current = replaceSelection(['a']);
    host.pickTransformHandle.mockReturnValue('south-east');
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(200, 150)));
    act(() => result.current.handlePointerUp(event(220, 160)));
    expect(commit.mock.calls[0][0].label).toBe('Resize selection');
    expect(host.pickNode).not.toHaveBeenCalled();
  });

  it('selecting a connector clears node selection', () => {
    const { result, event, host, selectionRef, applyConnectorSelection } = setup();
    selectionRef.current = replaceSelection(['a']);
    host.pickNode.mockReturnValue(null);
    host.pickConnector.mockReturnValue('edge');
    act(() => result.current.handlePointerDown(event(100, 100)));
    expect(selectionRef.current.nodeIds).toEqual([]);
    expect(applyConnectorSelection).toHaveBeenCalledWith('edge');
  });
});

describe('V2 quick-create from side handles', () => {
  // Node a spans (0,0)-(100,50); its right handle sits at (122,25).
  const boundsOf = (ids: readonly string[]): Bounds2d | null =>
    ids[0] === 'a' ? { x: 0, y: 0, width: 100, height: 50 }
    : ids[0] === 'b' ? { x: 400, y: 0, width: 100, height: 50 } : null;

  it('tracks hovered node and handle, and clears hover on press', () => {
    const { result, event, host } = setup();
    host.getNodesWorldBounds.mockImplementation(boundsOf);
    host.pickNodesInScreenBounds.mockReturnValue(['a']);
    act(() => result.current.handlePointerMove(event(100, 100)));
    expect(host.setHover).toHaveBeenLastCalledWith('a', null);
    act(() => result.current.handlePointerMove(event(122, 25)));
    expect(host.setHover).toHaveBeenLastCalledWith('a', 'right');
    act(() => result.current.handlePointerDown(event(122, 25)));
    expect(host.setHover).toHaveBeenLastCalledWith(null, null);
  });

  it('drags from a handle to empty canvas: same-size node at the fixed gap, bound right→left, editor open', () => {
    const { result, event, host, commit, selectionRef, openEditor } = setup();
    host.getNodesWorldBounds.mockImplementation(boundsOf);
    host.pickNodesInScreenBounds.mockReturnValue(['a']);
    host.pickNode.mockImplementation((point: { x: number }) => (point.x < 150 ? 'a' : null));
    act(() => result.current.handlePointerDown(event(122, 25)));
    expect(selectionRef.current.nodeIds).toEqual(['a']);
    act(() => result.current.handlePointerMove(event(322, 25)));
    act(() => result.current.handlePointerUp(event(322, 25)));
    expect(commit).toHaveBeenCalledOnce();
    const batch = commit.mock.calls[0][0];
    expect(batch.kind).toBe('batch');
    expect(batch.label).toBe('Quick create');
    const insertNode = batch.commands.find((command: { kind: string }) => command.kind === 'insert-node');
    expect(insertNode.node.size).toEqual({ width: 100, height: 50 });
    expect(insertNode.node.transform.translation).toEqual({ x: 200, y: 0 });
    const insertEdge = batch.commands.find((command: { kind: string }) => command.kind === 'insert-connector');
    expect(insertEdge.connector.source).toMatchObject({ nodeId: 'a', portId: null });
    expect(insertEdge.connector.target).toMatchObject({ nodeId: insertNode.node.id, portId: null });
    expect(selectionRef.current.nodeIds).toEqual([insertNode.node.id]);
    expect(openEditor).toHaveBeenCalledWith(insertNode.node.id, { isNew: true });
  });

  it('clicks a handle without dragging: same quick-create in that direction', () => {
    const { result, event, host, commit, openEditor } = setup();
    host.getNodesWorldBounds.mockImplementation(boundsOf);
    host.pickNodesInScreenBounds.mockReturnValue(['a']);
    act(() => result.current.handlePointerDown(event(122, 25)));
    act(() => result.current.handlePointerUp(event(123, 25)));
    expect(commit).toHaveBeenCalledOnce();
    expect(commit.mock.calls[0][0].label).toBe('Quick create');
    expect(openEditor).toHaveBeenCalledWith('new', { isNew: true });
  });

  it('drags from a handle onto another node: binds node to node', () => {
    const other = createTestNode('b', {
      size: { width: 100, height: 50 },
      transform: { translation: { x: 400, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const { result, event, host, commit, selectionRef, applyConnectorSelection } = setup([other]);
    host.getNodesWorldBounds.mockImplementation(boundsOf);
    host.pickNodesInScreenBounds.mockReturnValue(['a']);
    host.pickNode.mockImplementation((point: { x: number }) => (point.x < 150 ? 'a' : 'b'));
    act(() => result.current.handlePointerDown(event(122, 25)));
    act(() => result.current.handlePointerMove(event(395, 25)));
    act(() => result.current.handlePointerUp(event(395, 25)));
    expect(commit).toHaveBeenCalledOnce();
    const edge = commit.mock.calls[0][0];
    expect(edge.label).toBe('Connect');
    expect(edge.connector.source).toMatchObject({ nodeId: 'a', portId: null });
    expect(edge.connector.target).toMatchObject({ nodeId: 'b', portId: null });
    expect(selectionRef.current.nodeIds).toEqual([]);
    expect(applyConnectorSelection).toHaveBeenCalledWith(edge.connector.id);
  });

  it('shift-drags an endpoint free instead of rebinding it', () => {
    const edge = createTestConnector('edge', 'a', 'a');
    const { result, event, host, commit } = setup([], [edge]);
    host.getSelectedConnectorId.mockReturnValue('edge');
    host.pickConnectorHandle.mockReturnValue({ kind: 'endpoint', role: 'target', point: { x: 50, y: 25 } });
    host.pickNode.mockReturnValue(null);
    act(() => result.current.handlePointerDown(event(50, 25)));
    act(() => result.current.handlePointerMove({ ...event(200, 100), shiftKey: true }));
    act(() => result.current.handlePointerUp({ ...event(200, 100), shiftKey: true }));
    expect(commit).toHaveBeenCalledOnce();
    expect(commit.mock.calls[0][0]).toMatchObject({
      kind: 'set-connector',
      after: { target: { nodeId: null, point: { x: 200, y: 100 } } },
    });
  });
});
