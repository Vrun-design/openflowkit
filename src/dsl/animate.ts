import type { ScenePage } from '../opencanvas/domain/document/types';
import type { JsonObject } from '../opencanvas/domain/document/json';
import type { DslDiagnostic } from './ast';
import { diagnostic } from './diagnostics';
import { joinTokens, type DslSegment } from './segments';
import { quote } from './text';
import { ANIMATION_PRESETS, type AnimationPreset } from '../opencanvas/domain/animation/types';
import { boundsOfNodes } from '../opencanvas/domain/animation/bounds';
import { scaleTimeline, stepDuration } from '../opencanvas/domain/animation/frame';
import type { AnimationStep, Timeline } from '../opencanvas/domain/animation/types';

/**
 * The `animate` block (grammar §6.6a): the one place motion is written down.
 * A step is "these things appear, hold, next" — steps round-trip to text,
 * keyframes do not. Omitted block means `autoSequence`; the serializer never
 * invents one.
 */

export interface AnimateStep {
  /** Node refs for a reveal step; `[from, to]` for an edge step. */
  readonly refs: readonly string[];
  /** Set when the step is about an edge (`step a -> c`). */
  readonly edge?: boolean;
  readonly label?: string;
  readonly holdMs?: number;
}

export interface AnimateBlock {
  readonly preset: AnimationPreset;
  readonly durationMs?: number;
  readonly loop: boolean;
  readonly steps: readonly AnimateStep[];
}

/** `10s`, `8500ms`, `10` → milliseconds. Null when unreadable. */
export function parseAnimateDuration(text: string): number | null {
  const match = /^(\d+(?:\.\d+)?)(ms|s)?$/.exec(text.trim());
  if (!match) return null;
  const value = Number(match[1]);
  if (!Number.isFinite(value) || value <= 0) return null;
  return Math.round(match[2] === 'ms' ? value : value * 1000);
}

export function formatAnimateDuration(ms: number): string {
  return ms % 1000 === 0 ? `${ms / 1000}s` : `${ms}ms`;
}

function isPreset(value: string): value is AnimationPreset {
  return (ANIMATION_PRESETS as readonly string[]).includes(value);
}

/** One inner line: `a, b`, `a -> c : label`, either plus `hold 2s`. */
function parseStep(segment: DslSegment, diagnostics: DslDiagnostic[]): AnimateStep | null {
  const tokens = segment.tokens;
  if (tokens[0]?.value !== 'step' || tokens.length < 2) {
    diagnostics.push(diagnostic(segment, 'W190', 'warning', 'animate: only `step` lines belong in the block; line dropped', 'step a, b'));
    return null;
  }
  const body = tokens.slice(1);
  const holdAt = body.findIndex((token) => token.value === 'hold');
  const head = holdAt >= 0 ? body.slice(0, holdAt) : body;
  const holdToken = holdAt >= 0 ? body.slice(holdAt + 1).find((token) => token.value !== 'hold') : undefined;
  const holdMs = holdToken ? parseAnimateDuration(holdToken.value) : undefined;
  if (holdToken && holdMs === null) {
    diagnostics.push(diagnostic(segment, 'W190', 'warning', `animate: unreadable hold "${holdToken.value}"; default timing used`, 'hold 2s'));
  }
  const arrow = head.findIndex((token) => token.kind === 'arrow');
  let step: AnimateStep;
  if (arrow > 0) {
    const colon = head.findIndex((token, index) => index > arrow && token.value === ':');
    const from = joinTokens(head.slice(0, arrow));
    const to = joinTokens(colon > arrow ? head.slice(arrow + 1, colon) : head.slice(arrow + 1));
    const label = colon > arrow ? joinTokens(head.slice(colon + 1)) : '';
    step = { refs: [from, to], edge: true, ...(label ? { label } : {}), ...(holdMs ? { holdMs } : {}) };
  } else {
    const refs = joinTokens(head).split(',').map((ref) => ref.trim()).filter(Boolean);
    step = { refs, ...(holdMs ? { holdMs } : {}) };
  }
  if (step.refs.length === 0 || step.refs.some((ref) => ref.length === 0)) {
    diagnostics.push(diagnostic(segment, 'W190', 'warning', 'animate: step has no node to reveal; line dropped', 'step a, b'));
    return null;
  }
  return step;
}

/**
 * Pulls the animate block out of a statement stream: the family parsers never
 * see it, so `step a -> c` inside the block cannot become a real edge. Works
 * for every family because it runs before the family is chosen.
 */
