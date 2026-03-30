import type { FlowTab } from '@/lib/types';
import { nowIso } from '@/lib/date';

/** Syncs the active tab's nodes/edges snapshot. Used by canvas actions and tab actions. */
export function syncTabNodesEdges(
  tabs: FlowTab[],
  activeTabId: string,
  nodes: FlowTab['nodes'],
  edges: FlowTab['edges']
): FlowTab[] {
  const updatedAt = nowIso();
  return tabs.map((tab) => (tab.id === activeTabId ? { ...tab, nodes, edges, updatedAt } : tab));
}
