import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import { reparentByPosition } from './containment';

const at = (x: number, y: number) => ({ translation: { x, y }, rotationRadians: 0, scale: { x: 1, y: 1 } });

describe('reparentByPosition', () => {
  const section = createTestNode('s', { kind: 'section', size: { width: 400, height: 300 }, transform: at(100, 100) });

  it('adopts a node whose centre lands in a section, keeping its world position', () => {
    const free = createTestNode('a', { transform: at(150, 150) });
    const page = createTestDocument({ nodes: [section, free] }).pages[0];
    const [adopted] = reparentByPosition(page, [free]);
    expect(adopted.parentId).toBe('s');
    expect(adopted.transform.translation).toEqual({ x: 50, y: 50 });
  });

  it('releases a member dragged outside its section', () => {
    const member = createTestNode('a', { parentId: 's', transform: at(500, 50) });
    const page = createTestDocument({ nodes: [section, member] }).pages[0];
    const [released] = reparentByPosition(page, [member]);
    expect(released.parentId).toBeNull();
    expect(released.transform.translation).toEqual({ x: 600, y: 150 });
  });

  it('leaves group members and a moved container\'s own members alone', () => {
    const group = createTestNode('g', { kind: 'group', size: { width: 400, height: 300 }, transform: at(100, 100) });
    const member = createTestNode('a', { parentId: 'g', transform: at(500, 50) });
    const page = createTestDocument({ nodes: [section, group, member] }).pages[0];
    expect(reparentByPosition(page, [member])[0].parentId).toBe('g');
    const inner = createTestNode('b', { parentId: 's', transform: at(10, 10) });
    const page2 = createTestDocument({ nodes: [section, inner] }).pages[0];
    expect(reparentByPosition(page2, [section, inner]).map((node) => node.parentId)).toEqual([null, 's']);
  });
});
