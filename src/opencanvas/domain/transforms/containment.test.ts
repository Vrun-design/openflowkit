import { describe, expect, it } from 'vitest';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';
import type { JsonObject } from '../document/json';
import { adoptOnInsert, reparentByPosition } from './containment';

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

describe('adoptOnInsert', () => {
  const free = createTestNode('n', { transform: at(150, 150), size: { width: 100, height: 50 } });
  const sectionWith = (content: JsonObject, metadata: JsonObject = {}) =>
    createTestNode('s', { kind: 'section', size: { width: 400, height: 300 }, transform: at(100, 100), content, metadata });
  const adopt = (nodes: ReturnType<typeof createTestNode>[], node = free) => adoptOnInsert(createTestDocument({ nodes }).pages[0], node).parentId;

  it('joins a visible, unlocked frame', () => {
    expect(adopt([sectionWith({})])).toBe('s');
  });

  it('never joins a hidden or locked frame, which would hide or lock the new node', () => {
    expect(adopt([sectionWith({ sectionHidden: true })])).toBeNull();
    expect(adopt([sectionWith({ sectionLocked: true })])).toBeNull();
  });

  it('never joins a generated diagram or C4 view frame, or a group inside one: regenerating would delete it', () => {
    expect(adopt([sectionWith({}, { dsl: { family: 'flowchart' } })])).toBeNull();
    expect(adopt([sectionWith({}, { dsl: { arch: { view: 'v' } } })])).toBeNull();
    const inner = createTestNode('g', { kind: 'section', parentId: 's', size: { width: 300, height: 200 }, transform: at(10, 10) });
    expect(adopt([sectionWith({}, { dsl: { family: 'architecture' } }), inner])).toBeNull();
  });

  it('leaves an inserted container where it is', () => {
    const frame = createTestNode('f', { kind: 'frame', transform: at(150, 150), size: { width: 100, height: 50 } });
    expect(adopt([sectionWith({})], frame)).toBeNull();
  });
});

describe('reparentByPosition between overlapping frames', () => {
  it('drops into the topmost one, not the first in document order', () => {
    const low = createTestNode('low', { kind: 'section', zIndex: 1, size: { width: 400, height: 300 }, transform: at(100, 100) });
    const high = createTestNode('high', { kind: 'section', zIndex: 5, size: { width: 400, height: 300 }, transform: at(120, 120) });
    const node = createTestNode('a', { transform: at(200, 200) });
    const page = createTestDocument({ nodes: [low, high, node] }).pages[0];
    expect(reparentByPosition(page, [node])[0].parentId).toBe('high');
  });
});
