import type { FlowEdge, FlowNode } from '@/lib/types';

function isMindmapNode(node: FlowNode | undefined): node is FlowNode {
  return node !== undefined && node.type === 'mindmap';
}

export function getMindmapChildrenById(nodes: FlowNode[], edges: FlowEdge[]): Map<string, string[]> {
  const nodeIds = new Set(nodes.filter(isMindmapNode).map((node) => node.id));
  const childrenById = new Map<string, string[]>();
  const connectedTargets = new Set<string>();

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target)) {
      return;
    }

    const children = childrenById.get(edge.source) ?? [];
    children.push(edge.target);
    childrenById.set(edge.source, children);
    connectedTargets.add(edge.target);
  });

  nodes.filter(isMindmapNode).forEach((node) => {
    const parentId = typeof node.data.mindmapParentId === 'string' ? node.data.mindmapParentId : '';
    if (!parentId || !nodeIds.has(parentId) || connectedTargets.has(node.id)) {
      return;
    }

    const children = childrenById.get(parentId) ?? [];
    if (!children.includes(node.id)) {
      children.push(node.id);
    }
    childrenById.set(parentId, children);
  });

  childrenById.forEach((children) => {
    children.sort((left, right) => left.localeCompare(right));
  });

  return childrenById;
}

export function getMindmapDescendantIds(nodeId: string, childrenById: Map<string, string[]>): Set<string> {
  const descendants = new Set<string>();
  const pending = [...(childrenById.get(nodeId) ?? [])];

  while (pending.length > 0) {
    const currentId = pending.pop();
    if (!currentId || descendants.has(currentId)) {
      continue;
    }
    descendants.add(currentId);
    pending.push(...(childrenById.get(currentId) ?? []));
  }

  return descendants;
}

export function countVisibleMindmapChildren(nodeId: string, childrenById: Map<string, string[]>): number {
  return (childrenById.get(nodeId) ?? []).length;
}

export function applyMindmapVisibility(nodes: FlowNode[], edges: FlowEdge[]): { nodes: FlowNode[]; edges: FlowEdge[] } {
  const childrenById = getMindmapChildrenById(nodes, edges);
  const hiddenNodeIds = new Set<string>();
  const mindmapNodeIds = new Set(nodes.filter((node) => node.type === 'mindmap').map((node) => node.id));

  nodes.forEach((node) => {
    if (node.type !== 'mindmap' || node.data.mindmapCollapsed !== true) {
      return;
    }
    getMindmapDescendantIds(node.id, childrenById).forEach((descendantId) => {
      hiddenNodeIds.add(descendantId);
    });
  });

  return {
    nodes: nodes.map((node) => (
      node.type === 'mindmap'
        ? { ...node, hidden: hiddenNodeIds.has(node.id) }
        : node
    )),
    edges: edges.map((edge) => (
      mindmapNodeIds.has(edge.source) && mindmapNodeIds.has(edge.target)
        ? {
            ...edge,
            hidden: hiddenNodeIds.has(edge.source) || hiddenNodeIds.has(edge.target),
          }
        : edge
    )),
  };
}
