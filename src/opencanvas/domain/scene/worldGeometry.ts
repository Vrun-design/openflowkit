import { createBounds2d } from '../geometry/bounds';
import {
  applyMatrixToPoint,
  IDENTITY_MATRIX_2D,
  multiplyMatrices,
  transformBounds,
} from '../geometry/matrix';
import { transformToMatrix } from '../geometry/transform';
import type { Bounds2d, Matrix2d, Point2d } from '../geometry/types';
import type { SceneNode, ScenePage } from '../document/types';

export function buildNodeWorldMatrices(page: ScenePage): ReadonlyMap<string, Matrix2d> {
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  const matrices = new Map<string, Matrix2d>();

  function resolve(node: SceneNode): Matrix2d {
    const cached = matrices.get(node.id);
    if (cached) return cached;
    const local = transformToMatrix(node.transform);
    const parent = node.parentId === null ? undefined : nodesById.get(node.parentId);
    const world = parent ? multiplyMatrices(resolve(parent), local) : local;
    matrices.set(node.id, world);
    return world;
  }

  for (const node of page.nodes) resolve(node);
  return matrices;
}

export function nodeWorldBounds(node: SceneNode, worldMatrix: Matrix2d): Bounds2d {
  return transformBounds(worldMatrix, createBounds2d(0, 0, node.size.width, node.size.height));
}

export function nodeWorldCenter(node: SceneNode, worldMatrix: Matrix2d): Point2d {
  return applyMatrixToPoint(worldMatrix, { x: node.size.width / 2, y: node.size.height / 2 });
}

export function identityWorldMatrix(): Matrix2d {
  return IDENTITY_MATRIX_2D;
}
