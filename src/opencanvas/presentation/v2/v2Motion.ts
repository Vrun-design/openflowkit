// Motion export request → SVG artefacts. One place that turns the live
// document into a timeline and then into files, so the dialog, the MCP host
// and the test hook cannot drift.

import type { SceneDocumentV1 } from '../../domain/document/types';
import { autoSequence } from '../../domain/animation/sequence';
import { scaleTimeline, timelineDuration } from '../../domain/animation/frame';
import { flowToTimeline } from '../../domain/animation/flow';
import type { AnimationPreset, Timeline } from '../../domain/animation/types';
import { archModelOfPage } from '../../../dsl/model/model';
import { exportAnimatedSvg, exportMotionFrameSvg } from '../../infrastructure/export/animatedSvg';
import type { V2ExportFile } from './v2Export';

/** `auto` walks the connector graph; a flow id replays a phase-5 flow. */
export type V2MotionOrder = 'auto' | (string & {});

export interface V2MotionRequest {
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  readonly preset?: AnimationPreset;
  readonly order?: V2MotionOrder;
  /** Explicit clip length; null keeps the natural one. */
  readonly durationMs?: number | null;
  readonly loop?: boolean;
  readonly theme?: 'light' | 'dark' | 'print';
}

function pageOf(request: V2MotionRequest) {
  return request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0];
}

/** The timeline the dialog previews and every output is rendered from. */
export function motionTimeline(request: V2MotionRequest): Timeline {
  const page = pageOf(request);
  if (!page) throw new RangeError('Motion export requires a page.');
  const preset = request.preset ?? 'build';
  const model = archModelOfPage(page);
  const flow = request.order && request.order !== 'auto'
    ? model?.flows.find((candidate) => candidate.id === request.order)
    : undefined;
  const base = flow && model
    ? flowToTimeline(flow, model, request.document, page, preset)
    : autoSequence(page, preset);
  return request.durationMs ? scaleTimeline(base, request.durationMs) : base;
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
