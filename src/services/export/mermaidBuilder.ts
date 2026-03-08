import type { FlowEdge, FlowNode } from '@/lib/types';
import { getNodeParentId } from '@/lib/nodeParent';
import {
  DEFAULT_CLASS_RELATION,
  DEFAULT_ER_RELATION,
  isClassRelationToken,
  isERRelationToken,
} from '@/lib/relationSemantics';
import { handleIdToSide as handleIdToFlowSide } from '@/lib/nodeHandles';
import { sanitizeId, sanitizeLabel } from './formatting';

function normalizeArchitectureDirection(direction: string | undefined): '-->' | '<--' | '<-->' {
  if (direction === '<--' || direction === '<-->') return direction;
  return '-->';
}

function normalizeArchitectureSide(side: string | undefined): 'L' | 'R' | 'T' | 'B' | undefined {
  if (!side) return undefined;
  const normalized = side.trim().toUpperCase();
  if (normalized === 'L' || normalized === 'R' || normalized === 'T' || normalized === 'B') {
    return normalized;
  }
  return undefined;
}

function handleIdToSide(handleId: string | null | undefined): 'L' | 'R' | 'T' | 'B' | undefined {
  const side = handleIdToFlowSide(handleId);
  if (side === 'left') return 'L';
  if (side === 'right') return 'R';
  if (side === 'top') return 'T';
  if (side === 'bottom') return 'B';
  return undefined;
}

function toArchitectureMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['architecture-beta'];

  nodes.forEach((node) => {
    const id = sanitizeId(node.id);
    const label = sanitizeLabel(node.data.label);
    const kind = (node.data.archResourceType || 'service').toLowerCase();
    const parent = node.data.archBoundaryId ? sanitizeId(node.data.archBoundaryId) : '';
    const icon = node.data.archProvider && node.data.archProvider !== 'custom' ? `(${sanitizeLabel(node.data.archProvider)})` : '';
    const suffix = parent ? ` in ${parent}` : '';

    if (kind === 'group') {
      lines.push(`    group ${id}[${label}]`);
      return;
    }

    if (kind === 'junction') {
      lines.push(`    junction ${id}${icon}[${label}]${suffix}`);
      return;
    }

    lines.push(`    service ${id}${icon}[${label}]${suffix}`);
  });

  edges.forEach((edge) => {
    const source = sanitizeId(edge.source);
    const target = sanitizeId(edge.target);
    const edgeData = edge.data as {
      archProtocol?: string;
      archPort?: string;
      archDirection?: '-->' | '<--' | '<-->';
      archSourceSide?: 'L' | 'R' | 'T' | 'B';
      archTargetSide?: 'L' | 'R' | 'T' | 'B';
    } | undefined;
    const protocol = edgeData?.archProtocol;
    const port = edgeData?.archPort;
    const label = edge.label ? sanitizeLabel(String(edge.label)) : undefined;
    const sourceSide = normalizeArchitectureSide(edgeData?.archSourceSide) || handleIdToSide(edge.sourceHandle);
    const targetSide = normalizeArchitectureSide(edgeData?.archTargetSide) || handleIdToSide(edge.targetHandle);
    const direction = normalizeArchitectureDirection(
      edgeData?.archDirection
      || (edge.markerStart && edge.markerEnd ? '<-->' : edge.markerStart ? '<--' : '-->')
    );

    const resolvedLabel = protocol
      ? `${sanitizeLabel(protocol).toUpperCase()}${port ? `:${sanitizeLabel(String(port))}` : ''}`
      : label;
    const sourceToken = sourceSide ? `${source}:${sourceSide}` : source;
    const targetToken = targetSide ? `${targetSide}:${target}` : target;

    if (resolvedLabel) {
      lines.push(`    ${sourceToken} ${direction} ${targetToken} : ${resolvedLabel}`);
    } else {
      lines.push(`    ${sourceToken} ${direction} ${targetToken}`);
    }
  });

  return `${lines.join('\n')}\n`;
}

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

function toMindmapMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
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
      if (leftNode.position.y !== rightNode.position.y) return leftNode.position.y - rightNode.position.y;
      if (leftNode.position.x !== rightNode.position.x) return leftNode.position.x - rightNode.position.x;
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
    const explicitDepth = typeof node.data.mindmapDepth === 'number' ? Math.max(0, Math.floor(node.data.mindmapDepth)) : null;
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

