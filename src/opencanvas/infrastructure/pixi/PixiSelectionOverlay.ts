import { Graphics } from 'pixi.js';
import { unionBounds } from '../../domain/geometry/bounds';
import type { Bounds2d } from '../../domain/geometry/types';
import type { SceneIndex } from '../../domain/scene/types';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { drawTransformFrame } from './PixiTransformOverlay';
import { connectHandlePoints, sideAnchor, type ConnectSide } from '../../domain/connectors/connectHandles';
import { oppositeSide, quickCreateOrigin } from '../../domain/connectors/quickCreate';

import { CHROME_ACCENT as SELECTION_STROKE, CHROME_SURFACE } from './chrome';

const CONNECT_HANDLE_PIXELS = 11;

export function selectionWorldBounds(
  index: SceneIndex,
  selectedNodeIds: readonly string[]
): Bounds2d | null {
  const bounds = selectedNodeIds
    .map(
      (nodeId) =>
        (index.objectsByKey.get(`node:${nodeId}`)
          ?? index.objectsByKey.get(`container:${nodeId}`))?.bounds
    )
    .filter((value): value is Bounds2d => Boolean(value));
  return bounds.reduce<Bounds2d | null>(
    (combined, value) => (combined ? unionBounds(combined, value) : value),
    null
  );
}

export interface ConnectHover {
  readonly nodeId: string;
  readonly side: ConnectSide | null;
}

export class PixiSelectionOverlay {
  readonly graphics = new Graphics();

  private drawHandles(bounds: Bounds2d, zoom: number, highlight: ConnectSide | null): void {
    const radius = CONNECT_HANDLE_PIXELS / 2 / zoom;
    const stroke = 1.25 / zoom;
    for (const { side, point } of connectHandlePoints(bounds, zoom)) {
      const active = side === highlight;
      const ink = active ? CHROME_SURFACE : SELECTION_STROKE;
      this.graphics
        .circle(point.x, point.y, radius)
        .fill({ color: active ? SELECTION_STROKE : CHROME_SURFACE })
        .stroke({ color: SELECTION_STROKE, width: stroke });
      this.graphics
        .moveTo(point.x - radius / 2, point.y).lineTo(point.x + radius / 2, point.y)
        .moveTo(point.x, point.y - radius / 2).lineTo(point.x, point.y + radius / 2)
        .stroke({ color: ink, width: stroke });
    }
  }

  // Hovering a side handle previews what a click will do: the same-size
  // node one gap away and the arrow into it (Koboyo's affordance).
  private drawQuickCreateGhost(index: SceneIndex, nodeId: string, side: ConnectSide, zoom: number): void {
    const node = index.nodesById.get(nodeId);
    if (!node || node.transform.rotationRadians !== 0) return;
    const origin = quickCreateOrigin(node, side);
    const ghost: Bounds2d = { x: origin.x, y: origin.y, width: node.size.width, height: node.size.height };
    const from = sideAnchor(this.nodeBounds(index, nodeId) ?? ghost, side);
    const to = sideAnchor(ghost, oppositeSide(side));
    this.graphics
      .roundRect(ghost.x, ghost.y, ghost.width, ghost.height, 6)
      .fill({ color: SELECTION_STROKE, alpha: 0.05 })
      .stroke({ color: SELECTION_STROKE, alpha: 0.45, width: 1 / zoom });
    this.graphics
      .moveTo(from.x, from.y).lineTo(to.x, to.y)
      .stroke({ color: SELECTION_STROKE, alpha: 0.45, width: 1.5 / zoom });
    const back = 8 / zoom;
    const dx = Math.sign(to.x - from.x);
    const dy = Math.sign(to.y - from.y);
    this.graphics
      .moveTo(to.x - dx * back - dy * back * 0.6, to.y - dy * back - dx * back * 0.6)
      .lineTo(to.x, to.y)
      .lineTo(to.x - dx * back + dy * back * 0.6, to.y - dy * back + dx * back * 0.6)
      .stroke({ color: SELECTION_STROKE, alpha: 0.45, width: 1.5 / zoom });
  }

  private nodeBounds(index: SceneIndex, nodeId: string): Bounds2d | null {
    const node = index.nodesById.get(nodeId);
    const matrix = node && index.worldMatricesByNodeId.get(node.id);
    return node && matrix ? nodeWorldBounds(node, matrix) : null;
  }

  draw(
    index: SceneIndex,
    selectedNodeIds: readonly string[],
    primaryNodeId: string | null,
    zoom: number,
    cleanFrame = false,
    hover: ConnectHover | null = null
  ): void {
    this.graphics.clear();
    // One frame for one node; members of a group get a hairline each so the
    // union frame stays the only heavy line on screen.
    if (selectedNodeIds.length > 1) {
      for (const nodeId of cleanFrame ? [] : selectedNodeIds) {
        const bounds = this.nodeBounds(index, nodeId);
        if (!bounds) continue;
        this.graphics
          .rect(bounds.x, bounds.y, bounds.width, bounds.height)
          .stroke({ color: SELECTION_STROKE, width: (nodeId === primaryNodeId ? 1.25 : 0.75) / zoom, alpha: 0.8 });
      }
    }
    const bounds = selectionWorldBounds(index, selectedNodeIds);
    if (bounds) drawTransformFrame(this.graphics, bounds, zoom);
    // Connect handles: the single selected node, plus any hovered node.
    // A hovered handle inverts so the grab target reads at a glance.
    if (bounds && selectedNodeIds.length === 1) {
      const single = this.nodeBounds(index, selectedNodeIds[0]);
      if (single) {
        this.drawHandles(single, zoom, hover?.nodeId === selectedNodeIds[0] ? hover.side : null);
      }
    }
    if (hover && hover.nodeId !== selectedNodeIds[0]) {
      const hovered = this.nodeBounds(index, hover.nodeId);
      if (hovered) this.drawHandles(hovered, zoom, hover.side);
    }
    if (hover?.side) this.drawQuickCreateGhost(index, hover.nodeId, hover.side, zoom);
  }
}
