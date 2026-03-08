import { describe, expect, it } from 'vitest';
import type { Edge } from '@/lib/reactflowCompat';
import {
  getInteractionLodCooldownMs,
  getSafetyAdjustedEdges,
  isFarZoomReductionActive,
  isFarZoomReductionActiveForProfile,
  isInteractionLowDetailModeActive,
  isLowDetailModeActive,
  isLowDetailModeActiveForProfile,
  isLargeGraphSafetyActive,
  resolveFarZoomReductionStateForProfile,
  resolveLowDetailModeStateForProfile,
  shouldEnableViewportCulling,
} from './largeGraphSafetyMode';

describe('largeGraphSafetyMode', () => {
  it('activates by mode override and auto threshold', () => {
    expect(isLargeGraphSafetyActive(10, 10, 'on')).toBe(true);
    expect(isLargeGraphSafetyActive(2000, 2000, 'off')).toBe(false);
    expect(isLargeGraphSafetyActive(120, 10, 'auto', 'performance')).toBe(true);
    expect(isLargeGraphSafetyActive(299, 500, 'auto', 'balanced')).toBe(false);
    expect(isLargeGraphSafetyActive(300, 500, 'auto', 'balanced')).toBe(true);
    expect(isLargeGraphSafetyActive(499, 10, 'auto', 'quality')).toBe(false);
    expect(isLargeGraphSafetyActive(500, 10, 'auto', 'quality')).toBe(true);
  });

  it('disables animated edges when safety mode is active', () => {
    const animated = { id: 'e1', source: 'a', target: 'b', animated: true } as Edge;
    const staticEdge = { id: 'e2', source: 'b', target: 'c', animated: false } as Edge;
    const edges = [animated, staticEdge];

    const adjusted = getSafetyAdjustedEdges(edges, true);
    expect(adjusted).not.toBe(edges);
    expect(adjusted[0]).not.toBe(animated);
    expect(adjusted[0].animated).toBe(false);
    expect(adjusted[1]).toBe(staticEdge);
    expect(getSafetyAdjustedEdges(edges, false)).toBe(edges);
  });

  it('enables viewport culling only when safety mode is active', () => {
    expect(shouldEnableViewportCulling(true)).toBe(true);
    expect(shouldEnableViewportCulling(false)).toBe(false);
  });

  it('enables low-detail mode only for large-graph safety with far zoom', () => {
    expect(isLowDetailModeActive(false, 0.4)).toBe(false);
    expect(isLowDetailModeActive(true, 0.55)).toBe(false);
    expect(isLowDetailModeActive(true, 0.5)).toBe(true);
    expect(isLowDetailModeActiveForProfile(true, 0.58, 'performance')).toBe(true);
    expect(isLowDetailModeActiveForProfile(true, 0.43, 'quality')).toBe(false);
    expect(isLowDetailModeActiveForProfile(true, 0.42, 'quality')).toBe(true);
  });

  it('enables interaction low-detail mode only when interacting under safety mode', () => {
    expect(isInteractionLowDetailModeActive(false, true)).toBe(false);
    expect(isInteractionLowDetailModeActive(true, false)).toBe(false);
    expect(isInteractionLowDetailModeActive(true, true)).toBe(true);
  });

  it('enables far-zoom reductions only at very low zoom under safety mode', () => {
    expect(isFarZoomReductionActive(false, 0.3)).toBe(false);
    expect(isFarZoomReductionActive(true, 0.45)).toBe(false);
    expect(isFarZoomReductionActive(true, 0.4)).toBe(true);
    expect(isFarZoomReductionActive(true, 0.3)).toBe(true);
    expect(isFarZoomReductionActiveForProfile(true, 0.49, 'performance')).toBe(true);
    expect(isFarZoomReductionActiveForProfile(true, 0.35, 'quality')).toBe(false);
    expect(isFarZoomReductionActiveForProfile(true, 0.34, 'quality')).toBe(true);
  });

  it('returns profile-based interaction cooldown values', () => {
    expect(getInteractionLodCooldownMs('performance')).toBe(240);
    expect(getInteractionLodCooldownMs('balanced')).toBe(180);
    expect(getInteractionLodCooldownMs('quality')).toBe(130);
  });

  it('uses hysteresis when resolving low-detail zoom state', () => {
    expect(resolveLowDetailModeStateForProfile(true, 0.5, 'balanced', false)).toBe(true);
    expect(resolveLowDetailModeStateForProfile(true, 0.53, 'balanced', true)).toBe(true);
    expect(resolveLowDetailModeStateForProfile(true, 0.56, 'balanced', true)).toBe(false);
    expect(resolveLowDetailModeStateForProfile(false, 0.3, 'balanced', true)).toBe(false);
  });

  it('uses hysteresis when resolving far-zoom reduction state', () => {
    expect(resolveFarZoomReductionStateForProfile(true, 0.4, 'balanced', false)).toBe(true);
    expect(resolveFarZoomReductionStateForProfile(true, 0.44, 'balanced', true)).toBe(true);
    expect(resolveFarZoomReductionStateForProfile(true, 0.46, 'balanced', true)).toBe(false);
    expect(resolveFarZoomReductionStateForProfile(false, 0.2, 'balanced', true)).toBe(false);
  });
});
