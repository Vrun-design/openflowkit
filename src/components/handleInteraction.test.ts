import { describe, expect, it } from 'vitest';
import { getConnectorHandleStyle, getHandlePointerEvents, getV2HandleVisibilityClass } from './handleInteraction';

describe('handle interaction policy', () => {
  it('keeps pointer events enabled so selected nodes remain connectable', () => {
    expect(getHandlePointerEvents(true, true)).toBe('all');
    expect(getHandlePointerEvents(true, false)).toBe('all');
    expect(getHandlePointerEvents(false, true)).toBe('all');
  });

  it('includes connecting-state class by default', () => {
    const className = getV2HandleVisibilityClass(false);
    expect(className).toContain('[.is-connecting_&]:opacity-100');
    expect(className).toContain('flow-handle-hitarea');
  });

  it('can disable connecting-state and scale classes', () => {
    const className = getV2HandleVisibilityClass(true, { includeConnectingState: false, includeScale: false });
    expect(className).toContain('opacity-100');
    expect(className).not.toContain('scale-110');
    expect(className).not.toContain('[.is-connecting_&]:opacity-100');
  });

  it('keeps connector anchors pinned to node edges even when selected', () => {
    const selectedTop = getConnectorHandleStyle('top', true, 'all');
    const unselectedTop = getConnectorHandleStyle('top', false, 'all');
    expect(selectedTop.top).toBe(0);
    expect(unselectedTop.top).toBe(0);

    const selectedRight = getConnectorHandleStyle('right', true, 'all');
    const unselectedRight = getConnectorHandleStyle('right', false, 'all');
    expect(selectedRight.left).toBe('100%');
    expect(unselectedRight.left).toBe('100%');
  });

  it('keeps connector anchors above node content and on brand color', () => {
    const style = getConnectorHandleStyle('left', true, 'all');
    expect(style.zIndex).toBe(100);
    expect(style.backgroundColor).toBe('var(--brand-primary)');
  });
});
