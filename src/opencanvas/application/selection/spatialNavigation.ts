import type { SceneNode, ScenePage } from '../../domain/document/types';
import { buildNodeWorldMatrices, nodeWorldCenter } from '../../domain/scene/worldGeometry';

export type SpatialDirection = 'left' | 'right' | 'up' | 'down';

function directionVector(direction: SpatialDirection): { x: number; y: number } {
  switch (direction) {
    case 'left': return { x: -1, y: 0 };
    case 'right': return { x: 1, y: 0 };
    case 'up': return { x: 0, y: -1 };
    case 'down': return { x: 0, y: 1 };
  }
}

export function spatialNeighborId(
  page: ScenePage,
  currentId: string | null,
  direction: SpatialDirection
): string | null {
  if (page.nodes.length === 0) return null;
  if (!currentId) return page.nodes[0].id;
  const current = page.nodes.find((node) => node.id === currentId);
  if (!current) return page.nodes[0].id;
  const matrices = buildNodeWorldMatrices(page);
  const center = nodeWorldCenter(current, matrices.get(current.id)!);
  const axis = directionVector(direction);
  let best: { node: SceneNode; score: number } | null = null;
  for (const node of page.nodes) {
    if (node.id === current.id) continue;
    const candidate = nodeWorldCenter(node, matrices.get(node.id)!);
    const dx = candidate.x - center.x;
    const dy = candidate.y - center.y;
    const forward = dx * axis.x + dy * axis.y;
    if (forward <= 0) continue;
    const perpendicular = Math.abs(dx * axis.y - dy * axis.x);
    const score = forward + perpendicular * 2;
    if (!best || score < best.score || (score === best.score && node.id < best.node.id)) {
      best = { node, score };
    }
  }
  return best?.node.id ?? current.id;
}

export function arrowSpatialDirection(key: string): SpatialDirection | null {
  switch (key) {
    case 'ArrowLeft': return 'left';
    case 'ArrowRight': return 'right';
    case 'ArrowUp': return 'up';
    case 'ArrowDown': return 'down';
    default: return null;
  }
}
