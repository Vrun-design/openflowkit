import { Container, Graphics } from 'pixi.js';
import type { Size2d } from '../../domain/geometry/types';
import type { ScenePage } from '../../domain/document/types';
import { isContainerNodeKind } from '../../domain/nodes/containerNodePresentation';
import { createSceneIndex } from '../../domain/scene/spatialIndex';
import type { SceneIndex } from '../../domain/scene/types';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { projectConnectors } from '../../domain/connectors/routeProjection';
import { roundPolylineCorners } from '../../domain/geometry/polyline';
import type { Point2d } from '../../domain/geometry/types';
import { CHROME_ACCENT } from './chrome';
import { flowDashes } from './flowDashes';
import { PixiConnectorRenderer } from './PixiConnectorRenderer';
import { PixiContainerRenderer } from './PixiContainerRenderer';
import { PixiNodeRenderer } from './PixiNodeRenderer';

export interface FocusFrame {
  /** Nodes and containers that stay bright; everything else dims. */
  readonly nodeIds: readonly string[];
  readonly connectorIds: readonly string[];
  /**
   * 'flow' (default): the storyboard spotlight, orange rings and a heavy veil. 'selection': Map mode's focus on one
   * box or arrow; no rings, a lighter veil, and the focused arrows march toward their target.
   */
  readonly tone?: 'flow' | 'selection';
}

/** Screen px per second a focused arrow's dashes travel. */
export const FLOW_SPEED = 40;
const FLOW_ON = 8;
const FLOW_OFF = 10;

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
  private readonly flow = new Graphics();
  private last: { page: ScenePage; index: SceneIndex; color: number } | null = null;
  /** The focused arrows' routes, world px, source to target: computed once per page and frame. */
  private routes: { readonly page: ScenePage; readonly frame: FocusFrame; readonly paths: readonly { points: readonly Point2d[]; width: number }[] } | null = null;
  private zoom = 1;
  private phase = 0;

  constructor() {
    // Between the arrows' lines and their label chips: the dashes pass under every label.
    this.connectors.container.addChildAt(this.flow, 1);
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
    const index = this.last?.page === page ? this.last.index : createSceneIndex(page);
    this.zoom = zoom;
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
    this.setRoutes(page, frame);
    this.drawFlow(this.phase);
    if (frame.tone === 'selection') return;
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

  /** Whether the focus has arrows with a direction to show. */
  hasFlow(): boolean {
    return (this.routes?.paths.length ?? 0) > 0;
  }

  /**
   * The focused arrows' marching dashes, `phase` screen px along. Only these arrows redraw; the dashes are the accent
   * over the arrow's own ink, so they read on a dark line and on a light one.
   */
  drawFlow(phase: number): void {
    this.phase = phase;
    if (!this.flow.context) return;
    this.flow.clear();
    const paths = this.routes?.paths;
    if (!paths?.length) return;
    const zoom = this.zoom;
    for (const { points, width } of paths) {
      for (const dash of flowDashes(points, FLOW_ON / zoom, FLOW_OFF / zoom, phase / zoom)) {
        this.flow.moveTo(dash[0]!.x, dash[0]!.y);
        for (const point of dash.slice(1)) this.flow.lineTo(point.x, point.y);
        this.flow.stroke({ color: CHROME_ACCENT, width: width + 1 / zoom, cap: 'round', join: 'round' });
      }
    }
  }

  private setRoutes(page: ScenePage, frame: FocusFrame): void {
    if (this.routes?.page === page && this.routes.frame === frame) return;
    if (frame.tone !== 'selection') { this.routes = null; return; }
    const wanted = new Set(frame.connectorIds);
    const projected = projectConnectors(page, page.connectors.filter((connector) => wanted.has(connector.id)));
    this.routes = {
      page, frame,
      paths: projected.map((connector) => ({
        points: connector.commands.some((command) => command.kind === 'cubic')
          ? connector.samples : roundPolylineCorners(connector.samples, connector.presentation.cornerRadius),
        width: connector.presentation.stroke.width,
      })),
    };
  }

  /** Draws nothing, keeping every pool alive for the next draw. */
  clear(): void {
    if (this.veil.context) this.veil.clear();
    if (this.flow.context) this.flow.clear();
    this.routes = null;
    if (!this.last) return;
    const { page, index, color } = this.last;
    this.containers.draw(page, index, new Set());
    this.nodes.draw(page, index, new Set(), 'full', color);
    this.connectors.draw(page, true, new Set());
    if (this.marks.context) this.marks.clear();
  }
}
