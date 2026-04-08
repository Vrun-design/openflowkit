import type { FlowEdge, FlowNode } from '@/lib/types';
import { sanitizeId, sanitizeLabel, sanitizeEdgeLabel } from './formatting';
import { toArchitectureMermaid } from './mermaid/architectureMermaid';
import { toMindmapMermaid } from './mermaid/mindmapMermaid';
import { toJourneyMermaid } from './mermaid/journeyMermaid';
import { toClassDiagramMermaid } from './mermaid/classDiagramMermaid';
import { toERDiagramMermaid } from './mermaid/erDiagramMermaid';
import { toStateDiagramMermaid, looksLikeStateDiagram } from './mermaid/stateDiagramMermaid';
import { toSequenceMermaid } from './mermaid/sequenceMermaid';

function hasMarker(marker: FlowEdge['markerStart'] | FlowEdge['markerEnd']): boolean {
  return Boolean(marker);
}

function resolveFlowchartConnector(edge: FlowEdge): string {
  const dashPattern = edge.data?.dashPattern;
  const isDashedByData =
    dashPattern === 'dashed' || dashPattern === 'dotted' || dashPattern === 'dashdot';
  const isDashedByStyle = Boolean(edge.style?.strokeDasharray);
  const isDashed = isDashedByData || isDashedByStyle;

  const strokeWidthFromData =
    typeof edge.data?.strokeWidth === 'number' ? edge.data.strokeWidth : undefined;
  const styleWidth = edge.style?.strokeWidth;
  const strokeWidthFromStyle =
    typeof styleWidth === 'number'
      ? styleWidth
      : typeof styleWidth === 'string'
        ? Number(styleWidth)
        : undefined;
  const strokeWidth = strokeWidthFromData ?? strokeWidthFromStyle;
  const isThick =
    !isDashed &&
    typeof strokeWidth === 'number' &&
    Number.isFinite(strokeWidth) &&
    strokeWidth >= 4;

  const hasStart = hasMarker(edge.markerStart);
  const hasEnd = hasMarker(edge.markerEnd) || (!hasStart && !edge.markerEnd);

  let body = '--';
  if (isDashed) body = '-.-';
  if (isThick) body = '==';

  if (hasStart && hasEnd) return `<${body}>`;
  if (hasStart) return `<${body}`;
  if (hasEnd) return `${body}>`;
  return body;
}

function resolveShapeBrackets(
  shape: string | undefined,
  type: string | undefined
): { start: string; end: string } {
  switch (shape) {
    case 'diamond':
      return { start: '{', end: '}' };
    case 'hexagon':
      return { start: '{{', end: '}}' };
    case 'cylinder':
      return { start: '[(', end: ')]' };
    case 'circle':
      return { start: '((', end: '))' };
    case 'ellipse':
      return { start: '([', end: '])' };
    case 'capsule':
      return { start: '([', end: '])' };
    case 'parallelogram':
      return { start: '>', end: ']' };
    case 'rounded':
      return { start: '(', end: ')' };
    default:
      break;
  }

  if (type === 'decision') return { start: '{', end: '}' };
  if (type === 'start' || type === 'end') return { start: '([', end: '])' };

  return { start: '[', end: ']' };
}

function collectSectionTree(nodes: FlowNode[]): {
  roots: FlowNode[];
  childrenByParent: Map<string, FlowNode[]>;
} {
  const childrenByParent = new Map<string, FlowNode[]>();
  const roots: FlowNode[] = [];

  for (const node of nodes) {
    const parentId = node.parentId;
    if (parentId) {
      const children = childrenByParent.get(parentId) ?? [];
      children.push(node);
      childrenByParent.set(parentId, children);
    } else if (node.type !== 'section' && node.type !== 'group') {
      roots.push(node);
    }
  }

  return { roots, childrenByParent };
}

function emitFlowchartNode(node: FlowNode, indent: string): string {
  const label = sanitizeLabel(node.data.label);
  const id = sanitizeId(node.id);
  const { start, end } = resolveShapeBrackets(node.data.shape, node.type);
  return `${indent}${id}${start}"${label}"${end}\n`;
}

function emitFlowchartNodeStyle(node: FlowNode, indent: string): string | null {
  if (node.type === 'section' || node.type === 'group') {
    return null;
  }

  const styleParts: string[] = [];
  const backgroundColor =
    typeof node.style?.backgroundColor === 'string' ? node.style.backgroundColor : undefined;
  const borderColor = typeof node.style?.borderColor === 'string' ? node.style.borderColor : undefined;
  const textColor = typeof node.style?.color === 'string' ? node.style.color : undefined;

  if (backgroundColor) {
    styleParts.push(`fill:${backgroundColor}`);
  }
  if (borderColor) {
    styleParts.push(`stroke:${borderColor}`);
  }
  if (textColor) {
    styleParts.push(`color:${textColor}`);
  }

  if (styleParts.length === 0) {
    return null;
  }

  return `${indent}style ${sanitizeId(node.id)} ${styleParts.join(',')}\n`;
}

