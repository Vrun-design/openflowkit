import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { ConnectSide } from './connectHandles';
import { oppositeSide, planQuickCreate, quickCreateOrigin } from './quickCreate';

const SIDES: readonly ConnectSide[] = ['top', 'right', 'bottom', 'left'];

function page() {
  return createTestDocument({
    nodes: [createTestNode('source', {
      size: { width: 160, height: 72 },
      transform: { translation: { x: 100, y: 200 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    })],
  }).pages[0];
}

describe('quick-create', () => {
  it('mirrors sides', () => {
    expect(SIDES.map(oppositeSide)).toEqual(['bottom', 'left', 'top', 'right']);
  });

  it.each(SIDES)('places the new node one size past the %s edge, centred on the axis', (side) => {
    const origin = quickCreateOrigin(page().nodes[0], side);
    const expected = {
      right: { x: 100 + 320, y: 200 },
      left: { x: 100 - 320, y: 200 },
      bottom: { x: 100, y: 200 + 144 },
      top: { x: 100, y: 200 - 144 },
    }[side];
    expect(origin).toEqual(expected);
  });

  it.each(SIDES)('plans node + connector for a %s drag', (side) => {
    const plan = planQuickCreate(page(), 'source', side, 'new', 'edge');
    expect(plan.node.size).toEqual({ width: 160, height: 72 });
    expect(plan.node.kind).toBe(page().nodes[0].kind);
    expect(plan.node.content.label).toBe('');
    expect(plan.node.transform.translation).toEqual(quickCreateOrigin(page().nodes[0], side));
    // Sides stay dynamic: no ports minted, routing faces the partner live.
    expect(plan.node.ports).toEqual([]);
    expect(plan.connector.source).toEqual({ nodeId: 'source', portId: null, anchor: null, point: null });
    expect(plan.connector.target).toEqual({ nodeId: 'new', portId: null, anchor: null, point: null });
  });

  it('a source inside a frame gets its new node in the same frame, beside it (not at the page origin)', () => {
    const doc = createTestDocument({
      nodes: [
        createTestNode('frame', {
          size: { width: 600, height: 600 },
          transform: { translation: { x: 1000, y: 500 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        }),
        { ...createTestNode('child', {
          size: { width: 100, height: 40 },
          transform: { translation: { x: 50, y: 60 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        }), parentId: 'frame' },
      ],
    }).pages[0];
    const plan = planQuickCreate(doc, 'child', 'right', 'new', 'edge');
    expect(plan.node.parentId).toBe('frame');
    expect(plan.node.transform.translation).toEqual({ x: 50 + 200, y: 60 });
  });

  it('a drag released on empty canvas centres the new node on the drop point, in its parent space', () => {
    const doc = createTestDocument({
      nodes: [
        createTestNode('frame', {
          size: { width: 600, height: 600 },
          transform: { translation: { x: 1000, y: 500 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        }),
        { ...createTestNode('child', {
          size: { width: 100, height: 40 },
          transform: { translation: { x: 50, y: 60 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
        }), parentId: 'frame' },
      ],
    }).pages[0];
    const plan = planQuickCreate(doc, 'child', 'bottom', 'new', 'edge', { x: 1300, y: 900 });
    expect(plan.node.parentId).toBe('frame');
    expect(plan.node.transform.translation).toEqual({ x: 300 - 50, y: 400 - 20 });
    const root = planQuickCreate(page(), 'source', 'right', 'new', 'edge', { x: 900, y: 50 });
    expect(root.node.transform.translation).toEqual({ x: 900 - 80, y: 50 - 36 });
  });

  it('throws for an unknown source node', () => {
    expect(() => planQuickCreate(page(), 'ghost', 'right', 'new', 'edge')).toThrow(RangeError);
  });
});
