import { Graphics } from 'pixi.js';
import { unionBounds } from '../../domain/geometry/bounds';
import type { Bounds2d } from '../../domain/geometry/types';
import type { SceneIndex } from '../../domain/scene/types';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { drawTransformFrame } from './PixiTransformOverlay';
import { connectHandlePoints, type ConnectSide } from '../../domain/connectors/connectHandles';

const SELECTION_STROKE = 0xe95420;
const CONNECT_HANDLE_PIXELS = 12;

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
    const stroke = 1.5 / zoom;
    for (const { side, point } of connectHandlePoints(bounds, zoom)) {
      const active = side === highlight;
      const ink = active ? 0xffffff : SELECTION_STROKE;
      this.graphics
        .circle(point.x, point.y, radius)
        .fill({ color: active ? SELECTION_STROKE : 0xffffff })
        .stroke({ color: ink, width: stroke });
      this.graphics
        .moveTo(point.x - radius / 2, point.y).lineTo(point.x + radius / 2, point.y)
        .moveTo(point.x, point.y - radius / 2).lineTo(point.x, point.y + radius / 2)
        .stroke({ color: ink, width: stroke });
    }
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
    for (const nodeId of cleanFrame && selectedNodeIds.length === 1 ? [] : selectedNodeIds) {
      const node = index.nodesById.get(nodeId);
      const matrix = node && index.worldMatricesByNodeId.get(node.id);
      if (!node || !matrix) continue;
      const bounds = nodeWorldBounds(node, matrix);
      this.graphics
        .roundRect(bounds.x - 3, bounds.y - 3, bounds.width + 6, bounds.height + 6, 12)
        .stroke({ color: SELECTION_STROKE, width: nodeId === primaryNodeId ? 2.5 : 1.5 });
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
  }
}
