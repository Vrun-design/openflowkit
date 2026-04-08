import type { FlowEdge, FlowNode } from '@/lib/types';
import { NODE_WIDTH, NODE_HEIGHT } from '../constants';
import type { ViewSettings } from '@/store/types';
import { getNodeParentId } from '@/lib/nodeParent';
import { getNodeHandleIdForSide, type HandleSide } from '@/lib/nodeHandles';
import { resolveNodeSize } from '@/components/nodeHelpers';

// Walks the parent hierarchy to get the canvas-absolute position of a node.
// Uses node.position (relative) rather than positionAbsolute, which can be
// stale during drag operations before React Flow updates the store.
function getAbsolutePosition(node: FlowNode, nodeMap: Map<string, FlowNode>): { x: number; y: number } {

    let x = node.position.x;
    let y = node.position.y;
    let currentParentId = getNodeParentId(node);

    while (currentParentId) {
        const parent = nodeMap.get(currentParentId);
        if (parent) {
            x += parent.position.x;
            y += parent.position.y;
            currentParentId = getNodeParentId(parent);
        } else {
            break;
        }
    }
    return { x, y };
}

function getNodeDimensions(node: FlowNode): { width: number; height: number } {
    const measured = (node as FlowNode & { measured?: { width?: number; height?: number } }).measured;
    if (measured?.width && measured?.height) {
        return { width: measured.width, height: measured.height };
    }

    const resolved = resolveNodeSize(node);
    if (resolved.width && resolved.height) {
        return resolved;
    }

    // Match ELK's label-based estimation so handle assignment uses the same
    // assumed size that ELK used when computing node positions.
    const label = node.data?.label ?? '';
    const estimatedWidth = Math.max(NODE_WIDTH, label.length * 8 + 40);
    const estimatedHeight = Math.max(NODE_HEIGHT, Math.ceil(label.length / 40) * 20 + 60);
    return { width: estimatedWidth, height: estimatedHeight };
}

type RoutingContext = {
    nodeMap: Map<string, FlowNode>;
    nodeCenterMap: Map<string, { x: number; y: number }>;
};

export interface SmartRoutingOptions {
    profile?: 'standard' | 'infrastructure';
    bundlingEnabled?: boolean;
}

const routingContextCache = new WeakMap<FlowNode[], WeakMap<FlowEdge[], RoutingContext>>();
const ARCH_SIDE_TO_HANDLE_SIDE: Record<string, HandleSide> = {
    L: 'left',
    R: 'right',
    T: 'top',
    B: 'bottom',
};

function getSemanticHandleSide(side: unknown): HandleSide | undefined {
    if (typeof side !== 'string') {
        return undefined;
    }

    return ARCH_SIDE_TO_HANDLE_SIDE[side.toUpperCase()];
}

function preserveEdgeLabelPlacement(originalEdge: FlowEdge, nextEdge: FlowEdge): FlowEdge {
    const originalData = originalEdge.data as {
        labelPosition?: number;
        labelOffsetX?: number;
        labelOffsetY?: number;
    } | undefined;

    if (!originalData) return nextEdge;

    const hasLabelPlacement =
        typeof originalData.labelPosition === 'number'
        || typeof originalData.labelOffsetX === 'number'
        || typeof originalData.labelOffsetY === 'number';
    if (!hasLabelPlacement) return nextEdge;

    return {
        ...nextEdge,
        data: {
            ...(nextEdge.data || {}),
            labelPosition: originalData.labelPosition,
            labelOffsetX: originalData.labelOffsetX,
            labelOffsetY: originalData.labelOffsetY,
        },
    };
}

export function handleSideFromVector(dx: number, dy: number): HandleSide {
    if (Math.abs(dx) >= Math.abs(dy)) return dx >= 0 ? 'right' : 'left';
    return dy >= 0 ? 'bottom' : 'top';
}

function resolveAutoHandleSides(
    dx: number,
    dy: number,
    profile: SmartRoutingOptions['profile']
): { sourceHandleSide: HandleSide; targetHandleSide: HandleSide } {
    // Infrastructure uses a 1.25x bias toward horizontal routing.
    const effectiveDy = profile === 'infrastructure' ? dy * 1.25 : dy;
    const sourceSide = handleSideFromVector(dx, effectiveDy);
    const targetSide = handleSideFromVector(-dx, -effectiveDy);
    return { sourceHandleSide: sourceSide, targetHandleSide: targetSide };
}

