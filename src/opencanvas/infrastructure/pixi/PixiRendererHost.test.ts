import { describe, expect, it } from 'vitest';
import { PIXI_HOST_STAGE_DESTROY_OPTIONS, PixiRendererHost } from './PixiRendererHost';
import { createTestDocument, createTestNode } from '../../testing/builders/documentBuilder';

describe('Pixi renderer host lifecycle', () => {
  it('does not recursively destroy pooled CanvasText children during teardown', () => {
    expect(PIXI_HOST_STAGE_DESTROY_OPTIONS).toEqual({ children: false });
  });

  it('allows idempotent teardown before asynchronous renderer initialization', () => {
    const statuses: string[] = [];
    const host = new PixiRendererHost({ onStatusChange: (status) => statuses.push(status) });

    expect(() => host.destroy()).not.toThrow();
    expect(() => host.destroy()).not.toThrow();
    expect(statuses).toEqual(['destroyed']);
  });

  it('ignores resize before initialization', () => {
    const host = new PixiRendererHost();
    expect(() => host.resize()).not.toThrow();
    expect(host.getViewportSize()).toEqual({ width: 0, height: 0 });
    host.destroy();
  });

  it('preserves valid selection synchronously when a document commit replaces the page', () => {
    const host = new PixiRendererHost();
    const node = createTestNode('selected');
    host.setPage(createTestDocument({ nodes: [node] }).pages[0]);
    host.setSelection([node.id], node.id);

    const moved = {
      ...node,
      transform: { ...node.transform, translation: { x: 10, y: 5 } },
    };
    host.setPage(createTestDocument({ nodes: [moved] }).pages[0]);

    // Default camera is (64, 64, 1); south-east handle follows committed geometry.
    expect(host.pickTransformHandle({ x: 174, y: 119 })).toBe('south-east');
    host.destroy();
  });
});
