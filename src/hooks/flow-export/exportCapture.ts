import { getCompatibleNodesBounds } from '@/lib/reactflowCompat';
import type { FlowNode } from '@/lib/types';
import { encodeGif, startGifStream } from '@/services/gifEncoder';

export type ExportImageFormat = 'png' | 'jpeg';

export interface ExportCaptureConfig {
  maxDimension?: number;
  pixelRatio?: number;
}

export interface CapturedFrame {
  dataUrl: string;
  delayMs: number;
}

export interface DecodedFrame {
  frame: CapturedFrame;
  image: CanvasImageSource;
}

export type FrameBackgroundPainter = (
  context: CanvasRenderingContext2D,
  width: number,
  height: number
) => void;

export interface ExportCaptureOptions {
  width: number;
  height: number;
  options: {
    backgroundColor: string | null;
    width: number;
    height: number;
    style: {
      transform: string;
      width: string;
      height: string;
    };
    pixelRatio: number;
    skipFonts: boolean;
    filter: (node: HTMLElement) => boolean;
  };
}

export interface StreamingGifHandle {
  addFrame(dataUrl: string, delayMs: number): Promise<void>;
  finish(): Blob;
}

const EXPORT_CAPTURE_PADDING = 80;
const DEFAULT_EXPORT_WIDTH = 800;
const DEFAULT_EXPORT_HEIGHT = 600;
const EXPORT_FILTERED_CLASS_NAMES = [
  'react-flow__controls',
  'react-flow__minimap',
  'react-flow__attribution',
  'react-flow__background',
] as const;

export function wait(ms: number): Promise<void> {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export function waitForAnimationFrame(): Promise<void> {
  return new Promise((resolve) => {
    window.requestAnimationFrame(() => resolve());
  });
}

export async function waitForExportRender(minDelayMs = 0): Promise<void> {
  if (minDelayMs > 0) {
    await wait(minDelayMs);
  }

  await waitForAnimationFrame();
  await waitForAnimationFrame();
}

export function createDownload(blob: Blob, fileName: string): void {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.download = fileName;
  link.href = url;
  link.click();
  URL.revokeObjectURL(url);
}

async function copyBlobToClipboard(blob: Blob): Promise<void> {
  if (!navigator.clipboard?.write || typeof ClipboardItem === 'undefined') {
    throw new Error('Clipboard image copy is not supported in this browser.');
  }

  await navigator.clipboard.write([new ClipboardItem({ [blob.type]: blob })]);
}

export async function copyDataUrlToClipboard(dataUrl: string): Promise<void> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  await copyBlobToClipboard(blob);
}

function shouldIncludeExportNode(node: HTMLElement): boolean {
  if (!node.classList) {
    return true;
  }

  return !EXPORT_FILTERED_CLASS_NAMES.some((className) => node.classList.contains(className));
}

export function createExportOptions(
  nodes: FlowNode[],
  format: ExportImageFormat,
  config?: ExportCaptureConfig
): ExportCaptureOptions {
  const bounds = getCompatibleNodesBounds(nodes);
  const rawWidth = (bounds.width || DEFAULT_EXPORT_WIDTH) + EXPORT_CAPTURE_PADDING * 2;
  const rawHeight = (bounds.height || DEFAULT_EXPORT_HEIGHT) + EXPORT_CAPTURE_PADDING * 2;
  const longestSide = Math.max(rawWidth, rawHeight);
  const maxDimension = config?.maxDimension ?? longestSide;
  const scale = longestSide > maxDimension ? maxDimension / longestSide : 1;
  const width = Math.max(1, Math.round(rawWidth * scale));
  const height = Math.max(1, Math.round(rawHeight * scale));

  return {
    width,
    height,
    options: {
      backgroundColor: format === 'png' ? null : '#ffffff',
      width,
      height,
      style: {
        transform: `translate(${-bounds.x + EXPORT_CAPTURE_PADDING}px, ${-bounds.y + EXPORT_CAPTURE_PADDING}px) scale(${scale})`,
        width: `${rawWidth}px`,
        height: `${rawHeight}px`,
      },
      pixelRatio: config?.pixelRatio ?? 3,
      skipFonts: true,
      filter: shouldIncludeExportNode,
    },
  };
}

