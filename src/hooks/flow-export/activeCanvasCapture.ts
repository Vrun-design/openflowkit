import { toJpeg, toPng, toSvg } from 'html-to-image';
import { getActiveCanvasApi } from '@/canvas/activeCanvas';
import type { FlowNode } from '@/lib/types';
import { useFlowStore } from '@/store';
import { projectActiveDocumentMemoized } from '@/opencanvas/application/active-document/activeDocumentProjection';
import { exportCanonicalSvg } from '@/opencanvas/infrastructure/export/canonicalSvg';
import { resolveFlowExportViewport } from '../flowExportViewport';
import { createExportOptions } from './exportCapture';

export type CaptureFormat = 'png' | 'jpeg' | 'svg';

export interface CaptureOptions {
  readonly transparentBackground?: boolean;
}

export class CanvasCaptureError extends Error {}

function svgDataUrl(svg: string): string {
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function rasterize(svg: string, format: 'png' | 'jpeg', transparent: boolean): Promise<string> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = image.naturalWidth || image.width;
      canvas.height = image.naturalHeight || image.height;
      const context = canvas.getContext('2d');
      if (!context) {
        reject(new CanvasCaptureError('A 2D canvas is not available for export.'));
        return;
      }
      if (!(format === 'png' && transparent)) {
        context.fillStyle = '#ffffff';
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0);
      resolve(canvas.toDataURL(format === 'png' ? 'image/png' : 'image/jpeg', 0.92));
    };
    image.onerror = () => reject(new CanvasCaptureError('The exported SVG could not be rasterised.'));
    image.src = svgDataUrl(svg);
  });
}

/** Renderer-independent capture of the active page from the canonical document. */
function captureOpenCanvas(format: CaptureFormat, options: CaptureOptions): Promise<string> {
  const state = useFlowStore.getState();
  const projection = projectActiveDocumentMemoized({
    nodes: state.nodes, edges: state.edges, documents: state.documents,
    activeDocumentId: state.activeDocumentId, pages: state.tabs,
    activePageId: state.activeTabId, layers: state.layers,
  });
  if (projection.status !== 'ready') {
    return Promise.reject(new CanvasCaptureError('There is nothing on this page to export yet.'));
  }
  const transparent = Boolean(options.transparentBackground) && format !== 'jpeg';
  const svg = exportCanonicalSvg(projection.document, {
    pageId: state.activeTabId, pixelRatio: 2, transparent,
  });
  return format === 'svg' ? Promise.resolve(svgDataUrl(svg)) : rasterize(svg, format, transparent);
}

/** DOM capture of the React Flow viewport. */
async function captureReactFlow(
  nodes: FlowNode[],
  wrapper: HTMLDivElement | null,
  format: CaptureFormat,
  options: CaptureOptions
): Promise<string> {
  const { viewport, message } = resolveFlowExportViewport(wrapper);
  if (!viewport) throw new CanvasCaptureError(message ?? 'The canvas viewport could not be found.');
  wrapper?.classList.add('exporting');
  try {
    // A frame for the exporting styles to apply before html-to-image reads the DOM.
    await new Promise((resolve) => setTimeout(resolve, 300));
    if (format === 'svg') {
      const { options: capture } = createExportOptions(nodes, 'png');
      return await toSvg(viewport, { ...capture, backgroundColor: null });
    }
    const { options: capture } = createExportOptions(nodes, format, {
      transparentBackground: options.transparentBackground,
    });
    return format === 'png' ? await toPng(viewport, capture) : await toJpeg(viewport, capture);
  } finally {
    wrapper?.classList.remove('exporting');
  }
}

/**
 * Captures whichever canvas is visible as a data URL: the OpenCanvas surface
 * exports from the canonical document, React Flow from its DOM.
 */
export function captureActiveCanvas(
  nodes: FlowNode[],
  wrapper: HTMLDivElement | null,
  format: CaptureFormat,
  options: CaptureOptions = {}
): Promise<string> {
  return getActiveCanvasApi()
    ? captureOpenCanvas(format, options)
    : captureReactFlow(nodes, wrapper, format, options);
}
