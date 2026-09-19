import { applyDocumentCommand } from '@/opencanvas/domain/commands/execute';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import type { AgentAction } from './actions';

export interface RunActionResult {
  readonly document: SceneDocumentV1;
  readonly changed: boolean;
  readonly output: unknown;
}

/**
 * Validate raw input against the action's schema, run it against the page,
 * and apply the resulting command. Pure: the caller owns persistence (store
 * history in the browser, a file on the MCP server).
 */
export function runAgentAction(
  action: AgentAction<unknown, unknown>,
  rawInput: unknown,
  document: SceneDocumentV1,
  pageId: string
): RunActionResult {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`Page "${pageId}" was not found.`);
  const input = action.schema.parse(rawInput ?? {});
  const { command, output } = action.run(input, { document, page });
  if (!command) return { document, changed: false, output };
  return { document: applyDocumentCommand(document, command).document, changed: true, output };
}
