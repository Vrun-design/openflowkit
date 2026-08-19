import { Graphics } from 'pixi.js';
import { unionBounds } from '../../domain/geometry/bounds';
import type { Bounds2d } from '../../domain/geometry/types';
import type { SceneIndex } from '../../domain/scene/types';
import { nodeWorldBounds } from '../../domain/scene/worldGeometry';
import { drawTransformFrame } from './PixiTransformOverlay';

const SELECTION_STROKE = 0xe95420;

export function selectionWorldBounds(
  index: SceneIndex,
  selectedNodeIds: readonly string[]
): Bounds2d | null {
  const bounds = selectedNodeIds
    .map(
      (nodeId) =>
        [...index.objectsByKey.values()].find(
          (object) =>
            object.id === nodeId && (object.kind === 'node' || object.kind === 'container')
        )?.bounds
    )
    .filter((value): value is Bounds2d => Boolean(value));
  return bounds.reduce<Bounds2d | null>(
    (combined, value) => (combined ? unionBounds(combined, value) : value),
    null
  );
}

export class PixiSelectionOverlay {
  readonly graphics = new Graphics();

  draw(
    index: SceneIndex,
    selectedNodeIds: readonly string[],
    primaryNodeId: string | null,
    zoom: number
  ): void {
    this.graphics.clear();
    for (const nodeId of selectedNodeIds) {
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
  }
}
