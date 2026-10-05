import { describe, expect, it } from 'vitest';
import { createTestNode } from '../../testing/builders/documentBuilder';
import { resolveNodeStyle } from './nodeStyle';
import { architectureCardLayout } from './architectureCardLayout';

describe('architecture card text layout', () => {
  it('bounds long titles, technology and descriptions without overlap', () => {
    const node = createTestNode('card', {
      kind: 'architecture',
      size: { width: 240, height: 152 },
      content: {
        label: 'Order processing service with a long descriptive title',
        archProviderLabel: 'Container',
        archResourceType: 'A very long technology choice',
        archEnvironment:
          'This service validates orders and distributes them to downstream services. '.repeat(10),
      },
    });
    const layout = architectureCardLayout(node, resolveNodeStyle(node));
    expect(layout.title.lines.length).toBeLessThanOrEqual(2);
    expect(layout.detail.lines.length).toBeLessThanOrEqual(2);
    expect(layout.detailY).toBeGreaterThan(layout.titleY + layout.title.height);
    expect(layout.detailY + layout.detail.height).toBeLessThan(node.size.height);
    expect(layout.detail.truncated).toBe(true);
    expect(layout.resource.truncated).toBe(true);
  });

  it('gives the element type the header space the technology does not need', () => {
    const node = createTestNode('card', {
      kind: 'architecture',
      size: { width: 240, height: 152 },
      content: { label: 'Shop', archProviderLabel: 'Software system', archResourceType: 'React' },
    });
    const layout = architectureCardLayout(node, resolveNodeStyle(node));
    expect(layout.provider.displayText).toBe('Software system');
    expect(layout.resource.displayText).toBe('React');
    expect(layout.provider.width + layout.resource.width).toBeLessThanOrEqual(240 - 64);
  });
});
