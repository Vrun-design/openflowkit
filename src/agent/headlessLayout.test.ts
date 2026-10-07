import { describe, expect, it } from 'vitest';
import type { LayoutGraph } from '../dsl/layout';
import { HEADLESS_LAYOUT_LIMITS, headlessElkLayout } from './headlessLayout';

function graph(nodes: number, edges: number): LayoutGraph {
  return {
    rootId: 'root', direction: 'right',
    rootPadding: { top: 0, right: 0, bottom: 0, left: 0 }, groupPadding: { top: 0, right: 0, bottom: 0, left: 0 },
    nodes: Array.from({ length: nodes }, (_, index) => ({ id: `n${index}`, parentId: null, size: { width: 100, height: 60 } })),
    edges: Array.from({ length: edges }, (_, index) => ({ id: `e${index}`, sourceId: `n${index % nodes}`, targetId: `n${(index + 1) % nodes}` })),
  };
}

describe('headlessElkLayout', () => {
  it('lays a small graph out with ELK', async () => {
    const result = await headlessElkLayout.run(graph(3, 2));
    expect(Object.keys(result.positions)).toEqual(['n0', 'n1', 'n2']);
    expect(result.positions.n1!.x).toBeGreaterThan(result.positions.n0!.x);
  });

  it('refuses, at once, a graph that would block for minutes', async () => {
    const started = Date.now();
    await expect(headlessElkLayout.run(graph(HEADLESS_LAYOUT_LIMITS.nodes + 1, 0))).rejects.toThrow(/1001 shapes/);
    await expect(headlessElkLayout.run(graph(250, HEADLESS_LAYOUT_LIMITS.edges + 1))).rejects.toThrow(/401 connections/);
    expect(Date.now() - started).toBeLessThan(500);
  });
});
