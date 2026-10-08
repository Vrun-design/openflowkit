import ELK from 'elkjs/lib/elk.bundled.js';
import { describe, expect, it } from 'vitest';
import { buildMap } from './build';
import { fromElkLayout, toElkGraph, type ElkNode, type LaidRect } from './elk';
import { FIXTURE } from './fixture';
import { aggregate } from './view';

const model = buildMap(FIXTURE);
const sizeOf = (n: { kind: string }) => (n.kind === 'file' ? { width: 200, height: 46 } : { width: 232, height: 92 });
const measure = (t: string) => t.length * 6;

async function layout(expanded: Set<string>) {
  const { edges } = aggregate(model, expanded);
  const graph = toElkGraph(model, expanded, edges, sizeOf, measure);
  const laid = fromElkLayout((await new ELK().layout(graph as never)) as unknown as ElkNode);
  return { edges, graph, laid };
}

const EPS = 1.5;
const onBorder = (p: { x: number; y: number }, r: LaidRect) => {
  const inX = p.x >= r.x - EPS && p.x <= r.x + r.width + EPS;
  const inY = p.y >= r.y - EPS && p.y <= r.y + r.height + EPS;
  const atX = Math.abs(p.x - r.x) < EPS || Math.abs(p.x - (r.x + r.width)) < EPS;
  const atY = Math.abs(p.y - r.y) < EPS || Math.abs(p.y - (r.y + r.height)) < EPS;
  return (inX && atY) || (inY && atX);
};

describe('toElkGraph', () => {
  it('gives each open box its own arrows and padding, and leaves closed boxes as plain sizes', async () => {
    const open = new Set(['web', 'server']);
    const { graph, edges } = await layout(open);
    const web = graph.children!.find((c) => c.id === 'web')!;
    expect(web.layoutOptions!['elk.padding']).toContain('top=52');
    expect(web.layoutOptions!['elk.nodeSize.minimum']).toBe('(260,90)');
    expect(web.edges!.map((e) => e.id)).toEqual(edges.filter((e) => e.parent === 'web').map((e) => `e:${e.key}`));
    expect(graph.edges!.length).toBe(edges.filter((e) => e.parent === 'root').length);
    expect(graph.layoutOptions!['elk.json.edgeCoords']).toBe('ROOT');
    expect(graph.children!.find((c) => c.id === 'root#files')).toMatchObject({ width: 232, height: 92 });
  });
});

describe('real elkjs layout', () => {
  it('starts and ends every arrow on the border of its two boxes', async () => {
    const { edges, laid } = await layout(new Set(['web', 'server', 'server/routes']));
    expect(laid.edges.length).toBe(edges.length);
    for (const e of edges) {
      const l = laid.edges.find((x) => x.key === e.key)!;
      expect(l.points.length).toBeGreaterThanOrEqual(2);
      expect(onBorder(l.points[0], laid.rects.get(e.from)!), `${e.key} start`).toBe(true);
      expect(onBorder(l.points.at(-1)!, laid.rects.get(e.to)!), `${e.key} end`).toBe(true);
      expect(l.label?.text).toBeTruthy();
    }
  });

  it('encloses every child inside its open box, in absolute coordinates', async () => {
    const open = new Set(['web', 'server', 'server/routes']);
    const { laid } = await layout(open);
    for (const id of open) {
      const r = laid.rects.get(id)!;
      expect(r.open).toBe(true);
      for (const c of model.nodes[id].children) {
        const k = laid.rects.get(c)!;
        expect(k.x, c).toBeGreaterThanOrEqual(r.x);
        expect(k.y, c).toBeGreaterThanOrEqual(r.y + 52 - EPS);
        expect(k.x + k.width, c).toBeLessThanOrEqual(r.x + r.width + EPS);
        expect(k.y + k.height, c).toBeLessThanOrEqual(r.y + r.height + EPS);
      }
    }
    expect(laid.rects.get('server/routes#more')?.open).toBe(false);
    expect(laid.size.width).toBeGreaterThan(0);
  });

  it('lays out the same way twice', async () => {
    const open = new Set(['web', 'server']);
    const a = await layout(open);
    const b = await layout(open);
    expect([...b.laid.rects]).toEqual([...a.laid.rects]);
  });
});
