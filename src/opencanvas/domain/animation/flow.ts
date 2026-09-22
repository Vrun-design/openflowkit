import type { SceneDocumentV1, ScenePage } from '../document/types';
import { boundsOfNodes } from './bounds';
import type { ArchFlow, ArchModel, FlowStep } from '../../../dsl/model/types';
import { NOTE_MS, stepDuration } from './frame';
import type { AnimationStep, Timeline } from './types';

/**
 * Flow resolution, lifted out of `useV2FlowPlayback` so the hook, the export
 * preview and the encoders share it: each flow step becomes the node and
 * connector ids it lights up on a page. Presentation keeps page switching and
 * the camera; the mapping itself is pure.
 */

export interface FlatTimelineStep {
  readonly step: FlowStep;
  readonly depth: number;
  readonly branch?: string;
}

/** Playback-ordered steps with structural depth; the single flatten walk. */
export function flattenTimelineSteps(flow: Pick<ArchFlow, 'steps'>): readonly FlatTimelineStep[] {
  const out: FlatTimelineStep[] = [];
  const walk = (steps: readonly FlowStep[], depth: number, branch?: string) => {
    for (const step of steps) {
      out.push({ step, depth, ...(branch ? { branch } : {}) });
      for (const lane of step.branches ?? []) walk(lane.steps, depth + 1, lane.label);
    }
  };
  walk(flow.steps, 0);
  return out;
}

function elementIdOf(node: { readonly metadata: unknown }): string | null {
  const metadata = node.metadata as { model?: unknown };
  const model = metadata?.model;
  if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
  const elementId = (model as Record<string, unknown>).elementId;
  return typeof elementId === 'string' ? elementId : null;
}

function relationIdOf(connector: { readonly metadata: unknown }): string | null {
  const metadata = connector.metadata as { model?: unknown };
  const model = metadata?.model;
  if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
  const relationId = (model as Record<string, unknown>).relationId;
  return typeof relationId === 'string' ? relationId : null;
}

function nodeIdForElement(page: ScenePage | null, elementId: string): string | null {
  return page?.nodes.find((candidate) => elementIdOf(candidate) === elementId)?.id ?? null;
}

function pageShowingElement(
  document: SceneDocumentV1 | null, elementId: string, current: ScenePage | null,
): ScenePage | null {
  if (nodeIdForElement(current, elementId)) return current;
  return document?.pages.find((page) => nodeIdForElement(page, elementId)) ?? current;
}

export interface ResolvedFlowStep {
  readonly nodeIds: readonly string[];
  readonly connectorIds: readonly string[];
  readonly targetPage: ScenePage | null;
}

/** Element ids of one flow step → live node/connector ids on a page. */
export function resolveFlowStep(
  step: Pick<FlowStep, 'from' | 'to'>,
  document: SceneDocumentV1 | null,
  page: ScenePage | null,
): ResolvedFlowStep {
  const elementIds = [step.from, step.to].filter((id): id is string => Boolean(id));
  if (elementIds.length === 0) return { nodeIds: [], connectorIds: [], targetPage: null };
  const targetPage = elementIds.reduce<ScenePage | null>(
    (found, elementId) => found ?? pageShowingElement(document, elementId, page),
    null,
  );
  const sourcePage = targetPage ?? page;
  const nodeIds = elementIds.flatMap((elementId) => {
    const id = nodeIdForElement(sourcePage, elementId);
    return id ? [id] : [];
  });
  const relationId = step.from && step.to ? `rel:${step.from}->${step.to}` : null;
  const connectorIds = relationId
    ? sourcePage?.connectors
      .filter((connector) => connector.id === relationId || relationIdOf(connector) === relationId)
      .map((connector) => connector.id) ?? []
    : [];
  return { nodeIds, connectorIds, targetPage };
}

const NOTE_KINDS: readonly string[] = ['intro', 'info', 'conclusion'];

/**
 * A flow as a timeline: one step per flattened flow step, notes holding
 * longer, camera gliding to each step's bounds. Defaults to the walkthrough
 * preset — the flow playback look.
 */
export function flowToTimeline(
  flow: ArchFlow,
  _model: ArchModel,
  document: SceneDocumentV1 | null,
  page: ScenePage | null,
  preset: Timeline['preset'] = 'walkthrough',
): Timeline {
  const steps: AnimationStep[] = flattenTimelineSteps(flow).map(({ step }) => {
    const resolved = resolveFlowStep(step, document, page);
    const note = NOTE_KINDS.includes(step.kind) ? (step.label ?? step.kind) : undefined;
    const targetPage = resolved.targetPage ?? page;
    const camera = targetPage ? boundsOfNodes(targetPage, resolved.nodeIds) : undefined;
    return {
      nodeIds: resolved.nodeIds,
      connectorIds: resolved.connectorIds,
      ...(note ? { note, holdMs: NOTE_MS } : {}),
      ...(camera ? { camera } : {}),
      ...(resolved.targetPage ? { pageId: resolved.targetPage.id } : {}),
    };
  });
  const durationMs = steps.reduce((sum, step) => sum + stepDuration(step), 0);
  return { steps, preset, loop: false, durationMs };
}
