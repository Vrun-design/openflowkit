import type { z } from 'zod';
import type { DocumentCommand } from '@/opencanvas/domain/commands/types';
import type { SceneDocumentV1, ScenePage } from '@/opencanvas/domain/document/types';

/**
 * One action definition serves every surface: the in-app command palette,
 * WebMCP in the browser, the MCP server on a file, and tests. An action is a
 * pure function from (validated input, page) to an optional canonical command
 * plus a JSON-safe output; the surface decides how the command is applied.
 */
export interface ActionContext {
  readonly document: SceneDocumentV1;
  readonly page: ScenePage;
}

export interface ActionResult<Output> {
  readonly command: DocumentCommand | null;
  readonly output: Output;
}

export interface AgentAction<Input, Output> {
  readonly name: string;
  readonly description: string;
  readonly schema: z.ZodType<Input>;
  readonly run: (input: Input, context: ActionContext) => ActionResult<Output>;
}

export function defineAction<Input, Output>(action: AgentAction<Input, Output>): AgentAction<Input, Output> {
  return action;
}

export function requireNode(page: ScenePage, nodeId: string) {
  const node = page.nodes.find((candidate) => candidate.id === nodeId);
  if (!node) throw new RangeError(`Node "${nodeId}" was not found.`);
  return node;
}
