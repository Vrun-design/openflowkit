import type { Bounds2d } from '../../domain/geometry/types';
import type { SceneDocumentV1 } from '../../domain/document/types';
import { projectPageConnectors } from '../../domain/connectors/routeProjection';
import { cameraFitMatrix } from '../../domain/animation/camera';
import {
  DRAW_MS, GLIDE_MS, PULSE_DASH, PULSE_MS, REVEAL_MS, STORYBOARD_DIM,
  frameAt, stepRuns, stepWindows, timelineDuration,
} from '../../domain/animation/frame';
import type { Timeline } from '../../domain/animation/types';
import {
  exportCanonicalSvg, matrixCss, scaleAbout, svgViewBox,
  type CanonicalSvgExportOptions, type CssAnimation, type ElementAnimations,
} from './canonicalSvg';

/**
 * Animated SVG: the canonical markup plus one `<style>` block of CSS
 * keyframes. Element states come from the same `frameAt` the preview and the
 * encoders use, so the file, the preview and the raster frames agree frame
 * for frame. The base markup is the finished diagram — `prefers-reduced-motion`
 * switches the animations off and leaves the still.
 *
 * ponytail: one `@keyframes` block per element and the whole SVG re-emitted
 * per export — fine to ~500 nodes (≈1 MB); upgrade = share keyframes through
 * CSS variables, or patch only the groups whose state changed.
 */

/** `easeOutCubic` as a CSS bezier (agrees with the function to < 0.2 %). */
const EASE = 'cubic-bezier(.215,.61,.355,1)';
/** Camera glide sampling: fine enough that linear CSS steps track the eased path. */
const CAMERA_SAMPLE_MS = 40;
/** Percent-point nudge that turns a value change into a cut. */
const CUT = 0.001;

export interface AnimatedSvgOptions {
  readonly pageId?: string;
  readonly theme?: 'light' | 'dark' | 'print';
  readonly padding?: number;
  /**
   * Start the animations this far into the clip (negative delay), so the
   * preview can resume from the scrubber. Zero for files.
   */
  readonly seekMs?: number;
  /** Repeat forever; the preview and the README loop both use it. */
  readonly loop?: boolean;
  /** Icon art, as for the static export. */
  readonly iconArt?: CanonicalSvgExportOptions['iconArt'];
}

type Stops = Map<string, string>;

function stop(stops: Stops, pct: number, declarations: string): void {
  stops.set(Math.max(0, Math.min(100, pct)).toFixed(3), declarations);
}

function keyframes(name: string, stops: Stops): string {
  const body = [...stops.entries()]
    .sort((a, b) => Number(a[0]) - Number(b[0]))
    .map(([pct, declarations]) => `${pct}%{${declarations}}`)
    .join('');
  return `@keyframes ${name}{${body}}`;
}

function elementName(kind: 'node' | 'connector', id: string): string {
  return `ofk-${kind}-${id.replace(/[^A-Za-z0-9_-]/g, '-')}`;
}

/** Clip settings every keyframe animation shares: whole-clip span, seek, loop. */
interface ClipSettings {
  readonly durationMs: number;
  readonly seekMs: number;
  readonly loop: boolean;
}

/** Every element keyframe spans the whole clip; percentages are absolute. */
function clipAnimation(name: string, clip: ClipSettings): CssAnimation {
  return {
    name,
    durationMs: clip.durationMs,
    delayMs: -clip.seekMs,
    ...(clip.loop ? { iterationCount: 'infinite' } : {}),
  };
}

interface Planned {
  readonly css: readonly string[];
  readonly elements: ReadonlyMap<string, ElementAnimations>;
  readonly camera?: CssAnimation;
}

/** Element → the step indexes it belongs to, one map for nodes and connectors. */
function stepPlaces(timeline: Timeline): ReadonlyMap<string, number[]> {
  const places = new Map<string, number[]>();
  timeline.steps.forEach((step, index) => {
    for (const id of step.nodeIds) places.set(`node:${id}`, [...(places.get(`node:${id}`) ?? []), index]);
    for (const id of step.connectorIds) places.set(`connector:${id}`, [...(places.get(`connector:${id}`) ?? []), index]);
  });
  return places;
}

function splitKey(key: string): { readonly kind: 'node' | 'connector'; readonly id: string } {
  const at = key.indexOf(':');
  return { kind: key.slice(0, at) as 'node' | 'connector', id: key.slice(at + 1) };
}

/** Connectors whose authored dash makes a draw-on dishonest; they just fade. */
function dashedConnectorIds(document: SceneDocumentV1, pageId: string | undefined): ReadonlySet<string> {
  const page = pageId ? document.pages.find(({ id }) => id === pageId) ?? document.pages[0] : document.pages[0];
  if (!page) return new Set();
  return new Set(projectPageConnectors(page)
    .filter((connector) => connector.presentation.stroke.dash.length > 0)
    .map((connector) => connector.id));
}

