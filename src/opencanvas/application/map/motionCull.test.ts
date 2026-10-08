import { describe, expect, it } from 'vitest';
import { cullMotion, movedView, MOTION_OVERSCAN_PX } from './motionCull';
import type { MotionItem } from './planMotion';

const item = (id: string, from: [number, number], to: [number, number], fade: MotionItem['fade'] = null): MotionItem =>
  ({ id, from: { x: from[0], y: from[1], width: 100, height: 60 }, to: { x: to[0], y: to[1], width: 100, height: 60 }, fade, a0: 1 });
const size = { width: 1000, height: 700 };
const still = { x: 0, y: 0, zoom: 1 };

describe('movedView', () => {
  it('is the viewport with the overscan around it when the camera stays', () => {
    expect(movedView(still, null, size)).toEqual({ x: -MOTION_OVERSCAN_PX, y: -MOTION_OVERSCAN_PX, width: 1000 + 2 * MOTION_OVERSCAN_PX, height: 700 + 2 * MOTION_OVERSCAN_PX });
  });
  it('covers where the camera starts, ends and passes', () => {
    const view = movedView(still, { x: -3000, y: -2000, zoom: 1 }, size);
    expect(view.x).toBeLessThanOrEqual(-MOTION_OVERSCAN_PX);
    expect(view.x + view.width).toBeGreaterThanOrEqual(3000 + 1000 + MOTION_OVERSCAN_PX);
    expect(view.y + view.height).toBeGreaterThanOrEqual(2000 + 700);
  });
  it('widens with the world a zoomed-out end camera shows', () => {
    const view = movedView({ x: 0, y: 0, zoom: 1 }, { x: 0, y: 0, zoom: 0.5 }, size);
    expect(view.x + view.width).toBeGreaterThanOrEqual(2000);
  });
});

describe('cullMotion', () => {
  const view = movedView(still, null, size);
  it('keeps what is on screen at either end, or crosses the screen on the way', () => {
    const items = [item('on', [100, 100], [120, 100]), item('in', [5000, 100], [200, 100], 'in'), item('across', [-2000, 100], [2000, 100])];
    expect(cullMotion(items, view).live.map((i) => i.id)).toEqual(['on', 'in', 'across']);
  });
  it('jumps what stays off screen the whole move, fading ones included', () => {
    const items = [item('far', [4000, 3000], [4100, 3000]), item('gone', [-4000, 100], [-3900, 100], 'out'), item('near', [1100, 100], [1100, 200])];
    const { live, jumped } = cullMotion(items, view);
    expect(jumped.map((i) => i.id)).toEqual(['far', 'gone']);
    // Inside the overscan a box about to slide in is still drawn.
    expect(live.map((i) => i.id)).toEqual(['near']);
  });
});
