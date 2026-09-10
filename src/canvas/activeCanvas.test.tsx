import { afterEach, describe, expect, it, vi } from 'vitest';
import { renderHook, act } from '@testing-library/react';

const reactFlow = { fitView: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(), getViewport: () => ({ x: 0, y: 0, zoom: 1 }) };
vi.mock('@/lib/reactflowCompat', () => ({
  useReactFlow: () => reactFlow,
  useViewport: () => ({ x: 0, y: 0, zoom: 1 }),
}));

import {
  publishActiveCanvasViewport,
  registerActiveCanvas,
  resetActiveCanvasForTests,
  useActiveCanvas,
  useActiveCanvasViewport,
  type ActiveCanvasApi,
} from './activeCanvas';

const pixi: ActiveCanvasApi = {
  fitView: vi.fn(), zoomIn: vi.fn(), zoomOut: vi.fn(),
  getViewport: () => ({ x: 1, y: 2, zoom: 3 }),
  setViewport: vi.fn(),
  screenToFlowPosition: (p) => p, flowToScreenPosition: (p) => p,
};

afterEach(() => resetActiveCanvasForTests());

describe('active canvas registry', () => {
  it('falls back to React Flow until a canvas registers, then follows it', () => {
    const { result } = renderHook(() => useActiveCanvas());
    expect(result.current).toBe(reactFlow);
    let unregister = () => {};
    act(() => { unregister = registerActiveCanvas(pixi); });
    expect(result.current).toBe(pixi);
    act(() => unregister());
    expect(result.current).toBe(reactFlow);
  });

  it('publishes the registered viewport for zoom readouts', () => {
    const { result } = renderHook(() => useActiveCanvasViewport());
    expect(result.current.zoom).toBe(1);
    act(() => { registerActiveCanvas(pixi); });
    expect(result.current).toEqual({ x: 1, y: 2, zoom: 3 });
    act(() => publishActiveCanvasViewport({ x: 0, y: 0, zoom: 0.5 }));
    expect(result.current.zoom).toBe(0.5);
  });
});
