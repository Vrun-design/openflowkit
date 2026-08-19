import { describe, expect, it } from 'vitest';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { DEFAULT_NODE_CONTENT_LAYOUT } from './model';
import { setNodeContentLayout } from './editing';

describe('node content layout editing', () => {
  it('returns immutable JSON-safe node content', () => {
    const node = createTestNode('node-1');
    const next = setNodeContentLayout(node, {
      ...DEFAULT_NODE_CONTENT_LAYOUT,
      iconPlacement: 'right',
    });
    expect(next).not.toBe(node);
    expect(next.content.contentLayout).toMatchObject({ iconPlacement: 'right' });
    expect(JSON.parse(JSON.stringify(next))).toEqual(next);
    expect(node.content.contentLayout).toBeUndefined();
  });
});
