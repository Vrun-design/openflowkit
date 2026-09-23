// Export panel, Animation section: preset, order, duration and a preview of
// the exact animated SVG the download produces. Presentation only — the
// timeline and every artefact come from `v2Motion`, the one pipeline the
// preview, the stills and the files share.
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  IconCopy, IconDownload, IconPlayerPause, IconPlayerPlay, IconPlayerSkipBack, IconPlayerSkipForward, IconX,
} from '@tabler/icons-react';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { stepWindows, timelineDuration } from '../../domain/animation/frame';
import type { AnimationPreset, Timeline } from '../../domain/animation/types';
import { archModelOfPage } from '../../../dsl/model/model';
import { animateBlockFromTimeline, timelineFromAnimate, type AnimateBlock } from '../../../dsl/animate';
import { Button, Checkbox, Icon, IconButton, NumberField, Segmented, Slider } from '../design-system';
import { MOTION_FPS, MOTION_SIZES, motionFrameIntervalMs, motionFrameTimes, type MotionFormat, type MotionFps, type MotionSize } from '../../infrastructure/export/motionSchedule';
import { renderMotionFile, webCodecsAvailable } from '../../infrastructure/export/motionFrames';
import { animatedSvgFor, animateBlockFromText, motionFileStem, motionFrameSvgFor, motionTimeline, buildMotionSvgFile } from './v2Motion';
import { V2MotionSteps } from './V2MotionSteps';
import { loadIconArt } from './v2IconArt';
import { copyImageToClipboard, downloadV2Export } from './v2Export';

type MotionOutput = 'svg' | MotionFormat;

