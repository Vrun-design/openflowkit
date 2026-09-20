import { act, renderHook } from '@testing-library/react';
import type { PointerEvent as ReactPointerEvent } from 'react';
import { describe, expect, it, vi } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { clearSelection, replaceSelection } from '../../application/selection/selection';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { useV2Pointer } from './useV2Pointer';

function setup(extraNodes: ReturnType<typeof createTestNode>[] = []) {
  const page = createTestDocument({ nodes: [createTestNode('a'), ...extraNodes] }).pages[0];
  const section = document.createElement('section');
  const canvas = document.createElement('canvas');
  section.append(canvas);
  section.setPointerCapture = vi.fn();
  section.releasePointerCapture = vi.fn();
  const selectionRef = { current: clearSelection() };
  const host = {
    screenToWorld: (point: { x: number; y: number }) => point,
    pickNode: vi.fn((): string | null => 'a'),
    pickConnector: vi.fn((): string | null => null),
    getSelectedConnectorId: vi.fn((): string | null => null),
    pickConnectorHandle: vi.fn(() => null),
    pickTransformHandle: vi.fn((): 'south-east' | null => null),
    pickConnectHandle: vi.fn(() => null),
    setMarquee: vi.fn(), setTransformPreview: vi.fn(), setAlignmentGuides: vi.fn(), setConnectionPreview: vi.fn(),
    setConnectorSelection: vi.fn(), setConnectorPreview: vi.fn(),
  };
  const commit = vi.fn();
  const applyConnectorSelection = vi.fn();
  const { result } = renderHook(() => useV2Pointer({
    hostRef: { current: host as unknown as PixiRendererHost },
    cameraRef: { current: { x: 0, y: 0, zoom: 1 } }, pageRef: { current: page },
    selectionRef, toolRef: { current: 'select' }, spacePanRef: { current: false },
    readOnlyRef: { current: false }, gestureApiRef: { current: null }, commit,
    applySelection: (next) => { selectionRef.current = next; }, applyConnectorSelection,
    updateCamera: vi.fn(), openEditor: vi.fn(), onToolChange: vi.fn(), mintId: () => 'new',
  }));
  function event(x: number, y: number, target: HTMLElement = canvas): ReactPointerEvent<HTMLElement> {
    return { currentTarget: section, target, clientX: x, clientY: y, button: 0,
      pointerId: 1, preventDefault: vi.fn() } as unknown as ReactPointerEvent<HTMLElement>;
  }
  return { result, host, commit, page, selectionRef, applyConnectorSelection, event };
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

  it('snaps a move onto another node and shows the guide; Alt bypasses; guide clears on release', () => {
    const other = createTestNode('b', {
      size: { width: 200, height: 50 },
      transform: { translation: { x: 300, y: 300 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const { result, event, host, commit, page } = setup([other]);
    const start = page.nodes[0].transform.translation;
    // Drag so a's left edge lands 4px right of b's left edge (300) → snaps to 300.
    act(() => result.current.handlePointerDown(event(100, 100)));
    act(() => result.current.handlePointerMove(event(100 + 304 - start.x, 100)));
    expect(host.setAlignmentGuides).toHaveBeenLastCalledWith({ x: 300, y: null });
    expect(host.setTransformPreview.mock.calls.at(-1)?.[0].bounds.x).toBe(300);
    act(() => result.current.handlePointerMove({ ...event(100 + 304 - start.x, 100), altKey: true }));
    expect(host.setAlignmentGuides).toHaveBeenLastCalledWith(null);
    expect(host.setTransformPreview.mock.calls.at(-1)?.[0].bounds.x).toBe(304);
    act(() => result.current.handlePointerUp(event(100 + 304 - start.x, 100)));
    expect(host.setAlignmentGuides).toHaveBeenLastCalledWith(null);
    expect(commit.mock.calls[0][0].after.transform.translation.x).toBe(300);
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
