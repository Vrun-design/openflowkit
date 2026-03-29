import type { FlowEdge, FlowNode } from '@/lib/types';
import { resolveNodeSize } from '@/components/nodeHelpers';
import { handleIdToSide } from '@/lib/nodeHandles';

const NODE_WIDTH = 120;
const NODE_HEIGHT = 60;
const ELK_BOUNDARY_FANOUT_MIN_GROUP_SIZE = 3;

interface FlowNodeWithMeasuredDimensions extends FlowNode {
  measured?: { width?: number; height?: number };
}

export type NodeBounds = {
  left: number;
  right: number;
  top: number;
  bottom: number;
  centerX: number;
  centerY: number;
};

function getNodeBounds(
  node: FlowNode,
  positionMap: Map<string, { x: number; y: number; width?: number; height?: number }>
): NodeBounds {
  const layoutPosition = positionMap.get(node.id);
  const x = layoutPosition?.x ?? node.position.x ?? 0;
  const y = layoutPosition?.y ?? node.position.y ?? 0;
  const fallbackSize = resolveNodeSize(node);
  const width =
    layoutPosition?.width ??
    (node as FlowNodeWithMeasuredDimensions).measured?.width ??
    fallbackSize.width ??
    NODE_WIDTH;
  const height =
    layoutPosition?.height ??
    (node as FlowNodeWithMeasuredDimensions).measured?.height ??
    fallbackSize.height ??
    NODE_HEIGHT;
  return {
    left: x,
    right: x + width,
    top: y,
    bottom: y + height,
    centerX: x + width / 2,
    centerY: y + height / 2,
  };
}

function inferBoundarySide(
  bounds: NodeBounds,
  point: { x: number; y: number }
): 'left' | 'right' | 'top' | 'bottom' {
  const distances = [
    { side: 'left' as const, value: Math.abs(point.x - bounds.left) },
    { side: 'right' as const, value: Math.abs(point.x - bounds.right) },
    { side: 'top' as const, value: Math.abs(point.y - bounds.top) },
    { side: 'bottom' as const, value: Math.abs(point.y - bounds.bottom) },
  ];
  distances.sort((a, b) => a.value - b.value);
  return distances[0].side;
}

function getElkBoundaryFanoutSpacing(groupSize: number): number {
  return Math.min(28, 16 + Math.max(0, groupSize - ELK_BOUNDARY_FANOUT_MIN_GROUP_SIZE) * 2);
}

function getNodeBoundarySpan(
  bounds: NodeBounds,
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  return side === 'left' || side === 'right'
    ? bounds.bottom - bounds.top
    : bounds.right - bounds.left;
}

function getClampedBoundaryFanoutSpacing(
  groupSize: number,
  bounds: NodeBounds,
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  const preferredSpacing = getElkBoundaryFanoutSpacing(groupSize);
  if (groupSize <= 1) return preferredSpacing;
  const sideSpan = getNodeBoundarySpan(bounds, side);
  const usableSpan = Math.max(24, sideSpan - 28);
  const maxSpacing = usableSpan / Math.max(1, groupSize - 1);
  return Math.max(8, Math.min(preferredSpacing, maxSpacing));
}

function getRemoteAxisValue(
  edge: FlowEdge,
  direction: 'source' | 'target',
  side: 'left' | 'right' | 'top' | 'bottom',
  nodeMap: Map<string, FlowNode>,
  positionMap: Map<string, { x: number; y: number; width?: number; height?: number }>
): number {
  const remoteNodeId = direction === 'source' ? edge.target : edge.source;
  const remoteNode = nodeMap.get(remoteNodeId);
  if (!remoteNode) return Number.POSITIVE_INFINITY;
  const remoteBounds = getNodeBounds(remoteNode, positionMap);
  return side === 'left' || side === 'right' ? remoteBounds.centerY : remoteBounds.centerX;
}

function getBoundaryFanoutJoinDistance(
  boundary: { x: number; y: number },
  adjacent: { x: number; y: number },
  side: 'left' | 'right' | 'top' | 'bottom'
): number {
  const axisDistance =
    side === 'left' || side === 'right'
      ? Math.abs(adjacent.x - boundary.x)
      : Math.abs(adjacent.y - boundary.y);
  return Math.min(24, Math.max(10, axisDistance * 0.4));
}

