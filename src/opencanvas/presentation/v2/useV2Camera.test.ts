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
