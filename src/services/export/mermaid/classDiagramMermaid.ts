import type { FlowEdge, FlowNode } from '@/lib/types';
import { DEFAULT_CLASS_RELATION, isClassRelationToken } from '@/lib/relationSemantics';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

function resolveClassRelation(edge: FlowEdge): { relation: string; label?: string } {
  const edgeData = edge.data as { classRelation?: string; classRelationLabel?: string } | undefined;
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
  if (dataLabel) return { relation, label: dataLabel };

  if (typeof edge.label === 'string') {
    const candidate = edge.label.trim();
    if (candidate && candidate !== relation && !isClassRelationToken(candidate)) {
      return { relation, label: candidate };
    }
  }

  return { relation };
}

export function toClassDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['classDiagram'];
  sortNodesByPosition(nodes).forEach((node) => {
    const id = node.id.trim();
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
    const { relation, label } = resolveClassRelation(edge);
    const suffix = label ? ` : ${label}` : '';
    lines.push(`    ${edge.source} ${relation} ${edge.target}${suffix}`);
  });

  return `${lines.join('\n')}\n`;
}
