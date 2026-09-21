import { describe, expect, it } from 'vitest';
import type { ElkNode } from 'elkjs/lib/elk.bundled.js';
import type { LayoutGraph } from '../../dsl/layout';
import { createElkLayoutPort, type ElkLayoutEngine } from './elkLayoutPort';

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

  it('rejects cancelled runs', async () => {
    const controller = new AbortController();
    controller.abort();
    await expect(createElkLayoutPort().run(graph, controller.signal)).rejects.toMatchObject({ name: 'AbortError' });
  });
});
