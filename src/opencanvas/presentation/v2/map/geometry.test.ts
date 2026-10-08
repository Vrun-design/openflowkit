import { describe, expect, it } from 'vitest';
import { cubicBezier, curve, ease, frameBox, landing, roundedPath, topLeftOpen, zoomAt } from './geometry';

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
  it('lands on the whole map when readable, else on the opened box at 0.6+', () => {
    expect(landing({ width: 800, height: 500 }, { x: 0, y: 0, width: 200, height: 100 }, view).k).toBeGreaterThanOrEqual(0.6);
    const big = landing({ width: 6000, height: 4000 }, { x: 100, y: 100, width: 400, height: 300 }, view);
    expect(big.k).toBeGreaterThanOrEqual(0.6);
    expect(landing({ width: 6000, height: 4000 }, undefined, view).k).toBeLessThan(0.6);
  });
  it('zooms around the cursor', () => {
    const next = zoomAt({ x: 0, y: 0, k: 1 }, 2, 100, 100);
    expect(next).toEqual({ k: 2, x: -100, y: -100 });
  });
  it('rounds bends and survives short segments', () => {
    expect(roundedPath([{ x: 0, y: 0 }, { x: 0, y: 40 }, { x: 40, y: 40 }])).toContain('Q0,40');
    expect(roundedPath([{ x: 0, y: 0 }])).toBe('');
  });
  it('curves between two boxes', () => {
    const c = curve({ x: 0, y: 0, width: 10, height: 10 }, { x: 100, y: 0, width: 10, height: 10 });
    expect(c.d.startsWith('M10,5')).toBe(true);
    expect(c.mid.x).toBeGreaterThan(10);
  });
});

describe('landing on a big map', () => {
  const big = { width: 6000, height: 4000 };
  it('starts at the top-left open box at a readable scale when nothing was opened', () => {
    const cam = landing(big, undefined, view, { x: 100, y: 200, width: 500, height: 400 });
    expect(cam.k).toBe(0.6);
    expect(cam.x + 100 * cam.k).toBeCloseTo(view.pad);
    expect(cam.y + 200 * cam.k).toBeGreaterThanOrEqual(view.top);
  });
  it('still fits a map that is readable whole', () => {
    expect(landing({ width: 800, height: 500 }, undefined, view, { x: 0, y: 0, width: 10, height: 10 }).k).toBeGreaterThanOrEqual(0.6);
  });
  it('anchors at the top-left corner of everything drawn', () => {
    const r = (x: number, y: number) => ({ x, y, width: 10, height: 10 });
    expect(topLeftOpen(new Map([['a', r(500, 0)], ['b', r(100, 10)], ['c', r(0, 300)]]))).toMatchObject({ x: 0, y: 0 });
    expect(topLeftOpen(new Map())).toBeUndefined();
  });
});
