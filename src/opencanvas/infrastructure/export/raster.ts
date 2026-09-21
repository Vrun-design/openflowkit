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

export async function rasterizeSvgToPng(svg: string, options: RasterizeOptions = {}): Promise<Uint8Array> {
  const scale = Math.min(4, Math.max(1, options.scale ?? 2));
  const size = svgIntrinsicSize(svg);
  const url = URL.createObjectURL(new Blob([svg], { type: 'image/svg+xml;charset=utf-8' }));
  try {
    const image = new Image();
    image.decoding = 'sync';
    image.width = size.width;
    image.height = size.height;
    image.src = url;
    await image.decode();
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(size.width * scale);
    canvas.height = Math.round(size.height * scale);
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Canvas 2D is unavailable in this browser.');
    if (options.background) {
      context.fillStyle = options.background;
      context.fillRect(0, 0, canvas.width, canvas.height);
    }
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
    if (!blob) throw new Error('The browser could not encode a PNG.');
    return new Uint8Array(await blob.arrayBuffer());
  } finally {
    URL.revokeObjectURL(url);
  }
}
