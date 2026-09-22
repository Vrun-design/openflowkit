// Motion export request → SVG artefacts. One place that turns the live
// document into a timeline and then into files, so the dialog, the MCP host
// and the test hook cannot drift.

import type { SceneDocumentV1 } from '../../domain/document/types';
import { autoSequence } from '../../domain/animation/sequence';
import { timelineDuration } from '../../domain/animation/frame';
import type { AnimationPreset, Timeline } from '../../domain/animation/types';
import { exportAnimatedSvg, exportMotionFrameSvg } from '../../infrastructure/export/animatedSvg';

export interface V2MotionExportRequest {
  readonly document: SceneDocumentV1;
  readonly pageId: string;
  readonly preset?: AnimationPreset;
  readonly theme?: 'light' | 'dark' | 'print';
}

/** The zero-config timeline for a page: auto order, one step per node. */
export function autoTimelineFor(request: V2MotionExportRequest): Timeline {
  const page = request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0];
  if (!page) throw new RangeError('Motion export requires a page.');
  return autoSequence(page, request.preset ?? 'build');
}

export function animatedSvgFor(request: V2MotionExportRequest & { readonly timeline?: Timeline }): string {
  const timeline = request.timeline ?? autoTimelineFor(request);
  return exportAnimatedSvg(request.document, timeline, {
    pageId: request.pageId,
    ...(request.theme ? { theme: request.theme } : {}),
  });
}

/** One paused frame: the preview scrubber and every raster frame read this. */
export function motionFrameSvgFor(
  request: V2MotionExportRequest & { readonly timeline?: Timeline },
  tMs: number,
): string {
  const timeline = request.timeline ?? autoTimelineFor(request);
  return exportMotionFrameSvg(request.document, timeline, tMs, {
    pageId: request.pageId,
    ...(request.theme ? { theme: request.theme } : {}),
  });
}

export { timelineDuration };
