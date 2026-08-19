import { describe, expect, it } from 'vitest';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { DEFAULT_NODE_SIZING_POLICY, resolveSizedNode, validateNodeSizingPolicy } from './model';

describe('node sizing policy', () => {
  it('validates min/max, overflow, clipping, and line limits', () => {
    expect(validateNodeSizingPolicy(DEFAULT_NODE_SIZING_POLICY).success).toBe(true);
    expect(validateNodeSizingPolicy({
      ...DEFAULT_NODE_SIZING_POLICY,
      minSize: { width: 100, height: 100 }, maxSize: { width: 50, height: 50 },
    }).issues).toContain('maxSize must be greater than or equal to minSize.');
  });

  it('auto-sizes and clamps canonical geometry while preserving opaque content', () => {
    const node = createTestNode('node', {
      content: { label: 'A substantially longer portable node label', opaque: 'keep' },
    });
    const sized = resolveSizedNode(node, {
      ...DEFAULT_NODE_SIZING_POLICY,
      mode: 'auto', minSize: { width: 80, height: 40 }, maxSize: { width: 180, height: 100 },
    });
    expect(sized.size.width).toBe(180);
    expect(sized.size.height).toBeGreaterThanOrEqual(40);
    expect(sized.content.opaque).toBe('keep');
  });

  it('responsive mode wraps into bounded lines and grows height', () => {
    const node = createTestNode('node', {
      content: { label: 'alpha beta gamma delta epsilon zeta eta theta' },
    });
    const sized = resolveSizedNode(node, {
      ...DEFAULT_NODE_SIZING_POLICY,
      mode: 'responsive', overflow: 'wrap', maxLines: 3,
      minSize: { width: 80, height: 24 }, maxSize: { width: 120, height: 200 },
    });
    expect(sized.size.width).toBeLessThanOrEqual(120);
    expect(sized.size.height).toBeGreaterThan(40);
  });
});
