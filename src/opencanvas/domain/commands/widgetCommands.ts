import type { DocumentCommand } from './types';
import type { JsonValue } from '../document/json';
import type { ScenePage } from '../document/types';
import type { WidgetVariant } from '../nodes/widgetNodePresentation';
import { buildNodeStateMap } from '../scene/nodeState';

export interface WidgetStatePatch {
  readonly checked?: boolean;
  /** 0–1; clamped. */
  readonly value?: number;
  /** Item index (day for a date picker); -1 clears it. */
  readonly active?: number;
  /** null clears it (a plain button). */
  readonly variant?: WidgetVariant | null;
}

/** The patch as content keys; `undefined` removes a key. */
function contentPatch(patch: WidgetStatePatch): Record<string, JsonValue | undefined> {
  const next: Record<string, JsonValue | undefined> = {};
  if (patch.checked !== undefined) next.checked = patch.checked;
  if (patch.value !== undefined) next.value = Math.min(1, Math.max(0, patch.value));
  if (patch.active !== undefined) next.active = patch.active < 0 ? undefined : Math.round(patch.active);
  if (patch.variant !== undefined) next.variant = patch.variant ?? undefined;
  return next;
}

/** Set state on every selected, unlocked widget: one undo step. */
export function buildSetWidgetStateCommand(
  page: ScenePage, ids: readonly string[], patch: WidgetStatePatch
): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const changes = Object.entries(contentPatch(patch));
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => node.kind === 'widget' && selected.has(node.id) && !states.get(node.id)?.locked
      && changes.some(([key, value]) => node.content[key] !== value))
    .map((before) => {
      const content: Record<string, JsonValue> = { ...before.content };
      for (const [key, value] of changes) {
        if (value === undefined) delete content[key];
        else content[key] = value;
      }
      return {
        kind: 'set-node' as const, id: `widget-state:${before.id}`, label: 'Change widget state',
        pageId: page.id, before, after: { ...before, content },
      };
    });
  return commands.length ? { kind: 'batch', id: 'set-widget-state', label: 'Change widget state', commands } : null;
}
