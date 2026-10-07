import { act, renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { replaceSelection } from '../../application/selection/selection';
import type { ScenePage } from '../../domain/document/types';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { useV2Find } from './useV2Find';

const node = (id: string, label: string, y: number) => createTestNode(id, {
  content: { label }, transform: { translation: { x: 0, y }, rotationRadians: 0, scale: { x: 1, y: 1 } },
});
const pageOf = (...nodes: ReturnType<typeof node>[]): ScenePage => createTestDocument({ nodes }).pages[0]!;
const camera = { x: 5, y: 6, zoom: 2 };

function setup(initial: ScenePage) {
  const spies = {
    applySelection: vi.fn(), applyConnectorSelection: vi.fn(), glideToNodes: vi.fn(), animateTo: vi.fn(), focusCanvas: vi.fn(),
  };
  const view = renderHook(({ page }) => useV2Find({
    page, selectionRef: { current: replaceSelection(['a', 'gone']) }, selectedConnectorIdsRef: { current: ['c1', 'c2'] },
    cameraRef: { current: camera }, ...spies,
  }), { initialProps: { page: initial } });
  return { ...view, ...spies };
}

describe('useV2Find', () => {
  it('Escape restores what still exists; the X keeps the current selection and camera', () => {
    const page = pageOf(node('a', 'api', 0), node('b', 'api', 100));
    const escape = setup(page);
    act(() => escape.result.current.show());
    act(() => escape.result.current.close(true));
    expect(escape.applySelection).toHaveBeenCalledWith(replaceSelection(['a']));
    expect(escape.applyConnectorSelection).toHaveBeenCalledWith([]);
    expect(escape.animateTo).toHaveBeenCalledWith(camera);

    const button = setup(page);
    act(() => button.result.current.show());
    act(() => button.result.current.close(false));
    expect(button.applySelection).not.toHaveBeenCalled();
    expect(button.animateTo).not.toHaveBeenCalled();
    expect(button.focusCanvas).toHaveBeenCalled();
  });

  it('does not restore the camera on another page', () => {
    const view = setup(pageOf(node('a', 'api', 0)));
    act(() => view.result.current.show());
    view.rerender({ page: { ...pageOf(node('a', 'api', 0)), id: 'other' } });
    act(() => view.result.current.close(true));
    expect(view.applySelection).toHaveBeenCalledWith(replaceSelection(['a']));
    expect(view.animateTo).not.toHaveBeenCalled();
  });

  it('tracks the current match by id through a delete', () => {
    const view = setup(pageOf(node('a', 'api', 0), node('b', 'api', 100)));
    act(() => view.result.current.show());
    act(() => view.result.current.search('api'));
    act(() => view.result.current.step(1));
    act(() => view.result.current.step(1));
    expect(view.result.current.index).toBe(1);
    view.rerender({ page: pageOf(node('a', 'api', 0)) });
    expect(view.result.current).toMatchObject({ index: -1, count: 1 });
  });
});
