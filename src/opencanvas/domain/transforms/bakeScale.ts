import type { SceneNode } from '../document/types';
import { isJsonObject, type JsonValue } from '../document/json';

function scaledPoints(points: JsonValue, scaleX: number, scaleY: number): JsonValue {
  if (!Array.isArray(points)) return points;
  return points.map((point) => isJsonObject(point)
    && typeof point.x === 'number' && typeof point.y === 'number'
    ? { ...point, x: point.x * scaleX, y: point.y * scaleY }
    : point);
}

/**
 * Fold a node's transform scale into its geometry: size for every node, and
 * stroke points for freeform ink whose geometry lives in content. Persisted
 * documents keep scale at 1 because the legacy React Flow shape (still the
 * stored truth) has no scale, so an unbaked resize would be dropped silently
 * on the next round trip.
 */
export function bakeTransformScale(node: SceneNode): SceneNode {
  const { x: scaleX, y: scaleY } = node.transform.scale;
  if (scaleX === 1 && scaleY === 1) return node;
  const content = Array.isArray(node.content.points)
    ? { ...node.content, points: scaledPoints(node.content.points, scaleX, scaleY) }
    : node.content;
  return {
    ...node,
    content,
    size: { width: node.size.width * scaleX, height: node.size.height * scaleY },
    transform: { ...node.transform, scale: { x: 1, y: 1 } },
  };
}
