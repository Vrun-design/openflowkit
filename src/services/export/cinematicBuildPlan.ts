import type { FlowEdge, FlowNode } from '@/lib/types';

export type CinematicExportKind = 'cinematic-video' | 'cinematic-gif';

export interface CinematicBuildSegment {
  id: string;
  componentIndex: number;
  sourceNodeId: string | null;
  leadEdgeId: string | null;
  targetNodeId: string;
  hasTopologyFallback: boolean;
}

export interface CinematicBuildPlan {
  version: 1;
  orderedNodeIds: string[];
  segments: CinematicBuildSegment[];
  hasTopologyFallback: boolean;
}

type Orientation = 'TB' | 'LR';

function inferOrientation(nodes: FlowNode[]): Orientation {
  if (nodes.length <= 1) {
    return 'TB';
  }

  const xs = nodes.map((node) => node.position.x);
  const ys = nodes.map((node) => node.position.y);
  const width = Math.max(...xs) - Math.min(...xs);
  const height = Math.max(...ys) - Math.min(...ys);
  return width > height ? 'LR' : 'TB';
}

function createNodeComparator(nodes: FlowNode[]): (leftId: string, rightId: string) => number {
  const nodesById = new Map(nodes.map((node) => [node.id, node]));
  const orientation = inferOrientation(nodes);

  return (leftId, rightId) => {
    const left = nodesById.get(leftId);
    const right = nodesById.get(rightId);
    if (!left || !right) {
      return leftId.localeCompare(rightId);
    }

    if (orientation === 'LR') {
      const xDiff = left.position.x - right.position.x;
      if (Math.abs(xDiff) > 10) {
        return xDiff;
      }

      return left.position.y - right.position.y || leftId.localeCompare(rightId);
    }

    const yDiff = left.position.y - right.position.y;
    if (Math.abs(yDiff) > 10) {
      return yDiff;
    }

    return left.position.x - right.position.x || leftId.localeCompare(rightId);
  };
}

interface GraphModel {
  indegree: Map<string, number>;
  outgoingEdgeIdsByNodeId: Map<string, string[]>;
  incomingEdgeIdsByNodeId: Map<string, string[]>;
}

function buildGraphModel(nodes: FlowNode[], edges: FlowEdge[]): GraphModel {
  const nodeIds = new Set(nodes.map((node) => node.id));
  const indegree = new Map<string, number>();
  const outgoingEdgeIdsByNodeId = new Map<string, string[]>();
  const incomingEdgeIdsByNodeId = new Map<string, string[]>();

  nodes.forEach((node) => {
    indegree.set(node.id, 0);
    outgoingEdgeIdsByNodeId.set(node.id, []);
    incomingEdgeIdsByNodeId.set(node.id, []);
  });

  edges.forEach((edge) => {
    if (!nodeIds.has(edge.source) || !nodeIds.has(edge.target) || edge.source === edge.target) {
      return;
    }

    outgoingEdgeIdsByNodeId.get(edge.source)?.push(edge.id);
    incomingEdgeIdsByNodeId.get(edge.target)?.push(edge.id);
    indegree.set(edge.target, (indegree.get(edge.target) ?? 0) + 1);
  });

  return {
    indegree,
    outgoingEdgeIdsByNodeId,
    incomingEdgeIdsByNodeId,
  };
}

function buildOrderedNodeIds(
  nodes: FlowNode[],
  edges: FlowEdge[]
): { orderedNodeIds: string[]; hasTopologyFallback: boolean } {
  const compareNodes = createNodeComparator(nodes);
  const { indegree, outgoingEdgeIdsByNodeId } = buildGraphModel(nodes, edges);
  const edgeById = new Map(edges.map((edge) => [edge.id, edge]));

  const queue = nodes
    .map((node) => node.id)
    .filter((nodeId) => (indegree.get(nodeId) ?? 0) === 0)
    .sort(compareNodes);
  const orderedNodeIds: string[] = [];

  while (queue.length > 0) {
    const nextNodeId = queue.shift()!;
    orderedNodeIds.push(nextNodeId);

    for (const edgeId of outgoingEdgeIdsByNodeId.get(nextNodeId) ?? []) {
      const edge = edgeById.get(edgeId);
      if (!edge) {
        continue;
      }

      const nextIndegree = (indegree.get(edge.target) ?? 1) - 1;
      indegree.set(edge.target, nextIndegree);
      if (nextIndegree === 0) {
        queue.push(edge.target);
        queue.sort(compareNodes);
      }
    }
  }

  if (orderedNodeIds.length === nodes.length) {
    return {
      orderedNodeIds,
      hasTopologyFallback: false,
    };
  }

  return {
    orderedNodeIds: [...nodes.map((node) => node.id)].sort(compareNodes),
    hasTopologyFallback: true,
  };
}

