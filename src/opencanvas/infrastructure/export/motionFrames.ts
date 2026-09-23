// Motion encoding, main thread: start the worker and answer its SVG frames
// with bitmaps. A page the canvas can draw never comes back here at all — the
// worker paints and encodes it on its own. Only fallback frames (charts, ink,
// images, annotations) still rasterise an SVG, because browsers rasterise SVG
// only on the main thread.
import type { SceneDocumentV1 } from '../../domain/document/types';
import type { Timeline } from '../../domain/animation/types';
import { frameAt } from '../../domain/animation/frame';
import { frameDrawList } from '../../domain/animation/drawList';
import { exportMotionFrameSvg } from './animatedSvg';
import { svgViewBox } from './canonicalSvg';
import { paintFrame } from './framePainter';
import {
  motionCanvasSize, motionFrameIntervalMs, motionFrameTimes,
  type MotionFormat, type MotionFps, type MotionSize,
} from './motionSchedule';
import type { MotionWorkerOut } from './motion.worker';

export interface MotionEncodeRequest {
  readonly document: SceneDocumentV1;
  readonly timeline: Timeline;
  readonly pageId: string;
  readonly filenameStem: string;
  readonly format: MotionFormat;
  readonly size: MotionSize;
  readonly fps: MotionFps;
  readonly theme?: 'light' | 'dark' | 'print';
  /** Icon art for the SVG frames (see `CanonicalSvgExportOptions.iconArt`). */
  readonly iconArt?: Readonly<Record<string, string>>;
  readonly signal?: AbortSignal;
  readonly onProgress?: (done: number, total: number) => void;
}

export interface MotionEncodeResult {
  readonly filename: string;
  readonly mime: string;
  readonly bytes: Uint8Array;
}

/** MP4 is hidden where WebCodecs is missing; WebM falls back to MediaRecorder. */
export function webCodecsAvailable(): boolean {
  return typeof VideoEncoder !== 'undefined';
}

export function motionMime(format: MotionFormat): string {
  return format === 'gif' ? 'image/gif' : format === 'mp4' ? 'video/mp4' : 'video/webm';
}

function abortError(): Error {
  return new DOMException('Export cancelled.', 'AbortError');
}

/**
 * One frame as an ImageBitmap at the export size. The SVG decodes into an
 * `<img>` (browsers rasterise SVG only on the main thread) and is blitted into
 * a GPU-backed canvas: `createImageBitmap` would rasterise it again, on the
 * main thread, and that is what stalls the editor's canvas.
 */
async function decodeFrame(
  svg: string, width: number, height: number, canvas: OffscreenCanvas, context: OffscreenCanvasRenderingContext2D,
): Promise<ImageBitmap> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.width = width;
    image.height = height;
    image.src = url;
    await image.decode();
    context.clearRect(0, 0, width, height);
    context.drawImage(image, 0, 0, width, height);
    return canvas.transferToImageBitmap();
  } finally {
    URL.revokeObjectURL(url);
  }
}

/**
 * Frames → one file. The worker paints plain pages itself and only asks the
 * main thread for the SVG frames it must rasterise; those are decoded in
 * order. Progress lands every ten frames and cancelling terminates the worker
 * immediately, leaving the dialog usable.
 *
 * ponytail: a page with a chart, ink, an image or an annotation still
 * rasterises SVG on the main thread, so those pages pay the old cost —
 * upgrade = a per-node raster cache for the exotic kinds only.
 */
export async function renderMotionFile(request: MotionEncodeRequest): Promise<MotionEncodeResult> {
  const { document, timeline, pageId, format, size, fps } = request;
  const theme = request.theme ?? 'light';
  if (request.signal?.aborted) throw abortError();
  if (format === 'webm' && !webCodecsAvailable()) return recordWebmFallback(request);
  const worker = new Worker(new URL('./motion.worker.ts', import.meta.url), { type: 'module' });
  let frames = 0;
  let failure: ((error: Error) => void) | null = null;
  let finish: ((bytes: ArrayBuffer) => void) | null = null;
  const done = new Promise<ArrayBuffer>((resolve, reject) => {
    finish = resolve;
    failure = reject;
  });
  // The worker owns the export size — it is the side that knows the viewBox —
  // so the canvas it rasterises SVG frames into is built on the first one. A
  // page the canvas renderer covers never needs it at all.
  let surface: { readonly width: number; readonly height: number; readonly canvas: OffscreenCanvas; readonly context: OffscreenCanvasRenderingContext2D } | null = null;
  const surfaceFor = (width: number, height: number) => {
    if (surface && surface.width === width && surface.height === height) return surface;
    const canvas = new OffscreenCanvas(width, height);
    const context = canvas.getContext('2d', { alpha: false });
    if (!context) throw new Error('This browser cannot draw a canvas.');
    surface = { width, height, canvas, context };
    return surface;
  };
  // Decodes run one at a time, in the order the worker handed the frames out.
  let queue: Promise<void> = Promise.resolve();
  const decodeInto = (index: number, svg: string) => {
    queue = queue.then(async () => {
      if (request.signal?.aborted || !surface) return;
      const bitmap = await decodeFrame(svg, surface.width, surface.height, surface.canvas, surface.context);
      if (request.signal?.aborted) { bitmap.close(); return; }
      worker.postMessage({ type: 'frame', index, bitmap }, [bitmap]);
      // Hand the editor's next animation frame a clear slot before the next
      // raster: the export takes a little longer, the canvas keeps painting.
      await new Promise<void>((resolve) => { requestAnimationFrame(() => resolve()); });
    }).catch((error: unknown) => {
      failure?.(error instanceof Error ? error : new Error(String(error)));
    });
  };
  worker.onmessage = (event: MessageEvent<MotionWorkerOut>) => {
    const message = event.data;
    if (message.type === 'svg') {
      surfaceFor(message.width, message.height);
      decodeInto(message.index, message.svg);
    } else if (message.type === 'ready') frames = message.total;
    else if (message.type === 'progress') request.onProgress?.(message.done, frames);
    else if (message.type === 'done') finish?.(message.bytes);
    else failure?.(new Error(message.message));
  };
  worker.onerror = (event) => failure?.(new Error(event.message || 'The encoder stopped unexpectedly.'));
  // Terminating the worker kills the only thing that can settle `done`, so the
  // abort has to reject it too — otherwise cancelling hangs the export promise
  // and the dialog stays busy for ever.
  const abort = () => {
    worker.terminate();
    failure?.(abortError());
  };
  request.signal?.addEventListener('abort', abort, { once: true });
  try {
    worker.postMessage({ type: 'start', format, size, fps, document, timeline, pageId, theme, iconArt: request.iconArt ?? {} });
    const bytes = await done;
    return { filename: `${request.filenameStem}.${format}`, mime: motionMime(format), bytes: new Uint8Array(bytes) };
  } finally {
    request.signal?.removeEventListener('abort', abort);
    worker.terminate();
  }
}

