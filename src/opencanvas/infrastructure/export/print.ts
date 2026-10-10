import { SVG_BACKGROUND } from './canonicalSvg';

// "PDF" is the browser's print-to-PDF: a hidden frame holding exactly the
// exported SVGs, one page per sheet. Each sheet is an <img> of its SVG (still vector
// in print, fonts embedded), so ids like `#clip-<node>` never collide across pages.
// Deterministic HTML, so it is testable.

const escapeHtml = (value: string): string =>
  value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character]!);

export interface PrintDocumentOptions {
  /** Page orientation; diagrams are usually wider than tall. */
  readonly landscape?: boolean;
  /** The sheet takes the export's own background, so a dark export has no white margins. */
  readonly theme?: 'light' | 'dark' | 'print';
}

export function buildPrintDocument(svgs: readonly string[], title: string, options: PrintDocumentOptions = {}): string {
  const landscape = options.landscape ?? true;
  const background = options.theme === 'dark' ? SVG_BACKGROUND.dark : SVG_BACKGROUND.light;
  return `<!doctype html>
<html><head><meta charset="utf-8"><title>${escapeHtml(title)}</title>
<style>
  @page { size: A4 ${landscape ? 'landscape' : 'portrait'}; margin: 10mm; }
  html, body { margin: 0; background: ${background}; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
  .sheet { height: 100vh; display: flex; align-items: center; justify-content: center; break-after: page; }
  .sheet:last-of-type { break-after: auto; }
  img { width: 100%; height: 100%; object-fit: contain; }
</style></head>
<body>${svgs.map((svg) => `<section class="sheet"><img alt="" src="data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}"></section>`).join('')}
<script>window.addEventListener('load', function () { document.fonts.ready.then(function () { window.focus(); window.print(); }); });</script>
</body></html>`;
}

/** Prints the SVGs through a hidden same-origin frame; the frame removes itself. */
export function printSvgDocument(svgs: readonly string[], title: string, options: PrintDocumentOptions = {}): void {
  const frame = document.createElement('iframe');
  frame.setAttribute('aria-hidden', 'true');
  frame.style.cssText = 'position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden';
  frame.srcdoc = buildPrintDocument(svgs, title, options);
  frame.addEventListener('load', () => {
    window.setTimeout(() => frame.remove(), 60_000);
  });
  document.body.appendChild(frame);
}