/** Node-local centres, so the pop scales about the art exactly like the still. */
function nodeCenters(document: SceneDocumentV1, pageId: string | undefined): ReadonlyMap<string, { x: number; y: number }> {
  const page = pageId ? document.pages.find(({ id }) => id === pageId) ?? document.pages[0] : document.pages[0];
  if (!page) return new Map();
  return new Map(page.nodes.map((node) => [node.id, { x: node.size.width / 2, y: node.size.height / 2 }]));
}

function planBuild(
  timeline: Timeline,
  clip: ClipSettings,
  dashed: ReadonlySet<string>,
  centers: ReadonlyMap<string, { x: number; y: number }>,
): Planned {
  const durationMs = clip.durationMs;
  const windows = stepWindows(timeline);
  const css: string[] = [];
  const elements = new Map<string, ElementAnimations>();
  for (const [key, places] of stepPlaces(timeline)) {
    const { kind, id } = splitKey(key);
    const window = windows[Math.min(...places)]!;
    const start = (window.start / durationMs) * 100;
    const name = elementName(kind, id);
    // Nodes pop 0.92 → 1 like the stills; connectors only fade and draw on.
    // Identity is `none`, not `scale(1)`: an identity transform would still
    // rasterise into a bbox-clipped layer and shave the node's stroke.
    const center = centers.get(id) ?? { x: 0, y: 0 };
    const hidden = kind === 'node' ? `opacity:0;transform:${scaleAbout(center, 0.92)}` : 'opacity:0';
    const shown = kind === 'node' ? 'opacity:1;transform:none' : 'opacity:1';
    const fade: Stops = new Map();
    stop(fade, 0, hidden);
    stop(fade, start, `${hidden};animation-timing-function:${EASE}`);
    stop(fade, ((window.start + REVEAL_MS) / durationMs) * 100, shown);
    stop(fade, 100, shown);
    css.push(keyframes(name, fade));
    let path: (CssAnimation & { readonly dash: string }) | undefined;
    if (kind === 'connector' && !dashed.has(id)) {
      // ponytail: draw-on needs a unit dash, so only solid connectors draw;
      // dashed ones fade in (a unit dash would flatten their pattern mid-draw)
      // — upgrade = mask-based draw-on that keeps the authored dash.
      const draw: Stops = new Map();
      stop(draw, 0, 'stroke-dashoffset:1');
      stop(draw, start, `stroke-dashoffset:1;animation-timing-function:${EASE}`);
      stop(draw, ((window.start + DRAW_MS) / durationMs) * 100, 'stroke-dashoffset:0');
      stop(draw, 100, 'stroke-dashoffset:0');
      path = { ...clipAnimation(`${name}-draw`, clip), dash: '1' };
      css.push(keyframes(path.name, draw));
    }
    elements.set(key, { group: clipAnimation(name, clip), ...(path ? { path } : {}) });
  }
  return { css, elements };
}

function planWalkthrough(
  timeline: Timeline,
  clip: ClipSettings,
  viewBox: Bounds2d,
  centers: ReadonlyMap<string, { x: number; y: number }>,
): Planned {
  const durationMs = clip.durationMs;
  const windows = stepWindows(timeline);
  const css: string[] = [];
  const elements = new Map<string, ElementAnimations>();
  for (const [key, places] of stepPlaces(timeline)) {
    const { kind, id } = splitKey(key);
    const runs = stepRuns(places);
    const center = centers.get(id) ?? { x: 0, y: 0 };
    const dim = kind === 'node' ? `opacity:${STORYBOARD_DIM};transform:none` : `opacity:${STORYBOARD_DIM}`;
    const shown = kind === 'node' ? 'opacity:1;transform:none' : 'opacity:1';
    const revealAt = windows[runs[0]![0]]!.start;
    const stops: Stops = new Map();
    if (revealAt > 0) {
      stop(stops, 0, dim);
      stop(stops, (revealAt / durationMs) * 100 - CUT, `${dim};animation-timing-function:steps(1,end)`);
    }
    stop(stops, (revealAt / durationMs) * 100, kind === 'node'
      ? `opacity:0;transform:${scaleAbout(center, 0.92)};animation-timing-function:${EASE}`
      : `opacity:0;animation-timing-function:${EASE}`);
    stop(stops, ((revealAt + REVEAL_MS) / durationMs) * 100, shown);
    runs.forEach((run, index) => {
      if (index > 0) {
        stop(stops, (windows[run[0]]!.start / durationMs) * 100 - CUT, `${dim};animation-timing-function:steps(1,end)`);
        stop(stops, (windows[run[0]]!.start / durationMs) * 100, shown);
      }
      // The clip's last step stays lit; frameAt reads the same at t = end.
      if (windows[run[1]]!.end < durationMs) {
        stop(stops, (windows[run[1]]!.end / durationMs) * 100 - CUT, `${shown};animation-timing-function:steps(1,end)`);
        stop(stops, (windows[run[1]]!.end / durationMs) * 100, dim);
      }
    });
    const name = elementName(kind, id);
    css.push(keyframes(name, stops));
    elements.set(key, { group: clipAnimation(name, clip) });
  }
  const camera = planCamera(timeline, clip, viewBox);
  return camera
    ? { css: [...css, camera.css], elements, camera: camera.animation }
    : { css, elements };
}

