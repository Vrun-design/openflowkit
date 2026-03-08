import type { ElkExtendedEdge, ElkNode } from 'elkjs/lib/elk.bundled.js';
import { NODE_HEIGHT, NODE_WIDTH } from '@/constants';
import type { FlowEdge, FlowNode } from '@/lib/types';
import { handleIdToSide } from '@/lib/nodeHandles';
import { assignSmartHandlesWithOptions } from './smartEdgeRouting';
import { normalizeLayoutInputsForDeterminism } from './elk-layout/determinism';
import { buildResolvedLayoutConfiguration, getDeterministicSeedOptions, resolveLayoutPresetOptions } from './elk-layout/options';
import type { FlowNodeWithMeasuredDimensions, LayoutAlgorithm, LayoutDirection, LayoutOptions } from './elk-layout/types';

interface ElkLayoutEngine {
    layout: (graph: ElkNode) => Promise<ElkNode>;
}

let elkInstancePromise: Promise<ElkLayoutEngine> | null = null;
const ELK_BOUNDARY_FANOUT_MIN_GROUP_SIZE = 2;

function getElkBoundaryFanoutSpacing(groupSize: number): number {
    return Math.min(28, 16 + Math.max(0, groupSize - ELK_BOUNDARY_FANOUT_MIN_GROUP_SIZE) * 2);
}

function getNodeBoundarySpan(bounds: NodeBounds, side: 'left' | 'right' | 'top' | 'bottom'): number {
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
    if (groupSize <= 1) {
        return preferredSpacing;
    }

    const sideSpan = getNodeBoundarySpan(bounds, side);
    const usableSpan = Math.max(24, sideSpan - 28);
    const maxSpacing = usableSpan / Math.max(1, groupSize - 1);

    return Math.max(8, Math.min(preferredSpacing, maxSpacing));
}

async function getElkInstance(): Promise<ElkLayoutEngine> {
    if (!elkInstancePromise) {
        elkInstancePromise = import('elkjs/lib/elk.bundled.js').then((module) => {
            return new module.default() as unknown as ElkLayoutEngine;
        });
    }
    return elkInstancePromise;
}

function buildElkNode(
    node: FlowNode,
    childrenByParent: Map<string, FlowNode[]>
): ElkNode {
    const children = childrenByParent.get(node.id) || [];

    const nodeWithMeasuredDimensions = node as FlowNodeWithMeasuredDimensions;
    let width = nodeWithMeasuredDimensions.measured?.width ?? node.width ?? nodeWithMeasuredDimensions.data?.width;
    let height = nodeWithMeasuredDimensions.measured?.height ?? node.height ?? nodeWithMeasuredDimensions.data?.height;

    if (!width || !height) {
        const label = node.data?.label || '';
        const estimatedWidth = Math.max(NODE_WIDTH, label.length * 8 + 40);
        const estimatedHeight = Math.max(NODE_HEIGHT, Math.ceil(label.length / 40) * 20 + 60);

        width = width ?? estimatedWidth;
        height = height ?? estimatedHeight;
    }

    return {
        id: node.id,
        width: children.length === 0 ? width : undefined,
        height: children.length === 0 ? height : undefined,
        children: children.map((child) => buildElkNode(child, childrenByParent)),
        layoutOptions: {
            'elk.padding': '[top=40,left=20,bottom=20,right=20]',
        },
    };
}

function buildPositionMap(layoutResult: ElkNode): Map<string, { x: number; y: number; width?: number; height?: number }> {
    const positionMap = new Map<string, { x: number; y: number; width?: number; height?: number }>();

    function traverse(node: ElkNode): void {
        if (node.id !== 'root') {
            positionMap.set(node.id, {
                x: node.x ?? 0,
                y: node.y ?? 0,
                width: node.width,
                height: node.height,
            });
        }
        node.children?.forEach(traverse);
    }

    traverse(layoutResult);
    return positionMap;
}

type NodeBounds = {
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
    const width =
        layoutPosition?.width
        ?? node.width
        ?? (node as FlowNodeWithMeasuredDimensions).measured?.width
        ?? (node as FlowNodeWithMeasuredDimensions).data?.width
        ?? NODE_WIDTH;
    const height =
        layoutPosition?.height
        ?? node.height
        ?? (node as FlowNodeWithMeasuredDimensions).measured?.height
        ?? (node as FlowNodeWithMeasuredDimensions).data?.height
        ?? NODE_HEIGHT;

    return {
        left: x,
        right: x + width,
        top: y,
        bottom: y + height,
        centerX: x + width / 2,
        centerY: y + height / 2,
    };
}

