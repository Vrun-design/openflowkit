import type { SceneDocumentV1 } from '../../domain/document/types';
import { exportCanonicalSvg, SVG_BACKGROUND } from '../../infrastructure/export/canonicalSvg';
import { serializeCanonicalJson } from '../../infrastructure/export/canonicalJson';
import { printSvgDocument } from '../../infrastructure/export/print';
import { rasterizeSvgToPng } from '../../infrastructure/export/raster';

export type V2ExportFormat = 'png' | 'svg' | 'pdf' | 'json';
export type V2ExportScope = 'selection' | 'page' | 'document';
export type V2ExportTheme = 'light' | 'dark' | 'print';

export interface V2ExportRequest {
  readonly document: SceneDocumentV1;
  readonly format: V2ExportFormat;
  readonly scope: V2ExportScope;
  readonly pageId: string;
  readonly selectedNodeIds?: readonly string[];
  readonly theme?: V2ExportTheme;
  /** Pixel multiplier baked into the emitted file (PNG and SVG alike). */
  readonly scale?: 1 | 2 | 3;
  readonly transparent?: boolean;
}

export interface V2ExportFile {
  readonly filename: string;
  readonly mime: string;
  readonly text?: string;
  readonly bytes?: Uint8Array;
}

function slug(value: string, fallback: string): string {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || fallback;
}

function fileStem(request: V2ExportRequest): string {
  const base = slug(request.document.name, 'diagram');
  if (request.scope === 'document') return `${base}-document`;
  const page = request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0];
  return `${base}-${page ? slug(page.name, page.id) : request.pageId}${request.scope === 'selection' ? '-selection' : ''}`;
}

/** Pages an export touches: one for page/selection scope, every page for document scope. */
function exportPages(request: V2ExportRequest) {
  if (request.scope === 'document' && request.document.pages.length > 0) return request.document.pages;
  const page = request.document.pages.find(({ id }) => id === request.pageId) ?? request.document.pages[0];
  if (!page) throw new RangeError('Export requires at least one page.');
  return [page];
}

function svgFor(request: V2ExportRequest, pageId: string, scale: number): string {
  return exportCanonicalSvg(request.document, {
    pageId,
    ...(request.scope === 'selection' && request.selectedNodeIds?.length
      ? { selectedNodeIds: request.selectedNodeIds }
      : {}),
    theme: request.theme ?? 'light',
    pixelRatio: scale,
    ...(request.transparent ? { transparent: true } : {}),
  });
}

/**
 * One export intent → files ready to hand to the platform. SVG, PDF (print
 * HTML) and JSON are text; PNG is rasterized from the same SVG, so every format
 * shares one source of truth. Document scope yields one file per page.
 */
export async function buildV2Export(request: V2ExportRequest): Promise<readonly V2ExportFile[]> {
  if (request.format === 'pdf') return [];
  const stem = fileStem(request);
  if (request.format === 'json') {
    return [{ filename: `${stem}.json`, mime: 'application/json', text: serializeCanonicalJson(request.document) }];
  }
  const pages = exportPages(request);
  const scale = request.scale ?? 1;
  const files: V2ExportFile[] = [];
  for (const [index, page] of pages.entries()) {
    const suffix = pages.length > 1 ? `-${index + 1}-${slug(page.name, page.id)}` : '';
    const svg = svgFor(request, page.id, scale);
    if (request.format === 'svg') {
      files.push({ filename: `${stem}${suffix}.svg`, mime: 'image/svg+xml', text: svg });
      continue;
    }
    const bytes = await rasterizeSvgToPng(svg, {
      scale: 1,
      ...(request.transparent ? {} : { background: request.theme === 'dark' ? SVG_BACKGROUND.dark : SVG_BACKGROUND.light }),
    });
    files.push({ filename: `${stem}${suffix}.png`, mime: 'image/png', bytes });
  }
  return files;
}

/** PDF is the browser's print dialog over the same SVG the other formats use. */
export function printV2Export(request: V2ExportRequest): void {
  const [page] = exportPages(request);
  if (!page) throw new RangeError('Export requires at least one page.');
  printSvgDocument(svgFor(request, page.id, 1), request.document.name);
}

/** Base64 for the wire (agent bridge / MCP JSON results); chunked for big PNGs. */
export function bytesToBase64(bytes: Uint8Array): string {
  let binary = '';
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return window.btoa(binary);
}

export function downloadV2Export(files: readonly V2ExportFile[]): void {
  files.forEach((file, index) => {
    // Stagger downloads so browsers that ignore multiple saves still queue them.
    window.setTimeout(() => {
      const blob = file.bytes
        ? new Blob([file.bytes as BlobPart], { type: file.mime })
        : new Blob([file.text ?? ''], { type: `${file.mime};charset=utf-8` });
      const url = URL.createObjectURL(blob);
      const anchor = window.document.createElement('a');
      anchor.href = url;
      anchor.download = file.filename;
      window.document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    }, index * 150);
  });
}

export function downloadTextFile(filename: string, text: string, mime: string): void {
  downloadV2Export([{ filename, mime, text }]);
}

/** Copy an image artefact to the system clipboard; false when the API is missing. */
export async function copyImageToClipboard(bytes: Uint8Array, mime: string): Promise<boolean> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) return false;
  try {
    await navigator.clipboard.write([new ClipboardItem({ [mime]: new Blob([bytes as BlobPart], { type: mime }) })]);
    return true;
  } catch {
    return false;
  }
}

export function buildV2SvgExport(document: SceneDocumentV1): { filename: string; svg: string } {
  return { filename: `${document.id}.svg`, svg: exportCanonicalSvg(document) };
}

export function buildV2JsonExport(document: SceneDocumentV1): { filename: string; json: string } {
  return { filename: `${document.id}.json`, json: serializeCanonicalJson(document) };
}
