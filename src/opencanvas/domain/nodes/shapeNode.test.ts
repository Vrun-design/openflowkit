import { describe, expect, it } from 'vitest';
import { createTestDocument } from '../../testing/builders/documentBuilder';
import { createShapeNode, defaultShapeSize, SHAPE_KINDS } from './shapeNode';

const page = () => createTestDocument({ nodes: [] }).pages[0];

describe('createShapeNode', () => {
  it('makes a text node with a visible placeholder', () => {
    const node = createShapeNode(page(), { kind: 'text', id: 'n1', at: { x: 4, y: 8 } });
    expect(node.kind).toBe('text');
    expect(node.content.label).toBe('Text');
    expect(node.appearance.fill).toBeUndefined();
  });

  it.each(SHAPE_KINDS.filter((kind) => kind !== 'text'))(
    'makes a process node carrying the %s outline',
    (kind) => {
      const node = createShapeNode(page(), { kind, id: 'n1', at: { x: 0, y: 0 } });
      expect(node.kind).toBe('process');
      expect(node.content.shape).toBe(kind);
      expect(node.content.label).toBe('');
      expect(node.appearance).toMatchObject({ fill: '#fdfdfb', strokeWidth: 1.5 });
    }
  );

  it('stacks new nodes above the page and honours an explicit size', () => {
    const document = createTestDocument({ nodes: [] });
    const first = createShapeNode(document.pages[0], { kind: 'rectangle', id: 'a', at: { x: 0, y: 0 } });
    const pageWithNode = { ...document.pages[0], nodes: [first] };
    const second = createShapeNode(pageWithNode, {
      kind: 'rectangle', id: 'b', at: { x: 0, y: 0 }, size: { width: 10, height: 20 },
    });
    expect(second.zIndex).toBe(first.zIndex + 1);
    expect(second.size).toEqual({ width: 10, height: 20 });
  });

  it('sizes round shapes larger than boxes', () => {
    expect(defaultShapeSize('circle').height).toBeGreaterThan(defaultShapeSize('rectangle').height);
    expect(defaultShapeSize('text')).toEqual({ width: 160, height: 48 });
  });
});
