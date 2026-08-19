import type { DocumentCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import { resolveSizedNode } from '../../domain/node-sizing/model';
import type { NodeSizingPolicyV1 } from '../../domain/node-sizing/types';

export function buildProductionNodeSizingCommand(
  page: ScenePage,
  nodeId: string,
  policy: NodeSizingPolicyV1
): DocumentCommand | null {
  const before = page.nodes.find((node) => node.id === nodeId);
  if (!before) throw new Error(`Node "${nodeId}" was not found.`);
  const after = resolveSizedNode(before, policy);
  if (JSON.stringify(before) === JSON.stringify(after)) return null;
  return {
    kind: 'set-node', id: `size-node:${nodeId}`, label: 'Set node sizing',
    pageId: page.id, before, after,
  };
}