function inferBoundarySide(bounds: NodeBounds, point: { x: number; y: number }): 'left' | 'right' | 'top' | 'bottom' {
    const distances = [
        { side: 'left' as const, value: Math.abs(point.x - bounds.left) },
        { side: 'right' as const, value: Math.abs(point.x - bounds.right) },
        { side: 'top' as const, value: Math.abs(point.y - bounds.top) },
        { side: 'bottom' as const, value: Math.abs(point.y - bounds.bottom) },
    ];

    distances.sort((a, b) => a.value - b.value);
    return distances[0].side;
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
    if (!remoteNode) {
        return Number.POSITIVE_INFINITY;
    }

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
    if (points.length === 0 || offset === 0) {
        return points;
    }

    if (points.length === 1) {
        const onlyPoint = { ...points[0] };
        if (side === 'left' || side === 'right') {
            onlyPoint.y += offset;
        } else {
            onlyPoint.x += offset;
        }
        return [onlyPoint];
    }

    const nextPoints = points.map((point) => ({ ...point }));
    const boundaryIndex = direction === 'source' ? 0 : nextPoints.length - 1;
    const adjacentIndex = direction === 'source' ? 1 : nextPoints.length - 2;

    if (adjacentIndex < 0 || adjacentIndex >= nextPoints.length) {
        return nextPoints;
    }

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

        if (direction === 'source') {
            return [...branchPoints, ...nextPoints.slice(1)];
        }

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

    if (direction === 'source') {
        return [...branchPoints, ...nextPoints.slice(1)];
    }

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
    const groups = new Map<string, Array<{
        edge: FlowEdge;
        nodeId: string;
        side: 'left' | 'right' | 'top' | 'bottom';
        direction: 'source' | 'target';
    }>>();

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
        if (!points || points.length === 0 || !sourceNode || !targetNode) {
            continue;
        }

        const sourceBounds = getNodeBounds(sourceNode, positionMap);
        const targetBounds = getNodeBounds(targetNode, positionMap);
        const sourceSide = handleIdToSide(edge.sourceHandle) ?? inferBoundarySide(sourceBounds, points[0]);
        const targetSide = handleIdToSide(edge.targetHandle) ?? inferBoundarySide(targetBounds, points[points.length - 1]);

        const nonRectangularShapes = ['circle', 'ellipse', 'diamond', 'capsule', 'hexagon', 'cylinder'];
        const isSourceNonRectangular = nonRectangularShapes.includes(sourceNode.data?.shape as string);
        const isTargetNonRectangular = nonRectangularShapes.includes(targetNode.data?.shape as string);

        if (!isSourceNonRectangular) addToGroup(edge, sourceSide, 'source', edge.source);
        if (!isTargetNonRectangular) addToGroup(edge, targetSide, 'target', edge.target);
    }

    for (const group of groups.values()) {
        if (group.length < ELK_BOUNDARY_FANOUT_MIN_GROUP_SIZE) {
            continue;
        }

        const sortedGroup = [...group].sort((entryA, entryB) => {
            const axisA = getRemoteAxisValue(entryA.edge, entryA.direction, entryA.side, nodeMap, positionMap);
            const axisB = getRemoteAxisValue(entryB.edge, entryB.direction, entryB.side, nodeMap, positionMap);
            if (axisA !== axisB) {
                return axisA - axisB;
            }

            return entryA.edge.id.localeCompare(entryB.edge.id);
        });

        const groupNode = nodeMap.get(sortedGroup[0]?.nodeId ?? '');
        if (!groupNode) {
            continue;
        }

        const nodeBounds = getNodeBounds(groupNode, positionMap);
        const spacing = getClampedBoundaryFanoutSpacing(sortedGroup.length, nodeBounds, sortedGroup[0].side);
        sortedGroup.forEach((entry, index) => {
            const offset = (index - (sortedGroup.length - 1) / 2) * spacing;
            if (offset === 0) {
                return;
            }

            const basePoints = normalizedPointsMap.get(entry.edge.id) ?? edgePointsMap.get(entry.edge.id);
            if (!basePoints) {
                return;
            }

            normalizedPointsMap.set(
                entry.edge.id,
                applyBoundaryOffset(basePoints, entry.side, offset, entry.direction)
            );
        });
    }

    return normalizedPointsMap;
}

