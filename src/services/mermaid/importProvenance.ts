import type { EdgeData, FlowEdge, FlowNode, NodeData } from '@/lib/types';

export interface MermaidImportedNodeMetadata {
  role: 'leaf' | 'container';
  source: 'official-flowchart';
  fidelity: 'renderer-backed';
}

export interface MermaidImportedEdgeMetadata {
  source: 'official-flowchart';
  fidelity: 'renderer-backed';
  hasFixedRoute: boolean;
  preferredSourceHandle?: string;
  preferredTargetHandle?: string;
}

const MERMAID_IMPORTED_NODE_KEY = '_mermaidImportedNode';
const MERMAID_IMPORTED_EDGE_KEY = '_mermaidImportedEdge';

export function attachMermaidImportedNodeMetadata(
  node: FlowNode,
  metadata: MermaidImportedNodeMetadata
): FlowNode {
  return {
    ...node,
    data: {
      ...node.data,
      [MERMAID_IMPORTED_NODE_KEY]: metadata,
    },
  };
}

export function attachMermaidImportedEdgeMetadata(
  edge: FlowEdge,
  metadata: MermaidImportedEdgeMetadata
): FlowEdge {
  return {
    ...edge,
    data: {
      ...edge.data,
      [MERMAID_IMPORTED_EDGE_KEY]: metadata,
    },
  };
}

export function readMermaidImportedNodeMetadataFromData(
  data: NodeData | undefined
): MermaidImportedNodeMetadata | null {
  const value = data?.[MERMAID_IMPORTED_NODE_KEY];
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<MermaidImportedNodeMetadata>;
  if (
    (candidate.role !== 'leaf' && candidate.role !== 'container')
    || candidate.source !== 'official-flowchart'
    || candidate.fidelity !== 'renderer-backed'
  ) {
    return null;
  }

  return candidate as MermaidImportedNodeMetadata;
}

export function readMermaidImportedNodeMetadata(
  node: FlowNode
): MermaidImportedNodeMetadata | null {
  return readMermaidImportedNodeMetadataFromData(node.data);
}

export function isMermaidImportedContainerNode(node: FlowNode): boolean {
  const metadata = readMermaidImportedNodeMetadata(node);
  return metadata?.role === 'container';
}

export function readMermaidImportedEdgeMetadata(
  edge: FlowEdge
): MermaidImportedEdgeMetadata | null {
  const value = edge.data?.[MERMAID_IMPORTED_EDGE_KEY];
  if (!value || typeof value !== 'object') {
    return null;
  }

  const candidate = value as Partial<MermaidImportedEdgeMetadata>;
  if (
    candidate.source !== 'official-flowchart'
    || candidate.fidelity !== 'renderer-backed'
    || typeof candidate.hasFixedRoute !== 'boolean'
    || (
      candidate.preferredSourceHandle !== undefined
      && typeof candidate.preferredSourceHandle !== 'string'
    )
    || (
      candidate.preferredTargetHandle !== undefined
      && typeof candidate.preferredTargetHandle !== 'string'
    )
  ) {
    return null;
  }

  return candidate as MermaidImportedEdgeMetadata;
}

export function downgradeMermaidImportedEdgeMetadata(edge: FlowEdge): EdgeData {
  const edgeData = edge.data;
  const nextData = { ...(edgeData ?? {}) };
  const current = nextData[MERMAID_IMPORTED_EDGE_KEY];
  if (!current || typeof current !== 'object') {
    return nextData;
  }

  const candidate = current as Partial<MermaidImportedEdgeMetadata>;
  if (candidate.source !== 'official-flowchart' || candidate.fidelity !== 'renderer-backed') {
    delete nextData[MERMAID_IMPORTED_EDGE_KEY];
    return nextData;
  }

  nextData[MERMAID_IMPORTED_EDGE_KEY] = {
    source: 'official-flowchart',
    fidelity: 'renderer-backed',
    hasFixedRoute: false,
    preferredSourceHandle:
      typeof edge.sourceHandle === 'string' ? edge.sourceHandle : candidate.preferredSourceHandle,
    preferredTargetHandle:
      typeof edge.targetHandle === 'string' ? edge.targetHandle : candidate.preferredTargetHandle,
  } satisfies MermaidImportedEdgeMetadata;
  return nextData;
}

export function clearMermaidImportedEdgeMetadata(edgeData: EdgeData | undefined): EdgeData {
  const nextData = { ...(edgeData ?? {}) };
  delete nextData[MERMAID_IMPORTED_EDGE_KEY];
  return nextData;
}
