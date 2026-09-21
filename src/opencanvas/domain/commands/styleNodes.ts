import type { DocumentCommand } from './types';
import type { ScenePage } from '../document/types';
import type { JsonObject } from '../document/json';
import { areStructurallyEqual } from './equality';
import { buildNodeStateMap } from '../scene/nodeState';
import { textNodeSize } from './sceneEdits';
import { resolveNodeStyle } from '../nodes/nodeStyle';

// One appearance patch over a set of nodes as one batch; locked and unchanged
// nodes are skipped. Shared by the v2 style popover and the set_style action.
export function buildStyleNodesCommand(page: ScenePage, ids: readonly string[], patch: JsonObject): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const commands: DocumentCommand[] = [];
  for (const before of page.nodes) {
    if (!selected.has(before.id) || states.get(before.id)?.locked) continue;
    const appearance = { ...before.appearance, ...patch };
    if (areStructurallyEqual(appearance, before.appearance)) continue;
    const styled = { ...before, appearance };
    // Free text hugs its content, so typography changes re-fit the box.
    const after = before.kind === 'text'
      ? { ...styled, size: textNodeSize(typeof before.content.label === 'string' ? before.content.label : '', resolveNodeStyle(styled)) }
      : styled;
    commands.push({ kind: 'set-node', id: `style:${before.id}`, label: 'Style selection',
      pageId: page.id, before, after });
  }
  return commands.length ? { kind: 'batch', id: 'style-selection', label: 'Style selection', commands } : null;
}
