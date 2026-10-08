import { describe, expect, it } from 'vitest';
import { createDefaultSceneLayer } from '../../domain/document/defaults';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import { absoluteRects, frameAt } from './motionFrame';

const node = (id: string, parentId: string | null, x: number, y: number, kind = 'process'): SceneNode => ({
  id, kind, parentId, layerId: 'default', zIndex: 1,
  transform: { translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } }, size: { width: 100, height: 50 },
  content: {}, appearance: {}, ports: [], metadata: {}, extensions: {},
});
const page = (nodes: SceneNode[]): ScenePage => ({
  id: 'map', name: 'Map', diagramKind: 'architecture', layers: [createDefaultSceneLayer()], nodes, connectors: [], metadata: {}, extensions: {},
});

describe('motion frames', () => {
  it('adds up parent offsets into absolute rects', () => {
    const rects = absoluteRects(page([node('a', null, 10, 20), node('b', 'a', 5, 6)]));
    expect(rects.get('b')).toMatchObject({ x: 15, y: 26, width: 100, height: 50 });
  });

  it('groups boxes by opacity, flattens them and records where and how opaque each is drawn', () => {
    const a = node('a', null, 0, 0);
    const b = node('b', 'a', 5, 5);
    const c = node('c', null, 0, 0);
    const from = { x: 0, y: 0, width: 10, height: 10 };
    const to = { x: 100, y: 0, width: 20, height: 10 };
    const cur = new Map();
    const items = [
      { id: 'a', from, to, fade: null, a0: 1 }, { id: 'b', from, to, fade: 'in' as const, a0: 0 }, { id: 'c', from, to, fade: 'out' as const, a0: 1 },
      { id: 'ghost', from, to, fade: null, a0: 1 },
    ];
    const byId = new Map([a, b, c].map((n) => [n.id, n]));
    const end = frameAt(items, (id) => byId.get(id), 1, cur, new Map());
    expect(end.groups.map((g) => [g.alpha, g.nodes.map((n) => n.id)])).toEqual([[1, ['a', 'b']], [0, ['c']]]);
    expect(end.groups[0]!.nodes[1]).toMatchObject({ id: 'b', parentId: null, transform: { translation: { x: 100, y: 0 } }, size: { width: 20, height: 10 } });
    expect(cur.get('a')).toMatchObject(to);
    expect(cur.has('ghost')).toBe(false);
    const start = frameAt(items, (id) => byId.get(id), 0, cur, new Map());
    expect(start.groups.map((g) => g.alpha)).toEqual([1, 0]);
    expect(cur.get('a')).toMatchObject(from);
  });

  it('starts a fade from the opacity the box is drawn at', () => {
    const cur = new Map();
    const half = { x: 0, y: 0, width: 10, height: 10 };
    // A box that was fading out at 0.4 and is wanted again: it comes back from 0.4, not from 0 or 1.
    const frame = frameAt([{ id: 'a', from: half, to: half, fade: null, a0: 0.4 }], (id) => node(id, null, 0, 0), 0, cur, new Map());
    expect(frame.groups[0]!.alpha).toBe(0.4);
    expect(frameAt([{ id: 'a', from: half, to: half, fade: null, a0: 0.4 }], (id) => node(id, null, 0, 0), 1, cur, new Map()).groups[0]!.alpha).toBe(1);
  });
});