const FORMAT_OPTIONS: readonly { value: MotionOutput; label: string; title: string }[] = [
  { value: 'svg', label: 'SVG', title: 'Animated vector; plays in GitHub READMEs, docs and Notion' },
  { value: 'gif', label: 'GIF', title: 'Plays everywhere: Slack, GitHub, X, email' },
  { value: 'mp4', label: 'MP4', title: 'Plays in Slack, Keynote, YouTube; not in a README' },
  { value: 'webm', label: 'WebM', title: 'Plays in Chrome, Firefox and Slack' },
];

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
  const [output, setOutput] = useState<MotionOutput>('svg');
  const [fps, setFps] = useState<MotionFps>(24);
  const [size, setSize] = useState<MotionSize>(1080);
  const [busy, setBusy] = useState(false);
  const [progress, setProgress] = useState<{ readonly done: number; readonly total: number } | null>(null);
  // Icon art loads once per document; the preview redraws with it when it lands.
  const [iconArt, setIconArt] = useState<Readonly<Record<string, string>>>({});
  useEffect(() => {
    let live = true;
    void loadIconArt(document).then((art) => { if (live) setIconArt(art); });
    return () => { live = false; };
  }, [document]);
  const [failure, setFailure] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);
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
  const [playing, setPlaying] = useState(() => !globalThis.matchMedia?.('(prefers-reduced-motion: reduce)').matches);
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
    return animatedSvgFor({ document, pageId: page.id, preset, order, durationMs: targetMs, loop, theme, iconArt }, { seekMs: playFrom });
  }, [empty, page, document, preset, order, targetMs, loop, theme, playFrom, iconArt]);
  const stillSvg = useMemo(() => {
    if (empty || !page) return null;
    return motionFrameSvgFor({ document, pageId: page.id, preset, order, durationMs: targetMs, loop, theme, iconArt }, at);
  }, [empty, page, document, preset, order, targetMs, loop, theme, at, iconArt]);
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
  // An edited timeline is written out as its block, so files match the chips.
  const block = edited && page && timeline ? animateBlockFromTimeline(timeline, page) : null;
  const request = {
    document, pageId: page?.id ?? pageId, preset, order: block ? 'code' : order,
    durationMs: block ? null : targetMs, loop: block ? block.loop : loop, theme, iconArt,
    ...(codeText ? { codeText } : {}),
  };
  function download(): void {
    if (empty) return;
    const file = buildMotionSvgFile(request);
    downloadV2Export([file]);
    onToast(`${file.filename} downloaded.`, 'success');
  }
  async function encode(): Promise<void> {
    if (empty || !timeline || !page || output === 'svg') return;
    const controller = new AbortController();
    abortRef.current = controller;
    setBusy(true);
    setFailure(null);
    setProgress({ done: 0, total: motionFrameTimes(timelineDuration(timeline), motionFrameIntervalMs(output, fps)).length });
    try {
      const file = await renderMotionFile({
        document, timeline, pageId: page.id, filenameStem: motionFileStem(request),
        format: output, size, fps, theme, iconArt, signal: controller.signal,
        onProgress: (done, total) => setProgress({ done, total }),
      });
      downloadV2Export([file]);
      onToast(`${file.filename} downloaded.`, 'success');
    } catch (error) {
      if (error instanceof DOMException && error.name === 'AbortError') {
        onToast('Export cancelled.', 'info');
      } else {
        // One sentence, and the dialog stays usable.
        const message = error instanceof Error ? error.message : 'The export failed.';
        setFailure(message);
        onToast(message, 'danger');
      }
    } finally {
      setBusy(false);
      setProgress(null);
      abortRef.current = null;
    }
  }
  async function copy(): Promise<void> {
    if (empty || !timeline || !page || output === 'svg') return;
    setBusy(true);
    setFailure(null);
    try {
      const file = await renderMotionFile({
        document, timeline, pageId: page.id, filenameStem: motionFileStem(request),
        format: output, size, fps, theme, iconArt,
      });
      const copied = await copyImageToClipboard(file.bytes, file.mime);
      if (copied) onToast(`${output.toUpperCase()} copied to the clipboard.`, 'success');
      else setFailure('This browser cannot copy that format to the clipboard — download it instead.');
    } catch (error) {
      const message = error instanceof Error ? error.message : 'The export failed.';
      setFailure(message);
      onToast(message, 'danger');
    } finally {
      setBusy(false);
    }
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
      <div className="ofk-motion-stage">
      <Segmented<AnimationPreset> label="Preset" value={preset} onChange={setPreset} options={PRESETS} />
      <div className="ofk-motion-preview" data-empty={empty || undefined} data-busy={busy || undefined}>
        {empty ? (
          <div className="ofk-motion-empty">
            <span className="ofk-motion-hero" aria-hidden="true"><i /><i /><i /></span>
            <p className="ofk-caption">Nothing to animate yet. Add shapes and each one becomes a step.</p>
          </div>
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
          selected={playing}
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
      </div>
      {orderOptions.length > 1 ? (
        <Segmented<string> label="Order" value={edited ? 'code' : order}
          onChange={(value) => { setOrder(value); setEdited(value === 'code' ? (codeBlock ?? null) : null); }}
          options={orderOptions} />
      ) : null}
      <Segmented<MotionOutput> label="Format" value={output} onChange={setOutput}
        options={FORMAT_OPTIONS.filter((option) => option.value !== 'mp4' || webCodecsAvailable())} />
      {output !== 'svg' ? (
        <>
          <Segmented<'12' | '24' | '30'> label="Frame rate" value={String(fps) as '12' | '24' | '30'}
            onChange={(value) => setFps(Number(value) as MotionFps)}
            options={MOTION_FPS.map((value) => ({ value: String(value) as '12' | '24' | '30', label: `${value} fps` }))} />
          <Segmented<'720' | '1080' | '1440'> label="Size" value={String(size) as '720' | '1080' | '1440'}
            onChange={(value) => setSize(Number(value) as MotionSize)}
            options={MOTION_SIZES.map((value) => ({ value: String(value) as '720' | '1080' | '1440', label: `${value}p` }))} />
        </>
      ) : null}
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
      {progress ? (
        <div className="ofk-motion-progress" role="status">
          <progress value={progress.done} max={Math.max(1, progress.total)} aria-label="Encoding progress" />
          <span className="ofk-caption">Frame {progress.done} of {progress.total}</span>
          <Button variant="quiet" onClick={() => abortRef.current?.abort()}>
            <Icon icon={IconX} /> Cancel
          </Button>
        </div>
      ) : null}
      {failure ? <p className="ofk-motion-failure" role="alert">{failure}</p> : null}
      <div className="ofk-v2-export-actions">
        <Button variant="primary" disabled={empty || busy}
          onClick={() => { if (output === 'svg') download(); else void encode(); }}>
          <Icon icon={IconDownload} /> {output === 'svg' ? 'Download SVG' : `Export ${FORMAT_OPTIONS.find((option) => option.value === output)?.label ?? output}`}
        </Button>
        {output !== 'svg' ? (
          <Button variant="quiet" disabled={empty || busy} onClick={() => { void copy(); }}>
            <Icon icon={IconCopy} /> Copy
          </Button>
        ) : null}
      </div>
      <p className="ofk-caption">
        {empty
          ? 'Pick a preset now and it is ready the moment the page has shapes.'
          : output === 'svg'
            ? `Plays in GitHub READMEs, docs and any browser. ${timeline?.steps.length ?? 0} steps, ${(durationMs / 1000).toFixed(1)}s${loop ? ', loops' : ''}.`
            : `${FORMAT_OPTIONS.find((option) => option.value === output)?.title ?? ''} ${timeline?.steps.length ?? 0} steps, ${(durationMs / 1000).toFixed(1)}s at ${fps} fps.`}
      </p>
    </div>
  );
}
