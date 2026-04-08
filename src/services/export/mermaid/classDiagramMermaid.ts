import type { FlowEdge, FlowNode } from '@/lib/types';
import { DEFAULT_CLASS_RELATION, isClassRelationToken } from '@/lib/relationSemantics';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

interface ClassRelationEdgeData {
  classRelation?: string;
  classRelationLabel?: string;
  classRelationSourceCardinality?: string;
  classRelationTargetCardinality?: string;
}

function toMermaidClassIdentifier(value: string): string {
  return value.trim().replace(/<([^<>]+)>/g, '~$1~');
}

function resolveClassRelation(edge: FlowEdge): {
  relation: string;
  label?: string;
  sourceCardinality?: string;
  targetCardinality?: string;
} {
  const edgeData = edge.data as ClassRelationEdgeData | undefined;
  const dataRelation = edgeData?.classRelation?.trim();
  const fallbackRelation =
    typeof edge.label === 'string' && isClassRelationToken(edge.label.trim())
      ? edge.label.trim()
      : undefined;
  const relation =
    dataRelation && isClassRelationToken(dataRelation)
      ? dataRelation
      : (fallbackRelation ?? DEFAULT_CLASS_RELATION);

  const dataLabel = edgeData?.classRelationLabel?.trim();
  const sourceCardinality = edgeData?.classRelationSourceCardinality?.trim();
  const targetCardinality = edgeData?.classRelationTargetCardinality?.trim();
  if (dataLabel) {
    return { relation, label: dataLabel, sourceCardinality, targetCardinality };
  }

  if (typeof edge.label === 'string') {
    const candidate = edge.label.trim();
    if (candidate && candidate !== relation && !isClassRelationToken(candidate)) {
      return { relation, label: candidate, sourceCardinality, targetCardinality };
    }
  }

  return { relation, sourceCardinality, targetCardinality };
}

export function toClassDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['classDiagram'];
  sortNodesByPosition(nodes).forEach((node) => {
    const id = toMermaidClassIdentifier(node.id);
    const stereotype =
      typeof node.data.classStereotype === 'string' ? node.data.classStereotype.trim() : '';
    const attributes = Array.isArray(node.data.classAttributes)
      ? node.data.classAttributes.map((entry) => String(entry).trim()).filter(Boolean)
      : [];
    const methods = Array.isArray(node.data.classMethods)
      ? node.data.classMethods.map((entry) => String(entry).trim()).filter(Boolean)
      : [];
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
    const { relation, label, sourceCardinality, targetCardinality } = resolveClassRelation(edge);
    const sourceCardinalitySegment = sourceCardinality ? ` "${sourceCardinality}"` : '';
    const targetCardinalitySegment = targetCardinality ? ` "${targetCardinality}"` : '';
    const suffix = label ? ` : ${label}` : '';
    lines.push(
      `    ${toMermaidClassIdentifier(edge.source)}${sourceCardinalitySegment} ${relation}${targetCardinalitySegment} ${toMermaidClassIdentifier(edge.target)}${suffix}`
    );
  });

  return `${lines.join('\n')}\n`;
}
