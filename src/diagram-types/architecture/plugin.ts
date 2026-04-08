import type { FlowEdge, FlowNode } from '@/lib/types';
import type { DiagramPlugin } from '@/diagram-types/core';
import { MarkerType } from '@/lib/reactflowCompat';
import { setNodeParent } from '@/lib/nodeParent';

type ArchNodeKind = 'group' | 'service' | 'junction' | 'person' | 'system' | 'container' | 'component' | 'database_container' | 'router' | 'switch' | 'firewall' | 'load_balancer' | 'cdn' | 'dns';

interface ParsedArchNode {
  id: string;
  kind: ArchNodeKind;
  icon?: string;
  label: string;
  parentId?: string;
}

interface ParsedArchEdge {
  source: string;
  target: string;
  label?: string;
  protocol?: string;
  port?: string;
  direction?: '-->' | '<--' | '<-->';
  sourceSide?: 'L' | 'R' | 'T' | 'B';
  targetSide?: 'L' | 'R' | 'T' | 'B';
}

function buildArchitectureLayerRanks(nodes: ParsedArchNode[]): Map<string, number> {
  const ranks = new Map<string, number>();
  let nextRank = 0;

  for (const node of nodes) {
    if (node.kind === 'group' && !node.parentId && !ranks.has(node.id)) {
      ranks.set(node.id, nextRank++);
    }
  }

  for (const node of nodes) {
    if (node.kind !== 'group' && !node.parentId && !ranks.has(node.id)) {
      ranks.set(node.id, nextRank++);
    }
  }

  return ranks;
}

function resolveArchitectureLayerRank(
  node: ParsedArchNode,
  layerRanks: Map<string, number>
): number | undefined {
  if (layerRanks.has(node.id)) {
    return layerRanks.get(node.id);
  }
  if (node.parentId && layerRanks.has(node.parentId)) {
    return layerRanks.get(node.parentId);
  }
  return undefined;
}

function sideToHandleId(side: ParsedArchEdge['sourceSide']): string | undefined {
  if (side === 'L') return 'left';
  if (side === 'R') return 'right';
  if (side === 'T') return 'top';
  if (side === 'B') return 'bottom';
  return undefined;
}

function normalizeEdgeEndpoint(endpoint: string): string {
  return endpoint
    .trim()
    .replace(/^[LRBT]:/i, '')
    .replace(/:[LRBT]$/i, '');
}

function stripQuotes(value: string): string {
  const trimmed = value.trim();
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"'))
    || (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1).trim();
  }
  return trimmed;
}

const NODE_KEYWORDS = 'group|service|junction|person|system|container|component|database_container|router|switch|firewall|load_balancer|cdn|dns';

function parseNodeLine(line: string): ParsedArchNode | null {
  const pattern = new RegExp(`^(${NODE_KEYWORDS})\\s+([A-Za-z_][\\w.-]*)(?:\\(([^)]+)\\))?(?:\\[(.+?)\\])?(?:\\s+in\\s+([A-Za-z_][\\w.-]*))?$`, 'i');
  const match = line.match(pattern);
  if (!match) return null;

  const kind = match[1].toLowerCase() as ParsedArchNode['kind'];
  const id = match[2];
  const icon = match[3]?.trim().toLowerCase();
  const label = stripQuotes((match[4] || id).trim());
  const parentId = match[5]?.trim();

  return { id, kind, icon, label, parentId };
}

