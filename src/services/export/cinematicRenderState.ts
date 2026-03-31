import type { FlowEdge } from '@/lib/types';
import {
  getCinematicResolutionPreset,
  getCinematicSpeedMultiplier,
  type CinematicExportRequest,
  type CinematicThemeMode,
} from './cinematicExport';
import type {
  CinematicBuildPlan,
  CinematicBuildSegment,
} from './cinematicBuildPlan';

export interface CinematicExportPreset {
  kind: CinematicExportRequest['format'];
  fps: number;
  maxDimension: number;
  pixelRatio: number;
  introHoldMs: number;
  rootNodeFadeMs: number;
  edgeGrowMs: number;
  targetNodeFadeMs: number;
  settleMs: number;
  finalHoldMs: number;
  maxFrames: number;
  speedMultiplier: number;
}

export interface CinematicRenderState {
  active: boolean;
  backgroundMode: CinematicThemeMode;
  visibleNodeIds: ReadonlySet<string>;
  builtEdgeIds: ReadonlySet<string>;
  visibleEdgeIds: ReadonlySet<string>;
  activeNodeId: string | null;
  activeNodeProgress: number;
  activeEdgeId: string | null;
  activeEdgeProgress: number;
  currentSegment: CinematicBuildSegment | null;
}

interface CinematicTimelineSegment {
  segment: CinematicBuildSegment;
  startMs: number;
  endMs: number;
  edgeGrowStartMs: number | null;
  edgeGrowEndMs: number | null;
  nodeFadeStartMs: number;
  nodeFadeEndMs: number;
}

export interface CinematicTimeline {
  preset: CinematicExportPreset;
  plan: CinematicBuildPlan;
  totalDurationMs: number;
  segments: CinematicTimelineSegment[];
}

const EMPTY_SET = new Set<string>();

function clamp01(value: number): number {
  return Math.max(0, Math.min(1, value));
}

function easeOutCubic(value: number): number {
  const clampedValue = clamp01(value);
  return 1 - Math.pow(1 - clampedValue, 3);
}

function easeOutQuart(value: number): number {
  const clampedValue = clamp01(value);
  return 1 - Math.pow(1 - clampedValue, 4);
}

function createInactiveSegmentRenderState(): CinematicRenderState {
  return {
    active: true,
    backgroundMode: 'light',
    visibleNodeIds: EMPTY_SET,
    builtEdgeIds: EMPTY_SET,
    visibleEdgeIds: EMPTY_SET,
    activeNodeId: null,
    activeNodeProgress: 0,
    activeEdgeId: null,
    activeEdgeProgress: 0,
    currentSegment: null,
  };
}

export function getCinematicExportPreset(
  request: Pick<CinematicExportRequest, 'format' | 'speed' | 'resolution'>
): CinematicExportPreset {
  const speedMultiplier = getCinematicSpeedMultiplier(request.speed);
  const resolutionPreset = getCinematicResolutionPreset(request.resolution);
  const isHighResolution = request.resolution === '4k';
  const isLowResolution = request.resolution === '720p';

  return {
    kind: request.format,
    fps: isHighResolution ? 24 : isLowResolution ? 18 : 20,
    maxDimension: resolutionPreset.maxDimension,
    pixelRatio: resolutionPreset.pixelRatio,
    introHoldMs: Math.round(200 / speedMultiplier),
    rootNodeFadeMs: Math.round(300 / speedMultiplier),
    edgeGrowMs: Math.round(500 / speedMultiplier),
    targetNodeFadeMs: Math.round(260 / speedMultiplier),
    settleMs: Math.round(150 / speedMultiplier),
    finalHoldMs: Math.round(640 / speedMultiplier),
    maxFrames: isHighResolution ? 320 : isLowResolution ? 220 : 280,
    speedMultiplier,
  };
}

function estimateRawDurationMs(plan: CinematicBuildPlan, preset: CinematicExportPreset): number {
  return plan.segments.reduce((total, segment) => {
    if (!segment.leadEdgeId) {
      return total + preset.rootNodeFadeMs + preset.settleMs;
    }

    return total + preset.edgeGrowMs + preset.targetNodeFadeMs + preset.settleMs;
  }, preset.introHoldMs + preset.finalHoldMs);
}

function scalePresetForFrameBudget(
  plan: CinematicBuildPlan,
  preset: CinematicExportPreset
): CinematicExportPreset {
  const rawDurationMs = estimateRawDurationMs(plan, preset);
  const rawFrames = Math.max(1, Math.ceil((rawDurationMs / 1000) * preset.fps));
  if (rawFrames <= preset.maxFrames) {
    return preset;
  }

  const ratio = preset.maxFrames / rawFrames;

  return {
    ...preset,
    introHoldMs: Math.max(120, Math.round(preset.introHoldMs * ratio)),
    rootNodeFadeMs: Math.max(140, Math.round(preset.rootNodeFadeMs * ratio)),
    edgeGrowMs: Math.max(180, Math.round(preset.edgeGrowMs * ratio)),
    targetNodeFadeMs: Math.max(140, Math.round(preset.targetNodeFadeMs * ratio)),
    settleMs: Math.max(40, Math.round(preset.settleMs * ratio)),
    finalHoldMs: Math.max(180, Math.round(preset.finalHoldMs * ratio)),
  };
}

