import { describe, expect, it } from 'vitest';
import { connectHandlePoints, nearestSide, pickConnectHandle, sideAnchor } from './connectHandles';

const bounds = { x: 100, y: 100, width: 200, height: 100 };

describe('connect handles', () => {
  it('places handles outside each side midpoint, scaled by zoom', () => {
    const points = Object.fromEntries(connectHandlePoints(bounds, 2).map(({ side, point }) => [side, point]));
    expect(points.right).toEqual({ x: 311, y: 150 });
    expect(points.top).toEqual({ x: 200, y: 89 });
    expect(sideAnchor(bounds, 'left')).toEqual({ x: 100, y: 150 });
  });

  it('picks a handle within a screen radius and nothing elsewhere', () => {
    const camera = { x: 0, y: 0, zoom: 1 };
    expect(pickConnectHandle(bounds, { x: 322, y: 152 }, camera)).toBe('right');
    expect(pickConnectHandle(bounds, { x: 200, y: 150 }, camera)).toBeNull();
  });

  it('chooses the nearest side relative to the node shape', () => {
    expect(nearestSide(bounds, { x: 350, y: 150 })).toBe('right');
    expect(nearestSide(bounds, { x: 200, y: 30 })).toBe('top');
    expect(nearestSide(bounds, { x: 110, y: 160 })).toBe('left');
  });
});