function emitFlowchartLinkStyle(edge: FlowEdge, index: number, indent: string): string | null {
  const styleParts: string[] = [];
  const stroke = typeof edge.style?.stroke === 'string' ? edge.style.stroke : undefined;
  const strokeWidth = edge.style?.strokeWidth;
  const normalizedStrokeWidth =
    typeof strokeWidth === 'number'
      ? strokeWidth
      : typeof strokeWidth === 'string'
        ? Number(strokeWidth)
        : undefined;

  if (stroke) {
    styleParts.push(`stroke:${stroke}`);
  }
  if (typeof normalizedStrokeWidth === 'number' && Number.isFinite(normalizedStrokeWidth)) {
    styleParts.push(`stroke-width:${normalizedStrokeWidth}px`);
  }

  if (styleParts.length === 0) {
    return null;
  }

  return `${indent}linkStyle ${index} ${styleParts.join(',')}\n`;
}

function emitSectionBlock(
  section: FlowNode,
  children: FlowNode[],
  childrenByParent: Map<string, FlowNode[]>,
  indent: string
): string {
  const label = sanitizeLabel(section.data.label);
  const id = sanitizeId(section.id);
  const shouldEmitExplicitId = label !== id && !id.startsWith('subgraph_');
  const subgraphHeader = shouldEmitExplicitId
    ? `${id}[${JSON.stringify(label)}]`
    : /[\s()[\]{}]/.test(label)
      ? `"${label}"`
      : label;
  let out = `${indent}subgraph ${subgraphHeader}\n`;

  for (const child of children) {
    if (child.type === 'section' || child.type === 'group') {
      const grandChildren = childrenByParent.get(child.id) ?? [];
      out += emitSectionBlock(child, grandChildren, childrenByParent, indent + '    ');
    } else {
      out += emitFlowchartNode(child, indent + '    ');
    }
  }

  out += `${indent}end\n`;
  return out;
}

function toFlowchartMermaid(nodes: FlowNode[], edges: FlowEdge[], direction?: string): string {
  const dir = direction ?? 'TD';
  let mermaid = `flowchart ${dir}\n`;

  const sectionNodes = nodes.filter((n) => n.type === 'section' || n.type === 'group');
  const hasSubgraphs = sectionNodes.length > 0;

  if (hasSubgraphs) {
    const { roots, childrenByParent } = collectSectionTree(nodes);

    for (const section of sectionNodes) {
      if (!section.parentId) {
        const children = childrenByParent.get(section.id) ?? [];
        mermaid += emitSectionBlock(section, children, childrenByParent, '    ');
      }
    }

    for (const node of roots) {
      mermaid += emitFlowchartNode(node, '    ');
    }
  } else {
    for (const node of nodes) {
      mermaid += emitFlowchartNode(node, '    ');
    }
  }

  edges.forEach((edge) => {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    const connector = resolveFlowchartConnector(edge);
    if (edge.label) {
      const label = sanitizeEdgeLabel(edge.label as string);
      mermaid += `    ${source} ${connector}|"${label}"| ${target}\n`;
    } else {
      mermaid += `    ${source} ${connector} ${target}\n`;
    }
  });

  nodes.forEach((node) => {
    const styleDirective = emitFlowchartNodeStyle(node, '    ');
    if (styleDirective) {
      mermaid += styleDirective;
    }
  });

  edges.forEach((edge, index) => {
    const linkStyleDirective = emitFlowchartLinkStyle(edge, index, '    ');
    if (linkStyleDirective) {
      mermaid += linkStyleDirective;
    }
  });

  return mermaid;
}

export function toMermaid(nodes: FlowNode[], edges: FlowEdge[], direction?: string): string {
  const architectureNodeCount = nodes.filter((node) => node.type === 'architecture').length;
  if (nodes.length > 0 && architectureNodeCount === nodes.length) {
    return toArchitectureMermaid(nodes, edges);
  }

  const mindmapNodeCount = nodes.filter((node) => node.type === 'mindmap').length;
  if (nodes.length > 0 && mindmapNodeCount === nodes.length) {
    return toMindmapMermaid(nodes, edges);
  }

  const journeyNodeCount = nodes.filter((node) => node.type === 'journey').length;
  if (nodes.length > 0 && journeyNodeCount === nodes.length) {
    return toJourneyMermaid(nodes);
  }

  const classNodeCount = nodes.filter((node) => node.type === 'class').length;
  if (nodes.length > 0 && classNodeCount === nodes.length) {
    return toClassDiagramMermaid(nodes, edges);
  }

  const erNodeCount = nodes.filter((node) => node.type === 'er_entity').length;
  if (nodes.length > 0 && erNodeCount === nodes.length) {
    return toERDiagramMermaid(nodes, edges);
  }

  const seqNodeCount = nodes.filter(
    (node) =>
      node.type === 'sequence_participant'
      || node.type === 'sequence_note'
      || Boolean(node.data.seqFragmentId)
  ).length;
  if (nodes.length > 0 && seqNodeCount === nodes.length) {
    return toSequenceMermaid(nodes, edges);
  }

  if (looksLikeStateDiagram(nodes)) {
    return toStateDiagramMermaid(nodes, edges, direction);
  }

  return toFlowchartMermaid(nodes, edges, direction);
}
