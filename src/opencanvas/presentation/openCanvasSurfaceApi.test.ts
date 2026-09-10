import { describe, expect, it, vi } from 'vitest';
import { createOpenCanvasSurfaceApi } from './openCanvasSurfaceApi';
import { CameraMotionController } from './CameraMotionController';
import type { CanvasCamera } from '../domain/camera/types';

function harness(camera: CanvasCamera = { x: 0, y: 0, zoom: 1 }) {
  let current = camera;
  const applyCamera = vi.fn((next: CanvasCamera) => { current = next; });
  const api = createOpenCanvasSurfaceApi({
    getCamera: () => current,
    applyCamera,
    getViewportSize: () => ({ width: 800, height: 600 }),
    getViewportOrigin: () => ({ x: 100, y: 50 }),
    getContentBounds: () => ({ x: 0, y: 0, width: 400, height: 300 }),
    getNodesWorldBounds: (ids) => ids.includes('a') ? { x: 1000, y: 1000, width: 100, height: 100 } : null,
    prefersReducedMotion: () => true,
    motion: new CameraMotionController(),
  });
  return { api, applyCamera, camera: () => current };
}

describe('createOpenCanvasSurfaceApi', () => {
  it('converts client coordinates through the surface origin and camera', () => {
    const { api } = harness({ x: 20, y: 10, zoom: 2 });
    expect(api.screenToFlowPosition({ x: 140, y: 70 })).toEqual({ x: 10, y: 5 });
    expect(api.flowToScreenPosition({ x: 10, y: 5 })).toEqual({ x: 140, y: 70 });
  });

  it('zooms around the viewport centre by React Flow\'s step', () => {
    const { api, camera } = harness();
    api.zoomIn();
    expect(camera().zoom).toBeCloseTo(1.2);
    // centre stays fixed: world point under (400,300) unchanged
    expect(api.screenToFlowPosition({ x: 500, y: 350 })).toEqual({ x: 400, y: 300 });
    api.zoomOut();
    expect(camera().zoom).toBeCloseTo(1);
  });

  it('chains zoom steps from the animation target', () => {
    let now = 0;
    const frames: FrameRequestCallback[] = [];
    const motion = new CameraMotionController({
      now: () => now,
      request: (cb) => frames.push(cb),
      cancel: () => {},
    });
    let camera: CanvasCamera = { x: 0, y: 0, zoom: 1 };
    const api = createOpenCanvasSurfaceApi({
      getCamera: () => camera,
      applyCamera: (next) => { camera = next; },
      getViewportSize: () => ({ width: 800, height: 600 }),
      getViewportOrigin: () => ({ x: 0, y: 0 }),
      getContentBounds: () => null,
      getNodesWorldBounds: () => null,
      prefersReducedMotion: () => false,
      motion,
    });
    api.zoomIn({ duration: 300 });
    now = 150; frames.shift()!(now);
    expect(camera.zoom).toBeGreaterThan(1);
    expect(camera.zoom).toBeLessThan(1.2);
    api.zoomIn({ duration: 300 });
    expect(api.getViewport().zoom).toBeCloseTo(1.44);
    now = 600; frames.pop()!(now);
    expect(camera.zoom).toBeCloseTo(1.44);
  });

  it('fits the whole page or only the named nodes', () => {
    const { api, camera } = harness();
    api.fitView({ padding: 0 });
    expect(camera().zoom).toBeCloseTo(2);
    api.fitView({ nodes: [{ id: 'a' }], padding: 0, maxZoom: 1 });
    expect(camera()).toEqual({ x: -650, y: -750, zoom: 1 });
  });

  it('ignores a fit with nothing to fit', () => {
    const { api, applyCamera } = harness();
    api.fitView({ nodes: [{ id: 'missing' }] });
    expect(applyCamera).not.toHaveBeenCalled();
  });

  it('exposes and sets the viewport in React Flow shape', () => {
    const { api, camera } = harness();
    api.setViewport({ x: 5, y: 6, zoom: 0.5 });
    expect(api.getViewport()).toEqual({ x: 5, y: 6, zoom: 0.5 });
    expect(camera()).toEqual({ x: 5, y: 6, zoom: 0.5 });
  });
});