export function buildCinematicTimeline(
  plan: CinematicBuildPlan,
  basePreset: CinematicExportPreset
): CinematicTimeline {
  const preset = scalePresetForFrameBudget(plan, basePreset);
  let currentMs = preset.introHoldMs;

  const segments = plan.segments.map<CinematicTimelineSegment>((segment) => {
    const startMs = currentMs;
    const edgeGrowStartMs = segment.leadEdgeId ? currentMs : null;
    const edgeGrowEndMs = segment.leadEdgeId ? currentMs + preset.edgeGrowMs : null;
    const nodeFadeStartMs = edgeGrowEndMs ?? currentMs;
    const nodeFadeEndMs =
      nodeFadeStartMs + (segment.leadEdgeId ? preset.targetNodeFadeMs : preset.rootNodeFadeMs);
    const endMs = nodeFadeEndMs + preset.settleMs;

    currentMs = endMs;

    return {
      segment,
      startMs,
      endMs,
      edgeGrowStartMs,
      edgeGrowEndMs,
      nodeFadeStartMs,
      nodeFadeEndMs,
    };
  });

  return {
    preset,
    plan,
    totalDurationMs: currentMs + preset.finalHoldMs,
    segments,
  };
}

function buildVisibleEdgeIds(visibleNodeIds: Set<string>, edges: FlowEdge[]): Set<string> {
  return new Set(
    edges
      .filter((edge) => visibleNodeIds.has(edge.source) && visibleNodeIds.has(edge.target))
      .map((edge) => edge.id)
  );
}

export function resolveCinematicRenderState(
  timeline: CinematicTimeline,
  edges: FlowEdge[],
  timeMs: number,
  backgroundMode: CinematicThemeMode = 'light'
): CinematicRenderState {
  if (timeline.plan.segments.length === 0) {
    return createInactiveSegmentRenderState();
  }

  const clampedTimeMs = Math.max(0, Math.min(timeMs, timeline.totalDurationMs));
  const visibleNodeIds = new Set<string>();

  let activeNodeId: string | null = null;
  let activeNodeProgress = 0;
  let activeEdgeId: string | null = null;
  let activeEdgeProgress = 0;
  let currentSegment: CinematicBuildSegment | null = null;

  if (clampedTimeMs < timeline.preset.introHoldMs) {
    return {
      ...createInactiveSegmentRenderState(),
      backgroundMode,
      visibleNodeIds,
    };
  }

  for (const segmentEntry of timeline.segments) {
    const { segment } = segmentEntry;

    if (clampedTimeMs >= segmentEntry.endMs) {
      visibleNodeIds.add(segment.targetNodeId);
      continue;
    }

    currentSegment = segment;
    if (
      segmentEntry.edgeGrowStartMs !== null &&
      segmentEntry.edgeGrowEndMs !== null &&
      clampedTimeMs < segmentEntry.edgeGrowEndMs
    ) {
      visibleNodeIds.add(segment.sourceNodeId ?? segment.targetNodeId);
      activeEdgeId = segment.leadEdgeId;
      activeEdgeProgress = easeOutQuart(
        (clampedTimeMs - segmentEntry.edgeGrowStartMs) /
          (segmentEntry.edgeGrowEndMs - segmentEntry.edgeGrowStartMs)
      );
      break;
    }

    if (segment.sourceNodeId) {
      visibleNodeIds.add(segment.sourceNodeId);
    }

    activeNodeId = segment.targetNodeId;
    activeNodeProgress = easeOutCubic(
      (clampedTimeMs - segmentEntry.nodeFadeStartMs) /
        (segmentEntry.nodeFadeEndMs - segmentEntry.nodeFadeStartMs)
    );
    if (activeNodeProgress > 0) {
      visibleNodeIds.add(segment.targetNodeId);
    }
    break;
  }

  if (!currentSegment && clampedTimeMs >= timeline.totalDurationMs - timeline.preset.finalHoldMs) {
    timeline.plan.orderedNodeIds.forEach((nodeId) => visibleNodeIds.add(nodeId));
  }

  const visibleEdgeIds = buildVisibleEdgeIds(visibleNodeIds, edges);
  if (activeEdgeId) {
    visibleEdgeIds.delete(activeEdgeId);
  }

  return {
    active: true,
    backgroundMode,
    visibleNodeIds,
    builtEdgeIds: new Set(visibleEdgeIds),
    visibleEdgeIds: activeEdgeId ? new Set([...visibleEdgeIds, activeEdgeId]) : visibleEdgeIds,
    activeNodeId,
    activeNodeProgress,
    activeEdgeId,
    activeEdgeProgress,
    currentSegment,
  };
}
