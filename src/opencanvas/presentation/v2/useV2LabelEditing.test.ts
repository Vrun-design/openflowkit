import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { DEFAULT_CANVAS_CAMERA } from '../../domain/camera/camera';
import type { CanvasCamera } from '../../domain/camera/types';
import type { ScenePage } from '../../domain/document/types';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { useV2LabelEditing } from './useV2LabelEditing';

function setup() {
  const page = createTestDocument({ nodes: [
    createTestNode('n1', { content: { label: 'Old' } }),
    createTestNode('new', { kind: 'text', content: { label: 'Text' } }),
  ] }).pages[0];
  const getNodeLabelScreenBounds = vi.fn(() => new DOMRect(10, 20, 100, 40));
  const commit = vi.fn();
  const focusCanvas = vi.fn();
  const announce = vi.fn();
  const hostRef = { current: { getNodeLabelScreenBounds } as unknown as PixiRendererHost };
  const hook = renderHook(
    ({ camera, page }: { camera: CanvasCamera; page: ScenePage }) =>
      useV2LabelEditing({
        hostRef,
        page,
        camera,
        commit,
        announce,
        focusCanvas,
      }),
    { initialProps: { camera: DEFAULT_CANVAS_CAMERA, page } }
  );
  act(() => hook.result.current.openEditor('n1'));
  return { ...hook, page, getNodeLabelScreenBounds, commit, focusCanvas, announce };
}

describe('useV2LabelEditing', () => {
  it('cancel closes the editor and it stays closed across re-renders', () => {
    const { result, rerender, focusCanvas, page } = setup();
    expect(result.current.editing?.nodeId).toBe('n1');
    act(() => result.current.cancelEdit());
    rerender({ camera: DEFAULT_CANVAS_CAMERA, page });
    expect(result.current.editing).toBeNull();
    expect(result.current.editingRef.current).toBe(false);
    expect(focusCanvas).toHaveBeenCalledOnce();
  });

  it('re-anchors the overlay only when the camera changes', () => {
    const { result, rerender, getNodeLabelScreenBounds, page } = setup();
    const opened = result.current.editing;
    rerender({ camera: DEFAULT_CANVAS_CAMERA, page });
    expect(result.current.editing).toBe(opened);
    getNodeLabelScreenBounds.mockReturnValue(new DOMRect(50, 60, 100, 40));
    rerender({ camera: { ...DEFAULT_CANVAS_CAMERA, zoom: 2 }, page });
    expect(result.current.editing?.bounds.x).toBe(50);
  });

  it('defers opening until the page containing the node renders', () => {
    const { result, rerender, getNodeLabelScreenBounds, page } = setup();
    act(() => result.current.cancelEdit());
    getNodeLabelScreenBounds.mockReturnValueOnce(null as unknown as DOMRect);
    act(() => result.current.openEditor('n1'));
    expect(result.current.editing).toBeNull();
    rerender({ camera: DEFAULT_CANVAS_CAMERA, page: { ...page } });
    expect(result.current.editing?.nodeId).toBe('n1');
  });

  it('commits one set-node only when the label changed', () => {
    const { result, commit } = setup();
    act(() => result.current.commitLabel('Old'));
    expect(commit).not.toHaveBeenCalled();
    act(() => result.current.openEditor('n1'));
    act(() => result.current.commitLabel('New'));
    expect(commit).toHaveBeenCalledOnce();
    expect(commit.mock.calls[0][0]).toMatchObject({ kind: 'set-node', after: { content: { label: 'New' } } });
    expect(result.current.editing).toBeNull();
  });

  it('announces open and save', () => {
    const { result, announce } = setup();
    expect(announce).toHaveBeenLastCalledWith('Editing label');
    act(() => result.current.commitLabel('New'));
    expect(announce).toHaveBeenLastCalledWith('Label saved');
  });

  it('type-to-edit opens with the typed character replacing the label', () => {
    const { result } = setup();
    act(() => result.current.openEditor('n1', { initialValue: 'Q' }));
    expect(result.current.editing).toMatchObject({ nodeId: 'n1', value: 'Q' });
  });

  it('empty commit or cancel on a new node deletes it instead of leaving a blank node', () => {
    const { result, commit } = setup();
    act(() => result.current.openEditor('new', { isNew: true }));
    act(() => result.current.commitLabel('   '));
    expect(commit).toHaveBeenCalledOnce();
    expect(commit.mock.calls[0][0]).toMatchObject({ kind: 'batch', label: 'Delete selection' });
    act(() => result.current.openEditor('new', { isNew: true }));
    act(() => result.current.cancelEdit());
    expect(commit).toHaveBeenCalledTimes(2);
    // Existing nodes keep the old label on cancel and are never deleted.
    act(() => result.current.openEditor('n1'));
    act(() => result.current.cancelEdit());
    expect(commit).toHaveBeenCalledTimes(2);
  });
});
