// Export panel, Animation section: preset, order, duration and a preview of
// the exact animated SVG the download produces. Presentation only — the
// timeline and every artefact come from `v2Motion`, the one pipeline the
// preview, the stills and the files share.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconDownload, IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward,
} from '@tabler/icons-react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { stepWindows, timelineDuration } from '../../domain/animation/frame';
import type { AnimationPreset, Timeline } from '../../domain/animation/types';
import { archModelOfPage } from '../../../dsl/model/model';
import { animateBlockFromTimeline, timelineFromAnimate, type AnimateBlock } from '../../../dsl/animate';
import { Button, Checkbox, Icon, IconButton, NumberField, Segmented, Slider } from '../design-system';
import { animatedSvgFor, animateBlockFromText, motionFrameSvgFor, motionTimeline, buildMotionSvgFile } from './v2Motion';
import { V2MotionSteps } from './V2MotionSteps';
import { downloadV2Export } from './v2Export';

const PRESETS: readonly { value: AnimationPreset; label: string; title: string }[] = [
  { value: 'build', label: 'Build', title: 'Everything appears in order' },
  { value: 'walkthrough', label: 'Walkthrough', title: 'Spotlight one step at a time' },
  { value: 'pulse', label: 'Pulse', title: 'Everything shown; connectors carry a moving light' },
];

export interface V2MotionExportProps {
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  readonly onToast: (title: string, tone: 'info' | 'success' | 'danger') => void;
  /** Writes the animate block into the code panel (the text hub). */
  readonly onAnimateBlock?: (block: AnimateBlock) => void;
  /** The code panel's live text; the `code` order reads its block. */
  readonly codeText?: string;
}

