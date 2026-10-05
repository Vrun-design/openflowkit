// SVG → PNG via the platform rasterizer. The SVG is self-contained (see
// canonicalSvg), so an <img> decode plus a canvas is enough; no library.

export interface RasterizeOptions {
  /** Integer CSS-pixel multiplier; the SVG's own width/height are already 1x. */
  readonly scale?: number;
  /** Painted behind the artwork; omit for transparency. */
  readonly background?: string;
}

export interface SvgSize {
  readonly width: number;
  readonly height: number;
}

export function svgIntrinsicSize(svg: string): SvgSize {
  const width = Number(/\bwidth="([\d.]+)"/.exec(svg)?.[1]);
  const height = Number(/\bheight="([\d.]+)"/.exec(svg)?.[1]);
  const viewBox = /viewBox="([-\d.]+) ([-\d.]+) ([\d.]+) ([\d.]+)"/.exec(svg);
  const fallback = viewBox ? { width: Number(viewBox[3]), height: Number(viewBox[4]) } : { width: 1024, height: 768 };
  return {
    width: Number.isFinite(width) && width > 0 ? width : fallback.width,
    height: Number.isFinite(height) && height > 0 ? height : fallback.height,
  };
}

// The canvas draws labels in the bundled Inter (index.css). An SVG decoded as an image
// cannot see the page's fonts, so without this every exported pixel used the system face.
export const INTER_URL = '/fonts/inter/inter-400-700-latin.woff2';
let interFontFace: Promise<string> | null = null;

function loadInterFontFace(): Promise<string> {
  interFontFace ??= fetch(INTER_URL)
    .then((response) => (response.ok ? response.arrayBuffer() : Promise.reject(new Error(String(response.status)))))
    .then((buffer) => {
      let binary = '';
      for (const byte of new Uint8Array(buffer)) binary += String.fromCharCode(byte);
      return `@font-face{font-family:'Inter';src:url(data:font/woff2;base64,${btoa(binary)}) format('woff2');font-weight:400 700}`;
    })
    // Offline or blocked: the system face, as before; the next export tries again.
    .catch(() => { interFontFace = null; return ''; });
  return interFontFace;
}

/** `svg` with Inter embedded when it uses it. */
export async function withEmbeddedInter(svg: string): Promise<string> {
  if (!svg.includes('Inter')) return svg;
  const fontFace = await loadInterFontFace();
  return fontFace ? svg.replace(/<svg\b[^>]*>/, (open) => `${open}<style>${fontFace}</style>`) : svg;
}

/** Decodes `svg` as an image of `width`×`height` and hands it to `draw` while it is still live. */
export async function withSvgImage<T>(
  svg: string, width: number, height: number, draw: (image: HTMLImageElement) => T | Promise<T>,
): Promise<T> {
  const url = URL.createObjectURL(new Blob([await withEmbeddedInter(svg)], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'async';
    image.width = width;
    image.height = height;
    image.src = url;
    await image.decode();
    return await draw(image);
  } finally {
    URL.revokeObjectURL(url);
  }
}

export async function rasterizeSvgToPng(svg: string, options: RasterizeOptions = {}): Promise<Uint8Array> {
  const scale = Math.min(4, Math.max(1, options.scale ?? 2));
  const size = svgIntrinsicSize(svg);
  const canvas = document.createElement('canvas');
  canvas.width = Math.round(size.width * scale);
  canvas.height = Math.round(size.height * scale);
  const context = canvas.getContext('2d');
  if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
  await withSvgImage(svg, size.width, size.height, (image) => {
    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
  });
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) throw new Error('The browser could not encode a PNG.');
  return new Uint8Array(await blob.arrayBuffer());
}
