import type { FlowEdge, FlowNode } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

function escapeStateLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}

function isStateDiagramNodeType(type: string | undefined): boolean {
  return type === 'state' || type === 'start' || type === 'section' || type === 'process';
}

export function looksLikeStateDiagram(nodes: FlowNode[]): boolean {
  if (nodes.length === 0) return false;
  const hasStateStartNode = nodes.some((node) => node.id.startsWith('state_start_'));
  const hasExplicitStateNode = nodes.some((node) => node.type === 'state');
  const sectionIds = new Set(
    nodes.filter((node) => node.type === 'section').map((node) => node.id)
  );
  const hasCompositeParenting = nodes.some((node) => {
    const parentId = getNodeParentId(node);
    return parentId.length > 0 && sectionIds.has(parentId);
  });

  if (!hasStateStartNode && !hasExplicitStateNode && !hasCompositeParenting) {
    return false;
  }

  return nodes.every((node) => isStateDiagramNodeType(node.type));
}

function hasMarker(marker: FlowEdge['markerStart'] | FlowEdge['markerEnd']): boolean {
  return Boolean(marker);
}

function resolveStateConnector(edge: FlowEdge): string {
  const hasStart = hasMarker(edge.markerStart);
  const hasEnd = hasMarker(edge.markerEnd) || (!hasStart && !edge.markerEnd);
  const styleWidth = edge.style?.strokeWidth;
  const styleDash = edge.style?.strokeDasharray;

  const isDashed = Boolean(styleDash);
  const numericWidth =
    typeof styleWidth === 'number'
      ? styleWidth
      : typeof styleWidth === 'string'
        ? Number(styleWidth)
        : undefined;
  const isThick =
    !isDashed &&
    typeof numericWidth === 'number' &&
    Number.isFinite(numericWidth) &&
    numericWidth >= 4;

  let body = '--';
  if (isDashed) body = '-.-';
  if (isThick) body = '==';

  if (hasStart && hasEnd) return `<${body}>`;
  if (hasStart) return `<${body}`;
  if (hasEnd) return `${body}>`;
  return body;
}

function toStateNodeToken(nodeId: string, startNodeIds: Set<string>): string {
  if (startNodeIds.has(nodeId)) {
    return '[*]';
  }
  return nodeId;
}

export function toStateDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['stateDiagram-v2'];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const childrenByParentId = new Map<string, FlowNode[]>();
  const topLevelNodes: FlowNode[] = [];

  sortNodesByPosition(nodes).forEach((node) => {
    const parentId = getNodeParentId(node);
    if (!parentId) {
      topLevelNodes.push(node);
      return;
    }
    const parentChildren = childrenByParentId.get(parentId) ?? [];
    parentChildren.push(node);
    childrenByParentId.set(parentId, parentChildren);
  });

  const xValues = nodes.map((node) => node.position.x);
  const yValues = nodes.map((node) => node.position.y);
  const xSpan = Math.max(...xValues) - Math.min(...xValues);
  const ySpan = Math.max(...yValues) - Math.min(...yValues);
  lines.push(`    direction ${xSpan > ySpan * 1.2 ? 'LR' : 'TB'}`);

  function emitNodeDeclaration(node: FlowNode, depth: number): void {
    const indent = '  '.repeat(depth);

    if (node.type === 'start') {
      return;
    }

    if (node.type === 'section') {
      const label = String(node.data.label || node.id).trim() || node.id;
      if (label === node.id) {
        lines.push(`${indent}state ${node.id} {`);
      } else {
        lines.push(`${indent}state "${escapeStateLabel(label)}" as ${node.id} {`);
      }

      const children = sortNodesByPosition(childrenByParentId.get(node.id) ?? []);
      children.forEach((child) => emitNodeDeclaration(child, depth + 1));
      lines.push(`${indent}}`);
      return;
    }

    const label = String(node.data.label || node.id).trim() || node.id;
    lines.push(`${indent}state "${escapeStateLabel(label)}" as ${node.id}`);
  }

  topLevelNodes.forEach((node) => emitNodeDeclaration(node, 1));

  const startNodeIds = new Set(
    nodes.filter((node) => node.type === 'start').map((node) => node.id)
  );
  edges.forEach((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) return;

    const sourceToken = toStateNodeToken(edge.source, startNodeIds);
    const targetToken = toStateNodeToken(edge.target, startNodeIds);
    const connector = resolveStateConnector(edge);
    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    const suffix = label ? ` : ${label}` : '';
    lines.push(`    ${sourceToken} ${connector} ${targetToken}${suffix}`);
  });

  return `${lines.join('\n')}\n`;
}
