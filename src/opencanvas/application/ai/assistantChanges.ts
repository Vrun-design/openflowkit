// Compiled assistant blocks → review rows that compose. Each row is a set-page
// built on the page the earlier accepted rows produced, so rejecting one row
// rebuilds the chain rather than breaking a precondition. New diagrams land to
// the right of the content; a replaced diagram keeps its place.
import type { CompileResult } from '../../../dsl/compile';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import { buildDslPageCommand, nextDslFrameOrigin } from '../dsl/dslPageCommand';
import type { AiProposedChange } from './sceneProposal';

export interface AssistantDraft {
  /** Stable row id. */
  readonly id: string;
  readonly compiled: CompileResult;
  /** Frame to replace; absent or unknown on the page means a new diagram. */
  readonly frameId?: string;
}

const titleOf = (frame: SceneNode | undefined): string | null => {
  const label = frame?.content.label;
  return typeof label === 'string' && label ? label : null;
};

export function chainAssistantChanges(
  page: ScenePage, drafts: readonly AssistantDraft[], rejected: ReadonlySet<string> = new Set(),
): Omit<AiProposedChange, 'status'>[] {
  let current = page;
  const changes: Omit<AiProposedChange, 'status'>[] = [];
  for (const draft of drafts) {
    const bound = draft.frameId ? current.nodes.find((node) => node.id === draft.frameId && node.kind === 'frame') : undefined;
    const translation = bound ? bound.transform.translation : nextDslFrameOrigin(current);
    const compiled: CompileResult = {
      ...draft.compiled,
      frame: { ...draft.compiled.frame, transform: { ...draft.compiled.frame.transform, translation: { ...translation } } },
    };
    const command = buildDslPageCommand(current, compiled, bound?.id);
    if (!command) continue;
    const name = titleOf(compiled.frame) ?? titleOf(bound);
    const count = compiled.nodes.length + compiled.groups.length;
    changes.push({
      id: draft.id,
      explanation: `${compiled.meta.family} · ${count} ${count === 1 ? 'shape' : 'shapes'}`,
      command: { ...command, label: bound ? `Update ${name ?? 'diagram'}` : `Add ${name ?? `${compiled.meta.family} diagram`}` },
    });
    if (!rejected.has(draft.id) && command.kind === 'set-page') {
      current = command.after;
    }
  }
  return changes;
}

