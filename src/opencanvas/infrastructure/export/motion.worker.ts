// Frames out, one file in. The worker owns the frame schedule, the canvas and
// the encoder. A page of plain nodes and connectors is drawn here, from the
// domain draw list, with no main-thread round trip at all; pages the canvas
// cannot draw (charts, ink, images, annotations) fall back to the SVG path —
// the worker builds the markup, the main thread rasterises it (browsers only
// rasterise SVG on the main thread) and hands back a bitmap.
//
// Protocol: `start` → in canvas mode the worker paints and encodes on its own;
// in SVG mode it pushes up to WINDOW `svg` messages → the main answers each
// with a `frame` bitmap; the last frame finalises the file.
// Answers: `svg`, `ready`, `progress` every ten frames, one `done`/`error`.
//
// ponytail: GIF is 256 colours at ≤ 20 fps and pulse replaces an authored dash
// with its travelling light — deliberate preset looks, not bugs. Upgrade =
// per-frame palettes (bigger files) and a masked dash so the pattern survives.
import { GIFEncoder, applyPalette, quantize } from 'gifenc';
import { BufferTarget, CanvasSource, Mp4OutputFormat, Output, WebMOutputFormat } from 'mediabunny';
import type { Bounds2d } from '../../domain/geometry/types';
import type { SceneDocumentV1, ScenePage } from '../../domain/document/types';
import type { Timeline } from '../../domain/animation/types';
import { frameAt, timelineDuration } from '../../domain/animation/frame';
import { frameDrawList } from '../../domain/animation/drawList';
import { exportMotionFrameSvg } from './animatedSvg';
import { svgViewBox } from './canonicalSvg';
import { paintFrame } from './framePainter';
import { motionBitrate, motionCanvasSize, motionFrameIntervalMs, motionFrameTimes, type MotionSize } from './motionSchedule';

interface StartMessage {
  readonly type: 'start';
  readonly format: 'gif' | 'mp4' | 'webm';
  readonly size: MotionSize;
  readonly fps: number;
  readonly document: SceneDocumentV1;
  readonly timeline: Timeline;
  readonly pageId: string;
  readonly theme: 'light' | 'dark' | 'print';
}

interface FrameMessage {
  readonly type: 'frame';
  readonly index: number;
  readonly bitmap: ImageBitmap;
}

type InMessage = StartMessage | FrameMessage;

interface SvgMessage {
  readonly type: 'svg';
  readonly index: number;
  readonly svg: string;
  readonly width: number;
  readonly height: number;
}
interface ProgressMessage {
  readonly type: 'progress';
  readonly done: number;
}
interface DoneMessage {
  readonly type: 'done';
  readonly bytes: ArrayBuffer;
}
interface ReadyMessage {
  readonly type: 'ready';
  readonly total: number;
}
interface ErrorMessage {
  readonly type: 'error';
  readonly message: string;
}

export type MotionWorkerOut = SvgMessage | ProgressMessage | DoneMessage | ReadyMessage | ErrorMessage;

/** Frames handed out but not yet encoded. Two keeps memory flat and the pipe full. */
const WINDOW = 2;

interface Session {
  readonly format: StartMessage['format'];
  readonly width: number;
  readonly height: number;
  readonly fps: number;
  readonly document: SceneDocumentV1;
  readonly timeline: Timeline;
  readonly theme: StartMessage['theme'];
  readonly page: ScenePage;
  readonly viewBox: Bounds2d;
  readonly scale: number;
  /** `canvas` draws here; `svg` posts markup for the main thread to rasterise. */
  readonly mode: 'canvas' | 'svg';
  readonly times: readonly number[];
  readonly intervalMs: number;
  /** Order frames are handed to the main thread; GIF needs the last one first. */
  readonly order: readonly number[];
  readonly canvas: OffscreenCanvas;
  readonly context: OffscreenCanvasRenderingContext2D;
  encoder: ReturnType<typeof GIFEncoder> | null;
  output: Output<Mp4OutputFormat | WebMOutputFormat, BufferTarget> | null;
  source: CanvasSource | null;
  palette: readonly number[][] | null;
  handed: number;
  encoded: number;
  /** What the canvas currently shows; frames with the same picture reuse it. */
  drawnSignature: string | null;
  /** Encodes are serialised so frames reach the file in order. */
  chain: Promise<void>;
}

