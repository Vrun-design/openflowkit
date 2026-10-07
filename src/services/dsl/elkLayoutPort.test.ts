import { describe, expect, it } from 'vitest';
import type { ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { LayoutGraph } from '../../dsl/layout';
import { backEdges, createElkLayoutPort, type ElkLayoutEngine } from './elkLayoutPort';

const graph: LayoutGraph = {
  rootId: 'root',
  rootPadding: { top: 10, right: 10, bottom: 10, left: 10 },
  groupPadding: { top: 40, right: 10, bottom: 10, left: 10 },
  direction: 'right',
  nodes: [
    { id: 'group', parentId: null, size: { width: 0, height: 0 }, minSize: { width: 200, height: 120 } },
    { id: 'a', parentId: 'group', size: { width: 100, height: 60 } },
    { id: 'b', parentId: null, size: { width: 100, height: 60 } },
  ],
  edges: [{ id: 'e', sourceId: 'a', targetId: 'b' }],
};

function fakeEngine(children: readonly ElkNode[]): ElkLayoutEngine {
  return {
    layout: async (input) => ({ ...input, id: input.id, width: 400, height: 240, children: [...children] }),
  };
}

describe('createElkLayoutPort', () => {
  it('returns parent-relative positions and container sizes', async () => {
    const port = createElkLayoutPort(async () => fakeEngine([
      { id: 'group', x: 20, y: 30, width: 260, height: 140, children: [{ id: 'a', x: 15, y: 50 }] },
      { id: 'b', x: 320, y: 35 },
    ]));
    const result = await port.run(graph);
    expect(result.positions).toEqual({ group: { x: 20, y: 30 }, a: { x: 15, y: 50 }, b: { x: 320, y: 35 } });
    expect(result.sizes).toEqual({ group: { width: 260, height: 140 }, root: { width: 400, height: 240 } });
  });

  it('nests group children into the ELK graph', async () => {
    let seen: { children?: Array<{ id: string; children?: Array<{ id: string }> }> } = {};
    const port = createElkLayoutPort(async () => ({ layout: async (input) => { seen = input as typeof seen; return { ...input, children: [] }; } }));
    await port.run(graph);
    const group = seen.children?.find((node) => node.id === 'group');
    expect(group?.children?.map((node) => node.id)).toEqual(['a']);
    expect(seen.children?.map((node) => node.id)).toEqual(['group', 'b']);
  });

  it('breaks cycles depth-first in declaration order, as Mermaid does, across group borders', () => {
    // User → CDN → (group) GW → Done → User: only the edge closing the loop turns around,
    // so the first-declared node leads the flow even when the loop runs through a group.
    const cyclic: LayoutGraph = {
      ...graph,
      nodes: [
        { id: 'user', parentId: null, size: { width: 100, height: 60 } },
        { id: 'cdn', parentId: null, size: { width: 100, height: 60 } },
        { id: 'edge', parentId: null, size: { width: 0, height: 0 } },
        { id: 'gw', parentId: 'edge', size: { width: 100, height: 60 } },
        { id: 'done', parentId: null, size: { width: 100, height: 60 } },
      ],
      edges: [
        { id: 'e1', sourceId: 'user', targetId: 'cdn' },
        { id: 'e2', sourceId: 'cdn', targetId: 'gw' },
        { id: 'e3', sourceId: 'gw', targetId: 'done' },
        { id: 'e4', sourceId: 'done', targetId: 'user' },
        { id: 'e5', sourceId: 'gw', targetId: 'gw' },
      ],
    };
    expect([...backEdges(cyclic)]).toEqual(['e4', 'e5']);
  });

  it('hands ELK each back edge reversed', async () => {
    let seen: { edges?: Array<{ id: string; sources: string[]; targets: string[] }> } = {};
    const port = createElkLayoutPort(async () => ({ layout: async (input) => { seen = input as typeof seen; return { ...input, children: [] }; } }));
    await port.run({ ...graph, edges: [...graph.edges, { id: 'back', sourceId: 'b', targetId: 'a' }] });
    expect(seen.edges).toEqual([
      { id: 'e', sources: ['a'], targets: ['b'] },
      { id: 'back', sources: ['a'], targets: ['b'] },
    ]);
  });

  it('rejects cancelled runs', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createElkLayoutPort(async () => fakeEngine([])).run(graph, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
