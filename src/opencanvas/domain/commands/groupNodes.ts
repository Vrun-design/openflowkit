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

export type WrapKind = 'group' | 'section';

// Sections keep room for their title chip; groups hug their members.
const WRAP_PADDING: Record<WrapKind, { top: number; side: number; bottom: number }> = {
  group: { top: GROUP_PADDING, side: GROUP_PADDING, bottom: GROUP_PADDING },
  section: { top: 56, side: 24, bottom: 24 },
};

/**
 * ⌘G / ⌘⌥G: wrap the selected top-level nodes in a container sized to their
 * union + padding. A group is invisible (its selection frame is its only
 * chrome); a section draws a titled boundary. Children keep their world
 * position by moving into the container's frame. One batch, one undo.
 * ponytail: top-level nodes only; wrapping inside a container returns null.
 * Convert through the parent's inverse matrix when nesting is needed.
 */
export function buildWrapCommand(page: ScenePage, nodeIds: readonly string[], id: string, kind: WrapKind): DocumentCommand | null {
  const roots = selectedRootIds(page, nodeIds);
  const nodes = page.nodes.filter((node) => roots.includes(node.id));
  if (nodes.length < (kind === 'group' ? 2 : 1) || nodes.some((node) => node.parentId !== null)) return null;
  if (page.nodes.some((node) => node.id === id)) throw new RangeError(`Node "${id}" already exists.`);
  const matrices = buildNodeWorldMatrices(page);
  const boxes = nodes.map((node) => nodeWorldBounds(node, matrices.get(node.id)!));
  const union = boxes.slice(1).reduce(unionBounds, boxes[0]);
  const pad = WRAP_PADDING[kind];
  const origin = { x: union.x - pad.side, y: union.y - pad.top };
  const label = kind === 'group' ? 'Group' : 'Wrap in section';
  const container: SceneNode = {
    id, kind, parentId: null,
    layerId: nodes[0].layerId,
    zIndex: Math.min(...nodes.map((node) => node.zIndex)),
    transform: { translation: origin, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: union.width + pad.side * 2, height: union.height + pad.top + pad.bottom },
    content: { label: kind === 'group' ? '' : 'Section' },
    appearance: {},
    ports: [], metadata: {}, extensions: {},
  };
  const commands: DocumentCommand[] = [
    { kind: 'insert-node', id: `${kind}:${id}`, label, pageId: page.id, index: page.nodes.length, node: container },
    ...nodes.map((node) => ({
      kind: 'set-node' as const, id: `${kind}-child:${node.id}`, label, pageId: page.id, before: node,
      after: {
        ...node, parentId: id,
        transform: { ...node.transform, translation: {
          x: node.transform.translation.x - origin.x, y: node.transform.translation.y - origin.y,
        } },
      },
    })),
  ];
  return { kind: 'batch', id: `${kind}:${id}`, label, commands };
}

export function buildGroupCommand(page: ScenePage, nodeIds: readonly string[], groupId: string): DocumentCommand | null {
  return buildWrapCommand(page, nodeIds, groupId, 'group');
}

/** ⌘⇧G: dissolve every selected top-level group or section; children return to the page. */
export function buildUngroupCommand(page: ScenePage, nodeIds: readonly string[]): BatchDocumentCommand | null {
  const groups = page.nodes.filter((node) => nodeIds.includes(node.id)
    && (node.kind === 'group' || node.kind === 'section') && node.parentId === null);
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

/** Section setting: draw the title chip or not. Groups have no header to toggle. */
export function buildSetHeaderCommand(page: ScenePage, nodeIds: readonly string[], show: boolean): DocumentCommand | null {
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => nodeIds.includes(node.id) && node.kind !== 'group' && (node.content.showHeader !== false) !== show)
    .map((before) => ({
      kind: 'set-node' as const, id: `header:${before.id}`, label: show ? 'Show header' : 'Hide header', pageId: page.id, before,
      after: { ...before, content: { ...before.content, showHeader: show } },
    }));
  return commands.length ? { kind: 'batch', id: 'set-header', label: commands[0].label, commands } : null;
}
