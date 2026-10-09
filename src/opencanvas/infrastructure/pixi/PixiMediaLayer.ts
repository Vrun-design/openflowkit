import { Assets, Container, Sprite, type Texture } from 'pixi.js';
import type { Bounds2d, Matrix2d } from '../../domain/geometry/types';
import { applyPixiNodeMatrix } from './pixiNodeTransform';

interface PixiMediaLoadRequest {
  readonly nodeId: string;
  readonly generation: number;
  readonly matrix: Matrix2d;
  readonly bounds: Bounds2d;
  readonly opacity?: number;
  readonly resolveUrl: () => Promise<string | null>;
  /** Names the image: a texture loaded once under this key is placed at once on every later draw (Map mode redraws per frame). */
  readonly cacheKey?: string;
}

const loadedTextures = new Map<string, Texture>();

/**
 * Pixi's asset resolver brace-expands `{a,b}` in URLs, so a data-URL SVG coloured by
 * CSS (`.cls-1{fill:…}`) loses its braces and paints black. Escape them first.
 */
export function pixiAssetUrl(url: string): string {
  return url.startsWith('data:') ? url.replace(/[{}]/g, (brace) => encodeURIComponent(brace)) : url;
}

/** SVGs rasterize at their own size (Azure's are 18 px): an icon is drawn at least this big on its long side, so a card stays sharp zoomed in on a 2× screen. */
const SVG_RASTER_PX = 256;

export const isSvgUrl = (url: string): boolean => url.startsWith('data:image/svg+xml') || /\.svg(?:[?#]|$)/i.test(url);

/** The raster resolution that takes a `width` × `height` SVG to SVG_RASTER_PX on its long side; never below 1. */
export const svgRasterResolution = (width: number, height: number): number =>
  Math.max(1, Math.ceil(SVG_RASTER_PX / Math.max(width, height, 1)));

async function textureFor(url: string): Promise<Texture> {
  const src = pixiAssetUrl(url);
  if (!isSvgUrl(url)) return Assets.load<Texture>(src);
  const image = new Image();
  image.src = url;
  // One the browser cannot measure up front loads as before, at its own size.
  const measured = typeof image.decode === 'function' && await image.decode().then(() => true, () => false);
  return measured
    ? Assets.load<Texture>({ src, data: { resolution: svgRasterResolution(image.naturalWidth, image.naturalHeight) } })
    : Assets.load<Texture>(src);
}

export class PixiMediaLayer {
  readonly container = new Container();
  private generation = 0;
  private readonly loadedNodeIds = new Set<string>();

  constructor(private readonly onReady: (nodeId: string) => void) {}

  beginDraw(): number {
    this.container.removeChildren().forEach((child) => child.destroy({ children: true }));
    this.loadedNodeIds.clear();
    return ++this.generation;
  }

  isLoaded(nodeId: string): boolean {
    return this.loadedNodeIds.has(nodeId);
  }

  load(request: PixiMediaLoadRequest): void {
    const known = request.cacheKey ? loadedTextures.get(request.cacheKey) : undefined;
    if (known) this.place(request, known);
    else void this.performLoad(request);
  }

  private async performLoad(request: PixiMediaLoadRequest): Promise<void> {
    try {
      const url = await request.resolveUrl();
      if (!url || request.generation !== this.generation) return;
      const texture = await textureFor(url);
      if (request.cacheKey) loadedTextures.set(request.cacheKey, texture);
      if (request.generation !== this.generation) return;
      this.place(request, texture);
    } catch {
      // A missing or unreadable media source leaves the authored fallback visible.
    }
  }

  private place(request: PixiMediaLoadRequest, texture: Texture): void {
    const container = new Container();
    applyPixiNodeMatrix(container, request.matrix);
    const sprite = new Sprite(texture);
    const textureWidth = Math.max(1, texture.width);
    const textureHeight = Math.max(1, texture.height);
    const scale = Math.min(
      request.bounds.width / textureWidth,
      request.bounds.height / textureHeight
    );
    sprite.width = textureWidth * scale;
    sprite.height = textureHeight * scale;
    sprite.position.set(
      request.bounds.x + (request.bounds.width - sprite.width) / 2,
      request.bounds.y + (request.bounds.height - sprite.height) / 2
    );
    sprite.alpha = request.opacity ?? 1;
    container.addChild(sprite);
    this.container.addChild(container);
    this.loadedNodeIds.add(request.nodeId);
    this.onReady(request.nodeId);
  }
}
