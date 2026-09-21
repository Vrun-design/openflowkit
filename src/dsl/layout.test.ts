import { describe, expect, it } from 'vitest';
import { deterministicLayout, type LayoutGraph } from './layout';

const graph: LayoutGraph = {
  rootId: 'root',
  rootPadding: { top: 28, right: 28, bottom: 28, left: 28 },
  groupPadding: { top: 54, right: 22, bottom: 22, left: 22 },
  direction: 'right',
  nodes: [
    { id: 'g1', parentId: null, size: { width: 0, height: 0 }, minSize: { width: 200, height: 140 } },
    { id: 'g2', parentId: null, size: { width: 0, height: 0 }, minSize: { width: 200, height: 140 } },
    { id: 'a', parentId: 'g1', size: { width: 120, height: 52 } },
    { id: 'b', parentId: 'g1', size: { width: 120, height: 52 } },
    { id: 'c', parentId: 'g2', size: { width: 120, height: 52 } },
    { id: 'loose', parentId: null, size: { width: 120, height: 52 } },
  ],
  edges: [],
};

describe('deterministicLayout', () => {
  it('sizes containers around their children and nests coordinates', async () => {
    const result = await deterministicLayout.run(graph);
    expect(result.sizes.g1).toEqual({ width: 332, height: 140 });
    expect(result.positions.a).toEqual({ x: 22, y: 54 });
    expect(result.positions.b).toEqual({ x: 22 + 120 + 48, y: 54 });
    expect(result.sizes.root!.width).toBeGreaterThan(result.sizes.g1!.width + result.sizes.g2!.width);
  });

  it('reverses child order for left and up directions', async () => {
    const left = await deterministicLayout.run({ ...graph, direction: 'left' });
    const right = await deterministicLayout.run({ ...graph, direction: 'right' });
    expect(left.positions.g1!.x).toBeGreaterThan(left.positions.g2!.x);
    expect(right.positions.g1!.x).toBeLessThan(right.positions.g2!.x);
    expect(left.positions.a!.x).toBeGreaterThanOrEqual(0);
  });

  it('rejects an aborted run', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(deterministicLayout.run(graph, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
