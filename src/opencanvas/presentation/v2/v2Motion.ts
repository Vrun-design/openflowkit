// Motion export request → SVG artefacts. One place that turns the live
// document into a timeline and then into files, so the dialog, the MCP host
// and the test hook cannot drift.

import type { SceneDocumentV1 } from '../../domain/document/types';
import { scaleTimeline, timelineDuration } from '../../domain/animation/frame';
import type { AnimationPreset, Timeline } from '../../domain/animation/types';
import { extractAnimateBlock, motionTimelineFor, timelineFromAnimate, type AnimateBlock } from '../../../dsl/animate';
import { parseDocument } from '../../../dsl/document';
import type { MotionFormat, MotionFps, MotionSize } from '../../infrastructure/export/motionSchedule';
import { exportAnimatedSvg, exportMotionFrameSvg } from '../../infrastructure/export/animatedSvg';
import { renderMotionFile } from '../../infrastructure/export/motionFrames';
import type { V2ExportFile } from './v2Export';

/** `auto` walks the connector graph; a flow id replays a phase-5 flow; `code` reads the frame's animate block. */
export type V2MotionOrder = 'auto' | 'code' | (string & {});

export interface V2MotionRequest {
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  readonly preset?: AnimationPreset;
  readonly order?: V2MotionOrder;
  /** Explicit clip length; null keeps the natural one. */
  readonly durationMs?: number | null;
  readonly loop?: boolean;
  readonly theme?: 'light' | 'dark' | 'print';
  /** The code panel's current text; `code` order reads its animate block. */
  readonly codeText?: string;
}

function pageOf(request: V2MotionRequest) {
  return request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0];
}

/** The animate block in a document's source text, if it has one. */
export function animateBlockFromText(text: string | undefined): AnimateBlock | null {
  if (!text) return null;
  try {
    return extractAnimateBlock(parseDocument(text).segments, []).block;
  } catch {
    return null;
  }
}

/**
 * The timeline the dialog previews and every output is rendered from. The
 * shared resolver handles auto/flow/the frame's block; the dialog's live code
 * draft wins when it is present, so chips and preview never lag the panel.
 */
export function motionTimeline(request: V2MotionRequest): Timeline {
  if (request.order === 'code' && request.codeText !== undefined) {
    const page = pageOf(request);
    const block = animateBlockFromText(request.codeText);
    if (page && block) {
      const timeline = timelineFromAnimate(page, block);
      return request.durationMs ? scaleTimeline(timeline, request.durationMs) : timeline;
    }
  }
  return motionTimelineFor(request);
}

export function animatedSvgFor(
  request: V2MotionRequest & { readonly timeline?: Timeline },
  options: { readonly seekMs?: number } = {},
): string {
  const timeline = request.timeline ?? motionTimeline(request);
  return exportAnimatedSvg(request.document, timeline, {
    pageId: request.pageId,
    ...(request.theme ? { theme: request.theme } : {}),
    ...(request.loop ? { loop: true } : {}),
    ...(options.seekMs ? { seekMs: options.seekMs } : {}),
  });
}

/** One paused frame: the preview scrubber and every raster frame read this. */
export function motionFrameSvgFor(
  request: V2MotionRequest & { readonly timeline?: Timeline },
  tMs: number,
): string {
  const timeline = request.timeline ?? motionTimeline(request);
  return exportMotionFrameSvg(request.document, timeline, tMs, {
    pageId: request.pageId,
    ...(request.theme ? { theme: request.theme } : {}),
  });
}

function slug(value: string, fallback: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
}

export function motionFileStem(request: V2MotionRequest): string {
  const page = pageOf(request);
  const document = slug(request.document.name, 'diagram');
  const name = page ? slug(page.name, page.id) : request.pageId;
  return `${document}-${name}-${request.preset ?? 'build'}`;
}

export function buildMotionSvgFile(request: V2MotionRequest): V2ExportFile {
  return {
    filename: `${motionFileStem(request)}.svg`,
    mime: 'image/svg+xml',
    text: animatedSvgFor(request),
  };
}

export { timelineDuration };

export interface V2MotionEncodeRequest extends V2MotionRequest {
  readonly timeline?: Timeline;
  readonly format: MotionFormat;
  readonly size: MotionSize;
  readonly fps: MotionFps;
}

/** The raster/video motion file for a request; the live host's extra path. */
export async function buildMotionRasterFile(request: V2MotionEncodeRequest): Promise<V2ExportFile> {
  const file = await renderMotionFile({
    document: request.document,
    timeline: request.timeline ?? motionTimeline(request),
    pageId: pageOf(request)?.id ?? request.pageId,
    filenameStem: motionFileStem(request),
    format: request.format,
    size: request.size,
    fps: request.fps,
    ...(request.theme ? { theme: request.theme } : {}),
  });
  return { filename: file.filename, mime: file.mime, bytes: file.bytes };
}
