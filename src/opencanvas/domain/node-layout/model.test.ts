import { describe, expect, it } from 'vitest';
import { DEFAULT_NODE_CONTENT_LAYOUT, layoutNodeContent, validateNodeContentLayout } from './model';

describe('node content layout model', () => {
  it('preserves legacy top-centered defaults when field is absent', () => {
    expect(validateNodeContentLayout(undefined)).toEqual({
      success: true,
      value: DEFAULT_NODE_CONTENT_LAYOUT,
      issues: [],
    });
  });

  it('rejects unsafe persisted values without leaking them into geometry', () => {
    const result = validateNodeContentLayout({
      version: 1,
      horizontal: 'outside',
      vertical: 'center',
      iconPlacement: 'free',
      labelAlignment: 'center',
      padding: { top: -1, right: 8, bottom: 8, left: 8 },
      gap: -4,
      iconScale: 99,
      freeIconPosition: { x: 2, y: 0.5 },
    });
    expect(result.success).toBe(false);
    expect(result.value.horizontal).toBe('center');
    expect(result.value.padding.top).toBe(16);
    expect(result.value.iconScale).toBe(1);
  });

  it.each(['top', 'right', 'bottom', 'left'] as const)(
    'places icon %s relative to label',
    (iconPlacement) => {
      const geometry = layoutNodeContent(
        { ...DEFAULT_NODE_CONTENT_LAYOUT, iconPlacement },
        {
          nodeSize: { width: 200, height: 120 },
          iconSize: { width: 32, height: 32 },
          labelSize: { width: 80, height: 18 },
          subLabelSize: { width: 100, height: 14 },
        }
      );
      expect(geometry.iconBounds).not.toBeNull();
      if (iconPlacement === 'top')
        expect(geometry.iconBounds!.y).toBeLessThan(geometry.labelBounds.y);
      if (iconPlacement === 'bottom')
        expect(geometry.iconBounds!.y).toBeGreaterThan(geometry.labelBounds.y);
      if (iconPlacement === 'left')
        expect(geometry.iconBounds!.x).toBeLessThan(geometry.labelBounds.x);
      if (iconPlacement === 'right')
        expect(geometry.iconBounds!.x).toBeGreaterThan(geometry.labelBounds.x);
    }
  );

  it('keeps normalized free icon position within resized node bounds', () => {
    const geometry = layoutNodeContent(
      {
        ...DEFAULT_NODE_CONTENT_LAYOUT,
        iconPlacement: 'free',
        freeIconPosition: { x: 1, y: 1 },
      },
      {
        nodeSize: { width: 120, height: 80 },
        iconSize: { width: 40, height: 40 },
        labelSize: { width: 60, height: 16 },
        subLabelSize: null,
      }
    );
    expect(geometry.iconBounds).toEqual({ x: 64, y: 24, width: 40, height: 40 });
  });
});
