import type { SceneNode, ScenePage } from '../document/types';
import { applyMatrixToPoint, invertMatrix } from '../geometry/matrix';
import { isContainerNodeKind } from '../nodes/containerNodePresentation';
import { buildNodeWorldMatrices, nodeWorldBounds, nodeWorldCenter } from '../scene/worldGeometry';
import { getDescendantNodeIds } from '../scene/queries';
import { createSceneIndex } from '../scene/spatialIndex';
import { buildNodeStateMap } from '../scene/nodeState';

/** Containers a moved node can drop into; ⌘G groups are invisible and never adopt. */
function adopts(node: SceneNode): boolean {
  return isContainerNodeKind(node.kind) && node.kind !== 'group';
}

// FigJam/Figma drop rule: after a move, a node whose centre lands inside a
// section joins it (the deepest one), and a node dragged out of its section
// leaves it. Nodes keep their world position; only `parentId` and the local
// translation change. Group members and nodes moved with their own container
// are left alone.
export function reparentByPosition(
  page: ScenePage, moved: readonly SceneNode[], accepts: (container: SceneNode) => boolean = () => true,
): readonly SceneNode[] {
  const preview: ScenePage = {
    ...page,
    nodes: page.nodes.map((node) => moved.find((next) => next.id === node.id) ?? node),
  };
  const index = createSceneIndex(preview);
  const matrices = buildNodeWorldMatrices(preview);
  const movedIds = new Set(moved.map((node) => node.id));
  const containers = preview.nodes
    .filter((node) => adopts(node) && !movedIds.has(node.id) && accepts(node))
    .map((node) => ({ node, bounds: nodeWorldBounds(node, matrices.get(node.id)!), depth: depthOf(preview, node) }))
    // Deepest first; between overlapping siblings, the one drawn on top.
    .sort((a, b) => b.depth - a.depth || b.node.zIndex - a.node.zIndex);
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

/**
 * A node about to be inserted, adopted by the frame its centre lands in: placing is a drop. Not into a
 * hidden or locked frame (the node would vanish or freeze), nor into a generated diagram or C4 view,
 * whose regeneration replaces everything inside it. An inserted container stays where it is put.
 */
export function adoptOnInsert(page: ScenePage, node: SceneNode): SceneNode {
  if (isContainerNodeKind(node.kind)) return node;
  const states = buildNodeStateMap(page);
  const byId = new Map(page.nodes.map((candidate) => [candidate.id, candidate]));
  const generated = (container: SceneNode): boolean => {
    for (let at: SceneNode | undefined = container, hops = 0; at && hops <= page.nodes.length; at = byId.get(at.parentId ?? ''), hops += 1) {
      const dsl = at.metadata.dsl;
      if (dsl && typeof dsl === 'object' && ('family' in dsl || 'arch' in dsl)) return true;
    }
    return false;
  };
  const accepts = (container: SceneNode) => {
    const state = states.get(container.id);
    return state?.visible === true && !state.locked && !generated(container);
  };
  return reparentByPosition({ ...page, nodes: [...page.nodes, node] }, [node], accepts)[0]!;
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
