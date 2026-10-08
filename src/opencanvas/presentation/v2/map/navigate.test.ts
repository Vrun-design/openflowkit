import { describe, expect, it } from 'vitest';
import { buildMap } from '../../../../dsl/map/build';
import { FIXTURE } from '../../../../dsl/map/fixture';
import { labelsFor, layerCounts, neighbours, oneLevel, pickNeighbour, revealExpanded } from './navigate';

const box = (x: number, y: number) => ({ x, y, width: 100, height: 50 });

describe('pickNeighbour', () => {
  const rects = new Map([['a', box(0, 0)], ['b', box(200, 0)], ['c', box(200, 200)], ['d', box(0, 200)]]);
  const all = ['a', 'b', 'c', 'd'];
  it('moves to the nearest sibling in the direction', () => {
    expect(pickNeighbour(rects, all, 'a', 'right')).toBe('b');
    expect(pickNeighbour(rects, all, 'a', 'down')).toBe('d');
    expect(pickNeighbour(rects, all, 'c', 'left')).toBe('d');
    expect(pickNeighbour(rects, all, 'c', 'up')).toBe('b');
  });
  it('stays put at an edge', () => {
    expect(pickNeighbour(rects, all, 'a', 'left')).toBeNull();
    expect(pickNeighbour(rects, all, 'a', 'up')).toBeNull();
    expect(pickNeighbour(rects, all, 'zzz', 'right')).toBeNull();
  });
});

describe('reveal, level, layers, neighbours', () => {
  const model = buildMap(FIXTURE);
  it('reveals by opening every container above', () => {
    const next = revealExpanded(model, new Set(), 'server/routes/r03.ts');
    expect(next.has('server')).toBe(true);
    expect(next.has('server/routes/r03.ts')).toBe(false);
  });
  it('opens one level at a time', () => {
    const one = oneLevel(model, new Set());
    expect(one.has('server')).toBe(true);
    expect(oneLevel(model, one).size).toBeGreaterThan(one.size);
  });
  it('counts only the kinds present', () => {
    const counts = layerCounts(model);
    expect(counts.import).toBeGreaterThan(0);
    expect(counts.call).toBe(1);
    expect(counts.data).toBeUndefined();
  });
  it('keeps the selection, its ancestors, descendants and talkers undimmed', () => {
    const shown = ['web', 'server', 'ext:stripe'];
    const near = neighbours(model, shown, 'web', [{ id: 'server', out: 1, in: 0, links: [] }]);
    expect([...near].sort()).toEqual(['server', 'web']);
  });
});

describe('labelsFor', () => {
  it('keeps names that are unique and adds the parent to ones that collide', () => {
    const m = buildMap({ files: [{ path: 'packages/common/a.ts', loc: 1 }, { path: 'excalidraw/common/b.ts', loc: 1 }, { path: 'excalidraw/solo/c.ts', loc: 1 }, { path: 'packages/solo2/d.ts', loc: 1 }], imports: [] });
    const ids = Object.keys(m.nodes).filter((id) => m.nodes[id].name.replace(/\/$/, '') === 'common' || m.nodes[id].name.replace(/\/$/, '') === 'solo');
    const labels = labelsFor(m, ids);
    const common = ids.filter((id) => m.nodes[id].name.includes('common'));
    expect(new Set(common.map((id) => labels.get(id))).size).toBe(common.length);
    expect(common.every((id) => (labels.get(id) ?? '').includes('/') && (labels.get(id) ?? '') !== m.nodes[id].name)).toBe(true);
  });
});
