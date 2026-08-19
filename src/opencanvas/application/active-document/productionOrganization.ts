import type { DocumentCommand } from '../../domain/commands/types';
import { invertMatrix, multiplyMatrices } from '../../domain/geometry/matrix';
import { createTransform2d, transformToMatrix } from '../../domain/geometry/transform';
import type { Matrix2d, Transform2d } from '../../domain/geometry/types';
import { buildNodeWorldMatrices } from '../../domain/scene/worldGeometry';
import type { SceneNode, ScenePage } from '../../domain/document/types';

export type NodeZOrderAction = 'back' | 'backward' | 'forward' | 'front';

const MATRIX_EPSILON = 1e-7;

function requireNode(page: ScenePage, nodeId: string): SceneNode {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new Error(`Node "${nodeId}" was not found.`);
  return node;
}

function isDescendant(page: ScenePage, nodeId: string, possibleDescendantId: string): boolean {
  const nodesById = new Map(page.nodes.map((node) => [node.id, node]));
  let current = nodesById.get(possibleDescendantId);
  while (current?.parentId) {
    if (current.parentId === nodeId) return true;
    current = nodesById.get(current.parentId);
  }
  return false;
}

function matrixToTransform(matrix: Matrix2d): Transform2d {
  const scaleX = Math.hypot(matrix.a, matrix.b);
  if (scaleX <= MATRIX_EPSILON) throw new Error('Reparenting requires an invertible transform.');
  const transform = createTransform2d({
    translation: { x: matrix.tx, y: matrix.ty },
    rotationRadians: Math.atan2(matrix.b, matrix.a),
    scale: { x: scaleX, y: (matrix.a * matrix.d - matrix.b * matrix.c) / scaleX },
  });
  const rebuilt = transformToMatrix(transform);
  for (const key of ['a', 'b', 'c', 'd', 'tx', 'ty'] as const) {
    if (Math.abs(rebuilt[key] - matrix[key]) > MATRIX_EPSILON) {
      throw new Error('Reparenting would introduce unsupported skew.');
    }
  }
  return transform;
}

export function buildProductionReparentCommand(
  page: ScenePage,
  nodeId: string,
  parentId: string | null
): DocumentCommand | null {
  const node = requireNode(page, nodeId);
  if (node.parentId === parentId) return null;
  if (parentId === nodeId || (parentId !== null && isDescendant(page, nodeId, parentId))) {
    throw new Error('Reparenting would create a hierarchy cycle.');
  }
  if (parentId !== null) requireNode(page, parentId);

  const worldMatrices = buildNodeWorldMatrices(page);
  const world = worldMatrices.get(nodeId)!;
  let local = world;
  if (parentId !== null) {
    const inverseParent = invertMatrix(worldMatrices.get(parentId)!);
    if (!inverseParent) throw new Error('Parent transform is not invertible.');
    local = multiplyMatrices(inverseParent, world);
  }
  const after = { ...node, parentId, transform: matrixToTransform(local) };
  return {
    kind: 'set-node', id: `reparent-node:${nodeId}`, label: 'Reparent node',
    pageId: page.id, before: node, after,
  };
}

export function productionParentCandidates(page: ScenePage, nodeId: string): readonly SceneNode[] {
  requireNode(page, nodeId);
  return page.nodes.filter((candidate) => {
    if (candidate.id === nodeId || isDescendant(page, nodeId, candidate.id)) return false;
    try {
      buildProductionReparentCommand(page, nodeId, candidate.id);
      return true;
    } catch {
      return false;
    }
  });
}

function scopedSiblings(page: ScenePage, node: SceneNode): SceneNode[] {
  return page.nodes
    .filter((candidate) => candidate.layerId === node.layerId && candidate.parentId === node.parentId)
    .sort((left, right) => left.zIndex - right.zIndex || left.id.localeCompare(right.id));
}

export function buildProductionZOrderCommand(
  page: ScenePage,
  nodeId: string,
  action: NodeZOrderAction
): DocumentCommand | null {
  const node = requireNode(page, nodeId);
  const siblings = scopedSiblings(page, node);
  const index = siblings.findIndex((candidate) => candidate.id === nodeId);
  const targetIndex = action === 'front' ? siblings.length - 1
    : action === 'back' ? 0
      : action === 'forward' ? Math.min(siblings.length - 1, index + 1)
        : Math.max(0, index - 1);
  if (targetIndex === index) return null;
  const ordered = [...siblings];
  ordered.splice(index, 1);
  ordered.splice(targetIndex, 0, node);
  const commands: DocumentCommand[] = ordered.flatMap((candidate, zIndex) => (
    candidate.zIndex === zIndex ? [] : [{
      kind: 'set-node' as const, id: `z-order-node:${candidate.id}`, label: 'Change node z-order',
      pageId: page.id, before: candidate, after: { ...candidate, zIndex },
    }]
  ));
  return {
    kind: 'batch', id: `z-order:${nodeId}:${action}`, label: 'Change node z-order', commands,
  };
}
