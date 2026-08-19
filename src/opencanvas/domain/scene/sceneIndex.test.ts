import { describe, expect, it } from 'vitest';
import { createBounds2d } from '../geometry/bounds';
import {
  createTestConnector,
  createTestDocument,
  createTestNode,
} from '../../testing/builders/documentBuilder';
import { getDescendantNodeIds, getIndexedSceneObject, querySceneBounds } from './queries';
import { createSceneIndex } from './spatialIndex';

describe('OpenCanvas scene index', () => {
  it('composes parent transforms into child world bounds', () => {
    const parent = createTestNode('parent', {
      kind: 'group',
      transform: { translation: { x: 100, y: 200 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
      size: { width: 400, height: 300 },
    });
    const child = createTestNode('child', {
      parentId: 'parent',
      transform: { translation: { x: 20, y: 30 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const index = createSceneIndex(createTestDocument({ nodes: [parent, child] }).pages[0]);

    expect(getIndexedSceneObject(index, 'node', 'child')?.bounds).toEqual({
      x: 120,
      y: 230,
      width: 100,
      height: 50,
    });
  });

  it('indexes the axis-aligned envelope of rotated nodes', () => {
    const node = createTestNode('rotated', {
      transform: {
        translation: { x: 10, y: 20 },
        rotationRadians: Math.PI / 2,
        scale: { x: 1, y: 1 },
      },
      size: { width: 100, height: 40 },
    });
    const bounds = getIndexedSceneObject(
      createSceneIndex(createTestDocument({ nodes: [node] }).pages[0]),
      'node',
      'rotated'
    )?.bounds;

    expect(bounds?.x).toBeCloseTo(-30);
    expect(bounds?.y).toBeCloseTo(20);
    expect(bounds?.width).toBeCloseTo(40);
    expect(bounds?.height).toBeCloseTo(100);
  });

  it('queries exact bounds in deterministic render order', () => {
    const container = createTestNode('container', {
      kind: 'section',
      size: { width: 500, height: 300 },
    });
    const low = createTestNode('low', {
      zIndex: 1,
      transform: { translation: { x: 20, y: 20 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const high = createTestNode('high', {
      zIndex: 2,
      transform: { translation: { x: 200, y: 20 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const connector = createTestConnector('edge', 'low', 'high');
    const page = createTestDocument({ nodes: [high, container, low], connectors: [connector] })
      .pages[0];
    const index = createSceneIndex(page, 64);

    expect(
      querySceneBounds(index, createBounds2d(0, 0, 500, 300)).map(({ kind, id }) => `${kind}:${id}`)
    ).toEqual(['container:container', 'connector:edge', 'node:low', 'node:high']);
  });

  it('filters hidden layers and object kinds', () => {
    const layers = [
      { id: 'default', name: 'Default', visible: true, locked: false },
      { id: 'hidden', name: 'Hidden', visible: false, locked: false },
    ];
    const visible = createTestNode('visible');
    const hidden = createTestNode('hidden', { layerId: 'hidden' });
    const index = createSceneIndex(
      createTestDocument({ nodes: [visible, hidden], layers }).pages[0]
    );
    const viewport = createBounds2d(-10, -10, 200, 100);

    expect(querySceneBounds(index, viewport).map((item) => item.id)).toEqual(['visible']);
    expect(
      querySceneBounds(index, viewport, { includeHidden: true }).map((item) => item.id)
    ).toEqual(['visible', 'hidden']);
    expect(querySceneBounds(index, viewport, { kinds: new Set(['connector']) })).toEqual([]);
  });

  it('handles negative cells, touching bounds, and huge overflow objects', () => {
    const negative = createTestNode('negative', {
      transform: { translation: { x: -100, y: -50 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    });
    const huge = createTestNode('huge', { size: { width: 100_000, height: 100_000 } });
    const index = createSceneIndex(createTestDocument({ nodes: [negative, huge] }).pages[0], 10);

    expect(index.overflowObjectKeys.size).toBe(1);
    expect(querySceneBounds(index, createBounds2d(-1, -1, 1, 1)).map((item) => item.id)).toContain(
      'negative'
    );
    expect(
      querySceneBounds(index, createBounds2d(90_000, 90_000, 10, 10)).map((item) => item.id)
    ).toEqual(['huge']);
  });

  it('returns descendants in stable breadth-first document order', () => {
    const nodes = [
      createTestNode('root', { kind: 'group' }),
      createTestNode('a', { parentId: 'root' }),
      createTestNode('b', { parentId: 'root' }),
      createTestNode('grandchild', { parentId: 'a' }),
    ];
    const index = createSceneIndex(createTestDocument({ nodes }).pages[0]);
    expect(getDescendantNodeIds(index, 'root')).toEqual(['a', 'b', 'grandchild']);
  });

  it('rejects invalid pages and cell sizes', () => {
    const page = createTestDocument({ nodes: [createTestNode('node', { layerId: 'missing' })] })
      .pages[0];
    expect(() => createSceneIndex(page)).toThrow(/invalid scene page/);
    expect(() => createSceneIndex(createTestDocument().pages[0], 0)).toThrow(/greater than zero/);
    const index = createSceneIndex(createTestDocument().pages[0]);
    expect(() => querySceneBounds(index, { x: Number.NaN, y: 0, width: 10, height: 10 })).toThrow(
      /query bounds/
    );
  });
});