export function extractAnimateBlock(
  segments: readonly DslSegment[],
  diagnostics: DslDiagnostic[],
): { readonly block: AnimateBlock | null; readonly segments: readonly DslSegment[] } {
  const index = segments.findIndex((segment) => segment.tokens[0]?.value === 'animate' && segment.opens);
  if (index < 0) return { block: null, segments };
  const header = segments[index]!;
  const words = header.tokens.slice(1).map((token) => token.value);
  const presetWord = words.find((word) => word !== 'loop' && !/^\d/.test(word));
  const durationWord = words.find((word) => /^\d/.test(word));
  if (presetWord && !isPreset(presetWord)) {
    diagnostics.push(diagnostic(header, 'W190', 'warning', `animate: unknown preset "${presetWord}"; Build assumed`, 'build'));
  }
  const preset = presetWord && isPreset(presetWord) ? presetWord : 'build';
  const durationMs = durationWord ? parseAnimateDuration(durationWord) : null;
  if (durationWord && durationMs === null) {
    diagnostics.push(diagnostic(header, 'W190', 'warning', `animate: unreadable duration "${durationWord}"; natural length used`, '10s'));
  }
  const inner: DslSegment[] = [];
  let depth = 1;
  let close = -1;
  for (let at = index + 1; at < segments.length; at += 1) {
    const segment = segments[at]!;
    if (segment.opens) depth += 1;
    if (segment.closes) {
      depth -= 1;
      if (depth === 0) { close = at; break; }
    }
    if (segment.tokens.length > 0 && segment.tokens[0]?.kind !== 'comment') inner.push(segment);
  }
  if (close < 0) {
    diagnostics.push(diagnostic(header, 'W103', 'warning', 'animate block is never closed', '} inserted'));
    close = segments.length;
  }
  const steps = inner.flatMap((segment) => {
    const step = parseStep(segment, diagnostics);
    return step ? [step] : [];
  });
  return {
    block: { preset, ...(durationMs ? { durationMs } : {}), loop: words.includes('loop'), steps },
    segments: [...segments.slice(0, index), ...segments.slice(close + 1)],
  };
}

/** Canonical block text (grammar §6.4 order: after edges, before align/notes). */
export function animateBlockLines(block: AnimateBlock): string[] {
  const header = ['animate', block.preset];
  if (block.durationMs) header.push(formatAnimateDuration(block.durationMs));
  if (block.loop) header.push('loop');
  return [
    `${header.join(' ')} {`,
    ...block.steps.map((step) => {
      const body = step.edge
        ? `${step.refs[0] ?? ''} -> ${step.refs[1] ?? ''}${step.label ? ` : ${quote(step.label)}` : ''}`
        : step.refs.join(', ');
      return `  step ${body}${step.holdMs ? ` hold ${formatAnimateDuration(step.holdMs)}` : ''}`;
    }),
    '}',
  ];
}

/** Plain JSON for `metadata.dsl.animate`; the scene never holds class instances. */
export function animateToJson(block: AnimateBlock): JsonObject {
  return {
    preset: block.preset,
    ...(block.durationMs ? { durationMs: block.durationMs } : {}),
    loop: block.loop,
    steps: block.steps.map((step) => ({
      refs: [...step.refs],
      ...(step.edge ? { edge: true } : {}),
      ...(step.label ? { label: step.label } : {}),
      ...(step.holdMs ? { holdMs: step.holdMs } : {}),
    })),
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Reads `metadata.dsl.animate` back; malformed entries are dropped, never thrown. */
export function animateFromJson(value: unknown): AnimateBlock | null {
  if (!isRecord(value)) return null;
  const preset = typeof value.preset === 'string' && isPreset(value.preset) ? value.preset : 'build';
  const steps = Array.isArray(value.steps)
    ? value.steps.flatMap((entry): AnimateStep[] => {
      if (!isRecord(entry) || !Array.isArray(entry.refs)) return [];
      const refs = entry.refs.filter((ref): ref is string => typeof ref === 'string');
      if (refs.length === 0) return [];
      return [{
        refs,
        ...(entry.edge === true ? { edge: true } : {}),
        ...(typeof entry.label === 'string' ? { label: entry.label } : {}),
        ...(typeof entry.holdMs === 'number' && entry.holdMs > 0 ? { holdMs: entry.holdMs } : {}),
      }];
    })
    : [];
  return {
    preset,
    ...(typeof value.durationMs === 'number' && value.durationMs > 0 ? { durationMs: value.durationMs } : {}),
    loop: value.loop === true,
    steps,
  };
}

/**
 * The block as a playable timeline: refs are DSL ids, which are the scene ids
 * for every family that compiles one node per reference. Unknown refs warn and
 * reveal nothing rather than throwing.
 */
export function timelineFromAnimate(
  page: ScenePage,
  block: AnimateBlock,
  diagnostics: DslDiagnostic[] = [],
): Timeline {
  const nodeIds = new Set(page.nodes.map((node) => node.id));
  const connectorsFor = (from: string, to: string): readonly string[] =>
    page.connectors
      .filter((connector) => connector.source.nodeId === from && connector.target.nodeId === to)
      .map((connector) => connector.id);
  const steps: AnimationStep[] = block.steps.map((step) => {
    const known = step.refs.filter((ref) => nodeIds.has(ref));
    for (const ref of step.refs) {
      if (!nodeIds.has(ref)) {
        diagnostics.push({ code: 'W122', severity: 'warning', line: 0, col: 1, endCol: 1, message: `animate: unknown node "${ref}"`, source: 'parse' });
      }
    }
    const connectorIds = step.edge && step.refs.length >= 2 ? connectorsFor(step.refs[0]!, step.refs[1]!) : [];
    const camera = boundsOfNodes(page, known);
    return {
      nodeIds: known,
      connectorIds,
      ...(step.holdMs ? { holdMs: step.holdMs } : {}),
      ...(step.label ? { note: step.label } : {}),
      ...(camera ? { camera } : {}),
    };
  });
  const timeline: Timeline = { steps, preset: block.preset, loop: block.loop, durationMs: steps.reduce((sum, step) => sum + stepDuration(step), 0) };
  return block.durationMs ? scaleTimeline(timeline, block.durationMs) : timeline;
}
