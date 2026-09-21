import type { SceneNode, ScenePage } from '../document/types';
import { applyMatrixToPoint, invertMatrix } from '../geometry/matrix';
import { isContainerNodeKind } from '../nodes/containerNodePresentation';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from '../scene/worldGeometry';
import { getDescendantNodeIds } from '../scene/queries';
import { createSceneIndex } from '../scene/spatialIndex';

/** Containers a moved node can drop into; ⌘G groups are invisible and never adopt. */
function adopts(node: SceneNode): boolean {
  return isContainerNodeKind(node.kind) && node.kind !== 'group';
}

// FigJam/Figma drop rule: after a move, a node whose centre lands inside a
// section joins it (the deepest one), and a node dragged out of its section
// leaves it. Nodes keep their world position; only `parentId` and the local
// translation change. Group members and nodes moved with their own container
// are left alone.
export function reparentByPosition(page: ScenePage, moved: readonly SceneNode[]): readonly SceneNode[] {
  const preview: ScenePage = {
    ...page,
    nodes: page.nodes.map((node) => moved.find((next) => next.id === node.id) ?? node),
  };
  const index = createSceneIndex(preview);
  const matrices = buildNodeWorldMatrices(preview);
  const movedIds = new Set(moved.map((node) => node.id));
  const containers = preview.nodes
    .filter((node) => adopts(node) && !movedIds.has(node.id))
    .map((node) => ({ node, bounds: nodeWorldBounds(node, matrices.get(node.id)!), depth: depthOf(preview, node) }))
    .sort((a, b) => b.depth - a.depth);
  return moved.map((node) => {
    const parent = node.parentId === null ? null : index.nodesById.get(node.parentId) ?? null;
    if (parent?.kind === 'group') return node;
    // A node moved together with its own (selected) container stays with it.
    if (node.parentId !== null && movedIds.has(node.parentId)) return node;
    const centre = nodeWorldCenter(node, matrices.get(node.id)!);
    const excluded = new Set(getDescendantNodeIds(index, node.id));
    const target = containers.find(({ node: candidate, bounds }) => candidate.id !== node.id && !excluded.has(candidate.id)
      && centre.x >= bounds.x && centre.x <= bounds.x + bounds.width
      && centre.y >= bounds.y && centre.y <= bounds.y + bounds.height) ?? null;
    const nextParentId = target?.node.id ?? null;
    if (nextParentId === node.parentId) return node;
    const world = matrices.get(node.id)!;
    const inverse = nextParentId === null ? null : invertMatrix(matrices.get(nextParentId)!);
    const origin = applyMatrixToPoint(world, { x: 0, y: 0 });
    const local = inverse ? applyMatrixToPoint(inverse, origin) : origin;
    return { ...node, parentId: nextParentId, transform: { ...node.transform, translation: local } };
  });
}

function depthOf(page: ScenePage, node: SceneNode): number {
  let depth = 0;
  let parentId = node.parentId;
  while (parentId) {
    depth += 1;
    parentId = page.nodes.find((candidate) => candidate.id === parentId)?.parentId ?? null;
  }
  return depth;
}
