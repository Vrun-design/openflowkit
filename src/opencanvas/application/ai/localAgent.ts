// Deterministic, provider-free proposal source: turns a named intent plus the
// live selection into changes built only from the shared agent actions.
// Owns no planner, no network, no React; V2-11 swaps in a provider behind
// the same (intent → changes) shape.
import { findAgentAction } from '../../../agent/actions';
import { resolveAgentActionCommand } from '../../../agent/runAction';
import { applyDocumentCommand } from '../../domain/commands/execute';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneDocumentV1, SceneNode } from '../../domain/document/types';
import type { AiProposedChange } from './sceneProposal';

export const LOCAL_AGENT_SOURCE = 'local-agent';
export type LocalAgentIntent = 'add-step-after-selection' | 'label-unlabeled' | 'tidy-row';
export const LOCAL_AGENT_INTENTS: readonly { readonly id: LocalAgentIntent; readonly label: string }[] = [
  { id: 'add-step-after-selection', label: 'Add a step after the selection' },
  { id: 'label-unlabeled', label: 'Label unlabeled nodes' },
  { id: 'tidy-row', label: 'Tidy selection into a row' },
];
const GAP = 48;

export interface LocalAgentContext {
  readonly selection: { readonly primaryNodeId: string | null; readonly nodeIds: readonly string[] };
  readonly mintId: (prefix: string) => string;
}

type Change = Omit<AiProposedChange, 'status'>;

function action(name: string, input: unknown, document: SceneDocumentV1, pageId: string): DocumentCommand {
  const definition = findAgentAction(name);
  if (!definition) throw new RangeError(`Agent action "${name}" was not found.`);
  const { command } = resolveAgentActionCommand(definition, input, document, pageId);
  if (!command) throw new RangeError(`Agent action "${name}" produced no change.`);
  return command;
}

function hasLabel(node: SceneNode): boolean {
  return typeof node.content.label === 'string' && node.content.label.trim().length > 0;
}

function page(document: SceneDocumentV1, pageId: string) {
  const found = document.pages.find((candidate) => candidate.id === pageId);
  if (!found) throw new RangeError(`Page "${pageId}" was not found.`);
  return found;
}

export function proposeFromIntent(
  document: SceneDocumentV1, pageId: string, intent: LocalAgentIntent, context: LocalAgentContext
): Change[] {
  const current = page(document, pageId);
  const { primaryNodeId, nodeIds } = context.selection;
  switch (intent) {
    case 'add-step-after-selection': {
      const primary = current.nodes.find((node) => node.id === primaryNodeId);
      if (!primary) throw new Error('Select a node first; the new step goes to its right.');
      const id = context.mintId('node');
      const label = `Step ${current.nodes.length + 1}`;
      const add = action('add_node', {
        kind: 'process', id, label,
        x: primary.transform.translation.x + primary.size.width + GAP,
        y: primary.transform.translation.y,
      }, document, pageId);
      // The connector resolves against the page as it will be after the add.
      const withNode = applyDocumentCommand(document, add).document;
      const connect = action('connect', { id: context.mintId('connector'), source: primary.id, target: id },
        withNode, pageId);
      return [
        { id: `${id}:add`, explanation: `Add "${label}" ${GAP}px to the right of "${hasLabel(primary) ? primary.content.label : primary.id}".`, command: add },
        { id: `${id}:connect`, explanation: `Connect the selected node to "${label}".`, command: connect },
      ];
    }
    case 'label-unlabeled': {
      const changes = current.nodes.flatMap((node, index) => hasLabel(node) ? [] : [{
        id: `label:${node.id}`,
        explanation: `Node ${index + 1} has no label; name it by its position.`,
        command: action('set_label', { id: node.id, label: `Step ${index + 1}` }, document, pageId),
      }]);
      if (changes.length === 0) throw new Error('Every node already has a label.');
      return changes;
    }
    case 'tidy-row': {
      const selected = current.nodes.filter((node) => nodeIds.includes(node.id));
      const primary = selected.find((node) => node.id === primaryNodeId) ?? selected[0];
      if (selected.length < 2 || !primary) throw new Error('Select at least two nodes to tidy into a row.');
      const ordered = [...selected].sort((a, b) => a.transform.translation.x - b.transform.translation.x);
      let x = ordered[0].transform.translation.x;
      const y = primary.transform.translation.y;
      const changes: Change[] = [];
      for (const node of ordered) {
        const { translation } = node.transform;
        if (translation.x !== x || translation.y !== y) changes.push({
          id: `tidy:${node.id}`,
          explanation: `Move "${hasLabel(node) ? node.content.label : node.id}" into the row at y=${y}.`,
          command: action('move_node', { id: node.id, x, y }, document, pageId),
        });
        x += node.size.width + GAP;
      }
      if (changes.length === 0) throw new Error('The selection is already a tidy row.');
      return changes;
    }
  }
}