function toJourneyMermaid(nodes: FlowNode[]): string {
  const lines: string[] = ['journey', '    title Journey'];
  const sectionMap = new Map<string, FlowNode[]>();

  sortNodesByPosition(nodes).forEach((node) => {
    const section = String(node.data.journeySection || 'General').trim() || 'General';
    const sectionNodes = sectionMap.get(section) ?? [];
    sectionNodes.push(node);
    sectionMap.set(section, sectionNodes);
  });

  sectionMap.forEach((sectionNodes) => {
    sectionNodes.sort((left, right) => {
      if (left.position.y !== right.position.y) return left.position.y - right.position.y;
      if (left.position.x !== right.position.x) return left.position.x - right.position.x;
      return left.id.localeCompare(right.id);
    });
  });

  const orderedSections = Array.from(sectionMap.keys()).sort((left, right) => {
    const leftMinX = Math.min(...(sectionMap.get(left) ?? []).map((node) => node.position.x));
    const rightMinX = Math.min(...(sectionMap.get(right) ?? []).map((node) => node.position.x));
    if (leftMinX !== rightMinX) return leftMinX - rightMinX;
    return left.localeCompare(right);
  });

  orderedSections.forEach((section) => {
    lines.push(`    section ${section}`);
    const sectionNodes = sectionMap.get(section) ?? [];
    sectionNodes.forEach((node) => {
      const task = String(node.data.journeyTask || node.data.label || node.id).trim() || node.id;
      const actor = String(node.data.journeyActor || node.data.subLabel || '').trim();
      const scoreValue = node.data.journeyScore;
      const hasScore = typeof scoreValue === 'number' && Number.isFinite(scoreValue) && scoreValue >= 0 && scoreValue <= 5;
      if (hasScore && actor) {
        lines.push(`      ${task}: ${Math.round(scoreValue)}: ${actor}`);
        return;
      }
      if (hasScore) {
        lines.push(`      ${task}: ${Math.round(scoreValue)}`);
        return;
      }
      lines.push(`      ${task}`);
    });
  });

  return `${lines.join('\n')}\n`;
}

function resolveClassRelation(edge: FlowEdge): { relation: string; label?: string } {
  const edgeData = edge.data as { classRelation?: string; classRelationLabel?: string } | undefined;
  const dataRelation = edgeData?.classRelation?.trim();
  const fallbackRelation = typeof edge.label === 'string' && isClassRelationToken(edge.label.trim())
    ? edge.label.trim()
    : undefined;
  const relation = (dataRelation && isClassRelationToken(dataRelation))
    ? dataRelation
    : (fallbackRelation ?? DEFAULT_CLASS_RELATION);

  const dataLabel = edgeData?.classRelationLabel?.trim();
  if (dataLabel) return { relation, label: dataLabel };

  if (typeof edge.label === 'string') {
    const candidate = edge.label.trim();
    if (candidate && candidate !== relation && !isClassRelationToken(candidate)) {
      return { relation, label: candidate };
    }
  }

  return { relation };
}

function toClassDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['classDiagram'];
  sortNodesByPosition(nodes).forEach((node) => {
    const id = node.id.trim();
    const stereotype = typeof node.data.classStereotype === 'string' ? node.data.classStereotype.trim() : '';
    const attributes = Array.isArray(node.data.classAttributes) ? node.data.classAttributes.map((entry) => String(entry).trim()).filter(Boolean) : [];
    const methods = Array.isArray(node.data.classMethods) ? node.data.classMethods.map((entry) => String(entry).trim()).filter(Boolean) : [];
    if (!stereotype && attributes.length === 0 && methods.length === 0) {
      lines.push(`    class ${id}`);
      return;
    }

    lines.push(`    class ${id} {`);
    if (stereotype) lines.push(`      <<${stereotype}>>`);
    attributes.forEach((attribute) => lines.push(`      ${attribute}`));
    methods.forEach((method) => lines.push(`      ${method}`));
    lines.push('    }');
  });

  edges.forEach((edge) => {
    const { relation, label } = resolveClassRelation(edge);
    const suffix = label ? ` : ${label}` : '';
    lines.push(`    ${edge.source} ${relation} ${edge.target}${suffix}`);
  });

  return `${lines.join('\n')}\n`;
}

function resolveERRelation(edge: FlowEdge): { relation: string; label?: string } {
  const edgeData = edge.data as { erRelation?: string; erRelationLabel?: string } | undefined;
  const dataRelation = edgeData?.erRelation?.trim();
  const fallbackRelation = typeof edge.label === 'string' && isERRelationToken(edge.label.trim())
    ? edge.label.trim()
    : undefined;
  const relation = (dataRelation && isERRelationToken(dataRelation))
    ? dataRelation
    : (fallbackRelation ?? DEFAULT_ER_RELATION);

  const dataLabel = edgeData?.erRelationLabel?.trim();
  if (dataLabel) return { relation, label: dataLabel };

  if (typeof edge.label === 'string') {
    const candidate = edge.label.trim();
    if (candidate && candidate !== relation && !isERRelationToken(candidate)) {
      return { relation, label: candidate };
    }
  }

  return { relation };
}

function toERDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['erDiagram'];
  sortNodesByPosition(nodes).forEach((node) => {
    lines.push(`    ${node.id} {`);
    const fields = Array.isArray(node.data.erFields) ? node.data.erFields.map((entry) => String(entry).trim()).filter(Boolean) : [];
    fields.forEach((field) => lines.push(`      ${field}`));
    lines.push('    }');
  });

  edges.forEach((edge) => {
    const { relation, label } = resolveERRelation(edge);
    const suffix = label ? ` : ${label}` : '';
    lines.push(`    ${edge.source} ${relation} ${edge.target}${suffix}`);
  });

  return `${lines.join('\n')}\n`;
}

function escapeStateLabel(label: string): string {
  return label.replace(/"/g, '\\"');
}

function isStateDiagramNodeType(type: string | undefined): boolean {
  return type === 'state' || type === 'start' || type === 'section' || type === 'process';
}

function looksLikeStateDiagram(nodes: FlowNode[]): boolean {
  if (nodes.length === 0) return false;
  const hasStateStartNode = nodes.some((node) => node.id.startsWith('state_start_'));
  const hasExplicitStateNode = nodes.some((node) => node.type === 'state');
  const sectionIds = new Set(nodes.filter((node) => node.type === 'section').map((node) => node.id));
  const hasCompositeParenting = nodes.some((node) => {
    const parentId = getNodeParentId(node);
    return parentId.length > 0 && sectionIds.has(parentId);
  });

  if (!hasStateStartNode && !hasExplicitStateNode && !hasCompositeParenting) {
    return false;
  }

  return nodes.every((node) => isStateDiagramNodeType(node.type));
}

function resolveStateConnector(edge: FlowEdge): string {
  const hasStart = hasMarker(edge.markerStart);
  const hasEnd = hasMarker(edge.markerEnd) || (!hasStart && !edge.markerEnd);
  const styleWidth = edge.style?.strokeWidth;
  const styleDash = edge.style?.strokeDasharray;

  const isDashed = Boolean(styleDash);
  const numericWidth = typeof styleWidth === 'number'
    ? styleWidth
    : typeof styleWidth === 'string'
      ? Number(styleWidth)
      : undefined;
  const isThick = !isDashed && typeof numericWidth === 'number' && Number.isFinite(numericWidth) && numericWidth >= 4;

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

function toStateDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
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

  const startNodeIds = new Set(nodes.filter((node) => node.type === 'start').map((node) => node.id));
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

function hasMarker(marker: FlowEdge['markerStart'] | FlowEdge['markerEnd']): boolean {
  return Boolean(marker);
}

function resolveFlowchartConnector(edge: FlowEdge): string {
  const dashPattern = edge.data?.dashPattern;
  const isDashedByData = dashPattern === 'dashed' || dashPattern === 'dotted' || dashPattern === 'dashdot';
  const isDashedByStyle = Boolean(edge.style?.strokeDasharray);
  const isDashed = isDashedByData || isDashedByStyle;

  const strokeWidthFromData = typeof edge.data?.strokeWidth === 'number' ? edge.data.strokeWidth : undefined;
  const styleWidth = edge.style?.strokeWidth;
  const strokeWidthFromStyle = typeof styleWidth === 'number'
    ? styleWidth
    : typeof styleWidth === 'string'
      ? Number(styleWidth)
      : undefined;
  const strokeWidth = strokeWidthFromData ?? strokeWidthFromStyle;
  const isThick = !isDashed && typeof strokeWidth === 'number' && Number.isFinite(strokeWidth) && strokeWidth >= 4;

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

  if (looksLikeStateDiagram(nodes)) {
    return toStateDiagramMermaid(nodes, edges);
  }

  let mermaid = 'flowchart TD\n';

  nodes.forEach((node) => {
    const label = sanitizeLabel(node.data.label);
    const id = sanitizeId(node.id);
    let shapeStart = '[';
    let shapeEnd = ']';

    const shape = node.data.shape || 'rounded';
    const type = node.type;

    if (shape === 'diamond') { shapeStart = '{'; shapeEnd = '}'; }
    else if (shape === 'hexagon') { shapeStart = '{{'; shapeEnd = '}}'; }
    else if (shape === 'cylinder') { shapeStart = '[('; shapeEnd = ')]'; }
    else if (shape === 'ellipse') { shapeStart = '(['; shapeEnd = '])'; }
    else if (shape === 'circle') { shapeStart = '(('; shapeEnd = '))'; }
    else if (shape === 'parallelogram') { shapeStart = '>'; shapeEnd = ']'; }
    else if (type === 'decision') { shapeStart = '{'; shapeEnd = '}'; }
    else if (type === 'start' || type === 'end') { shapeStart = '(['; shapeEnd = '])'; }

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