let session: Session | null = null;

function post(message: MotionWorkerOut, transfer: Transferable[] = []): void {
  (self as unknown as Worker).postMessage(message, transfer);
}

/**
 * A cheap signature of the picture at t. Two frames with the same signature
 * are the same image, so the second one never needs rasterising — most of a
 * build's hold time is static, and rasterising a 500-node page is the only
 * expensive step in the whole pipeline.
 */
function frameSignature(timeline: Timeline, tMs: number): string {
  const state = frameAt(timeline, tMs);
  const parts: string[] = [];
  for (const [id, node] of Object.entries(state.nodes)) {
    parts.push(`${id}:${node.opacity.toFixed(2)},${node.scale.toFixed(2)}`);
  }
  for (const [id, connector] of Object.entries(state.connectors)) {
    parts.push(`${id}:${connector.opacity.toFixed(2)},${connector.drawProgress.toFixed(2)},${connector.pulsePhase?.toFixed(2) ?? ''}`);
  }
  const camera = state.camera;
  if (camera) parts.push(`camera:${camera.x.toFixed(1)},${camera.y.toFixed(1)},${camera.width.toFixed(1)},${camera.height.toFixed(1)}`);
  return parts.join('|');
}

function svgFor(state: Session, index: number): string {
  return exportMotionFrameSvg(state.document, state.timeline, state.times[index]!, {
    pageId: state.page.id,
    theme: state.theme,
  });
}

/** Paints one frame from the domain draw list; the canvas then holds it. */
function drawCanvasFrame(state: Session, index: number): void {
  const at = state.times[index]!;
  const ops = frameDrawList(state.page, frameAt(state.timeline, at), state.theme, state.viewBox);
  paintFrame(state.context, ops, state.viewBox, state.scale);
  state.drawnSignature = frameSignature(state.timeline, at);
}

/** Hands out the next frame while the window has room. */
function pump(): void {
  const state = session;
  if (!state) return;
  while (state.handed - state.encoded < WINDOW && state.handed < state.order.length) {
    const index = state.order[state.handed]!;
    state.handed += 1;
    // Nothing in flight and the picture has not changed: encode what the
    // canvas already shows instead of drawing or rasterising it again.
    if (state.handed - 1 === state.encoded
      && state.drawnSignature !== null
      && frameSignature(state.timeline, state.times[index]!) === state.drawnSignature) {
      enqueue(state, () => encodeCurrent(state, index));
      continue;
    }
    if (state.mode === 'canvas') {
      enqueue(state, () => {
        drawCanvasFrame(state, index);
        return encodeCurrent(state, index);
      });
      continue;
    }
    post({ type: 'svg', index, svg: svgFor(state, index), width: state.width, height: state.height });
  }
}

/** Encodes are serialised so frames reach the file in order. */
function enqueue(state: Session, work: () => Promise<void>): void {
  state.chain = state.chain.then(work).catch((error: unknown) => {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  });
}

