import { applyDocumentCommand } from '@/opencanvas/domain/commands/execute';
import type { SceneDocumentV1 } from '@/opencanvas/domain/document/types';
import type { AgentOp, OpContext, OpOutcome } from './ops/types';

/**
 * Validated input in, one reversible command (or none) plus a JSON-safe output
 * out. Hosts that own a history commit the command themselves; file hosts
 * apply it with runAgentOp.
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
