import { describe, expect, it } from 'vitest';
import { boundsOfNodes } from './bounds';
import { animNode, animPage } from './testFixtures';

describe('boundsOfNodes', () => {
  it('boxes one node at its world size', () => {
    const page = animPage([animNode('a', 10, 20)]);
    expect(boundsOfNodes(page, ['a'])).toEqual({ x: 10, y: 20, width: 100, height: 50 });
  });

  it('unions every named node', () => {
    const page = animPage([animNode('a', 0, 0), animNode('b', 200, 100)]);
    expect(boundsOfNodes(page, ['a', 'b'])).toEqual({ x: 0, y: 0, width: 300, height: 150 });
  });

  // A step can name nothing (an empty hold) or a node deleted since the block
  // was written: the camera must fall back, not frame an empty box at origin.
  it('is undefined for no ids and for ids that are not on the page', () => {
    const page = animPage([animNode('a', 0, 0)]);
    expect(boundsOfNodes(page, [])).toBeUndefined();
    expect(boundsOfNodes(page, ['ghost'])).toBeUndefined();
  });

  it('ignores the missing ones when only some are found', () => {
    const page = animPage([animNode('a', 0, 0)]);
    expect(boundsOfNodes(page, ['a', 'ghost'])).toEqual({ x: 0, y: 0, width: 100, height: 50 });
  });
});
