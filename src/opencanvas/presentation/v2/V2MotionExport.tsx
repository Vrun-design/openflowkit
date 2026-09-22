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
import type { AnimationPreset } from '../../domain/animation/types';
import { archModelOfPage } from '../../../dsl/model/model';
import { Button, Checkbox, Icon, IconButton, NumberField, Segmented, Slider } from '../design-system';
import { animatedSvgFor, motionFrameSvgFor, motionTimeline, buildMotionSvgFile } from './v2Motion';
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
}

export function V2MotionExport({ document, pageId, onToast }: V2MotionExportProps) {
  const page = document.pages.find(({ id }) => id === pageId) ?? document.pages[0];
  const flows = useMemo(() => (page ? archModelOfPage(page)?.flows ?? [] : []), [page]);
  const [preset, setPreset] = useState<AnimationPreset>('build');
  const [order, setOrder] = useState<string>('auto');
  const [loop, setLoop] = useState(false);
  const [theme, setTheme] = useState<'light' | 'dark'>('light');
  const [targetMs, setTargetMs] = useState<number | null>(null);
  const timeline = useMemo(() => {
    if (!page) return null;
    try {
      return motionTimeline({ document, pageId: page.id, preset, order, durationMs: targetMs, loop, theme });
    } catch {
      return null;
    }
  }, [document, page, preset, order, targetMs, loop, theme]);
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
    const request = { document, pageId: page?.id ?? pageId, preset, order, durationMs: targetMs, loop, theme };
    const file = buildMotionSvgFile(request);
    downloadV2Export([file]);
    onToast(`${file.filename} downloaded.`, 'success');
  }
  const orderOptions = [
    { value: 'auto', label: 'Auto', title: 'Follow the connector graph' },
    ...flows.map((flow) => ({ value: flow.id, label: flow.name, title: `Replay the "${flow.name}" flow` })),
  ];
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
      {flows.length > 0 ? (
        <Segmented<string> label="Order" value={order} onChange={setOrder} options={orderOptions} />
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
