import type { Bounds2d } from '../geometry/types';

/**
 * The one timeline type: a step is "these things appear/light up, hold,
 * next". No keyframes, no per-property curves — steps round-trip to text,
 * keyframes do not. The SVG, the raster frames and the preview all read the
 * same `frameAt` below, so there is exactly one answer to "what is on screen
 * at time t".
 */

export type AnimationPreset = 'build' | 'walkthrough' | 'pulse';

export interface AnimationStep {
  readonly nodeIds: readonly string[];
  readonly connectorIds: readonly string[];
  readonly note?: string;
  readonly holdMs?: number;
  /** World-space box the camera glides to for this step; absent = fit all. */
  readonly camera?: Bounds2d;
  /** Flow steps can resolve onto another page; current-page timelines omit it. */
  readonly pageId?: string;
}

export interface Timeline {
  readonly steps: readonly AnimationStep[];
  readonly preset: AnimationPreset;
  readonly loop: boolean;
  readonly durationMs: number;
}

export interface ElementFrameState {
  readonly opacity: number;
  /** Pop scale for nodes; always 1 for connectors. */
  readonly scale: number;
  /** Connector draw-on progress; always 1 for nodes. */
  readonly drawProgress: number;
  /** Pulse preset only: travelling-dash phase in [0, 1). */
  readonly pulsePhase?: number;
}

export interface FrameState {
  readonly timeMs: number;
  readonly durationMs: number;
  readonly activeStepIndex: number;
  readonly nodes: Record<string, ElementFrameState>;
  readonly connectors: Record<string, ElementFrameState>;
  readonly camera: Bounds2d | null;
}