export function V2MotionExport({ document, pageId, onToast, onAnimateBlock, codeText }: V2MotionExportProps) {
  const page = document.pages.find(({ id }) => id === pageId) ?? document.pages[0];
  const flows = useMemo(() => (page ? archModelOfPage(page)?.flows ?? [] : []), [page]);
  const [preset, setPreset] = useState<AnimationPreset>('build');
  const [order, setOrder] = useState<string>('auto');
  const [loop, setLoop] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [targetMs, setTargetMs] = useState<number | null>(null);
  // Editing a chip turns the order into an explicit animate block: the chips
  // ARE the DSL, rendered, and every edit is written back to the code panel.
  const [edited, setEdited] = useState<AnimateBlock | null>(null);
  const codeBlock = useMemo(() => animateBlockFromText(codeText), [codeText]);
  const timeline = useMemo<Timeline | null>(() => {
    if (!page) return null;
    try {
      return edited
        ? timelineFromAnimate(page, edited)
        : motionTimeline({ document, pageId: page.id, preset, order, durationMs: targetMs, loop, theme, ...(codeText ? { codeText } : {}) });
    } catch {
      return null;
    }
  }, [document, page, preset, order, targetMs, loop, theme, edited, codeText]);
  const durationMs = timeline ? timelineDuration(timeline) : 0;
  const empty = !timeline || timeline.steps.length === 0 || durationMs <= 0;
  const [tMs, setTMs] = useState(0);
  const [playing, setPlaying] = useState(false);
  const [playFrom, setPlayFrom] = useState(0);
  // Derived, never reset in an effect: an edit that shortens the clip simply
  // clamps the playhead on the next render.
  const at = Math.min(tMs, durationMs);
  const rafRef = useRef(0);
  useEffect(() => {
    if (!playing || durationMs <= 0) return;
    const started = performance.now();
    const tick = (now: number) => {
      const elapsed = playFrom + (now - started);
      if (elapsed >= durationMs && !loop) {
        setTMs(durationMs);
        setPlaying(false);
        return;
      }
      setTMs(elapsed % durationMs);
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [playing, playFrom, durationMs, loop]);
  const playingSvg = useMemo(() => {
    if (empty || !page) return null;
    return animatedSvgFor({ document, pageId: page.id, preset, order, durationMs: targetMs, loop, theme }, { seekMs: playFrom });
  }, [empty, page, document, preset, order, targetMs, loop, theme, playFrom]);
  const stillSvg = useMemo(() => {
    if (empty || !page) return null;
    return motionFrameSvgFor({ document, pageId: page.id, preset, order, durationMs: targetMs, loop, theme }, at);
  }, [empty, page, document, preset, order, targetMs, loop, theme, at]);
  const previewSvg = playing ? playingSvg : stillSvg;
  const play = () => {
    if (empty) return;
    setPlayFrom(at >= durationMs ? 0 : at);
    setPlaying(true);
  };
  const toggle = () => (playing ? setPlaying(false) : play());
  const stepBy = (direction: 1 | -1) => {
    if (!timeline) return;
    setPlaying(false);
    const windows = stepWindows(timeline);
    const current = windows.findIndex((window) => at < window.end - 1);
    const index = current < 0 ? windows.length - 1 : current;
    setTMs(windows[Math.min(Math.max(0, index + direction), windows.length - 1)]!.start);
  };
  function download(): void {
    if (empty) return;
    // An edited timeline is written out as its block, so the file matches the chips.
    const block = edited && page && timeline ? animateBlockFromTimeline(timeline, page) : null;
    const request = {
      document, pageId: page?.id ?? pageId, preset, order: block ? 'code' : order,
      durationMs: block ? null : targetMs, loop: block ? block.loop : loop, theme,
    };
    const file = buildMotionSvgFile(request);
    downloadV2Export([file]);
    onToast(`${file.filename} downloaded.`, 'success');
  }
  const orderOptions = [
    { value: 'auto', label: 'Auto', title: 'Follow the connector graph' },
    ...flows.map((flow) => ({ value: flow.id, label: flow.name, title: `Replay the "${flow.name}" flow` })),
    ...(codeBlock ? [{ value: 'code', label: 'From code', title: 'Play the animate block in the diagram source' }] : []),
  ];
  // A chip edit rebuilds the block from the timeline the user is looking at.
  const editSteps = (mutate: (steps: ReturnType<typeof animateBlockFromTimeline>['steps']) => ReturnType<typeof animateBlockFromTimeline>['steps']): void => {
    if (!timeline || !page) return;
    const next: AnimateBlock = { ...animateBlockFromTimeline(timeline, page), steps: mutate(animateBlockFromTimeline(timeline, page).steps) };
    setEdited(next);
    onAnimateBlock?.(next);
    setPlaying(false);
  };
  const move = (from: number, to: number) => editSteps((steps) => {
    const at = Math.min(Math.max(0, to), steps.length - 1);
    if (from === at) return steps;
    const copy = [...steps];
    const [step] = copy.splice(from, 1);
    if (!step) return steps;
    copy.splice(at, 0, step);
    return copy;
  });
  const merge = (from: number, to: number) => editSteps((steps) => {
    if (from === to || !steps[from] || !steps[to]) return steps;
    const target = steps[to]!;
    const source = steps[from]!;
    const merged = {
      refs: [...target.refs, ...source.refs],
      ...(target.edges || source.edges ? { edges: [...(target.edges ?? []), ...(source.edges ?? [])] } : {}),
      ...(target.label ?? source.label ? { label: target.label ?? source.label } : {}),
      ...(target.holdMs ?? source.holdMs ? { holdMs: target.holdMs ?? source.holdMs } : {}),
    };
    return steps.filter((_, index) => index !== from).map((step, index) => (index === (from < to ? to - 1 : to) ? merged : step));
  });
  const setHold = (index: number, holdMs: number | null) => editSteps((steps) => steps.map((step, at) => {
    if (at !== index) return step;
    const { holdMs: _previous, ...rest } = step;
    return holdMs ? { ...rest, holdMs } : rest;
  }));
  return (
    <div
      className="ofk-v2-properties ofk-motion"
      onKeyDown={(event) => {
        if ((event.target as HTMLElement).closest('button, input, textarea, select, [role="slider"]')) return;
        if (event.key === ' ') { event.preventDefault(); toggle(); }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); stepBy(-1); }
        else if (event.key === 'ArrowRight') { event.preventDefault(); stepBy(1); }
      }}
    >
      <Segmented<AnimationPreset> label="Preset" value={preset} onChange={setPreset} options={PRESETS} />
      {orderOptions.length > 1 ? (
        <Segmented<string> label="Order" value={edited ? 'code' : order}
          onChange={(value) => { setOrder(value); setEdited(value === 'code' ? (codeBlock ?? null) : null); }}
          options={orderOptions} />
      ) : null}
      <div className="ofk-motion-preview" data-empty={empty || undefined}>
        {empty ? (
          <p className="ofk-caption">Nothing to animate here — this page has no shapes.</p>
        ) : (
          <img
            src={`data:image/svg+xml;charset=utf-8,${encodeURIComponent(previewSvg ?? '')}`}
            alt={`${PRESETS.find((option) => option.value === preset)?.label ?? preset} preview, ${timeline?.steps.length ?? 0} steps, ${(durationMs / 1000).toFixed(1)} seconds`}
            tabIndex={0}
            aria-label="Animation preview"
          />
        )}
      </div>
      <div className="ofk-motion-transport">
        <IconButton
          label={playing ? 'Pause (space)' : 'Play (space)'}
          aria-pressed={playing}
          disabled={empty}
          icon={<Icon icon={playing ? IconPlayerPause : IconPlayerPlay} />}
          onClick={toggle}
        />
        <IconButton label="Previous step (left arrow)" disabled={empty} icon={<Icon icon={IconPlayerSkipBack} />} onClick={() => stepBy(-1)} />
        <Slider
          label="Timeline"
          hideLabel
          min={0}
          max={Math.max(1, durationMs)}
          step={10}
          value={Math.round(at)}
          readout={`${(at / 1000).toFixed(1)}s / ${(durationMs / 1000).toFixed(1)}s`}
          aria-valuetext={`${(at / 1000).toFixed(1)} of ${(durationMs / 1000).toFixed(1)} seconds`}
          disabled={empty}
          onChange={(event) => {
            setPlaying(false);
            setTMs(Number(event.currentTarget.value));
          }}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
            event.preventDefault();
            stepBy(event.key === 'ArrowRight' ? 1 : -1);
          }}
        />
        <IconButton label="Next step (right arrow)" disabled={empty} icon={<Icon icon={IconPlayerSkipForward} />} onClick={() => stepBy(1)} />
      </div>
      <div className="ofk-motion-fields">
        <NumberField
          label="Duration"
          value={Number(((targetMs ?? durationMs) / 1000).toFixed(1))}
          min={1}
          max={600}
          step={0.5}
          unit="s"
          stepper="none"
          onChange={(value) => setTargetMs(value * 1000)}
        />
        <Segmented<'light' | 'dark'> label="Theme" value={theme} onChange={setTheme}
          options={[{ value: 'light', label: 'Light' }, { value: 'dark', label: 'Dark' }]} />
        <Checkbox label="Loop" checked={loop} onChange={(event) => setLoop(event.currentTarget.checked)} />
      </div>
      {timeline && page && !empty ? (
        <V2MotionSteps steps={timeline.steps} page={page} onReorder={move} onMerge={merge} onHold={setHold} />
      ) : null}
      <div className="ofk-v2-export-actions">
        <Button variant="primary" disabled={empty} onClick={download}>
          <Icon icon={IconDownload} /> Download SVG
        </Button>
      </div>
      <p className="ofk-caption">
        {empty
          ? 'An animation needs at least one shape on the page.'
          : `Plays in GitHub READMEs, docs and any browser. ${timeline?.steps.length ?? 0} steps, ${(durationMs / 1000).toFixed(1)}s${loop ? ', loops' : ''}.`}
      </p>
    </div>
  );
}
