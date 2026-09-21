import { applyDocumentCommand } from '@/opencanvas/domain/commands/execute';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import type { ActionResult, AgentAction } from './actions';
import type { AgentOp, OpContext, OpOutcome } from './ops/types';

export interface RunActionResult {
  readonly document: SceneDocumentV1;
  readonly changed: boolean;
  readonly output: unknown;
}

/**
 * Validate raw input and resolve the action to a canonical command without
 * applying it. Session-based callers commit the result through the revisioned
 * session; direct callers use runAgentAction below.
 */
export function resolveAgentActionCommand<Input, Output>(
  action: AgentAction<Input, Output>,
  rawInput: unknown,
  document: SceneDocumentV1,
  pageId: string
): ActionResult<Output> {
  const page = document.pages.find((candidate) => candidate.id === pageId);
  if (!page) throw new RangeError(`Page "${pageId}" was not found.`);
  const input = action.schema.parse(rawInput ?? {});
  return action.run(input, { document, page });
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
  const { command, output } = resolveAgentActionCommand(action, rawInput, document, pageId);
  if (!command) return { document, changed: false, output };
  return { document: applyDocumentCommand(document, command).document, changed: true, output };
}

/**
 * Op-level twin of resolveAgentActionCommand: validated input in, one
 * reversible command (or none) plus a JSON-safe output out. Hosts that own a
 * history commit the command themselves; file hosts apply it with runAgentOp.
 */
export async function resolveAgentOpCommand<Input, Output>(
  op: AgentOp<Input, Output>,
  rawInput: unknown,
  context: OpContext
): Promise<OpOutcome<Output>> {
  return op.run(op.schema.parse(rawInput ?? {}), context);
}

export interface RunOpResult {
  readonly document: SceneDocumentV1;
  readonly changed: boolean;
  readonly output: unknown;
}

/** Apply an op straight to a document — the file/offline path. */
export async function runAgentOp(
  op: AgentOp<unknown, unknown>,
  rawInput: unknown,
  context: OpContext
): Promise<RunOpResult> {
  const { command, output } = await resolveAgentOpCommand(op, rawInput, context);
  if (!command) return { document: context.document, changed: false, output };
  return { document: applyDocumentCommand(context.document, command).document, changed: true, output };
}