export type { LayoutAlgorithm, LayoutDirection, LayoutOptions } from './elk-layout/types';
export { buildResolvedLayoutConfiguration, getDeterministicSeedOptions, normalizeLayoutInputsForDeterminism, resolveLayoutPresetOptions };

export function resolveLayoutedEdgeHandles(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
    return assignSmartHandlesWithOptions(nodes, edges, {
        profile: 'standard',
        bundlingEnabled: true,
    });
}

export async function getElkLayout(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: LayoutOptions = {}
): Promise<{ nodes: FlowNode[]; edges: FlowEdge[] }> {
    function collectEdgePoints(
        elkNode: ElkNode | (ElkNode & { edges?: ElkExtendedEdge[]; children?: ElkNode[] }),
        edgePointsMap: Map<string, { x: number; y: number }[]>
    ): void {
        if (elkNode.edges) {
            elkNode.edges.forEach((layeredElkEdge) => {
                if (layeredElkEdge.sections && layeredElkEdge.sections.length > 0) {
                    const section = layeredElkEdge.sections[0];
                    const points = [
                        section.startPoint,
                        ...(section.bendPoints || []),
                        section.endPoint,
                    ].filter(Boolean) as { x: number; y: number }[];
                    edgePointsMap.set(layeredElkEdge.id, points);
                }
            });
        }
        if (elkNode.children) {
            elkNode.children.forEach((childNode) => collectEdgePoints(childNode, edgePointsMap));
        }
    }

    const { layoutOptions } = buildResolvedLayoutConfiguration(options);
    const { topLevelNodes, childrenByParent, sortedEdges } = normalizeLayoutInputsForDeterminism(nodes, edges);

    const elkGraph: ElkNode = {
        id: 'root',
        layoutOptions,
        children: topLevelNodes.map((node) => buildElkNode(node, childrenByParent)),
        edges: sortedEdges.map((edge) => ({
            id: edge.id,
            sources: [edge.source],
            targets: [edge.target],
        })) as ElkExtendedEdge[],
    };

    try {
        const elk = await getElkInstance();
        const layoutResult = await elk.layout(elkGraph);
        const positionMap = buildPositionMap(layoutResult);

        // Collect bend points by traversing the ENTIRE ELK result tree.
        // ELK puts routed edges inside children[].edges, NOT at the root level.
        const edgePointsMap = new Map<string, { x: number; y: number }[]>();
        collectEdgePoints(layoutResult, edgePointsMap);

        const laidOutNodes = nodes.map((node) => {
            const position = positionMap.get(node.id);
            if (!position) return node;

            const style = { ...node.style };
            if (node.type === 'group' || node.type === 'section' || node.type === 'container') {
                if (position.width) style.width = position.width;
                if (position.height) style.height = position.height;
            }

            return {
                ...node,
                position: { x: position.x, y: position.y },
                style,
            };
        });
        const reroutedEdges = resolveLayoutedEdgeHandles(laidOutNodes, sortedEdges);
        const normalizedElkPointsMap = normalizeElkEdgeBoundaryFanout(
            reroutedEdges,
            laidOutNodes,
            positionMap,
            edgePointsMap
        );

        const laidOutEdges = reroutedEdges.map((edge) => {
            const points = normalizedElkPointsMap.get(edge.id) ?? edgePointsMap.get(edge.id);
            if (points) {
                return {
                    ...edge,
                    data: {
                        ...edge.data,
                        routingMode: edge.data?.routingMode === 'manual' ? ('manual' as const) : ('elk' as const),
                        elkPoints: points,
                    },
                };
            }
            return edge;
        });

        return { nodes: laidOutNodes, edges: laidOutEdges };
    } catch (err) {
        console.error('ELK Layout Error:', err);
        return { nodes, edges };
    }
}

export function enforceDirectionalHandles(
    edges: FlowEdge[],
    direction: 'TB' | 'LR' | 'RL' | 'BT'
): FlowEdge[] {
    const isLR = direction === 'LR' || direction === 'RL';
    const sourceHandle = isLR ? 'right' : 'bottom';
    const targetHandle = isLR ? 'left' : 'top';

    return edges.map((edge) => ({
        ...edge,
        sourceHandle: edge.sourceHandle || sourceHandle,
        targetHandle: edge.targetHandle || targetHandle,
    }));
}
