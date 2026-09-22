import type { DocumentCommand } from './types';
import type { ScenePage } from '../document/types';
import { buildNodeStateMap } from '../scene/nodeState';

// Ink is a content property, not an appearance one: a stroke's colour and
// width live in `content.strokeColor`/`content.strokeWidth` so the DSL-less
// freeform model stays self-describing. One undo step per pick.
export interface InkPatch {
  readonly strokeColor?: string;
  readonly strokeWidth?: number;
  /** 0–1; a highlighter's see-through wash. */
  readonly transparency?: number;
}

const STROKE_KINDS = new Set(['pen', 'highlighter', 'line', 'arrow']);

export function buildSetInkCommand(
  page: ScenePage, ids: readonly string[], patch: InkPatch
): DocumentCommand | null {
  const selected = new Set(ids);
  const states = buildNodeStateMap(page);
  const commands: DocumentCommand[] = page.nodes
    .filter((node) => selected.has(node.id) && STROKE_KINDS.has(node.kind) && !states.get(node.id)?.locked)
    .map((before) => ({
      kind: 'set-node' as const,
      id: `ink:${before.id}`,
      label: 'Change ink',
      pageId: page.id,
      before,
      after: { ...before, content: { ...before.content, ...patch } },
    }));
  return commands.length ? { kind: 'batch', id: 'set-ink', label: 'Change ink', commands } : null;
}
