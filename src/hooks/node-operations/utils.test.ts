import { describe, expect, it } from 'vitest';
import { createProcessNode } from './utils';

describe('createProcessNode', () => {
  it('creates blank generic shape content by default', () => {
    const node = createProcessNode('shape-1', { x: 10, y: 20 });

    expect(node.type).toBe('process');
    expect(node.data.label).toBe('');
    expect(node.data.subLabel).toBe('');
    expect(node.width).toBeUndefined();
    expect(node.height).toBeUndefined();
  });
});