function createComponentOrderMap(
  orderedNodeIds: string[],
  edges: FlowEdge[],
  nodes: FlowNode[]
): Map<string, number> {
  const visible = new Set<string>();
  const componentIndexByNodeId = new Map<string, number>();
  const edgeByTargetId = new Map<string, FlowEdge[]>();

  edges.forEach((edge) => {
    const current = edgeByTargetId.get(edge.target) ?? [];
    current.push(edge);
    edgeByTargetId.set(edge.target, current);
  });

  const sectionByNodeId = new Map<string, string>();
  for (const node of nodes) {
    if (node.parentId && nodes.some((n) => n.id === node.parentId && n.type === 'section')) {
      sectionByNodeId.set(node.id, node.parentId);
    }
  }

  let currentComponentIndex = -1;
  const sectionIndexMap = new Map<string, number>();

  orderedNodeIds.forEach((nodeId) => {
    const sectionId = sectionByNodeId.get(nodeId);
    if (sectionId && sectionIndexMap.has(sectionId)) {
      componentIndexByNodeId.set(nodeId, sectionIndexMap.get(sectionId)!);
      visible.add(nodeId);
      return;
    }

    const incomingEdges = edgeByTargetId.get(nodeId) ?? [];
    const hasVisibleSource = incomingEdges.some(
      (edge) => visible.has(edge.source) && edge.source !== edge.target
    );

    if (!hasVisibleSource) {
      currentComponentIndex += 1;
    }

    componentIndexByNodeId.set(nodeId, currentComponentIndex);
    if (sectionId) {
      sectionIndexMap.set(sectionId, currentComponentIndex);
    }
    visible.add(nodeId);
  });

  return componentIndexByNodeId;
}

function resolveLeadEdgeForNode(
  nodeId: string,
  orderedNodeIds: string[],
  edges: FlowEdge[],
  compareNodes: (leftId: string, rightId: string) => number
): FlowEdge | null {
  const visibleIndexByNodeId = new Map(orderedNodeIds.map((id, index) => [id, index]));
  const candidateEdges = edges.filter((edge) => {
    if (edge.target !== nodeId || edge.source === edge.target) {
      return false;
    }

    const sourceIndex = visibleIndexByNodeId.get(edge.source);
    const targetIndex = visibleIndexByNodeId.get(edge.target);
    return (
      typeof sourceIndex === 'number' &&
      typeof targetIndex === 'number' &&
      sourceIndex < targetIndex
    );
  });

  if (candidateEdges.length === 0) {
    return null;
  }

  candidateEdges.sort((left, right) => {
    const sourceOrder = compareNodes(left.source, right.source);
    if (sourceOrder !== 0) {
      return sourceOrder;
    }

    return left.id.localeCompare(right.id);
  });

  return candidateEdges[0];
}

export function buildCinematicBuildPlan(nodes: FlowNode[], edges: FlowEdge[]): CinematicBuildPlan {
  if (nodes.length === 0) {
    return {
      version: 1,
      orderedNodeIds: [],
      segments: [],
      hasTopologyFallback: false,
    };
  }

  const { orderedNodeIds, hasTopologyFallback } = buildOrderedNodeIds(nodes, edges);
  const compareNodes = createNodeComparator(nodes);
  const componentIndexByNodeId = createComponentOrderMap(orderedNodeIds, edges, nodes);

  const segments = orderedNodeIds.map<CinematicBuildSegment>((targetNodeId) => {
    const leadEdge = resolveLeadEdgeForNode(targetNodeId, orderedNodeIds, edges, compareNodes);

    return {
      id: `segment:${targetNodeId}`,
      componentIndex: componentIndexByNodeId.get(targetNodeId) ?? 0,
      sourceNodeId: leadEdge?.source ?? null,
      leadEdgeId: leadEdge?.id ?? null,
      targetNodeId,
      hasTopologyFallback,
    };
  });

  return {
    version: 1,
    orderedNodeIds,
    segments,
    hasTopologyFallback,
  };
}
