import { describe, expect, it } from 'vitest';
import { contextBarStyle } from './V2ContextBar';

const layout = { width: 300, left: 0, right: 1280 };

describe('contextBarStyle', () => {
  it('left-aligns a box anchor above it', () => {
    expect(contextBarStyle(new DOMRect(300, 400, 120, 60), layout)).toMatchObject({ left: 300, top: 296 });
  });
  it('centres a point anchor above the path', () => {
    expect(contextBarStyle(new DOMRect(300, 400, 0, 200), layout)).toMatchObject({ left: 150, top: 296 });
  });
  it('falls below the whole path near the top', () => {
    expect(contextBarStyle(new DOMRect(300, 40, 0, 200), layout).top).toBe(256);
  });
  it('stays inside the visible canvas when panels shrink it', () => {
    expect(contextBarStyle(new DOMRect(-500, 400, 120, 60), { ...layout, left: 300 }).left).toBe(308);
    expect(contextBarStyle(new DOMRect(1200, 400, 120, 60), { ...layout, right: 880 }).left).toBe(572);
  });
});
