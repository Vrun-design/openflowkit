import { describe, expect, it } from 'vitest';
import { semanticDetailLevel } from '../../infrastructure/pixi/viewportProjection';
import { cubicBezier, ease, frameBox, landing, READABLE, topLeftOpen, zoomAt } from './geometry';

const view = { width: 1000, height: 700, top: 50, bottom: 50, pad: 24 };

describe('geometry', () => {
  it('eases from 0 to 1, monotonic, front-loaded', () => {
    expect(ease(0)).toBe(0);
    expect(ease(1)).toBe(1);
    expect(ease(0.25)).toBeGreaterThan(0.5);
    const linear = cubicBezier(0, 0, 1, 1);
    expect(linear(0.3)).toBeCloseTo(0.3, 3);
  });
  it('frames a box centred, clamped to maxK', () => {
    const cam = frameBox({ x: 0, y: 0, width: 100, height: 100 }, view, 1);
    expect(cam.k).toBe(1);
    expect(cam.x + 50 * cam.k).toBeCloseTo(500);
  });
  it('keeps the landing floor in the editor\'s full-detail band, with a margin', () => {
    // Landing below this would hide every label (compact detail): the floor must stay above the editor's threshold.
    expect(semanticDetailLevel(READABLE)).toBe('full');
    expect(semanticDetailLevel(READABLE - 0.04)).toBe('full');
    expect(READABLE).toBeGreaterThanOrEqual(0.7);
  });
  it('lands on the whole map when readable, else on the opened box, never below the floor', () => {
    expect(landing({ width: 800, height: 500 }, { x: 0, y: 0, width: 200, height: 100 }, view).k).toBeGreaterThanOrEqual(READABLE);
    const big = landing({ width: 6000, height: 4000 }, { x: 100, y: 100, width: 400, height: 300 }, view);
    expect(big.k).toBeGreaterThanOrEqual(READABLE);
    // Nothing opened on a map too big to fit: the top-left corner at the floor, not the whole map at 10%.
    const none = landing({ width: 6000, height: 4000 }, undefined, view);
    expect(none.k).toBe(READABLE);
    expect(none.x).toBe(view.pad);
  });
  it('fits an opened box that fits at the floor, and starts a box that does not at its header', () => {
    const size = { width: 6000, height: 4000 };
    const fits = landing(size, { x: 1000, y: 1000, width: 600, height: 300 }, view);
    expect(fits.k).toBeGreaterThanOrEqual(READABLE);
    expect(fits.x + 1300 * fits.k).toBeCloseTo(view.width / 2);
    const huge = { x: 1000, y: 1000, width: 3000, height: 2500 };
    const head = landing(size, huge, view);
    expect(head.k).toBe(READABLE);
    expect(head.x + huge.x * head.k).toBeCloseTo(view.pad);
    expect(head.y + huge.y * head.k).toBeCloseTo(view.top + view.pad);
  });
  it('prefers the context box (the closed one\'s parent) when it fits at the floor', () => {
    const size = { width: 6000, height: 4000 };
    const box = { x: 1000, y: 1000, width: 200, height: 100 };
    const parent = { x: 900, y: 900, width: 700, height: 400 };
    const cam = landing(size, box, view, undefined, parent);
    expect(cam.x + 1250 * cam.k).toBeCloseTo(view.width / 2);
    const wide = landing(size, box, view, undefined, { x: 0, y: 0, width: 5000, height: 3000 });
    expect(wide.x + 1100 * wide.k).toBeCloseTo(view.width / 2);
  });
  it('zooms around the cursor', () => {
    const next = zoomAt({ x: 0, y: 0, k: 1 }, 2, 100, 100);
    expect(next).toEqual({ k: 2, x: -100, y: -100 });
  });
});

describe('landing on a big map', () => {
  const big = { width: 6000, height: 4000 };
  it('starts at the top-left open box at a readable scale when nothing was opened', () => {
    const cam = landing(big, undefined, view, { x: 100, y: 200, width: 500, height: 400 });
    expect(cam.k).toBe(READABLE);
    expect(cam.x + 100 * cam.k).toBeCloseTo(view.pad);
    expect(cam.y + 200 * cam.k).toBeGreaterThanOrEqual(view.top);
  });
  it('still fits a map that is readable whole', () => {
    expect(landing({ width: 800, height: 500 }, undefined, view, { x: 0, y: 0, width: 10, height: 10 }).k).toBeGreaterThanOrEqual(READABLE);
  });
  it('anchors at the top-left corner of everything drawn', () => {
    const r = (x: number, y: number) => ({ x, y, width: 10, height: 10 });
    expect(topLeftOpen(new Map([['a', r(500, 0)], ['b', r(100, 10)], ['c', r(0, 300)]]))).toMatchObject({ x: 0, y: 0 });
    expect(topLeftOpen(new Map())).toBeUndefined();
  });
});
