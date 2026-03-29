import type { FlowEdge, FlowNode } from '@/lib/types';
import { handleIdToSide as handleIdToFlowSide } from '@/lib/nodeHandles';
import { sanitizeId, sanitizeLabel } from '../formatting';

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

export function toArchitectureMermaid(nodes: FlowNode[], edges: FlowEdge[]): string {
  const lines: string[] = ['architecture-beta'];

  nodes.forEach((node) => {
    const id = sanitizeId(node.id);
    const label = sanitizeLabel(node.data.label);
    const kind = (node.data.archResourceType || 'service').toLowerCase();
    const parent = node.data.archBoundaryId ? sanitizeId(node.data.archBoundaryId) : '';
    const icon =
      node.data.archProvider && node.data.archProvider !== 'custom'
        ? `(${sanitizeLabel(node.data.archProvider)})`
        : '';
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
    const edgeData = edge.data as
      | {
          archProtocol?: string;
          archPort?: string;
          archDirection?: '-->' | '<--' | '<-->';
          archSourceSide?: 'L' | 'R' | 'T' | 'B';
          archTargetSide?: 'L' | 'R' | 'T' | 'B';
        }
      | undefined;
    const protocol = edgeData?.archProtocol;
    const port = edgeData?.archPort;
    const label = edge.label ? sanitizeLabel(String(edge.label)) : undefined;
    const sourceSide =
      normalizeArchitectureSide(edgeData?.archSourceSide) || handleIdToSide(edge.sourceHandle);
    const targetSide =
      normalizeArchitectureSide(edgeData?.archTargetSide) || handleIdToSide(edge.targetHandle);
    const direction = normalizeArchitectureDirection(
      edgeData?.archDirection ||
        (edge.markerStart && edge.markerEnd ? '<-->' : edge.markerStart ? '<--' : '-->')
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
