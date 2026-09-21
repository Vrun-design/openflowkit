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
    expect(plan.node.ports.map((port) => port.id)).toEqual([oppositeSide(side)]);
    expect(plan.connector.source).toMatchObject({ nodeId: 'source', portId: side });
    expect(plan.connector.target).toMatchObject({ nodeId: 'new', portId: oppositeSide(side) });
    expect(plan.sourceNode.ports.map((port) => port.id)).toEqual([side]);
  });

  it('keeps the source record identical when the side port already exists', () => {
    const first = planQuickCreate(page(), 'source', 'right', 'new', 'edge');
    const withPort = createTestDocument({ nodes: [first.sourceNode] }).pages[0];
    const second = planQuickCreate(withPort, 'source', 'right', 'new2', 'edge2');
    expect(second.sourceNode).toBe(first.sourceNode);
  });

  it('throws for an unknown source node', () => {
    expect(() => planQuickCreate(page(), 'ghost', 'right', 'new', 'edge')).toThrow(RangeError);
  });
});
