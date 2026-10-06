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

  it('drops below the selection, clear of its + handle, when the spot above holds a connector label', () => {
    const node = new DOMRect(300, 400, 120, 60);
    const label = new DOMRect(320, 340, 90, 20);
    expect(contextBarStyle(node, layout, [label]).top).toBe(500);
    // A label elsewhere changes nothing.
    expect(contextBarStyle(node, layout, [new DOMRect(900, 340, 90, 20)]).top).toBe(296);
    // Labels on both sides: stay above, where people look first, lifted clear of the label.
    expect(contextBarStyle(node, layout, [label, new DOMRect(320, 510, 90, 20)]).top).toBe(284);
  });

  it('a selected line between two shapes puts the bar above the upper shape, not on it', () => {
    // Line from the bottom of A (y 224-296) down to C (y 564-636); the point anchor spans the path.
    const line = new DOMRect(400, 296, 0, 304);
    const a = new DOMRect(280, 224, 160, 72);
    const c = new DOMRect(380, 564, 160, 72);
    const top = contextBarStyle(line, layout, [a, c]).top as number;
    expect(top + 48).toBeLessThanOrEqual(a.y - 8);
  });
});
