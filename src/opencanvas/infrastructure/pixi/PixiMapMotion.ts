import { Container } from 'pixi.js';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { SceneIndex } from '../../domain/scene/types';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import type { MotionFrame } from '../../application/map/motionFrame';
import { PixiContainerRenderer } from './PixiContainerRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

// View-only layers for Map mode's open/close move. Each frame redraws the moving boxes from their interpolated rects into
// its own renderers (the page, its index and the host's own drawing are never touched); the host hides its own boxes
// for the length of the move and shows them again at the end.
// ponytail: every box is redrawn each frame (path A, M0 measured 4.7 ms at 300 plain boxes) — per-box display objects
// (path B, ~1 ms) if a C4 map with icons at 300 boxes costs more than 6 ms a frame.

class Layer {
  readonly container = new Container();
  private readonly containers = new PixiContainerRenderer();
  private readonly nodes: PixiNodeRenderer;
  private drawn = false;
  private last: [ScenePage, SceneIndex, number, ReadonlyMap<string, number>] | null = null;

  constructor(onMediaReady: () => void, resolveAsset?: (assetId: string) => Promise<string | null>) {
    this.nodes = new PixiNodeRenderer(onMediaReady, resolveAsset);
    this.container.addChild(this.containers.graphics, this.nodes.graphics, this.nodes.media, this.nodes.labels, this.containers.labels);
    this.container.visible = false;
  }

  draw(boxes: readonly SceneNode[], alpha: number, page: ScenePage, base: SceneIndex, canvasColor: number, widths: ReadonlyMap<string, number>): void {
    if (boxes.length === 0 && !this.drawn) return;
    this.last = [page, base, canvasColor, widths];
    const flat: ScenePage = { ...page, nodes: boxes, connectors: [] };
    const index: SceneIndex = {
      ...base, page: flat, nodesById: new Map(boxes.map((node) => [node.id, node])),
      worldMatricesByNodeId: buildNodeWorldMatrices(flat), childIdsByParentId: new Map(),
    };
    this.containers.draw(flat, index, null, canvasColor, widths);
    this.nodes.draw(flat, index, null, 'full', canvasColor, widths);
    this.container.alpha = alpha;
    this.container.visible = boxes.length > 0;
    this.drawn = boxes.length > 0;
  }

  /** Empties the renderers (their graphics and label textures), so a finished move holds no GPU memory. */
  clear(): void {
    if (this.last) this.draw([], 1, ...this.last);
  }
}

export class PixiMapMotion {
  readonly container = new Container();
  // One layer per opacity in the frame (a layer fades as a whole): usually one to three, a few more after quick re-targets.
  private readonly layers: Layer[] = [];

  constructor(private readonly onMediaReady: () => void, private readonly resolveAsset?: (assetId: string) => Promise<string | null>) {
    this.container.visible = false;
  }

  /** Draws `frame` over `page` (the target page: its layers and settings) using the target's index for everything but geometry. */
  draw(frame: MotionFrame, page: ScenePage, base: SceneIndex, canvasColor: number): void {
    while (this.layers.length < frame.groups.length) {
      const layer = new Layer(this.onMediaReady, this.resolveAsset);
      this.layers.push(layer);
      this.container.addChild(layer.container);
    }
    this.layers.forEach((layer, i) => {
      const group = frame.groups[i];
      layer.draw(group?.nodes ?? [], group?.alpha ?? 1, page, base, canvasColor, frame.textWidths);
    });
    this.container.visible = true;
  }

  clear(): void {
    this.container.visible = false;
    this.layers.forEach((layer) => layer.clear());
  }
}