function sameBounds(a: Bounds2d, b: Bounds2d): boolean {
  return a.x === b.x && a.y === b.y && a.width === b.width && a.height === b.height;
}

/**
 * The camera's keyframes. The camera holds between steps and moves only
 * during a glide, so each step gets a hold stop at its boundary plus samples
 * of the glide itself — every sample read from the same `frameAt` the stills
 * use, so a paused SVG lands on the still exactly.
 *
 * ponytail: the glide is sampled every 40 ms and CSS interpolates linearly
 * between samples (≈0.1 % off the eased path); upgrade = emit per-segment
 * cubic-bezier stops from the glide's own easing.
 */
function planCamera(
  timeline: Timeline, clip: ClipSettings, viewBox: Bounds2d,
)
: { readonly css: string; readonly animation: CssAnimation } | null {
  const durationMs = clip.durationMs;
  if (!timeline.steps.some((step) => step.camera)) return null;
  const windows = stepWindows(timeline);
  const stops: Stops = new Map();
  const transformAt = (tMs: number): string => {
    const camera = frameAt(timeline, tMs).camera;
    return camera ? `transform:${matrixCss(cameraFitMatrix(camera, viewBox))}` : 'transform:none';
  };
  timeline.steps.forEach((step, index) => {
    const start = windows[index]!.start;
    stop(stops, (start / durationMs) * 100 - CUT, transformAt(start));
    if (!step.camera) return;
    const previous = timeline.steps.slice(0, index).reverse().find((candidate) => candidate.camera)?.camera;
    if (previous && sameBounds(previous, step.camera)) return;
    for (let at = start; at <= Math.min(start + GLIDE_MS, durationMs); at += CAMERA_SAMPLE_MS) {
      stop(stops, (at / durationMs) * 100, transformAt(at));
    }
  });
  stop(stops, 100, transformAt(durationMs));
  return { css: keyframes('ofk-camera', stops), animation: clipAnimation('ofk-camera', clip) };
}

function planPulse(timeline: Timeline, clip: ClipSettings): Planned {
  const elements = new Map<string, ElementAnimations>();
  const css = [keyframes('ofk-pulse', new Map([['0', 'stroke-dashoffset:0'], ['100', 'stroke-dashoffset:-1']]))];
  const order = new Set<string>();
  timeline.steps.forEach((step) => step.connectorIds.forEach((id) => order.add(id)));
  [...order].forEach((id, index) => {
    elements.set(`connector:${id}`, {
      path: {
        name: 'ofk-pulse', durationMs: PULSE_MS, delayMs: -index * 0.25 * PULSE_MS - clip.seekMs,
        iterationCount: 'infinite', fill: 'none', timing: 'linear', dash: PULSE_DASH,
      },
    });
  });
  return { css, elements };
}

/**
 * The animated SVG for a timeline. Build fades and draws on, walkthrough
 * spotlights with a gliding camera, pulse rides a travelling dash on the
 * connectors.
 */
export function exportAnimatedSvg(
  document: SceneDocumentV1,
  timeline: Timeline,
  options: AnimatedSvgOptions = {}
): string {
  const durationMs = timelineDuration(timeline);
  if (timeline.steps.length === 0 || durationMs <= 0) {
    throw new TypeError('Animated SVG export requires at least one step.');
  }
  const viewBox = svgViewBox(document, options);
  const centers = nodeCenters(document, options.pageId);
  const clip: ClipSettings = { durationMs, seekMs: Math.max(0, options.seekMs ?? 0), loop: options.loop ?? false };
  const plan = timeline.preset === 'pulse'
    ? planPulse(timeline, clip)
    : timeline.preset === 'walkthrough'
      ? planWalkthrough(timeline, clip, viewBox, centers)
      : planBuild(timeline, clip, dashedConnectorIds(document, options.pageId), centers);
  const svgOptions: CanonicalSvgExportOptions = {
    ...(options.pageId ? { pageId: options.pageId } : {}),
    ...(options.theme ? { theme: options.theme } : {}),
    ...(options.padding === undefined ? {} : { padding: options.padding }),
    ...(options.iconArt ? { iconArt: options.iconArt } : {}),
    animations: (kind, id) => plan.elements.get(`${kind}:${id}`),
    ...(plan.camera ? { cameraAnimation: plan.camera } : {}),
    styleSheet: [
      ...plan.css,
      '@media (prefers-reduced-motion: reduce){.ofk-anim{animation:none!important}}',
    ].join(''),
  };
  return exportCanonicalSvg(document, svgOptions);
}

/** One paused frame of the same timeline: the scrubber still and every raster frame. */
export function exportMotionFrameSvg(
  document: SceneDocumentV1,
  timeline: Timeline,
  tMs: number,
  options: AnimatedSvgOptions = {}
): string {
  return exportCanonicalSvg(document, {
    ...(options.pageId ? { pageId: options.pageId } : {}),
    ...(options.theme ? { theme: options.theme } : {}),
    ...(options.padding === undefined ? {} : { padding: options.padding }),
    ...(options.iconArt ? { iconArt: options.iconArt } : {}),
    frame: frameAt(timeline, tMs),
  });
}
