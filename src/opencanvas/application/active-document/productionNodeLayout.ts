import { areStructurallyEqual } from '../../domain/commands/equality';
import type { SetNodeCommand } from '../../domain/commands/types';
import type { ScenePage } from '../../domain/document/types';
import { setNodeContentLayout } from '../../domain/node-layout/editing';
import type { NodeContentLayoutV1 } from '../../domain/node-layout/types';

export function buildProductionNodeLayoutCommand(
  page: ScenePage,
  nodeId: string,
  layout: NodeContentLayoutV1,
  label: string
): SetNodeCommand | null {
  const before = page.nodes.find((node) => node.id === nodeId);
  if (!before) throw new RangeError(`Node "${nodeId}" was not found.`);
  const after = setNodeContentLayout(before, layout);
  if (areStructurallyEqual(before, after)) return null;
  return {
    kind: 'set-node', id: `edit-node-layout:${nodeId}`, label,
    pageId: page.id, before, after,
  };
}