function buildRoutingContext(nodes: FlowNode[], _edges: FlowEdge[]): RoutingContext {
    const nodeMap = new Map<string, FlowNode>();
    for (const node of nodes) {
        nodeMap.set(node.id, node);
    }

    const nodeCenterMap = new Map<string, { x: number; y: number }>();
    for (const node of nodes) {
        const { width, height } = getNodeDimensions(node);
        const absolutePosition = getAbsolutePosition(node, nodeMap);
        nodeCenterMap.set(node.id, {
            x: absolutePosition.x + width / 2,
            y: absolutePosition.y + height / 2,
        });
    }

    return { nodeMap, nodeCenterMap };
}

function getRoutingContext(nodes: FlowNode[], edges: FlowEdge[]): RoutingContext {
    let edgeCache = routingContextCache.get(nodes);
    if (!edgeCache) {
        edgeCache = new WeakMap<FlowEdge[], RoutingContext>();
        routingContextCache.set(nodes, edgeCache);
    }

    const cached = edgeCache.get(edges);
    if (cached) {
        return cached;
    }

    const fresh = buildRoutingContext(nodes, edges);
    edgeCache.set(edges, fresh);
    return fresh;
}

export function assignSmartHandles(nodes: FlowNode[], edges: FlowEdge[]): FlowEdge[] {
    return assignSmartHandlesWithOptions(nodes, edges, {
        profile: 'standard',
        bundlingEnabled: false,
    });
}

export function getSmartRoutingOptionsFromViewSettings(viewSettings: ViewSettings): SmartRoutingOptions {
    return {
        profile: viewSettings.smartRoutingProfile,
        bundlingEnabled: viewSettings.smartRoutingBundlingEnabled,
    };
}

export function assignSmartHandlesWithOptions(
    nodes: FlowNode[],
    edges: FlowEdge[],
    options: SmartRoutingOptions
): FlowEdge[] {
    const { nodeMap, nodeCenterMap } = getRoutingContext(nodes, edges);
    const profile = options.profile ?? 'standard';

    return edges.map((edge) => {
        const sourceNode = nodeMap.get(edge.source);
        const targetNode = nodeMap.get(edge.target);

        if (!sourceNode || !targetNode) return edge;

        // Self-loop: handled by CustomEdge already
        if (edge.source === edge.target) return edge;

        const sourceCenter = nodeCenterMap.get(sourceNode.id);
        const targetCenter = nodeCenterMap.get(targetNode.id);
        if (!sourceCenter || !targetCenter) return edge;

        const sx = sourceCenter.x;
        const sy = sourceCenter.y;
        const tx = targetCenter.x;
        const ty = targetCenter.y;

        const dx = tx - sx;
        const dy = ty - sy;

        const sourceFromSemanticSide = getSemanticHandleSide(edge.data?.archSourceSide);
        const targetFromSemanticSide = getSemanticHandleSide(edge.data?.archTargetSide);

        if (sourceFromSemanticSide && targetFromSemanticSide) {
            const semanticSourceHandle = getNodeHandleIdForSide(sourceNode, sourceFromSemanticSide);
            const semanticTargetHandle = getNodeHandleIdForSide(targetNode, targetFromSemanticSide);
            if (edge.sourceHandle === semanticSourceHandle && edge.targetHandle === semanticTargetHandle) {
                return edge;
            }
            const semanticEdge = {
                ...edge,
                sourceHandle: semanticSourceHandle,
                targetHandle: semanticTargetHandle,
            };
            return preserveEdgeLabelPlacement(edge, semanticEdge);
        }

        const { sourceHandleSide, targetHandleSide } = resolveAutoHandleSides(dx, dy, profile);

        const sourceHandle = getNodeHandleIdForSide(sourceNode, sourceHandleSide);
        const targetHandle = getNodeHandleIdForSide(targetNode, targetHandleSide);

        // Optimization: Only create new object if handles changed
        if (edge.sourceHandle === sourceHandle && edge.targetHandle === targetHandle) {
            return edge;
        }

        const nextEdge = {
            ...edge,
            sourceHandle,
            targetHandle,
        };
        return preserveEdgeLabelPlacement(edge, nextEdge);
    });
}