function applyBoundaryOffset(
  points: { x: number; y: number }[],
  side: 'left' | 'right' | 'top' | 'bottom',
  offset: number,
  direction: 'source' | 'target'
): { x: number; y: number }[] {
  if (points.length === 0 || offset === 0) return points;
  if (points.length === 1) {
    const onlyPoint = { ...points[0] };
    if (side === 'left' || side === 'right') onlyPoint.y += offset;
    else onlyPoint.x += offset;
    return [onlyPoint];
  }
  const nextPoints = points.map((point) => ({ ...point }));
  const boundaryIndex = direction === 'source' ? 0 : nextPoints.length - 1;
  const adjacentIndex = direction === 'source' ? 1 : nextPoints.length - 2;
  if (adjacentIndex < 0 || adjacentIndex >= nextPoints.length) return nextPoints;
  const boundaryPoint = { ...nextPoints[boundaryIndex] };
  const adjacentPoint = { ...nextPoints[adjacentIndex] };
  if (side === 'left' || side === 'right') {
    boundaryPoint.y += offset;
    const joinDistance = getBoundaryFanoutJoinDistance(boundaryPoint, adjacentPoint, side);
    const joinX = boundaryPoint.x + (side === 'right' ? joinDistance : -joinDistance);
    const branchPoints = [
      boundaryPoint,
      { x: joinX, y: boundaryPoint.y },
      { x: joinX, y: adjacentPoint.y },
    ];
    if (direction === 'source') return [...branchPoints, ...nextPoints.slice(1)];
    return [...nextPoints.slice(0, nextPoints.length - 1), ...branchPoints.reverse()];
  }
  boundaryPoint.x += offset;
  const joinDistance = getBoundaryFanoutJoinDistance(boundaryPoint, adjacentPoint, side);
  const joinY = boundaryPoint.y + (side === 'bottom' ? joinDistance : -joinDistance);
  const branchPoints = [
    boundaryPoint,
    { x: boundaryPoint.x, y: joinY },
    { x: adjacentPoint.x, y: joinY },
  ];
  if (direction === 'source') return [...branchPoints, ...nextPoints.slice(1)];
  return [...nextPoints.slice(0, nextPoints.length - 1), ...branchPoints.reverse()];
}

export function normalizeElkEdgeBoundaryFanout(
  edges: FlowEdge[],
  nodes: FlowNode[],
  positionMap: Map<string, { x: number; y: number; width?: number; height?: number }>,
  edgePointsMap: Map<string, { x: number; y: number }[]>
): Map<string, { x: number; y: number }[]> {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  const normalizedPointsMap = new Map<string, { x: number; y: number }[]>();
  const groups = new Map<
    string,
    Array<{
      edge: FlowEdge;
      nodeId: string;
      side: 'left' | 'right' | 'top' | 'bottom';
      direction: 'source' | 'target';
    }>
  >();

  const addToGroup = (
    edge: FlowEdge,
    side: 'left' | 'right' | 'top' | 'bottom',
    direction: 'source' | 'target',
    nodeId: string
  ): void => {
    const key = `${direction}:${nodeId}:${side}`;
    const group = groups.get(key) ?? [];
    group.push({ edge, nodeId, side, direction });
    groups.set(key, group);
  };

  for (const edge of edges) {
    const points = edgePointsMap.get(edge.id);
    const sourceNode = nodeMap.get(edge.source);
    const targetNode = nodeMap.get(edge.target);
    if (!points || points.length === 0 || !sourceNode || !targetNode) continue;
    const sourceBounds = getNodeBounds(sourceNode, positionMap);
    const targetBounds = getNodeBounds(targetNode, positionMap);
    const sourceSide =
      handleIdToSide(edge.sourceHandle) ?? inferBoundarySide(sourceBounds, points[0]);
    const targetSide =
      handleIdToSide(edge.targetHandle) ??
      inferBoundarySide(targetBounds, points[points.length - 1]);
    const nonRectangularShapes = ['circle', 'ellipse', 'diamond', 'capsule', 'hexagon', 'cylinder'];
    const isSourceNonRectangular = nonRectangularShapes.includes(sourceNode.data?.shape as string);
    const isTargetNonRectangular = nonRectangularShapes.includes(targetNode.data?.shape as string);
    if (!isSourceNonRectangular) addToGroup(edge, sourceSide, 'source', edge.source);
    if (!isTargetNonRectangular) addToGroup(edge, targetSide, 'target', edge.target);
  }

  for (const group of groups.values()) {
    if (group.length < ELK_BOUNDARY_FANOUT_MIN_GROUP_SIZE) continue;
    const sortedGroup = [...group].sort((entryA, entryB) => {
      const axisA = getRemoteAxisValue(
        entryA.edge,
        entryA.direction,
        entryA.side,
        nodeMap,
        positionMap
      );
      const axisB = getRemoteAxisValue(
        entryB.edge,
        entryB.direction,
        entryB.side,
        nodeMap,
        positionMap
      );
      if (axisA !== axisB) return axisA - axisB;
      return entryA.edge.id.localeCompare(entryB.edge.id);
    });
    const groupNode = nodeMap.get(sortedGroup[0]?.nodeId ?? '');
    if (!groupNode) continue;
    const nodeBounds = getNodeBounds(groupNode, positionMap);
    const spacing = getClampedBoundaryFanoutSpacing(
      sortedGroup.length,
      nodeBounds,
      sortedGroup[0].side
    );
    sortedGroup.forEach((entry, index) => {
      const offset = (index - (sortedGroup.length - 1) / 2) * spacing;
      if (offset === 0) return;
      const basePoints = normalizedPointsMap.get(entry.edge.id) ?? edgePointsMap.get(entry.edge.id);
      if (!basePoints) return;
      normalizedPointsMap.set(
        entry.edge.id,
        applyBoundaryOffset(basePoints, entry.side, offset, entry.direction)
      );
    });
  }

  return normalizedPointsMap;
}
