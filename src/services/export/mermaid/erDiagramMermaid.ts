import type { FlowEdge, FlowNode } from '@/lib/types';
import { normalizeErFields, stringifyErField } from '@/lib/entityFields';
import { DEFAULT_ER_RELATION, isERRelationToken } from '@/lib/relationSemantics';

function sortNodesByPosition(nodes: FlowNode[]): FlowNode[] {
  return [...nodes].sort((left, right) => {
    if (left.position.y !== right.position.y) return left.position.y - right.position.y;
    if (left.position.x !== right.position.x) return left.position.x - right.position.x;
    return left.id.localeCompare(right.id);
  });
}

function resolveERRelation(edge: FlowEdge): { relation: string; label?: string } {
  const edgeData = edge.data as { erRelation?: string; erRelationLabel?: string } | undefined;
  const dataRelation = edgeData?.erRelation?.trim();
  const fallbackRelation =
    typeof edge.label === 'string' && isERRelationToken(edge.label.trim())
      ? edge.label.trim()
      : undefined;
  const relation =
    dataRelation && isERRelationToken(dataRelation)
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

export function toERDiagramMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['erDiagram'];
  sortNodesByPosition(nodes).forEach((node) => {
    lines.push(`    ${node.id} {`);
    const fields = normalizeErFields(node.data.erFields)
      .map((entry) => stringifyErField(entry).trim())
      .filter(Boolean);
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
