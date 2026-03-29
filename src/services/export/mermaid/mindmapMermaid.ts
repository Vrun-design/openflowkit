import type { FlowEdge, FlowNode } from '@/lib/types';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

function getIncomingTargets(edges: FlowEdge[]): Set<string> {
  const incoming = new Set<string>();
  edges.forEach((edge) => incoming.add(edge.target));
  return incoming;
}

export function toMindmapMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['mindmap'];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenById = new Map<string, string[]>();

  edges.forEach((edge) => {
    const children = childrenById.get(edge.source) ?? [];
    children.push(edge.target);
    childrenById.set(edge.source, children);
  });

  childrenById.forEach((children) => {
    children.sort((left, right) => {
      const leftNode = nodeById.get(left);
      const rightNode = nodeById.get(right);
      if (!leftNode || !rightNode) return left.localeCompare(right);
      if (leftNode.position.y !== rightNode.position.y)
        return leftNode.position.y - rightNode.position.y;
      if (leftNode.position.x !== rightNode.position.x)
        return leftNode.position.x - rightNode.position.x;
      return left.localeCompare(right);
    });
  });

  const incoming = getIncomingTargets(edges);
  const roots = sortNodesByPosition(nodes.filter((node) => !incoming.has(node.id)));
  const visited = new Set<string>();

  function appendSubtree(node: FlowNode, depth: number): void {
    if (visited.has(node.id)) return;
    visited.add(node.id);
    const label = String(node.data.label || node.id).trim() || node.id;
    const explicitDepth =
      typeof node.data.mindmapDepth === 'number'
        ? Math.max(0, Math.floor(node.data.mindmapDepth))
        : null;
    const effectiveDepth = explicitDepth ?? depth;
    lines.push(`${'  '.repeat(effectiveDepth)}${label}`);

    const children = childrenById.get(node.id) ?? [];
    children.forEach((childId) => {
      const child = nodeById.get(childId);
      if (!child) return;
      appendSubtree(child, effectiveDepth + 1);
    });
  }

  roots.forEach((root) => appendSubtree(root, 0));
  sortNodesByPosition(nodes)
    .filter((node) => !visited.has(node.id))
    .forEach((node) => appendSubtree(node, 0));

  return `${lines.join('\n')}\n`;
}