/** The MediaRecorder fallback draws into a real canvas, so it decodes plainly. */
async function fallbackFrameBitmap(svg: string, width: number, height: number): Promise<ImageBitmap> {
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.width = width;
    image.height = height;
    image.src = url;
    await image.decode();
    return await createImageBitmap(image, 0, 0, width, height);
  } finally {
    URL.revokeObjectURL(url);
  }
}

function waitUntil(deadline: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    if (signal?.aborted) { reject(abortError()); return; }
    const onAbort = () => { window.clearTimeout(timer); reject(abortError()); };
    const timer = window.setTimeout(() => {
      signal?.removeEventListener('abort', onAbort);
      resolve();
    }, Math.max(0, deadline - performance.now()));
    signal?.addEventListener('abort', onAbort, { once: true });
  });
}

/**
 * WebM without WebCodecs: MediaRecorder over a captured canvas, in real time,
 * so a ten-second clip takes ten seconds. The spec's Safari-26-and-older path.
 *
 * ponytail: real-time recording means the clip cannot be faster than it plays,
 * and frames the machine misses are frames the file misses. Upgrade = a wasm
 * VP9 encoder for the offline path.
 */
async function recordWebmFallback(request: MotionEncodeRequest): Promise<MotionEncodeResult> {
  const { document, timeline, pageId, format, size, fps } = request;
  const theme = request.theme ?? 'light';
  const viewBox = svgViewBox(document, { pageId });
  const { width, height } = motionCanvasSize(viewBox, size);
  const times = motionFrameTimes(
    timeline.durationMs,
    motionFrameIntervalMs(format, fps),
  );
  const canvas = window.document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot draw a canvas.');
  const page = document.pages.find(({ id }) => id === pageId) ?? document.pages[0];
  const drawable = page !== undefined
    && frameDrawList(page, frameAt(timeline, 0), theme, viewBox)[0]?.kind !== 'fallback';
  const scale = Math.min(width / viewBox.width, height / viewBox.height);
  const mime = ['video/webm;codecs=vp9', 'video/webm;codecs=vp8', 'video/webm']
    .find((candidate) => MediaRecorder.isTypeSupported(candidate));
  if (!mime) throw new Error('This browser cannot record WebM.');
  const recorder = new MediaRecorder(canvas.captureStream(fps), { mimeType: mime });
  const chunks: Blob[] = [];
  recorder.ondataavailable = (event) => { if (event.data.size > 0) chunks.push(event.data); };
  const stopped = new Promise<void>((resolve) => { recorder.onstop = () => resolve(); });
  const started = performance.now();
  recorder.start();
  try {
    for (const [index, at] of times.entries()) {
      if (request.signal?.aborted) throw abortError();
      await waitUntil(started + at, request.signal);
      if (drawable) {
        paintFrame(context, frameDrawList(page, frameAt(timeline, at), theme, viewBox), viewBox, scale);
      } else {
        const bitmap = await fallbackFrameBitmap(
          exportMotionFrameSvg(document, timeline, at, { pageId, theme, ...(request.iconArt ? { iconArt: request.iconArt } : {}) }),
          width, height,
        );
        context.drawImage(bitmap, 0, 0);
        bitmap.close();
      }
      request.onProgress?.(index, times.length);
    }
    await waitUntil(started + times[times.length - 1]! + 250, request.signal);
  } finally {
    if (recorder.state !== 'inactive') recorder.stop();
    await stopped;
  }
  return {
    filename: `${request.filenameStem}.webm`,
    mime: 'video/webm',
    bytes: new Uint8Array(await new Blob(chunks, { type: 'video/webm' }).arrayBuffer()),
  };
}