function parseEdgeLine(line: string): ParsedArchEdge | null {
  const directions = ['<-->', '<->', '-->', '<--', '--'];
  const directionToken = directions.find((token) => line.includes(token));
  if (!directionToken) return null;
  const tokenIndex = line.indexOf(directionToken);
  if (tokenIndex <= 0) return null;

  const sourceToken = line.slice(0, tokenIndex).trim();
  const targetAndLabelToken = line.slice(tokenIndex + directionToken.length).trim();

  const parseEndpointOnly = (token: string): { id: string; side?: 'L' | 'R' | 'T' | 'B' } | null => {
    const suffixMatch = token.match(/^([A-Za-z_][\w.-]*):([LRBT])$/i);
    if (suffixMatch) {
      return { id: suffixMatch[1], side: suffixMatch[2].toUpperCase() as 'L' | 'R' | 'T' | 'B' };
    }
    const prefixMatch = token.match(/^([LRBT]):([A-Za-z_][\w.-]*)$/i);
    if (prefixMatch) {
      return { id: prefixMatch[2], side: prefixMatch[1].toUpperCase() as 'L' | 'R' | 'T' | 'B' };
    }
    const plainMatch = token.match(/^([A-Za-z_][\w.-]*)$/);
    if (plainMatch) {
      return { id: plainMatch[1] };
    }
    return null;
  };

  const parseTargetToken = (token: string): { id: string; side?: 'L' | 'R' | 'T' | 'B'; label?: string } | null => {
    const tryBuild = (
      match: RegExpMatchArray | null,
      idIndex: number,
      sideIndex?: number,
      sideIsPrefix = false
    ): { id: string; side?: 'L' | 'R' | 'T' | 'B'; label?: string } | null => {
      if (!match) return null;
      const sideValue = typeof sideIndex === 'number' ? match[sideIndex].toUpperCase() as 'L' | 'R' | 'T' | 'B' : undefined;
      const idValue = match[idIndex];
      const side = sideIsPrefix || sideIndex ? sideValue : undefined;
      const remainder = token.slice(match[0].length).trim();
      if (!remainder) {
        return { id: idValue, side };
      }
      if (!remainder.startsWith(':')) {
        return null;
      }
      const label = remainder.slice(1).trim();
      return label ? { id: idValue, side, label } : { id: idValue, side };
    };

    return (
      tryBuild(token.match(/^([LRBT]):([A-Za-z_][\w.-]*)/i), 2, 1, true)
      || tryBuild(token.match(/^([A-Za-z_][\w.-]*):([LRBT])/i), 1, 2)
      || tryBuild(token.match(/^([A-Za-z_][\w.-]*)/), 1)
    );
  };

  const sourceEndpoint: { id: string; side?: 'L' | 'R' | 'T' | 'B' } | null = parseEndpointOnly(sourceToken) || (() => {
    const normalizedId = normalizeEdgeEndpoint(sourceToken);
    return normalizedId ? { id: normalizedId } : null;
  })();
  const targetEndpoint: { id: string; side?: 'L' | 'R' | 'T' | 'B'; label?: string } | null = parseTargetToken(targetAndLabelToken) || (() => {
    const normalizedId = normalizeEdgeEndpoint(targetAndLabelToken);
    return normalizedId ? { id: normalizedId } : null;
  })();

  if (!sourceEndpoint || !targetEndpoint) return null;

  const direction = directionToken === '<->' ? '<-->' : directionToken === '--' ? '-->' : directionToken;
  return {
    source: sourceEndpoint.id,
    target: targetEndpoint.id,
    label: targetEndpoint.label,
    direction: direction as '-->' | '<--' | '<-->',
    sourceSide: sourceEndpoint.side,
    targetSide: targetEndpoint.side,
  };
}

function parseProtocolPort(label: string | undefined): { label?: string; protocol?: string; port?: string } {
  if (!label) return {};
  const trimmed = label.trim();
  if (!trimmed) return {};

  const protocolPortMatch = trimmed.match(/^([A-Za-z][\w+-]*)(?::(\d{1,5}))?$/);
  if (!protocolPortMatch) {
    return { label: trimmed };
  }

  const protocol = protocolPortMatch[1].toUpperCase();
  const port = protocolPortMatch[2];
  return {
    label: port ? `${protocol}:${port}` : protocol,
    protocol,
    port,
  };
}

function resolveArchKindColor(kind: ArchNodeKind): string {
  const colorMap: Record<string, string> = {
    group: 'violet', junction: 'amber', person: 'blue', system: 'slate',
    container: 'indigo', component: 'teal', database_container: 'cyan',
    router: 'emerald', switch: 'sky', firewall: 'red', load_balancer: 'orange',
    cdn: 'purple', dns: 'lime',
  };
  return colorMap[kind] ?? 'slate';
}

function resolveArchKindIcon(kind: ArchNodeKind): string {
  const iconMap: Record<string, string> = {
    group: 'Layers', junction: 'GitMerge', person: 'User', system: 'Box',
    container: 'Package', component: 'Puzzle', database_container: 'Database',
    router: 'Route', switch: 'Network', firewall: 'Shield', load_balancer: 'Scale',
    cdn: 'Globe', dns: 'Globe2',
  };
  return iconMap[kind] ?? 'Server';
}

