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
    void this.performLoad(request);
  }

  private async performLoad(request: PixiMediaLoadRequest): Promise<void> {
    try {
      const url = await request.resolveUrl();
      if (!url || request.generation !== this.generation) return;
      const texture = await Assets.load<Texture>(url);
      if (request.generation !== this.generation) return;
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
    } catch {
      // A missing or unreadable media source leaves the authored fallback visible.
    }
  }
}
