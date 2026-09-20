import { Container, Graphics } from 'pixi.js';
import { areStructurallyEqual } from '../../domain/commands/equality';
import type { ScenePage } from '../../domain/document/types';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

export interface ProposalPreviewFrame {
  /** The proposal's preview page (base page with non-rejected changes applied). */
  readonly page: ScenePage;
  /** Object ids to outline; a hovered review row. */
  readonly highlightIds: readonly string[];
}

const GHOST_ALPHA = 0.55;
const REMOVAL = 0xc2410c;
const HIGHLIGHT = 0xe95420;

/** Ghosts a proposal over the live page: added/changed objects at reduced
 * alpha, removed ones as a dashed outline. Reads the page; never writes. */
export class PixiProposalPreview {
  readonly container = new Container();
  private readonly ghosts = new Container();
  private readonly nodes = new PixiNodeRenderer();
  private readonly connectors = new PixiConnectorRenderer();
  private readonly marks = new Graphics();
  private counts = { removals: 0, highlights: 0 };

  constructor() {
    this.ghosts.alpha = GHOST_ALPHA;
    this.ghosts.addChild(this.connectors.container, this.nodes.graphics, this.nodes.media, this.nodes.labels);
    this.container.addChild(this.ghosts, this.marks);
    this.container.visible = false;
  }

  draw(current: ScenePage, frame: ProposalPreviewFrame, zoom: number): void {
    const { page, highlightIds } = frame;
    const index = createSceneIndex(page);
    const currentIndex = createSceneIndex(current);
    const changedNodes = new Set(page.nodes
      .filter((node) => !areStructurallyEqual(node, currentIndex.nodesById.get(node.id)))
      .map((node) => node.id));
    const changedConnectors = new Set(page.connectors
      .filter((edge) => !areStructurallyEqual(edge, currentIndex.connectorsById.get(edge.id)))
      .map((edge) => edge.id));
    // ponytail: basic/freeform families only, matching what v2 authors today;
    // pass the host's family flags when more families ship in v2.
    this.nodes.draw(page, index, true, true, true, false, false, false, false, false, false, changedNodes);
    this.connectors.setZoom(zoom);
    this.connectors.draw(page, true, changedConnectors);
    this.marks.clear();
    this.counts = { removals: 0, highlights: 0 };
    const width = 1.5 / zoom;
    for (const node of current.nodes) {
      if (index.nodesById.has(node.id)) continue;
      const matrix = currentIndex.worldMatricesByNodeId.get(node.id);
      if (!matrix) continue;
      const bounds = nodeWorldBounds(node, matrix);
      this.dashedRect(bounds.x, bounds.y, bounds.width, bounds.height, 6 / zoom);
      this.marks.stroke({ color: REMOVAL, width });
      this.counts.removals += 1;
    }
    for (const id of highlightIds) {
      const node = index.nodesById.get(id) ?? currentIndex.nodesById.get(id);
      const matrix = index.worldMatricesByNodeId.get(id) ?? currentIndex.worldMatricesByNodeId.get(id);
      if (node && matrix) {
        const bounds = nodeWorldBounds(node, matrix);
        const pad = 4 / zoom;
        this.marks.rect(bounds.x - pad, bounds.y - pad, bounds.width + 2 * pad, bounds.height + 2 * pad)
          .stroke({ color: HIGHLIGHT, width: 2 / zoom });
        this.counts.highlights += 1;
      }
    }
    this.container.visible = true;
  }

  private dashedRect(x: number, y: number, w: number, h: number, dash: number): void {
    const edges: [number, number, number, number][] = [[x, y, x + w, y], [x + w, y, x + w, y + h], [x + w, y + h, x, y + h], [x, y + h, x, y]];
    for (const [x1, y1, x2, y2] of edges) {
      const length = Math.hypot(x2 - x1, y2 - y1);
      const ux = (x2 - x1) / length; const uy = (y2 - y1) / length;
      for (let at = 0; at < length; at += dash * 2) {
        const end = Math.min(at + dash, length);
        this.marks.moveTo(x1 + ux * at, y1 + uy * at).lineTo(x1 + ux * end, y1 + uy * end);
      }
    }
  }

  getDebugSnapshot(): { nodes: number; connectors: number; removals: number; highlights: number } {
    return {
      nodes: this.nodes.getDebugSnapshot().length,
      connectors: this.connectors.getDebugSnapshot().connectors,
      ...this.counts,
    };
  }

  clear(): void {
    this.container.visible = false;
  }
}
