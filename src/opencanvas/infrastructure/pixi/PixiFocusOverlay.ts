import { Container, Graphics } from 'pixi.js';
import type { Size2d } from '../../domain/geometry/types';
import type { ScenePage } from '../../domain/document/types';
import { isContainerNodeKind } from '../../domain/nodes/containerNodePresentation';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import type { SceneIndex } from '../../domain/scene/types';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { PixiContainerRenderer } from './PixiContainerRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

export interface FocusFrame {
  /** Nodes and containers that stay bright; everything else dims. */
  readonly nodeIds: readonly string[];
  readonly connectorIds: readonly string[];
}

const ACCENT = 0xe95420;

/**
 * Storyboard spotlight for flow playback and tag perspectives: a screen-space
 * veil over the dimmed canvas, then the active objects re-drawn above it in a
 * world-space layer so panning and zooming keep them aligned.
 *
 * Everything stays in the render tree (visible, often empty) because Pixi's
 * garbage collector unloads contexts of unreachable graphics, and a later
 * `clear()` on an unloaded context throws.
 */
export class PixiFocusOverlay {
  readonly veil = new Graphics();
  readonly content = new Container();
  private readonly containers = new PixiContainerRenderer();
  private readonly nodes = new PixiNodeRenderer();
  private readonly connectors = new PixiConnectorRenderer();
  private readonly marks = new Graphics();
  private last: { page: ScenePage; index: SceneIndex; color: number } | null = null;

  constructor() {
    this.content.addChild(
      this.containers.graphics,
      this.connectors.container,
      this.nodes.graphics,
      this.nodes.media,
      this.nodes.labels,
      this.containers.labels,
      this.marks,
    );
  }

  drawScreen(viewport: Size2d, canvasColor: number, alpha: number): void {
    if (!this.veil.context) return;
    this.veil.clear();
    if (viewport.width > 0 && viewport.height > 0) {
      this.veil.rect(0, 0, viewport.width, viewport.height).fill({ color: canvasColor, alpha });
    }
  }

  draw(page: ScenePage, frame: FocusFrame, zoom: number, canvasColor: number): void {
    const index = createSceneIndex(page);
    this.last = { page, index, color: canvasColor };
    const nodes = new Set(frame.nodeIds);
    const containers = new Set(page.nodes
      .filter((node) => nodes.has(node.id) && isContainerNodeKind(node.kind))
      .map((node) => node.id));
    const plainNodes = new Set([...nodes].filter((id) => !containers.has(id)));
    this.containers.draw(page, index, containers, canvasColor);
    this.nodes.draw(page, index, plainNodes, 'full', canvasColor);
    this.connectors.setZoom(zoom);
    this.connectors.draw(page, true, new Set(frame.connectorIds));
    this.marks.clear();
    const width = 2 / zoom;
    const pad = 3 / zoom;
    for (const id of frame.nodeIds) {
      const node = index.nodesById.get(id);
      const matrix = index.worldMatricesByNodeId.get(id);
      if (!node || !matrix) continue;
      const bounds = nodeWorldBounds(node, matrix);
      this.marks
        .roundRect(bounds.x - pad, bounds.y - pad, bounds.width + 2 * pad, bounds.height + 2 * pad, 6 / zoom)
        .stroke({ color: ACCENT, width });
    }
  }

  /** Draws nothing, keeping every pool alive for the next draw. */
  clear(): void {
    if (this.veil.context) this.veil.clear();
    if (!this.last) return;
    const { page, index, color } = this.last;
    this.containers.draw(page, index, new Set());
    this.nodes.draw(page, index, new Set(), 'full', color);
    this.connectors.draw(page, true, new Set());
    if (this.marks.context) this.marks.clear();
  }
}
