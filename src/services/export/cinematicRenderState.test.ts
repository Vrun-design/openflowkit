import { describe, expect, it } from 'vitest';
import type { FlowEdge } from '@/lib/types';
import type { CinematicExportRequest } from './cinematicExport';
import { buildCinematicBuildPlan } from './cinematicBuildPlan';
import { buildCinematicTimeline, getCinematicExportPreset, resolveCinematicRenderState } from './cinematicRenderState';

const nodes = [
  { id: 'a', type: 'process', position: { x: 0, y: 0 }, data: { label: 'A' } },
  { id: 'b', type: 'process', position: { x: 200, y: 0 }, data: { label: 'B' } },
  { id: 'c', type: 'process', position: { x: 400, y: 0 }, data: { label: 'C' } },
] as const;

const edges = [
  { id: 'ab', source: 'a', target: 'b' },
  { id: 'bc', source: 'b', target: 'c' },
] as FlowEdge[];

const videoRequest: CinematicExportRequest = {
  format: 'cinematic-video',
  speed: 'normal',
  resolution: '1080p',
  themeMode: 'light',
};

describe('cinematic render state', () => {
  it('keeps the screen empty during the intro hold', () => {
    const plan = buildCinematicBuildPlan([...nodes], edges);
    const timeline = buildCinematicTimeline(plan, getCinematicExportPreset(videoRequest));

    const state = resolveCinematicRenderState(timeline, edges, 0);

    expect(state.visibleNodeIds.size).toBe(0);
    expect(state.activeEdgeId).toBeNull();
    expect(state.backgroundMode).toBe('light');
  });

  it('activates the lead edge before the target node fade', () => {
    const plan = buildCinematicBuildPlan([...nodes], edges);
    const timeline = buildCinematicTimeline(plan, getCinematicExportPreset(videoRequest));
    const secondSegment = timeline.segments[1];
    const midpoint = Math.round(((secondSegment.edgeGrowStartMs ?? 0) + (secondSegment.edgeGrowEndMs ?? 0)) / 2);

    const state = resolveCinematicRenderState(timeline, edges, midpoint);

    expect(state.activeEdgeId).toBe('ab');
    expect(state.activeEdgeProgress).toBeGreaterThan(0.5);
    expect(state.activeNodeId).toBeNull();
    expect(state.visibleNodeIds.has('a')).toBe(true);
    expect(state.visibleNodeIds.has('b')).toBe(false);
  });

  it('uses different timeline presets for speed and resolution choices', () => {
    const slow4kPreset = getCinematicExportPreset({
      ...videoRequest,
      speed: 'slow',
      resolution: '4k',
    });
    const fast720Preset = getCinematicExportPreset({
      ...videoRequest,
      speed: 'fast',
      resolution: '720p',
    });

    expect(slow4kPreset.maxDimension).toBeGreaterThan(fast720Preset.maxDimension);
    expect(slow4kPreset.pixelRatio).toBeGreaterThanOrEqual(fast720Preset.pixelRatio);
    expect(slow4kPreset.edgeGrowMs).toBeGreaterThan(fast720Preset.edgeGrowMs);
  });
});
