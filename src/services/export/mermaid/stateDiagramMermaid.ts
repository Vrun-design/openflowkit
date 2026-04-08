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

function quoteIfNeeded(value: string): string {
  return /[\s()[\]{}]/.test(value) ? `"${escapeStateLabel(value)}"` : value;
}

function isStateDiagramNodeType(type: string | undefined): boolean {
  return (
    type === 'state' ||
    type === 'start' ||
    type === 'process' ||
    type === 'section' ||
    type === 'annotation'
  );
}

export function looksLikeStateDiagram(nodes: FlowNode[]): boolean {
  if (nodes.length === 0) return false;
  const hasStateStartNode = nodes.some((node) => node.id.startsWith('state_start_'));
  const hasExplicitStateNode = nodes.some((node) => node.type === 'state');

  if (!hasStateStartNode && !hasExplicitStateNode) {
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

function resolveStateDiagramDirection(
  nodes: FlowNode[],
  direction?: string
): 'TB' | 'LR' {
  if (direction === 'LR' || direction === 'TB') {
    return direction;
  }

  const xValues = nodes.map((node) => node.position.x);
  const yValues = nodes.map((node) => node.position.y);
  const xSpan = Math.max(...xValues) - Math.min(...xValues);
  const ySpan = Math.max(...yValues) - Math.min(...yValues);
  return xSpan > ySpan * 1.2 ? 'LR' : 'TB';
}

export function toStateDiagramMermaid(
  nodes: FlowNode[],
  edges: FlowEdge[],
  direction?: string
): string {
  const lines: string[] = ['stateDiagram-v2'];
  const nodeById = new Map(nodes.map((node) => [node.id, node]));
  const noteNodes = sortNodesByPosition(
    nodes.filter(
      (node) => node.type === 'annotation' && typeof node.data.stateNoteTarget === 'string'
    )
  );
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

  lines.push(`    direction ${resolveStateDiagramDirection(nodes, direction)}`);

  function emitNodeDeclaration(node: FlowNode, depth: number): void {
    const indent = '  '.repeat(depth);
    const children = sortNodesByPosition(childrenByParentId.get(node.id) ?? []);

    if (node.type === 'start') {
      return;
    }

    const label = String(node.data.label || node.id).trim() || node.id;
    if (node.data.stateControlKind === 'fork' || node.data.stateControlKind === 'join') {
      lines.push(`${indent}state ${node.id} <<${node.data.stateControlKind}>>`);
      return;
    }
    if (children.length === 0) {
      lines.push(`${indent}state "${escapeStateLabel(label)}" as ${node.id}`);
      return;
    }

    if (label !== node.id) {
      lines.push(`${indent}state "${escapeStateLabel(label)}" as ${node.id} {`);
    } else {
      lines.push(`${indent}state ${node.id} {`);
    }
    children.forEach((childNode) => emitNodeDeclaration(childNode, depth + 1));
    edges.forEach((edge) => {
      const sourceNode = nodeById.get(edge.source);
      const targetNode = nodeById.get(edge.target);
      if (!sourceNode && !targetNode) return;

      const sourceParentId = sourceNode ? getNodeParentId(sourceNode) : '';
      const targetParentId = targetNode ? getNodeParentId(targetNode) : '';
      const shouldEmitInsideParent =
        (sourceParentId === node.id &&
          (targetParentId === node.id || edge.target.startsWith('state_start_'))) ||
        (targetParentId === node.id && edge.source.startsWith('state_start_'));

      if (!shouldEmitInsideParent) {
        return;
      }

      const sourceToken = toStateNodeToken(edge.source, startNodeIds);
      const targetToken = toStateNodeToken(edge.target, startNodeIds);
      const connector = resolveStateConnector(edge);
      const edgeLabel = typeof edge.label === 'string' ? edge.label.trim() : '';
      const suffix = edgeLabel ? ` : ${edgeLabel}` : '';
      lines.push(`${'  '.repeat(depth + 1)}${sourceToken} ${connector} ${targetToken}${suffix}`);
    });
    lines.push(`${indent}}`);
  }

  const startNodeIds = new Set(
    nodes.filter((node) => node.type === 'start').map((node) => node.id)
  );
  topLevelNodes.forEach((node) => emitNodeDeclaration(node, 1));
  edges.forEach((edge) => {
    const sourceNode = nodeById.get(edge.source);
    const targetNode = nodeById.get(edge.target);
    if (!sourceNode || !targetNode) return;

    if (
      getNodeParentId(sourceNode) &&
      getNodeParentId(sourceNode) === getNodeParentId(targetNode)
    ) {
      return;
    }

    const sourceToken = toStateNodeToken(edge.source, startNodeIds);
    const targetToken = toStateNodeToken(edge.target, startNodeIds);
    const connector = resolveStateConnector(edge);
    const label = typeof edge.label === 'string' ? edge.label.trim() : '';
    const suffix = label ? ` : ${label}` : '';
    lines.push(`    ${sourceToken} ${connector} ${targetToken}${suffix}`);
  });

  noteNodes.forEach((node) => {
    const position = String(node.data.stateNotePosition || 'right').trim();
    const target = String(node.data.stateNoteTarget || '').trim();
    const label = String(node.data.label || '').trim();
    if (!target || !label) return;

    lines.push(`    note ${position} of ${quoteIfNeeded(target)}: ${escapeStateLabel(label)}`);
  });

  return `${lines.join('\n')}\n`;
}
