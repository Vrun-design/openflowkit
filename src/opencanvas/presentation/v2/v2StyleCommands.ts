import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import type { JsonObject } from '../../domain/document/json';
import { areStructurallyEqual } from '../../domain/commands/equality';
import { buildNodeStateMap } from '../../domain/scene/nodeState';

export function buildV2StyleCommand(page: ScenePage, ids: readonly string[], patch: JsonObject): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const commands: DocumentCommand[] = [];
  for (const before of page.nodes) {
    if (!selected.has(before.id) || states.get(before.id)?.locked) continue;
    const appearance = { ...before.appearance, ...patch };
    if (areStructurallyEqual(appearance, before.appearance)) continue;
    commands.push({ kind: 'set-node', id: `style:${before.id}`, label: 'Style selection',
      pageId: page.id, before, after: { ...before, appearance } });
  }
  return commands.length ? { kind: 'batch', id: 'style-selection', label: 'Style selection', commands } : null;
}
