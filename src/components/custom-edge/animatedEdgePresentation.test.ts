import type { CSSProperties } from 'react';
import { describe, expect, it } from 'vitest';
import {
  DASH_PERIOD_CSS_VAR,
  resolveAnimatedEdgePresentation,
  withDashPeriodVar,
} from './animatedEdgePresentation';
import { getDashPatternPeriod } from './dashPattern';

describe('animated edge presentation', () => {
  it('preserves hover and selection overlays when animated export is disabled', () => {
    const result = resolveAnimatedEdgePresentation({
      animatedExportEnabled: false,
      selected: true,
      hovered: false,
      edgeAnimated: false,
      baseStyle: { stroke: '#000', strokeWidth: 1.5 },
    });

    expect(result.shouldRenderOverlay).toBe(true);
    expect(result.overlayStyle.strokeDasharray).toBe('8 8');
  });

  it('only renders active configured overlays when animated export is enabled', () => {
    const result = resolveAnimatedEdgePresentation({
      animatedExportEnabled: true,
      selected: true,
      hovered: true,
      edgeAnimated: true,
      animationConfig: {
        enabled: true,
        state: 'active',
        durationMs: 1400,
        dashArray: '12 6',
      },
      baseStyle: { stroke: '#123456', strokeWidth: 2 },
    });

    expect(result.shouldRenderOverlay).toBe(true);
    expect(result.overlayStyle.animationDuration).toBe('1400ms');
    expect(result.overlayStyle.strokeDasharray).toBe('12 6');
  });

  it('suppresses overlays for idle animated edges when the new pipeline is enabled', () => {
    const result = resolveAnimatedEdgePresentation({
      animatedExportEnabled: true,
      selected: true,
      hovered: true,
      edgeAnimated: true,
      animationConfig: {
        enabled: true,
        state: 'idle',
      },
      baseStyle: { stroke: '#123456', strokeWidth: 2 },
    });

    expect(result.shouldRenderOverlay).toBe(false);
  });

  describe('dash loop period', () => {
    function periodVarFor(dashArray: string | undefined): unknown {
      const result = resolveAnimatedEdgePresentation({
        animatedExportEnabled: true,
        selected: false,
        hovered: false,
        edgeAnimated: true,
        animationConfig: { enabled: true, state: 'active', dashArray },
        baseStyle: { stroke: '#000', strokeWidth: 2 },
      });

      return (result.overlayStyle as Record<string, unknown>)[DASH_PERIOD_CSS_VAR];
    }

    it('publishes one dash period per cycle for every dash preset', () => {
      // The presets offered in EdgeStyleSection — each needs its own travel distance,
      // otherwise the loop snaps back by the remainder every cycle.
      expect(periodVarFor('8 4')).toBe(12);
      expect(periodVarFor('2 4')).toBe(6);
      expect(periodVarFor('8 4 2 4')).toBe(18);
    });

    it('publishes the period of the default pattern when none is configured', () => {
      expect(periodVarFor(undefined)).toBe(16);
    });

    it('derives the period from the edge style when the animation sets no pattern', () => {
      const result = resolveAnimatedEdgePresentation({
        animatedExportEnabled: true,
        selected: false,
        hovered: false,
        edgeAnimated: true,
        animationConfig: { enabled: true, state: 'active' },
        baseStyle: { stroke: '#000', strokeWidth: 2, strokeDasharray: '6 4' },
      });

      expect(result.overlayStyle.strokeDasharray).toBe('6 4');
      expect((result.overlayStyle as Record<string, unknown>)[DASH_PERIOD_CSS_VAR]).toBe(10);
    });

    it('always matches the period helper for whatever pattern it emits', () => {
      const result = resolveAnimatedEdgePresentation({
        animatedExportEnabled: false,
        selected: true,
        hovered: false,
        edgeAnimated: false,
        baseStyle: { stroke: '#000', strokeWidth: 2, strokeDasharray: '8 4 2 4' },
      });

      expect((result.overlayStyle as Record<string, unknown>)[DASH_PERIOD_CSS_VAR])
        .toBe(getDashPatternPeriod(result.overlayStyle.strokeDasharray));
    });

    it('leaves the var unset when the pattern has no resolvable period', () => {
      expect(periodVarFor('10%')).toBeUndefined();
    });
  });

  // This is the helper the visible edge path uses — the one animated edges actually
  // render today. Without these, removing the call from CustomEdgeWrapper would
  // reintroduce the snap-back on every dash preset with a green suite.
  describe('withDashPeriodVar', () => {
    function periodOf(style: CSSProperties): unknown {
      return (withDashPeriodVar(style) as Record<string, unknown>)[DASH_PERIOD_CSS_VAR];
    }

    it('publishes the period of the style it is given', () => {
      expect(periodOf({ strokeDasharray: '8 4' })).toBe(12);
      expect(periodOf({ strokeDasharray: '2 4' })).toBe(6);
      expect(periodOf({ strokeDasharray: '8 4 2 4' })).toBe(18);
      expect(periodOf({ strokeDasharray: '6 4' })).toBe(10);
    });

    it('leaves the var unset for an edge with no pattern, so the CSS default applies', () => {
      // The "solid" preset writes an empty string, which React drops entirely; React
      // Flow's own `stroke-dasharray: 5` then paints and the CSS default of 10 matches.
      expect(periodOf({})).toBeUndefined();
      expect(periodOf({ strokeDasharray: '' })).toBeUndefined();
    });

    it('never publishes 0, which would satisfy var() and freeze the animation', () => {
      expect(periodOf({ strokeDasharray: '0 0' })).toBeUndefined();
      expect(periodOf({ strokeDasharray: '10%' })).toBeUndefined();
    });

    it('keeps the rest of the style untouched', () => {
      const result = withDashPeriodVar({ stroke: '#abc', strokeWidth: 3, strokeDasharray: '8 4' });

      expect(result.stroke).toBe('#abc');
      expect(result.strokeWidth).toBe(3);
      expect(result.strokeDasharray).toBe('8 4');
    });

    it('always agrees with the period helper for the pattern it emits', () => {
      for (const strokeDasharray of ['8 4', '2 4', '8 4 2 4', '6 4', '5', '8 8']) {
        const result = withDashPeriodVar({ strokeDasharray });
        expect((result as Record<string, unknown>)[DASH_PERIOD_CSS_VAR], strokeDasharray)
          .toBe(getDashPatternPeriod(strokeDasharray));
      }
    });
  });
});
