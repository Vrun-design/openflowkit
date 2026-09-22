import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  flattenTimelineSteps, resolveFlowStep,
} from '../../domain/animation/flow';
import type { FlatTimelineStep } from '../../domain/animation/flow';
import { NOTE_MS, STEP_MS } from '../../domain/animation/frame';
import { flowToMermaid, flowToPlantUml, flowToSequenceDsl } from '../../../dsl/model/flowExport';
import type { ArchFlow, ArchModel } from '../../../dsl/model/types';
import type { FocusFrame } from '../../infrastructure/pixi/PixiFocusOverlay';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';

export interface FlowPlayback {
  readonly flow: ArchFlow | null;
  readonly flat: readonly FlatTimelineStep[];
  readonly stepIndex: number;
  readonly step: FlatTimelineStep | null;
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

  const flat = useMemo(() => (flow ? flattenTimelineSteps(flow) : []), [flow]);
  const step = flat[stepIndex] ?? null;

  const resolved = useMemo(() => {
    if (!step) return null;
    return resolveFlowStep(step.step, document, page);
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
