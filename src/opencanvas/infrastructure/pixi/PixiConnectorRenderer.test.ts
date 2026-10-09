import { expect, it } from 'vitest';
import { createTestConnector, createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';

const at = (x: number, y: number) => ({ translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } });
const arrow = (id: string, to: string) => createTestConnector(id, 'top', to, {
  route: { kind: 'orthogonal', ownership: 'automatic' },
});
const page = {
  ...createTestDocument({
    nodes: [createTestNode('top', { transform: at(100, 0) }), createTestNode('left', { transform: at(0, 300) }), createTestNode('right', { transform: at(220, 300) })],
    connectors: [arrow('to-left', 'left'), arrow('to-right', 'right')],
  }).pages[0],
};

// Without labels (their text needs a canvas), the drawn ink's bounds tell where a line sits.
it('a subset is drawn exactly where the page draws it, even when a sibling shares its box side', () => {
  const ink = (ids?: string[], amongAll = false) => {
    const renderer = new PixiConnectorRenderer();
    renderer.draw(page, true, ids ? new Set(ids) : null, undefined, amongAll);
    const { x, y, width, height } = renderer.container.children[0]!.getLocalBounds().rectangle;
    return { left: x, top: y, right: x + width, bottom: y + height };
  };
  const union = (a: ReturnType<typeof ink>, b: ReturnType<typeof ink>) =>
    ({ left: Math.min(a.left, b.left), top: Math.min(a.top, b.top), right: Math.max(a.right, b.right), bottom: Math.max(a.bottom, b.bottom) });
  const whole = ink();
  for (const amongAll of [false, true]) {
    // Each arrow alone, in its own draw call, lands where the whole page puts it: together they cover exactly the page's ink.
    expect(union(ink(['to-left'], amongAll), ink(['to-right'], amongAll))).toEqual(whole);
  }
  // ...which is not where the arrow would go if the sibling did not exist.
  const isolated = new PixiConnectorRenderer();
  isolated.draw({ ...page, connectors: [page.connectors[0]!] }, true);
  const b = isolated.container.children[0]!.getLocalBounds().rectangle;
  expect({ left: b.x, right: b.x + b.width }).not.toEqual({ left: ink(['to-left']).left, right: ink(['to-left']).right });
});

it('an empty set draws nothing', () => {
  const none = new PixiConnectorRenderer();
  none.draw(page, true, new Set());
  expect(none.getDebugSnapshot().connectors).toBe(0);
});
