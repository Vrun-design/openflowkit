import type { ScenePage } from '../document/types';
import type { Bounds2d } from '../geometry/types';
import { boundsFromPoints } from '../geometry/bounds';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';

/** World-space box around the given nodes; undefined when none are found. */
export function boundsOfNodes(page: ScenePage, nodeIds: readonly string[]): Bounds2d | undefined {
  const matrices = buildNodeWorldMatrices(page);
  const corners = nodeIds.flatMap((id) => {
    const node = page.nodes.find((candidate) => candidate.id === id);
    const matrix = matrices.get(id);
    if (!node || !matrix) return [];
    const bounds = nodeWorldBounds(node, matrix);
    return [
      { x: bounds.x, y: bounds.y },
      { x: bounds.x + bounds.width, y: bounds.y + bounds.height },
    ];
  });
  return boundsFromPoints(corners) ?? undefined;
}
