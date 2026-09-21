import type { BatchDocumentCommand, DocumentCommand } from './types';
import type { SceneNode, ScenePage } from '../document/types';
import { unionBounds } from '../geometry/bounds';
import { buildNodeWorldMatrices, nodeWorldBounds } from '../scene/worldGeometry';

const GROUP_PADDING = 16;

/** Selected ids whose ancestors are not selected. */
export function selectedRootIds(page: ScenePage, nodeIds: readonly string[]): string[] {
  const selected = new Set(nodeIds);
  const byId = new Map(page.nodes.map((node) => [node.id, node]));
  return nodeIds.filter((id) => {
    let parentId = byId.get(id)?.parentId ?? null;
    while (parentId) {
      if (selected.has(parentId)) return false;
      parentId = byId.get(parentId)?.parentId ?? null;
    }
    return byId.has(id);
  });
}

/** Every node under `nodeIds`, depth first, excluding the ids themselves. */
export function descendantIds(page: ScenePage, nodeIds: readonly string[]): string[] {
  const children = new Map<string, string[]>();
  for (const node of page.nodes) {
    if (node.parentId) children.set(node.parentId, [...(children.get(node.parentId) ?? []), node.id]);
  }
  const result: string[] = [];
  const pending = nodeIds.flatMap((id) => children.get(id) ?? []);
  while (pending.length) {
    const id = pending.shift()!;
    result.push(id);
    pending.push(...(children.get(id) ?? []));
  }
  return result;
}

/**
 * ⌘G: wrap the selected top-level nodes in a quiet `group` container (no
 * label, no paint) sized to their union + padding. Children keep their world
 * position by moving into the group's frame. One batch, one undo.
 * ponytail: top-level nodes only; grouping inside a section/group returns
 * null. Convert through the parent's inverse matrix when nesting is needed.
 */
export function buildGroupCommand(page: ScenePage, nodeIds: readonly string[], groupId: string): DocumentCommand | null {
  const roots = selectedRootIds(page, nodeIds);
  const nodes = page.nodes.filter((node) => roots.includes(node.id));
  if (nodes.length < 2 || nodes.some((node) => node.parentId !== null)) return null;
  if (page.nodes.some((node) => node.id === groupId)) throw new RangeError(`Node "${groupId}" already exists.`);
  const matrices = buildNodeWorldMatrices(page);
  const boxes = nodes.map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
  const union = boxes.slice(1).reduce(unionBounds, boxes[0]);
  const origin = { x: union.x - GROUP_PADDING, y: union.y - GROUP_PADDING };
  const group: SceneNode = {
    id: groupId, kind: 'group', parentId: null,
    layerId: nodes[0].layerId,
    zIndex: Math.min(...nodes.map((node) => node.zIndex)),
    transform: { translation: origin, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: union.width + GROUP_PADDING * 2, height: union.height + GROUP_PADDING * 2 },
    content: { label: '' },
    appearance: { fill: 'transparent', stroke: 'transparent' },
    ports: [], metadata: {}, extensions: {},
  };
  const commands: DocumentCommand[] = [
    { kind: 'insert-node', id: `group:${groupId}`, label: 'Group', pageId: page.id, index: page.nodes.length, node: group },
    ...nodes.map((node) => ({
      kind: 'set-node' as const, id: `group-child:${node.id}`, label: 'Group', pageId: page.id, before: node,
      after: {
        ...node, parentId: groupId,
        transform: { ...node.transform, translation: {
          x: node.transform.translation.x - origin.x, y: node.transform.translation.y - origin.y,
        } },
      },
    })),
  ];
  return { kind: 'batch', id: `group:${groupId}`, label: 'Group', commands };
}

/** ⌘⇧G: dissolve every selected quiet group; children return to the page. */
export function buildUngroupCommand(page: ScenePage, nodeIds: readonly string[]): BatchDocumentCommand | null {
  const groups = page.nodes.filter((node) => nodeIds.includes(node.id) && node.kind === 'group' && node.parentId === null);
  if (groups.length === 0) return null;
  const commands: DocumentCommand[] = [];
  for (const group of groups) {
    for (const child of page.nodes.filter((node) => node.parentId === group.id)) {
      commands.push({
        kind: 'set-node', id: `ungroup-child:${child.id}`, label: 'Ungroup', pageId: page.id, before: child,
        after: {
          ...child, parentId: null,
          transform: { ...child.transform, translation: {
            x: child.transform.translation.x + group.transform.translation.x,
            y: child.transform.translation.y + group.transform.translation.y,
          } },
        },
      });
    }
    commands.push({
      kind: 'remove-node', id: `ungroup:${group.id}`, label: 'Ungroup', pageId: page.id,
      index: page.nodes.findIndex((node) => node.id === group.id), node: group,
    });
  }
  return { kind: 'batch', id: 'ungroup', label: 'Ungroup', commands };
}
