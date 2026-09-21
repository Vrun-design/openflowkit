import { SVG_BACKGROUND } from './canonicalSvg';

// "PDF" is the browser's print-to-PDF: a hidden frame holding exactly the
// exported SVG, sized to the paper. Deterministic HTML, so it is testable.

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export interface PrintDocumentOptions {
  /** Page orientation; diagrams are usually wider than tall. */
  readonly landscape?: boolean;
}

export function buildPrintDocument(svg: string, title: string, options: PrintDocumentOptions = {}): string {
  const landscape = options.landscape ?? true;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
  html, body { margin: 0; height: 100%; background: ${SVG_BACKGROUND.light}; }
  body { display: flex; align-items: center; justify-content: center; }
  svg { width: 100%; height: 100%; max-height: 100%; }
</style></head>
<body>${svg}
<script>window.addEventListener('load', function () { window.focus(); window.print(); });</script>
</body></html>`;
}

/** Prints the SVG through a hidden same-origin frame; the frame removes itself. */
export function printSvgDocument(svg: string, title: string, options: PrintDocumentOptions = {}): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = buildPrintDocument(svg, title, options);
  frame.addEventListener('load', () => {
    window.setTimeout(() => frame.remove(), 60_000);
  });
  document.body.appendChild(frame);
}
