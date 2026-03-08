import { useNodeId } from '@/lib/reactflowCompat';
import { useSelectedNodeId } from '@/store/selectionHooks';

export function useActiveNodeSelection(selected: boolean): boolean {
  const nodeId = useNodeId();
  const selectedNodeId = useSelectedNodeId();
  return selected || (Boolean(nodeId) && selectedNodeId === nodeId);
}
