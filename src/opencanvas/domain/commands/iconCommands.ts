import type { DocumentCommand, InsertNodeCommand } from './types';
import type { ScenePage } from '../document/types';
import type { Point2d } from '../geometry/types';
import { buildNodeStateMap } from '../scene/nodeState';
import { createIconNode, withIcon, type IconChoice } from '../nodes/iconNode';

/** Swap the icon on every unlocked selected node as one undo step. */
export function buildSetIconCommand(page: ScenePage, ids: readonly string[], icon: IconChoice): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => selected.has(node.id) && !states.get(node.id)?.locked)
    .map((before) => ({ kind: 'set-node', id: `icon:${before.id}`, label: 'Change icon', pageId: page.id, before, after: withIcon(before, icon) }));
  return commands.length ? { kind: 'batch', id: 'set-icon', label: 'Change icon', commands } : null;
}

export function buildInsertIconCommand(page: ScenePage, options: { readonly id: string; readonly at: Point2d; readonly icon: IconChoice }): InsertNodeCommand {
  const node = createIconNode(page, options);
  return { kind: 'insert-node', id: `create-node:${node.id}`, label: `Add ${options.icon.label}`, pageId: page.id, index: page.nodes.length, node };
}
