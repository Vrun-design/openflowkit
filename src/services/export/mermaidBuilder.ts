import type { FlowEdge, FlowNode } from '@/lib/types';
import { sanitizeId, sanitizeLabel } from './formatting';
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

function toFlowchartMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  let mermaid = 'flowchart TD\n';

  nodes.forEach((node) => {
    const label = sanitizeLabel(node.data.label);
    const id = sanitizeId(node.id);
    let shapeStart = '[';
    let shapeEnd = ']';

    const shape = node.data.shape || 'rounded';
    const type = node.type;

    if (shape === 'diamond') {
      shapeStart = '{';
      shapeEnd = '}';
    } else if (shape === 'hexagon') {
      shapeStart = '{{';
      shapeEnd = '}}';
    } else if (shape === 'cylinder') {
      shapeStart = '[(';
      shapeEnd = ')]';
    } else if (shape === 'ellipse') {
      shapeStart = '([';
      shapeEnd = '])';
    } else if (shape === 'circle') {
      shapeStart = '((';
      shapeEnd = '))';
    } else if (shape === 'parallelogram') {
      shapeStart = '>';
      shapeEnd = ']';
    } else if (type === 'decision') {
      shapeStart = '{';
      shapeEnd = '}';
    } else if (type === 'start' || type === 'end') {
      shapeStart = '([';
      shapeEnd = '])';
    }

    mermaid += `    ${id}${shapeStart}"${label}"${shapeEnd}\n`;
  });

  edges.forEach((edge) => {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    const connector = resolveFlowchartConnector(edge);
    if (edge.label) {
      const label = sanitizeLabel(edge.label as string);
      mermaid += `    ${source} ${connector}|"${label}"| ${target}\n`;
    } else {
      mermaid += `    ${source} ${connector} ${target}\n`;
    }
  });

  return mermaid;
}

export function toMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
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
    (node) => node.type === 'sequence_participant' || node.type === 'sequence_note'
  ).length;
  if (nodes.length > 0 && seqNodeCount === nodes.length) {
    return toSequenceMermaid(nodes, edges);
  }

  if (looksLikeStateDiagram(nodes)) {
    return toStateDiagramMermaid(nodes, edges);
  }

  return toFlowchartMermaid(nodes, edges);
}
