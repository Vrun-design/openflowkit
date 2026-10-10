import { act, renderHook } from '@testing-library/react';
import { afterEach, expect, it, vi } from 'vitest';
import type { PixiRendererHost } from '../../infrastructure/pixi/PixiRendererHost';
import { worldToScreen } from '../../domain/camera/camera';
import { useV2Camera } from './useV2Camera';

afterEach(() => {
  vi.unstubAllGlobals();
  document.body.innerHTML = '';
});

it('centres an off-origin element at capped zoom inside the canvas left by panels', () => {
  document.body.innerHTML =
    '<div class="ofk-v2" data-workspace-open="true" style="--v2-panel-width:320px"></div>';
  vi.stubGlobal('innerWidth', 1440);
  vi.stubGlobal('matchMedia', () => ({ matches: true }));
  const bounds = { x: 1600, y: 1100, width: 180, height: 100 };
  const host = {
    getContentBounds: () => bounds,
    getViewportSize: () => ({ width: 1440, height: 900 }),
    setCamera: vi.fn(),
  } as unknown as PixiRendererHost;
  const { result } = renderHook(() => useV2Camera({ current: host }));
  act(() => result.current.glideToNodes(['api']));
  const camera = result.current.cameraRef.current;
  expect(camera.zoom).toBe(1.4);
  expect(
    worldToScreen(camera, { x: bounds.x + bounds.width / 2, y: bounds.y + bounds.height / 2 })
  ).toEqual({ x: 560, y: 450 });
});

it('a landing asked for before the renderer has a size waits for it instead of fitting nothing', () => {
  vi.stubGlobal('innerWidth', 1440);
  let size = { width: 0, height: 0 };
  const host = {
    getContentBounds: () => ({ x: 160, y: 80, width: 814, height: 572 }),
    getViewportSize: () => size,
    setCamera: vi.fn(),
  } as unknown as PixiRendererHost;
  const { result } = renderHook(() => useV2Camera({ current: host }));
  // A template generates while WebGL is still starting: a 0×0 viewport fits to the floor zoom, jammed at the top.
  act(() => { result.current.landReadable('down', ['frame']); });
  expect(host.setCamera).not.toHaveBeenCalled();
  size = { width: 1440, height: 900 };
  act(() => result.current.fitOnOpen('ready', null, 'doc', 1, 'down'));
  const camera = result.current.cameraRef.current;
  expect(camera.zoom).toBeGreaterThan(1);
  // Centred, not pinned to the top-left padding.
  expect(160 * camera.zoom + camera.y).toBeGreaterThan(64);
});

function deferredHost() {
  const view = { size: { width: 0, height: 0 } };
  const host = {
    getContentBounds: () => ({ x: 160, y: 80, width: 814, height: 572 }),
    getViewportSize: () => view.size,
    setCamera: vi.fn(),
  } as unknown as PixiRendererHost;
  return { host, view };
}

it('a waiting landing runs on the ready transition only, never on a later edit', () => {
  vi.stubGlobal('innerWidth', 1440);
  const { host, view } = deferredHost();
  const { result } = renderHook(() => useV2Camera({ current: host }));
  act(() => result.current.fitOnOpen('ready', null, 'doc', 1, 'down'));
  act(() => { result.current.landReadable('down', ['frame']); });
  view.size = { width: 1440, height: 900 };
  // Already ready: the next fitOnOpen is an edit (revision 2), and must not yank the camera.
  act(() => result.current.fitOnOpen('ready', null, 'doc', 2, 'down'));
  expect(host.setCamera).not.toHaveBeenCalled();
});

it('a waiting landing is dropped by the reader\'s own camera move and by a document switch', () => {
  vi.stubGlobal('innerWidth', 1440);
  const moved = deferredHost();
  const first = renderHook(() => useV2Camera({ current: moved.host }));
  act(() => { first.result.current.landReadable('down'); });
  act(() => first.result.current.updateCamera({ x: 5, y: 5, zoom: 0.8 }));
  moved.view.size = { width: 1440, height: 900 };
  act(() => first.result.current.fitOnOpen('ready', null, 'doc', 1, 'down'));
  expect(first.result.current.cameraRef.current).toEqual({ x: 5, y: 5, zoom: 0.8 });

  const switched = deferredHost();
  const second = renderHook(() => useV2Camera({ current: switched.host }));
  act(() => second.result.current.fitOnOpen('initializing', null, 'doc-a', 1, 'down'));
  act(() => { second.result.current.landReadable('down'); });
  act(() => second.result.current.fitOnOpen('initializing', null, 'doc-b', 1, 'down'));
  switched.view.size = { width: 1440, height: 900 };
  act(() => second.result.current.fitOnOpen('ready', null, 'doc-b', 1, 'down'));
  expect(switched.host.setCamera).not.toHaveBeenCalled();
});

it('ready with the viewport still 0×0 retries on the next frames until it has a size', () => {
  vi.stubGlobal('innerWidth', 1440);
  const frames: FrameRequestCallback[] = [];
  vi.stubGlobal('requestAnimationFrame', (callback: FrameRequestCallback) => frames.push(callback));
  const { host, view } = deferredHost();
  const { result } = renderHook(() => useV2Camera({ current: host }));
  act(() => { result.current.landReadable('down', ['frame']); });
  act(() => result.current.fitOnOpen('ready', null, 'doc', 1, 'down'));
  expect(host.setCamera).not.toHaveBeenCalled();
  view.size = { width: 1440, height: 900 };
  act(() => { frames.splice(0).forEach((callback) => callback(0)); });
  expect(result.current.cameraRef.current.zoom).toBeGreaterThan(1);
});
