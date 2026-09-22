import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { flattenFlowSteps, placedElementId, type FlatFlowStep } from '../../../dsl/model/model';
import { flowToMermaid, flowToPlantUml, flowToSequenceDsl } from '../../../dsl/model/flowExport';
import type { ArchFlow, ArchModel } from '../../../dsl/model/types';
import type { FocusFrame } from '../../infrastructure/pixi/PixiFocusOverlay';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';

/** IcePanel's playback feel: each step reads for a beat, notes read longer. */
const STEP_MS = 1700;
const NOTE_MS = 2600;

export interface FlowPlayback {
  readonly flow: ArchFlow | null;
  readonly flat: readonly FlatFlowStep[];
  readonly stepIndex: number;
  readonly step: FlatFlowStep | null;
  readonly playing: boolean;
  /** What the canvas should spotlight for this step; null when closed. */
  readonly focus: FocusFrame | null;
  open: (flow: ArchFlow) => void;
  close: () => void;
  next: () => void;
  prev: () => void;
  toggle: () => void;
  jumpTo: (index: number) => void;
  exportText: (kind: 'mermaid' | 'plantuml' | 'sequence') => string | null;
}

function relationIdOf(connector: ScenePage['connectors'][number]): string | null {
  const model = connector.metadata.model;
  if (!model || typeof model !== 'object' || Array.isArray(model)) return null;
  const relationId = (model as Record<string, unknown>).relationId;
  return typeof relationId === 'string' ? relationId : null;
}

function nodeIdForElement(page: ScenePage | null, elementId: string): string | null {
  const node = page?.nodes.find((candidate) => placedElementId(candidate) === elementId);
  return node?.id ?? null;
}

function pageShowingElement(document: SceneDocumentV1 | null, elementId: string, current: ScenePage | null): ScenePage | null {
  if (nodeIdForElement(current, elementId)) return current;
  return document?.pages.find((page) => nodeIdForElement(page, elementId)) ?? current;
}

export interface FlowPlaybackOptions {
  readonly model: ArchModel | null;
  readonly document: SceneDocumentV1 | null;
  readonly page: ScenePage | null;
  readonly glideToNodes: (nodeIds: readonly string[]) => void;
  readonly onOpenPage: (pageId: string) => void;
}

/**
 * Plays a flow against the live canvas: each step resolves its two elements to
 * page nodes (switching views when needed) and glides the camera. Playback is
 * presentation state — it never touches the document.
 */
export function useV2FlowPlayback(options: FlowPlaybackOptions): FlowPlayback {
  const { model, document, page, glideToNodes, onOpenPage } = options;
  const [flow, setFlow] = useState<ArchFlow | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [playing, setPlaying] = useState(false);
  const optionsRef = useRef(options);
  useEffect(() => { optionsRef.current = options; });

  const flat = useMemo(() => (flow ? flattenFlowSteps(flow) : []), [flow]);
  const step = flat[stepIndex] ?? null;

  const resolved = useMemo(() => {
    if (!step) return null;
    const elementIds = [step.step.from, step.step.to].filter((id): id is string => Boolean(id));
    if (elementIds.length === 0) return { nodeIds: [], connectorIds: [], targetPage: null as ScenePage | null };
    const targetPage = elementIds.reduce<ScenePage | null>(
      (found, elementId) => found ?? pageShowingElement(document, elementId, page),
      null,
    );
    const sourcePage = targetPage ?? page;
    const nodeIds = elementIds.flatMap((elementId) => {
      const id = nodeIdForElement(sourcePage, elementId);
      return id ? [id] : [];
    });
    const relationId = step.step.from && step.step.to ? `rel:${step.step.from}->${step.step.to}` : null;
    const connectorIds = relationId
      ? sourcePage?.connectors
        .filter((connector) => connector.id === relationId || relationIdOf(connector) === relationId)
        .map((connector) => connector.id) ?? []
      : [];
    return { nodeIds, connectorIds, targetPage };
  }, [step, document, page]);

  // Navigating to the page that shows the step is part of playback, not of the
  // focus overlay: the page switch re-runs the resolution above.
  useEffect(() => {
    if (!flow || !resolved?.targetPage) return;
    if (resolved.targetPage.id !== page?.id) {
      onOpenPage(resolved.targetPage.id);
      return;
    }
    if (resolved.nodeIds.length > 0) glideToNodes(resolved.nodeIds);
  }, [flow, resolved, page?.id, onOpenPage, glideToNodes]);

  useEffect(() => {
    if (!flow || !playing || flat.length === 0) return;
    const current = flat[stepIndex];
    const delay = current && ['info', 'intro', 'conclusion'].includes(current.step.kind) ? NOTE_MS : STEP_MS;
    const timer = window.setTimeout(() => {
      if (stepIndex + 1 >= flat.length) setPlaying(false);
      else setStepIndex(stepIndex + 1);
    }, delay);
    return () => window.clearTimeout(timer);
  }, [flow, playing, flat, stepIndex]);

  const close = useCallback(() => {
    setPlaying(false);
    setFlow(null);
    setStepIndex(0);
  }, []);

  const open = useCallback((next: ArchFlow) => {
    setFlow(next);
    setStepIndex(0);
    setPlaying(false);
  }, []);

  return {
    flow, flat, stepIndex, step, playing,
    focus: flow && resolved ? { nodeIds: resolved.nodeIds, connectorIds: resolved.connectorIds } : null,
    open, close, next: () => setStepIndex((index) => Math.min(index + 1, Math.max(0, flat.length - 1))),
    prev: () => setStepIndex((index) => Math.max(0, index - 1)),
    jumpTo: (index) => setStepIndex(Math.max(0, Math.min(index, flat.length - 1))),
    toggle: () => setPlaying((value) => !value),
    exportText: (kind) => {
      if (!flow || !model) return null;
      if (kind === 'mermaid') return flowToMermaid(flow, model);
      if (kind === 'plantuml') return flowToPlantUml(flow, model);
      return flowToSequenceDsl(flow, model);
    },
  };
}
