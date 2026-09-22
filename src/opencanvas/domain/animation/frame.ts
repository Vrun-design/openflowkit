import type { Bounds2d } from '../geometry/types';
import { interpolateBounds } from './camera';
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
/** Pulse dash cycle length and the unit dash the travelling light rides on. */
export const PULSE_MS = 1200;
export const PULSE_DASH = '0.03 0.07';
/** Walkthrough camera glide length at the start of a step. */
export const GLIDE_MS = 400;

export function stepDuration(step: { readonly holdMs?: number; readonly note?: string }): number {
  return step.holdMs ?? (step.note ? NOTE_MS : STEP_MS);
}

/** Shortest a step may be squeezed to when the duration is scaled. */
export const MIN_STEP_MS = 200;

/** Rescale every step so the clip lasts `targetMs`; notes keep their extra weight. */
export function scaleTimeline(timeline: Timeline, targetMs: number): Timeline {
  const base = timelineDuration(timeline);
  if (base <= 0 || targetMs <= 0) return timeline;
  const factor = targetMs / base;
  const steps = timeline.steps.map((step) => ({
    ...step,
    holdMs: Math.max(MIN_STEP_MS, Math.round(stepDuration(step) * factor)),
  }));
  // Rounding each step can miss the target by a few ms; the last step absorbs
  // it so the clip is exactly as long as the dialog says.
  const total = steps.reduce((sum, step) => sum + stepDuration(step), 0);
  const last = steps.at(-1);
  if (last && last.holdMs !== undefined && Math.abs(total - targetMs) <= steps.length) {
    steps[steps.length - 1] = { ...last, holdMs: Math.max(MIN_STEP_MS, last.holdMs + (targetMs - total)) };
  }
  return { ...timeline, steps, durationMs: steps.reduce((sum, step) => sum + stepDuration(step), 0) };
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

export function timelineDuration(timeline: Pick<Timeline, 'steps'>): number {
  return stepWindows(timeline).at(-1)?.end ?? 0;
}

export function easeOutCubic(progress: number): number {
  const clamped = Math.min(1, Math.max(0, progress));
  return 1 - (1 - clamped) ** 3;
}

function clampTime(timeline: Timeline, tMs: number, durationMs: number): number {
  if (durationMs <= 0) return 0;
  return timeline.loop ? ((tMs % durationMs) + durationMs) % durationMs : Math.min(Math.max(0, tMs), durationMs);
}

function activeWindowIndex(windows: readonly StepWindow[], timeMs: number): number {
  const found = windows.findIndex((window) => timeMs < window.end);
  return found < 0 ? windows.length - 1 : found;
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

/** Adjacent step indexes collapse into one run, so a spotlight does not blink. */
export function stepRuns(places: readonly number[]): readonly (readonly [number, number])[] {
  const runs: [number, number][] = [];
  for (const place of [...places].sort((a, b) => a - b)) {
    const last = runs.at(-1);
    if (last && place === last[1] + 1) last[1] = place;
    else runs.push([place, place]);
  }
  return runs;
}

/**
 * Where the camera looks at time t: the active step's box, glided in from the
 * previous step's box. Only the walkthrough preset moves the camera — build
 * and pulse always frame the whole page.
 */
export function cameraAt(timeline: Timeline, tMs: number): Bounds2d | null {
  if (timeline.preset !== 'walkthrough') return null;
  const windows = stepWindows(timeline);
  if (windows.length === 0) return null;
  const timeMs = clampTime(timeline, tMs, windows.at(-1)!.end);
  const active = activeWindowIndex(windows, timeMs);
  const current = timeline.steps[active]?.camera ?? null;
  const previous = timeline.steps.slice(0, active).reverse().find((step) => step.camera)?.camera ?? null;
  if (!current) return previous;
  if (!previous) return current;
  return interpolateBounds(previous, current, easeOutCubic((timeMs - windows[active]!.start) / GLIDE_MS));
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
  const timeMs = clampTime(timeline, tMs, durationMs);
  const active = activeWindowIndex(windows, timeMs);
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
      const runs = stepRuns(places);
      const run = runs.find(([from, to]) => active >= from && active <= to);
      if (!run) {
        nodes[id] = { ...FULL, opacity: STORYBOARD_DIM };
      } else if (run === runs[0] && timeMs < windows[run[0]]!.start + REVEAL_MS) {
        nodes[id] = reveal(timeMs - windows[run[0]]!.start);
      } else {
        nodes[id] = FULL;
      }
    } else {
      const first = Math.min(...places);
      nodes[id] = timeMs >= windows[first]!.start ? reveal(timeMs - windows[first]!.start) : HIDDEN;
    }
  }
  for (const [id, places] of connectorSteps) {
    if (timeline.preset === 'walkthrough') {
      const runs = stepRuns(places);
      const run = runs.find(([from, to]) => active >= from && active <= to);
      if (!run) {
        connectors[id] = { ...FULL, opacity: STORYBOARD_DIM };
      } else if (run === runs[0] && timeMs < windows[run[0]]!.start + REVEAL_MS) {
        connectors[id] = { ...FULL, opacity: easeOutCubic((timeMs - windows[run[0]]!.start) / REVEAL_MS) };
      } else {
        connectors[id] = FULL;
      }
    } else {
      const first = Math.min(...places);
      const local = timeMs - windows[first]!.start;
      connectors[id] = timeMs >= windows[first]!.start
        ? { ...FULL, opacity: easeOutCubic(local / REVEAL_MS), drawProgress: easeOutCubic(local / DRAW_MS) }
        : HIDDEN;
    }
  }
  return { timeMs, durationMs, activeStepIndex: active, nodes, connectors, camera: cameraAt(timeline, timeMs) };
}