function parseArchitecture(input: string): { nodes: FlowNode[]; edges: FlowEdge[]; error?: string; diagnostics?: string[] } {
  const lines = input.replace(/\r\n/g, '\n').split('\n');
  const parsedNodes: ParsedArchNode[] = [];
  const parsedEdges: ParsedArchEdge[] = [];
  const knownNodeIds = new Set<string>();
  const nodeFirstDefinedAt = new Map<string, number>();
  const diagnostics: string[] = [];
  let hasHeader = false;
  let title: string | undefined;

  for (const [index, rawLine] of lines.entries()) {
    const lineNumber = index + 1;
    const line = rawLine.trim();
    if (!line || line.startsWith('%%')) continue;

    if (/^architecture(?:-beta)?\b/i.test(line)) {
      hasHeader = true;
      continue;
    }
    if (!hasHeader) continue;

    const titleMatch = line.match(/^title\s+(.+)$/i);
    if (titleMatch) {
      const nextTitle = stripQuotes(titleMatch[1]);
      if (nextTitle) {
        title = nextTitle;
      }
      continue;
    }

    const node = parseNodeLine(line);
    if (node) {
      if (knownNodeIds.has(node.id)) {
        const firstLine = nodeFirstDefinedAt.get(node.id);
        diagnostics.push(
          `Duplicate architecture node id "${node.id}" at line ${lineNumber}`
          + (typeof firstLine === 'number' ? ` (first defined at line ${firstLine})` : '')
        );
        continue;
      }
      parsedNodes.push(node);
      knownNodeIds.add(node.id);
      nodeFirstDefinedAt.set(node.id, lineNumber);
      continue;
    }

    const edge = parseEdgeLine(line);
    if (edge) {
      parsedEdges.push(edge);
      continue;
    }
    if (/(-->|<--|<->|<-->|--|->)/.test(line)) {
      diagnostics.push(`Invalid architecture edge syntax at line ${lineNumber}: "${line}"`);
      continue;
    }
    if (new RegExp(`^(${NODE_KEYWORDS})\\b`, 'i').test(line)) {
      diagnostics.push(`Invalid architecture node syntax at line ${lineNumber}: "${line}"`);
      continue;
    }
    diagnostics.push(`Unrecognized architecture line at ${lineNumber}: "${line}"`);
  }

  if (!hasHeader) {
    return { nodes: [], edges: [], error: 'Missing architecture header.' };
  }

  if (parsedNodes.length === 0) {
    return { nodes: [], edges: [], error: 'No valid architecture nodes found.' };
  }

  for (const edge of parsedEdges) {
    if (!knownNodeIds.has(edge.source)) {
      parsedNodes.push({ id: edge.source, kind: 'service', label: edge.source });
      knownNodeIds.add(edge.source);
      diagnostics.push(`Recovered implicit service node "${edge.source}" from edge reference.`);
    }
    if (!knownNodeIds.has(edge.target)) {
      parsedNodes.push({ id: edge.target, kind: 'service', label: edge.target });
      knownNodeIds.add(edge.target);
      diagnostics.push(`Recovered implicit service node "${edge.target}" from edge reference.`);
    }
  }

  const nodeIds = new Set(parsedNodes.map((node) => node.id));
  const layerRanks = buildArchitectureLayerRanks(parsedNodes);
  const nodes: FlowNode[] = parsedNodes.map((node, index) => {
    const layerRank = resolveArchitectureLayerRank(node, layerRanks);
    let mappedNode: FlowNode = {
      id: node.id,
      type: 'architecture',
      position: {
        x: (index % 4) * 280,
        y: Math.floor(index / 4) * 170,
      },
      data: {
        label: node.label,
        color: resolveArchKindColor(node.kind),
        shape: node.kind === 'group' ? 'rounded' : 'rectangle',
        icon: resolveArchKindIcon(node.kind),
        archTitle: index === 0 ? title : undefined,
        archProvider: node.icon || (node.kind === 'group' ? 'group' : 'custom'),
        archResourceType: node.kind,
        archBoundaryId: node.parentId,
        archLayerRank: layerRank,
        archLayerLabel: node.parentId || node.id,
      },
    };

    if (
      typeof node.parentId === 'string'
      && node.parentId.length > 0
      && node.parentId !== node.id
      && nodeIds.has(node.parentId)
    ) {
      mappedNode = setNodeParent(mappedNode, node.parentId);
    }

    return mappedNode;
  });

  const edges: FlowEdge[] = parsedEdges.map((edge, index) => {
    const parsedMeta = parseProtocolPort(edge.label);
    const direction = edge.direction || '-->';
    const markerStart = direction === '<--' || direction === '<-->'
      ? { type: MarkerType.ArrowClosed, color: '#94a3b8' as const }
      : undefined;
    const markerEnd = direction === '-->' || direction === '<-->'
      ? { type: MarkerType.ArrowClosed, color: '#94a3b8' as const }
      : undefined;
    return {
      id: `e-arch-${index + 1}`,
      source: edge.source,
      target: edge.target,
      sourceHandle: sideToHandleId(edge.sourceSide),
      targetHandle: sideToHandleId(edge.targetSide),
      label: parsedMeta.label ?? edge.label,
      type: 'smoothstep',
      markerStart,
      markerEnd,
      data: {
        archProtocol: parsedMeta.protocol,
        archPort: parsedMeta.port,
        archDirection: direction,
        archSourceSide: edge.sourceSide,
        archTargetSide: edge.targetSide,
      },
    };
  });

  return diagnostics.length > 0 ? { nodes, edges, diagnostics } : { nodes, edges };
}

export const ARCHITECTURE_PLUGIN: DiagramPlugin = {
  id: 'architecture',
  displayName: 'Architecture',
  parseMermaid: parseArchitecture,
};
