import { useFlowStore } from '@/store';
import { findAgentAction } from './actions';

/**
 * Run an agent action against the live editor: the store's single canonical
 * write path applies the command with history, so undo works like any edit.
 */
export function runAgentActionInStore(name: string, rawInput: unknown): unknown {
  const action = findAgentAction(name);
  if (!action) throw new RangeError(`Agent action "${name}" was not found.`);
  const input = action.schema.parse(rawInput ?? {});
  let output: unknown;
  let ran = false;
  useFlowStore.getState().applyCanonicalCommand((document, pageId) => {
    const page = document.pages.find((candidate) => candidate.id === pageId);
    if (!page) throw new RangeError(`Page "${pageId}" was not found.`);
    const result = action.run(input, { document, page });
    output = result.output;
    ran = true;
    return result.command;
  });
  if (!ran) throw new Error('The editor has no active document to act on.');
  return output;
}
