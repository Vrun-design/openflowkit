import { describe, expect, it } from 'vitest';
import { fitCameraToBounds } from './camera';
import { READABLE_ZOOM, readableLanding } from './readableLanding';

const viewport = { width: 1200, height: 800 };
const at = (camera: { x: number; y: number; zoom: number }, x: number, y: number) =>
  ({ x: x * camera.zoom + camera.x, y: y * camera.zoom + camera.y });

describe('readableLanding', () => {
  it('keeps the fit for a small diagram', () => {
    const content = { x: 100, y: 100, width: 600, height: 400 };
    const landing = readableLanding(content, viewport, 'down');
    expect(landing.zoomedIn).toBe(false);
    expect(landing.camera).toEqual(fitCameraToBounds(content, viewport, 64));
  });

  it('anchors a large top-down diagram on its top, centred sideways when it fits across', () => {
    const content = { x: 0, y: 0, width: 800, height: 6000 };
    const { camera, zoomedIn } = readableLanding(content, viewport, 'down');
    expect(zoomedIn).toBe(true);
    expect(camera.zoom).toBe(READABLE_ZOOM);
    expect(at(camera, 0, 0).y).toBe(64);
    const left = at(camera, 0, 0).x;
    expect(left).toBeCloseTo(viewport.width - at(camera, 800, 0).x);
  });

  it('anchors a large left-right diagram on its left, centred down when it fits', () => {
    const content = { x: 50, y: 20, width: 6000, height: 500 };
    const { camera, zoomedIn } = readableLanding(content, viewport, 'right');
    expect(zoomedIn).toBe(true);
    expect(camera.zoom).toBe(READABLE_ZOOM);
    expect(at(camera, 50, 0).x).toBe(64);
    expect(at(camera, 0, 20).y).toBeCloseTo(viewport.height - at(camera, 0, 520).y);
  });

  it('anchors bottom-up on the bottom and right-to-left on the right', () => {
    const tall = { x: 0, y: 0, width: 800, height: 6000 };
    expect(at(readableLanding(tall, viewport, 'up').camera, 0, 6000).y).toBe(viewport.height - 64);
    const wide = { x: 0, y: 0, width: 6000, height: 500 };
    expect(at(readableLanding(wide, viewport, 'left').camera, 6000, 0).x).toBe(viewport.width - 64);
  });

  it('stays at the readable zoom for extremely wide content', () => {
    const { camera } = readableLanding({ x: 0, y: 0, width: 90_000, height: 90_000 }, viewport, 'down');
    expect(camera.zoom).toBe(READABLE_ZOOM);
    expect(at(camera, 0, 0)).toEqual({ x: 64, y: 64 });
  });
});
