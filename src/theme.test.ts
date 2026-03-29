import { describe, expect, it } from 'vitest';
import {
  resolveAnnotationVisualStyle,
  resolveContainerVisualStyle,
  resolveEdgeConditionStroke,
  resolveEdgeVisualStyle,
  resolveNodeVisualStyle,
  resolveSectionVisualStyle,
  resolveSharedColorKey,
} from './theme';

describe('theme color helpers', () => {
  it('resolves legacy annotation aliases through the shared palette', () => {
    expect(resolveSharedColorKey('green', 'yellow')).toBe('emerald');
    expect(resolveSharedColorKey('orange', 'yellow')).toBe('amber');
    expect(resolveSharedColorKey('purple', 'yellow')).toBe('violet');
  });

  it('supports custom filled node colors', () => {
    expect(resolveNodeVisualStyle('custom', 'filled', '#14b8a6')).toEqual(
      expect.objectContaining({
        bg: '#14b8a6',
      })
    );
  });

  it('derives edge chrome from the stroke color', () => {
    const visualStyle = resolveEdgeVisualStyle('#2563eb');

    expect(visualStyle.stroke).toBe('#2563eb');
    expect(visualStyle.pillBg).toMatch(/^#/);
    expect(visualStyle.metaBorder).toMatch(/^#/);
  });

  it('maps edge conditions to shared semantic strokes', () => {
    expect(resolveEdgeConditionStroke('yes')).toBe(resolveNodeVisualStyle('emerald', 'subtle').border);
    expect(resolveEdgeConditionStroke('timeout')).toBe(resolveNodeVisualStyle('amber', 'subtle').border);
  });

  it('builds note-like annotation tones from the shared palette', () => {
    const annotationStyle = resolveAnnotationVisualStyle('custom', 'subtle', '#f97316');
    expect(annotationStyle.containerBg).toMatch(/^#/);
    expect(annotationStyle.foldBg).toMatch(/^#/);
  });

  it('returns stronger filled visuals for container-style nodes', () => {
    const subtleStyle = resolveContainerVisualStyle('violet', 'subtle');
    const filledStyle = resolveContainerVisualStyle('violet', 'filled');

    expect(filledStyle.bg).not.toBe(subtleStyle.bg);
    expect(filledStyle.text).not.toBe(subtleStyle.text);
  });

  it('returns stronger filled visuals for sections', () => {
    const subtleStyle = resolveSectionVisualStyle('blue', 'subtle');
    const filledStyle = resolveSectionVisualStyle('blue', 'filled');

    expect(filledStyle.bg).not.toBe(subtleStyle.bg);
    expect(filledStyle.border).not.toBe(subtleStyle.border);
  });
});