async function start(message: StartMessage): Promise<void> {
  const page = message.document.pages.find(({ id }) => id === message.pageId)
    ?? message.document.pages[0];
  if (!page) throw new Error('The page to animate was not found.');
  const viewBox = svgViewBox(message.document, { pageId: page.id });
  const { width, height } = motionCanvasSize(viewBox, message.size);
  const canvas = new OffscreenCanvas(width, height);
  const context = canvas.getContext('2d', { alpha: false, willReadFrequently: message.format === 'gif' });
  if (!context) throw new Error('This browser cannot draw offscreen.');
  context.imageSmoothingQuality = 'high';
  // One rule for the whole export: any visible node the canvas cannot draw
  // puts every frame back on the SVG path, so the protocol never changes
  // mid-file.
  const mode = frameDrawList(page, frameAt(message.timeline, 0), message.theme, viewBox)[0]?.kind === 'fallback'
    ? 'svg' : 'canvas';
  const times = motionFrameTimes(timelineDuration(message.timeline), motionFrameIntervalMs(message.format, message.fps));
  const state: Session = {
    format: message.format,
    width,
    height,
    fps: message.fps,
    document: message.document,
    timeline: message.timeline,
    theme: message.theme,
    page, viewBox, mode,
    scale: Math.min(width / viewBox.width, height / viewBox.height),
    times,
    intervalMs: motionFrameIntervalMs(message.format, message.fps),
    // GIF quantises from the finished diagram, so that frame is decoded first.
    order: message.format === 'gif'
      ? [times.length - 1, ...times.keys()]
      : [...times.keys()],
    canvas, context,
    encoder: message.format === 'gif' ? GIFEncoder() : null,
    output: null, source: null, palette: null,
    handed: 0, encoded: 0, drawnSignature: null, chain: Promise.resolve(),
  };
  if (message.format !== 'gif') {
    const output = new Output({
      format: message.format === 'mp4' ? new Mp4OutputFormat() : new WebMOutputFormat(),
      target: new BufferTarget(),
    });
    const source = new CanvasSource(canvas, {
      codec: message.format === 'mp4' ? 'avc' : 'vp9',
      bitrate: motionBitrate(width, height, message.fps),
      keyFrameInterval: 2,
    });
    output.addVideoTrack(source, { frameRate: message.fps });
    await output.start();
    state.output = output;
    state.source = source;
  }
  session = state;
  post({ type: 'ready', total: times.length });
  pump();
}

async function frame(message: FrameMessage): Promise<void> {
  const state = session;
  if (!state) throw new Error('The encoder was not started.');
  state.context.drawImage(message.bitmap, 0, 0);
  message.bitmap.close();
  state.drawnSignature = frameSignature(state.timeline, state.times[message.index]!);
  enqueue(state, () => encodeCurrent(state, message.index));
}

/** The canvas holds the frame; write it and hand out the next one. */
async function encodeCurrent(state: Session, index: number): Promise<void> {
  state.encoded += 1;
  if (state.format === 'gif') {
    const { width, height } = state.context.canvas;
    const data = state.context.getImageData(0, 0, width, height).data;
    if (!state.palette) {
      // The palette comes from the finished diagram: flat vector colours
      // quantise well and every frame then shares one table.
      state.palette = quantize(data, 256, { format: 'rgb565' });
    } else {
      const indexed = applyPalette(data, state.palette, 'rgb565');
      state.encoder!.writeFrame(indexed, width, height, { palette: state.palette, delay: state.intervalMs });
    }
  } else {
    await state.source!.add(state.times[index]! / 1000, state.intervalMs / 1000);
  }
  if (index % 10 === 0) post({ type: 'progress', done: index });
  pump();
  // The last encoded frame ends the file; the main thread just waits for it.
  if (state.encoded >= state.order.length) await finish();
}

async function finish(): Promise<void> {
  const state = session;
  if (!state) throw new Error('The encoder was not started.');
  if (state.format === 'gif') {
    state.encoder!.finish();
    const bytes = state.encoder!.bytes();
    post({ type: 'done', bytes: bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength) });
  } else {
    await state.output!.finalize();
    const buffer = state.output!.target.buffer;
    if (!buffer) throw new Error('The encoder produced no data.');
    post({ type: 'done', bytes: buffer }, [buffer]);
  }
  session = null;
}

self.onmessage = (event: MessageEvent<InMessage>) => {
  const message = event.data;
  const run = message.type === 'start' ? start(message) : frame(message);
  run.catch((error: unknown) => {
    post({ type: 'error', message: error instanceof Error ? error.message : String(error) });
  });
};