function loadImage(dataUrl: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () => reject(new Error('Failed to decode exported frame.'));
    image.src = dataUrl;
  });
}

async function decodeCapturedFrame(dataUrl: string): Promise<CanvasImageSource> {
  if (typeof window.createImageBitmap === 'function') {
    const response = await fetch(dataUrl);
    const blob = await response.blob();
    return window.createImageBitmap(blob);
  }

  return loadImage(dataUrl);
}

export async function decodeCapturedFrames(frames: CapturedFrame[]): Promise<DecodedFrame[]> {
  return Promise.all(
    frames.map(async (frame) => ({
      frame,
      image: await decodeCapturedFrame(frame.dataUrl),
    }))
  );
}

export async function decodeSingleFrame(dataUrl: string): Promise<CanvasImageSource> {
  return decodeCapturedFrame(dataUrl);
}

function createExportCanvas(
  width: number,
  height: number
): {
  canvas: HTMLCanvasElement;
  context: CanvasRenderingContext2D;
} {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');

  if (!context) {
    throw new Error('Canvas 2D context is unavailable.');
  }

  return { canvas, context };
}

export function renderDecodedFrame(
  context: CanvasRenderingContext2D,
  width: number,
  height: number,
  image: CanvasImageSource,
  backgroundColor?: string,
  backgroundPainter?: FrameBackgroundPainter
): void {
  if (backgroundPainter) {
    backgroundPainter(context, width, height);
  } else if (backgroundColor) {
    context.fillStyle = backgroundColor;
    context.fillRect(0, 0, width, height);
  } else {
    context.clearRect(0, 0, width, height);
  }

  context.drawImage(image, 0, 0, width, height);
}

export async function encodeGifFromFrames(params: {
  frames: DecodedFrame[];
  width: number;
  height: number;
  backgroundColor?: string;
  backgroundPainter?: FrameBackgroundPainter;
}): Promise<Blob> {
  const { frames, width, height, backgroundColor, backgroundPainter } = params;
  const { context } = createExportCanvas(width, height);
  const gifFrames = [];

  for (const { frame, image } of frames) {
    renderDecodedFrame(context, width, height, image, backgroundColor, backgroundPainter);
    gifFrames.push({
      imageData: context.getImageData(0, 0, width, height),
      delayMs: frame.delayMs,
    });
  }

  return encodeGif(gifFrames);
}

export async function encodeVideoFromFrames(params: {
  frames: DecodedFrame[];
  width: number;
  height: number;
  fps: number;
  mimeType: string;
  backgroundColor?: string;
  backgroundPainter?: FrameBackgroundPainter;
}): Promise<Blob> {
  const { frames, width, height, fps, mimeType, backgroundColor, backgroundPainter } = params;
  const { canvas, context } = createExportCanvas(width, height);
  const stream = canvas.captureStream(fps);
  const recorder = new MediaRecorder(stream, { mimeType });
  const chunks: BlobPart[] = [];

  recorder.ondataavailable = (event) => {
    if (event.data.size > 0) {
      chunks.push(event.data);
    }
  };

  const stopped = new Promise<Blob>((resolve) => {
    recorder.onstop = () => resolve(new Blob(chunks, { type: mimeType }));
  });

  recorder.start();
  const frameDurationMs = Math.max(1, Math.round(1000 / fps));

  for (const { frame, image } of frames) {
    const repeatCount = Math.max(1, Math.round(frame.delayMs / frameDurationMs));
    for (let repeatIndex = 0; repeatIndex < repeatCount; repeatIndex += 1) {
      renderDecodedFrame(context, width, height, image, backgroundColor, backgroundPainter);
      await wait(frameDurationMs);
    }
  }

  recorder.stop();
  return stopped;
}

export function createStreamingGifEncoder(
  width: number,
  height: number,
  backgroundPainter?: FrameBackgroundPainter
): StreamingGifHandle {
  const { context } = createExportCanvas(width, height);
  const stream = startGifStream(width, height, true);

  return {
    async addFrame(dataUrl: string, delayMs: number) {
      const image = await decodeCapturedFrame(dataUrl);
      renderDecodedFrame(context, width, height, image, undefined, backgroundPainter);
      const imageData = context.getImageData(0, 0, width, height);
      stream.addFrame(imageData, delayMs);
    },
    finish() {
      return stream.finish();
    },
  };
}
