import type { Bounds2d } from '../geometry/types';
import type { ElementFrameState, FrameState, Timeline } from './types';

/**
 * Timing is the hook's old playback feel, lifted so the preview, the SVG and
 * the encoders share it: each step reads for a beat, notes read longer.
 */
export const STEP_MS = 1700;
export const NOTE_MS = 2600;
/** Node pop 0.92 → 1 and fade-in length. */
export const REVEAL_MS = 320;
/** Connector draw-on length. */
export const DRAW_MS = 480;
/** Walkthrough veil for every step but the current one. */
export const STORYBOARD_DIM = 0.25;
/** Pulse dash cycle length. */
export const PULSE_MS = 1200;

export function stepDuration(step: { readonly holdMs?: number; readonly note?: string }): number {
  return step.holdMs ?? (step.note ? NOTE_MS : STEP_MS);
}

export interface StepWindow {
  readonly start: number;
  readonly end: number;
}

export function stepWindows(timeline: Pick<Timeline, 'steps'>): readonly StepWindow[] {
  let at = 0;
  return timeline.steps.map((step) => {
    const start = at;
    at += stepDuration(step);
    return { start, end: at };
  });
}

export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - (1 - clamped) ** 3;
}

const FULL: ElementFrameState = { opacity: 1, scale: 1, drawProgress: 1 };
const HIDDEN: ElementFrameState = { opacity: 0, scale: 0.92, drawProgress: 0 };

function reveal(localMs: number): ElementFrameState {
  const progress = easeOutCubic(localMs / REVEAL_MS);
  return {
    opacity: progress,
    scale: 0.92 + 0.08 * progress,
    drawProgress: easeOutCubic(localMs / DRAW_MS),
  };
}

/**
 * The single answer to "what is on screen at time t". Build reveals
 * cumulatively and ends with everything shown; walkthrough spotlights the
 * current step and dims the rest; pulse shows everything with a travelling
 * dash on the connectors.
 */
export function frameAt(timeline: Timeline, tMs: number): FrameState {
  const windows = stepWindows(timeline);
  const durationMs = windows.at(-1)?.end ?? 0;
  if (windows.length === 0 || durationMs <= 0) {
    return { timeMs: 0, durationMs: 0, activeStepIndex: -1, nodes: {}, connectors: {}, camera: null };
  }
  const timeMs = timeline.loop ? ((tMs % durationMs) + durationMs) % durationMs : Math.min(Math.max(0, tMs), durationMs);
  let active = windows.findIndex((window) => timeMs < window.end);
  if (active < 0) active = windows.length - 1;
  const nodes: Record<string, ElementFrameState> = {};
  const connectors: Record<string, ElementFrameState> = {};
  // Element → step indexes, built once: per-frame lookups stay O(1).
  const nodeSteps = new Map<string, number[]>();
  const connectorSteps = new Map<string, number[]>();
  timeline.steps.forEach((step, index) => {
    for (const id of step.nodeIds) nodeSteps.set(id, [...(nodeSteps.get(id) ?? []), index]);
    for (const id of step.connectorIds) connectorSteps.set(id, [...(connectorSteps.get(id) ?? []), index]);
  });
  if (timeline.preset === 'pulse') {
    const order = [...connectorSteps.keys()];
    for (const id of nodeSteps.keys()) nodes[id] = FULL;
    order.forEach((id, index) => {
      connectors[id] = { ...FULL, pulsePhase: ((timeMs / PULSE_MS + index * 0.25) % 1 + 1) % 1 };
    });
    return { timeMs, durationMs, activeStepIndex: active, nodes, connectors, camera: null };
  }
  for (const [id, places] of nodeSteps) {
    if (timeline.preset === 'walkthrough') {
      nodes[id] = places.includes(active) ? reveal(timeMs - windows[active]!.start) : { ...FULL, opacity: STORYBOARD_DIM };
    } else {
      const first = Math.min(...places);
      nodes[id] = timeMs >= windows[first]!.start ? reveal(timeMs - windows[first]!.start) : { ...HIDDEN };
    }
  }
  for (const [id, places] of connectorSteps) {
    if (timeline.preset === 'walkthrough') {
      connectors[id] = places.includes(active)
        ? { ...FULL, drawProgress: easeOutCubic((timeMs - windows[active]!.start) / DRAW_MS) }
        : { ...FULL, opacity: STORYBOARD_DIM };
    } else {
      const first = Math.min(...places);
      const local = timeMs - windows[first]!.start;
      connectors[id] = timeMs >= windows[first]!.start
        ? { ...FULL, opacity: easeOutCubic(local / REVEAL_MS), drawProgress: easeOutCubic(local / DRAW_MS) }
        : { ...HIDDEN };
    }
  }
  const camera: Bounds2d | null = timeline.preset === 'walkthrough'
    ? (timeline.steps[active]?.camera ?? null) : null;
  return { timeMs, durationMs, activeStepIndex: active, nodes, connectors, camera };
}
