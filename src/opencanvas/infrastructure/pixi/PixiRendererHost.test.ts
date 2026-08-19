import { describe, expect, it } from 'vitest';
import { PIXI_HOST_STAGE_DESTROY_OPTIONS, PixiRendererHost } from './PixiRendererHost';

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
});
