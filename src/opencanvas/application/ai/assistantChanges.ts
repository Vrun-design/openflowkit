// Assistant drafts → review rows that compose. Each row is built on the page the
// earlier accepted rows produced, so rejecting one row rebuilds the chain rather
// than breaking a precondition. New diagrams land to the right of the content;
// a replaced diagram keeps its place. Scene ops run again on that page, so their
// `before` snapshots are the page they will actually land on.
import type { AnyAgentOp } from '../../../agent/ops';
import type { OpCapabilities } from '../../../agent/ops/types';
import { resolveAgentOpCommand } from '../../../agent/runAction';
import type { CompileResult } from '../../../dsl/compile';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { SceneDocumentV1, SceneNode } from '../../domain/document/types';
import { buildDslPageCommand, nextDslFrameOrigin } from '../dsl/dslPageCommand';
import type { AiProposedChange } from './sceneProposal';

export type AssistantDraft = {
  /** Stable row id. */
  readonly id: string;
  readonly compiled: CompileResult;
  /** Frame to replace; absent or unknown on the page means a new diagram. */
  readonly frameId?: string;
} | {
  readonly id: string;
  readonly op: AnyAgentOp;
  readonly input: unknown;
  readonly label: string;
};

const titleOf = (frame: SceneNode | undefined): string | null => {
  const label = frame?.content.label;
  return typeof label === 'string' && label ? label : null;
};

// Scene ops read only the document; they never call a host capability.
const NO_CAPABILITIES = {} as OpCapabilities;

export async function chainAssistantChanges(
  document: SceneDocumentV1, pageId: string, drafts: readonly AssistantDraft[], rejected: ReadonlySet<string> = new Set(),
): Promise<Omit<AiProposedChange, 'status'>[]> {
  let current = document;
  const changes: Omit<AiProposedChange, 'status'>[] = [];
  for (const draft of drafts) {
    const page = current.pages.find(({ id }) => id === pageId);
    if (!page) break;
    let row: Omit<AiProposedChange, 'status'>;
    if ('op' in draft) {
      // A shape an earlier row removed or locked: the op cannot run, so there is no row.
      const outcome = await resolveAgentOpCommand(draft.op, draft.input, { document: current, pageId, capabilities: NO_CAPABILITIES })
        .catch(() => null);
      if (!outcome?.command) continue;
      row = { id: draft.id, explanation: draft.label, command: { ...outcome.command, label: draft.label } };
    } else {
      const bound = draft.frameId ? page.nodes.find((node) => node.id === draft.frameId && node.kind === 'frame') : undefined;
      const translation = bound ? bound.transform.translation : nextDslFrameOrigin(page);
      const compiled: CompileResult = {
        ...draft.compiled,
        frame: { ...draft.compiled.frame, transform: { ...draft.compiled.frame.transform, translation: { ...translation } } },
      };
      const command = buildDslPageCommand(page, compiled, bound?.id);
      if (!command) continue;
      const name = titleOf(compiled.frame) ?? titleOf(bound);
      const count = compiled.nodes.length + compiled.groups.length;
      row = {
        id: draft.id,
        explanation: `${compiled.meta.family} · ${count} ${count === 1 ? 'shape' : 'shapes'}`,
        command: { ...command, label: bound ? `Update ${name ?? 'diagram'}` : `Add ${name ?? `${compiled.meta.family} diagram`}` },
      };
    }
    changes.push(row);
    if (!rejected.has(draft.id)) current = applyDocumentCommand(current, row.command).document;
  }
  return changes;
}
