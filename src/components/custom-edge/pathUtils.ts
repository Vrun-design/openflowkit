import { getBezierPath, getSmoothStepPath, getStraightPath, Position } from '@/lib/reactflowCompat';
import { ROLLOUT_FLAGS } from '@/config/rolloutFlags';
import { isEdgeInteractionLowDetailModeActive } from './edgeRenderMode';
import { measureDevPerformance } from '@/lib/devPerformance';

interface MinimalEdge {
    id: string;
    source: string;
    target: string;
    sourceHandle?: string | null;
    targetHandle?: string | null;
}

interface MinimalNode {
    id: string;
    position?: { x: number; y: number };
    positionAbsolute?: { x: number; y: number };
    width?: number;
    height?: number;
    data?: {
        shape?: string;
    };
}

interface EdgePathParams {
    id: string;
    source: string;
    target: string;
    sourceX: number;
    sourceY: number;
    targetX: number;
    targetY: number;
    sourcePosition: Position;
    targetPosition: Position;
    sourceHandleId?: string | null;
    targetHandleId?: string | null;
}

type EdgeVariant = 'bezier' | 'smoothstep' | 'step' | 'straight';
type LoopDirection = 'right' | 'top' | 'left' | 'bottom';

interface EdgePathOptions {
    forceOrthogonal?: boolean;
    elkPoints?: { x: number; y: number }[];
    mindmapBranchKind?: 'root' | 'branch';
    routingMode?: 'auto' | 'elk' | 'manual';
    waypoints?: { x: number; y: number }[];
    waypoint?: {
        x: number;
        y: number;
    };
}

interface SelfLoopResult {
    path: string;
    labelX: number;
    labelY: number;
}

interface EdgePathResult {
    edgePath: string;
    labelX: number;
    labelY: number;
}

const POLYLINE_EPSILON = 0.5;
const NODE_LOOKUP_CACHE = new WeakMap<MinimalNode[], Map<string, MinimalNode>>();
const PARALLEL_EDGE_GROUP_CACHE = new WeakMap<MinimalEdge[], Map<string, MinimalEdge[]>>();
const ENDPOINT_SIBLING_CACHE = new WeakMap<MinimalEdge[], WeakMap<MinimalNode[], Map<string, MinimalEdge[]>>>();

function getNodeLookup(allNodes: MinimalNode[]): Map<string, MinimalNode> {
    let lookup = NODE_LOOKUP_CACHE.get(allNodes);
    if (!lookup) {
        lookup = new Map(allNodes.map((node) => [node.id, node]));
        NODE_LOOKUP_CACHE.set(allNodes, lookup);
    }
    return lookup;
}

function getParallelEdgeGroups(allEdges: MinimalEdge[]): Map<string, MinimalEdge[]> {
    let groups = PARALLEL_EDGE_GROUP_CACHE.get(allEdges);
    if (!groups) {
        groups = new Map<string, MinimalEdge[]>();
        for (const edge of allEdges) {
            const key = edge.source < edge.target
                ? `${edge.source}|${edge.target}`
                : `${edge.target}|${edge.source}`;
            const bucket = groups.get(key);
            if (bucket) {
                bucket.push(edge);
            } else {
                groups.set(key, [edge]);
            }
        }
        PARALLEL_EDGE_GROUP_CACHE.set(allEdges, groups);
    }
    return groups;
}

function getEndpointSiblingBuckets(allEdges: MinimalEdge[], allNodes: MinimalNode[]): Map<string, MinimalEdge[]> {
    let nodesCache = ENDPOINT_SIBLING_CACHE.get(allEdges);
    if (!nodesCache) {
        nodesCache = new WeakMap<MinimalNode[], Map<string, MinimalEdge[]>>();
        ENDPOINT_SIBLING_CACHE.set(allEdges, nodesCache);
    }

    let buckets = nodesCache.get(allNodes);
    if (!buckets) {
        const nodeLookup = getNodeLookup(allNodes);
        buckets = new Map<string, MinimalEdge[]>();
        const ensureBucket = (key: string): MinimalEdge[] => {
            const existing = buckets?.get(key);
            if (existing) return existing;
            const next: MinimalEdge[] = [];
            buckets?.set(key, next);
            return next;
        };

        for (const edge of allEdges) {
            ensureBucket(`source|${edge.source}|${edge.sourceHandle ?? ''}`).push(edge);
            ensureBucket(`target|${edge.target}|${edge.targetHandle ?? ''}`).push(edge);
        }

        for (const [key, siblings] of buckets.entries()) {
            const [, , handleId] = key.split('|');
            const direction = key.startsWith('source|') ? 'source' : 'target';
            siblings.sort((a, b) => {
                const remoteA = getRemoteNodeAxisValueFromLookup(nodeLookup, a, direction, handleId || null);
                const remoteB = getRemoteNodeAxisValueFromLookup(nodeLookup, b, direction, handleId || null);
                if (remoteA !== remoteB) {
                    return remoteA - remoteB;
                }

                return a.id.localeCompare(b.id);
            });
        }

        nodesCache.set(allNodes, buckets);
    }

    return buckets;
}

function getShapeAwareElkAnchorClearance(shape?: string): number {
    switch (shape) {
        case 'diamond':
            return 12;
        case 'circle':
        case 'ellipse':
        case 'capsule':
            return 8;
        case 'hexagon':
        case 'parallelogram':
        case 'cylinder':
            return 6;
        default:
            return 0;
    }
}

function isNearlySamePoint(a: { x: number; y: number }, b: { x: number; y: number }): boolean {
    return Math.abs(a.x - b.x) <= POLYLINE_EPSILON && Math.abs(a.y - b.y) <= POLYLINE_EPSILON;
}

function normalizePolylinePoints(points: { x: number; y: number }[]): { x: number; y: number }[] {
    const deduped: { x: number; y: number }[] = [];

    for (const point of points) {
        if (deduped.length === 0 || !isNearlySamePoint(deduped[deduped.length - 1], point)) {
            deduped.push(point);
        }
    }

    if (deduped.length <= 2) {
        return deduped;
    }

    const normalized: { x: number; y: number }[] = [deduped[0]];
    for (let index = 1; index < deduped.length - 1; index += 1) {
        const previous = normalized[normalized.length - 1];
        const current = deduped[index];
        const next = deduped[index + 1];
        const sameX =
            Math.abs(previous.x - current.x) <= POLYLINE_EPSILON
            && Math.abs(current.x - next.x) <= POLYLINE_EPSILON;
        const sameY =
            Math.abs(previous.y - current.y) <= POLYLINE_EPSILON
            && Math.abs(current.y - next.y) <= POLYLINE_EPSILON;

        if (!sameX && !sameY) {
            normalized.push(current);
        }
    }
    normalized.push(deduped[deduped.length - 1]);

    return normalized;
}

function applyAnchorClearance(
    point: { x: number; y: number },
    position: Position,
    clearance: number
): { x: number; y: number } {
    if (clearance <= 0) {
        return point;
    }

    switch (position) {
        case Position.Top:
            return { x: point.x, y: point.y - clearance };
        case Position.Bottom:
            return { x: point.x, y: point.y + clearance };
        case Position.Left:
            return { x: point.x - clearance, y: point.y };
        case Position.Right:
            return { x: point.x + clearance, y: point.y };
        default:
            return point;
    }
}

function getNodeById(allNodes: MinimalNode[], nodeId: string): MinimalNode | undefined {
    return getNodeLookup(allNodes).get(nodeId);
}

function getElkLabelPosition(
    sourceX: number,
    sourceY: number,
    points: { x: number; y: number }[]
): { x: number; y: number } {
    if (points.length === 0) {
        return { x: sourceX, y: sourceY };
    }

    if (points.length === 1) {
        return points[0];
    }

    const middleIndex = Math.floor(points.length / 2);
    if (points.length % 2 === 0) {
        const firstPoint = points[middleIndex - 1];
        const secondPoint = points[middleIndex];
        return {
            x: (firstPoint.x + secondPoint.x) / 2,
            y: (firstPoint.y + secondPoint.y) / 2,
        };
    }

    return points[middleIndex];
}

function withBundledLabelOffset(
    edgePath: string,
    labelX: number,
    labelY: number,
    params: Pick<EdgePathParams, 'sourcePosition' | 'targetPosition'>,
    bundleOffset: number
): EdgePathResult {
    const nudgedLabel = nudgeLabelByBundleOffset({ x: labelX, y: labelY }, params, bundleOffset);
    return { edgePath, labelX: nudgedLabel.x, labelY: nudgedLabel.y };
}

function getPathMidpoint(points: { x: number; y: number }[]): { x: number; y: number } {
    if (points.length <= 1) {
        return points[0] ?? { x: 0, y: 0 };
    }

    const segmentLengths = [];
    let totalLength = 0;
    for (let index = 0; index < points.length - 1; index += 1) {
        const start = points[index];
        const end = points[index + 1];
        const length = Math.hypot(end.x - start.x, end.y - start.y);
        segmentLengths.push(length);
        totalLength += length;
    }

    let remaining = totalLength / 2;
    for (let index = 0; index < segmentLengths.length; index += 1) {
        const length = segmentLengths[index];
        if (remaining <= length && length > 0) {
            const start = points[index];
            const end = points[index + 1];
            const ratio = remaining / length;
            return {
                x: start.x + (end.x - start.x) * ratio,
                y: start.y + (end.y - start.y) * ratio,
            };
        }
        remaining -= length;
    }

    return points[Math.floor(points.length / 2)];
}

function getAdaptiveFanoutSpacing(siblingCount: number): number {
    if (siblingCount <= 1) return 0;
    if (ROLLOUT_FLAGS.connectorModelV1) {
        return Math.min(18, 10 + Math.max(0, siblingCount - 2) * 1.5);
    }
    return Math.min(22, 12 + Math.max(0, siblingCount - 2) * 2);
}

function getParallelEdgeOffset(edgeId: string, source: string, target: string, allEdges: MinimalEdge[]): number {
    const key = source < target ? `${source}|${target}` : `${target}|${source}`;
    const siblings = getParallelEdgeGroups(allEdges).get(key) ?? [];
    if (siblings.length <= 1) return 0;

    const index = siblings.findIndex((edge) => edge.id === edgeId);
    const spacing = 25;
    return (index - (siblings.length - 1) / 2) * spacing;
}

function getEndpointFanoutOffset(
    edgeId: string,
    allEdges: MinimalEdge[],
    allNodes: MinimalNode[],
    endpoint: { nodeId: string; handleId?: string | null; direction: 'source' | 'target' }
): number {
    const siblings = getEndpointSiblings(allEdges, allNodes, endpoint);

    if (siblings.length <= 1) return 0;

    const index = siblings.findIndex((edge) => edge.id === edgeId);
    if (index === -1) return 0;

    const spacing = getAdaptiveFanoutSpacing(siblings.length);
    return (index - (siblings.length - 1) / 2) * spacing;
}

function getEndpointSiblingCount(
    allEdges: MinimalEdge[],
    allNodes: MinimalNode[],
    endpoint: { nodeId: string; handleId?: string | null; direction: 'source' | 'target' }
): number {
    return getEndpointSiblings(allEdges, allNodes, endpoint).length;
}

function getEndpointSiblings(
    allEdges: MinimalEdge[],
    allNodes: MinimalNode[],
    endpoint: { nodeId: string; handleId?: string | null; direction: 'source' | 'target' }
): MinimalEdge[] {
    return getEndpointSiblingBuckets(allEdges, allNodes).get(
        `${endpoint.direction}|${endpoint.nodeId}|${endpoint.handleId ?? ''}`
    ) ?? [];
}

function getRemoteNodeAxisValueFromLookup(
    nodeLookup: Map<string, MinimalNode>,
    edge: MinimalEdge,
    direction: 'source' | 'target',
    handleId: string | null
): number {
    const remoteNodeId = direction === 'source' ? edge.target : edge.source;
    const remoteNode = nodeLookup.get(remoteNodeId);
    if (!remoteNode) {
        return Number.POSITIVE_INFINITY;
    }

    const position = remoteNode.positionAbsolute ?? remoteNode.position ?? { x: 0, y: 0 };
    const width = remoteNode.width ?? 0;
    const height = remoteNode.height ?? 0;
    const usesVerticalAxis = handleId === 'left' || handleId === 'right';

    return usesVerticalAxis ? position.y + height / 2 : position.x + width / 2;
}

function getSelfLoopPath(
    sourceX: number,
    sourceY: number,
    nodeWidth = 180,
    nodeHeight = 60,
    loopDirection: LoopDirection = 'right'
): SelfLoopResult {
    const size = Math.max(nodeWidth, nodeHeight) * 0.5;
    const offset = size * 0.8;

    switch (loopDirection) {
        case 'top':
            return {
                path: `M ${sourceX - 15} ${sourceY} C ${sourceX - offset} ${sourceY - size * 1.5}, ${sourceX + offset} ${sourceY - size * 1.5}, ${sourceX + 15} ${sourceY}`,
                labelX: sourceX,
                labelY: sourceY - size * 1.2,
            };
        case 'left':
            return {
                path: `M ${sourceX} ${sourceY - 15} C ${sourceX - size * 1.5} ${sourceY - offset}, ${sourceX - size * 1.5} ${sourceY + offset}, ${sourceX} ${sourceY + 15}`,
                labelX: sourceX - size * 1.2,
                labelY: sourceY,
            };
        case 'bottom':
            return {
                path: `M ${sourceX - 15} ${sourceY} C ${sourceX - offset} ${sourceY + size * 1.5}, ${sourceX + offset} ${sourceY + size * 1.5}, ${sourceX + 15} ${sourceY}`,
                labelX: sourceX,
                labelY: sourceY + size * 1.2,
            };
        case 'right':
        default:
            return {
                path: `M ${sourceX} ${sourceY - 15} C ${sourceX + size * 1.5} ${sourceY - offset}, ${sourceX + size * 1.5} ${sourceY + offset}, ${sourceX} ${sourceY + 15}`,
                labelX: sourceX + size * 1.2,
                labelY: sourceY,
            };
    }
}

function getOffsetVector(position: Position, offset: number): { x: number; y: number } {
    switch (position) {
        case Position.Top:
        case Position.Bottom:
            return { x: offset, y: 0 };
        case Position.Left:
        case Position.Right:
            return { x: 0, y: offset };
        default:
            return { x: 0, y: 0 };
    }
}

function getLoopDirection(position: Position): LoopDirection {
    switch (position) {
        case Position.Top:
            return 'top';
        case Position.Left:
            return 'left';
        case Position.Bottom:
            return 'bottom';
        case Position.Right:
        default:
            return 'right';
    }
}

function nudgeLabelByBundleOffset(
    label: { x: number; y: number },
    params: Pick<EdgePathParams, 'sourcePosition' | 'targetPosition'>,
    bundleOffset: number
): { x: number; y: number } {
    if (bundleOffset === 0) return label;

    const labelNudge = bundleOffset * 0.7;
    const usesVerticalSpread =
        params.sourcePosition === Position.Left
        || params.sourcePosition === Position.Right
        || params.targetPosition === Position.Left
        || params.targetPosition === Position.Right;

    return usesVerticalSpread
        ? { x: label.x, y: label.y + labelNudge }
        : { x: label.x + labelNudge, y: label.y };
}

function buildMindmapRootBranchPath(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): EdgePathResult {
    const direction = targetX >= sourceX ? 1 : -1;
    const horizontalDistance = Math.abs(targetX - sourceX);
    const trunkLength = Math.min(96, Math.max(56, horizontalDistance * 0.18));
    const sourceControlX = sourceX + direction * trunkLength * 0.5;
    const bundleX = sourceX + direction * trunkLength;
    const targetControlX = targetX - direction * Math.min(100, Math.max(60, horizontalDistance * 0.24));
    const edgePath = [
        `M ${sourceX} ${sourceY}`,
        `C ${sourceControlX} ${sourceY}, ${bundleX} ${sourceY}, ${bundleX} ${sourceY}`,
        `C ${bundleX + direction * 28} ${sourceY}, ${targetControlX} ${targetY}, ${targetX} ${targetY}`,
    ].join(' ');

    return {
        edgePath,
        labelX: (bundleX + targetX) / 2,
        labelY: (sourceY + targetY) / 2,
    };
}

function buildMindmapTopicBranchPath(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number
): EdgePathResult {
    const direction = targetX >= sourceX ? 1 : -1;
    const horizontalDistance = Math.abs(targetX - sourceX);
    const trunkLength = Math.min(68, Math.max(34, horizontalDistance * 0.16));
    const sourceControlX = sourceX + direction * trunkLength * 0.55;
    const bundleX = sourceX + direction * trunkLength;
    const targetControlX = targetX - direction * Math.min(72, Math.max(42, horizontalDistance * 0.2));
    const edgePath = [
        `M ${sourceX} ${sourceY}`,
        `C ${sourceControlX} ${sourceY}, ${bundleX} ${sourceY}, ${bundleX} ${sourceY}`,
        `C ${bundleX + direction * 18} ${sourceY}, ${targetControlX} ${targetY}, ${targetX} ${targetY}`,
    ].join(' ');

    return {
        edgePath,
        labelX: (bundleX + targetX) / 2,
        labelY: (sourceY + targetY) / 2,
    };
}

/**
 * Builds an SVG path string from a polyline with rounded corners.
 * Uses quadratic Bézier curves at each interior bend point.
 */
function buildRoundedPolylinePath(points: { x: number; y: number }[], cornerRadius: number): string {
    if (points.length === 0) return '';
    if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
    if (points.length === 2) return `M ${points[0].x} ${points[0].y} L ${points[1].x} ${points[1].y}`;

    let path = `M ${points[0].x} ${points[0].y}`;

    for (let i = 1; i < points.length - 1; i++) {
        const prev = points[i - 1];
        const curr = points[i];
        const next = points[i + 1];

        const toPrev = Math.hypot(curr.x - prev.x, curr.y - prev.y);
        const toNext = Math.hypot(next.x - curr.x, next.y - curr.y);

        // Clamp the radius so it never exceeds half the shorter segment
        const r = Math.min(cornerRadius, toPrev / 2, toNext / 2);

        if (r < 1) {
            // Segments too short to round — just line through
            path += ` L ${curr.x} ${curr.y}`;
            continue;
        }

        // Entry control point: r units back from curr along prev→curr
        const entryX = curr.x + ((prev.x - curr.x) / toPrev) * r;
        const entryY = curr.y + ((prev.y - curr.y) / toPrev) * r;

        // Exit control point: r units forward from curr along curr→next
        const exitX = curr.x + ((next.x - curr.x) / toNext) * r;
        const exitY = curr.y + ((next.y - curr.y) / toNext) * r;

        path += ` L ${entryX} ${entryY} Q ${curr.x} ${curr.y} ${exitX} ${exitY}`;
    }

    const last = points[points.length - 1];
    path += ` L ${last.x} ${last.y}`;

    return path;
}

function enforceMinimumEndpointLead(
    points: { x: number; y: number }[],
    sourcePosition: Position,
    targetPosition: Position,
    minimumLead = 12
): { x: number; y: number }[] {
    if (points.length < 3) {
        return points;
    }

    const nextPoints = points.map((point) => ({ ...point }));

    const shiftSourceLead = (): void => {
        const source = nextPoints[0];
        const first = nextPoints[1];

        if (sourcePosition === Position.Left || sourcePosition === Position.Right) {
            if (Math.abs(first.y - source.y) > 0.5) return;
            const delta = Math.abs(first.x - source.x);
            if (delta >= minimumLead) return;
            const desiredX = source.x + (sourcePosition === Position.Right ? minimumLead : -minimumLead);
            const sharedX = first.x;
            for (let index = 1; index < nextPoints.length; index += 1) {
                if (Math.abs(nextPoints[index].x - sharedX) > 0.5) break;
                nextPoints[index].x = desiredX;
            }
            return;
        }

        if (Math.abs(first.x - source.x) > 0.5) return;
        const delta = Math.abs(first.y - source.y);
        if (delta >= minimumLead) return;
        const desiredY = source.y + (sourcePosition === Position.Bottom ? minimumLead : -minimumLead);
        const sharedY = first.y;
        for (let index = 1; index < nextPoints.length; index += 1) {
            if (Math.abs(nextPoints[index].y - sharedY) > 0.5) break;
            nextPoints[index].y = desiredY;
        }
    };

    const shiftTargetLead = (): void => {
        const target = nextPoints[nextPoints.length - 1];
        const lastInterior = nextPoints[nextPoints.length - 2];

        if (targetPosition === Position.Left || targetPosition === Position.Right) {
            if (Math.abs(lastInterior.y - target.y) > 0.5) return;
            const delta = Math.abs(target.x - lastInterior.x);
            if (delta >= minimumLead) return;
            const desiredX = target.x + (targetPosition === Position.Right ? -minimumLead : minimumLead);
            const sharedX = lastInterior.x;
            for (let index = nextPoints.length - 2; index >= 0; index -= 1) {
                if (Math.abs(nextPoints[index].x - sharedX) > 0.5) break;
                nextPoints[index].x = desiredX;
            }
            return;
        }

        if (Math.abs(lastInterior.x - target.x) > 0.5) return;
        const delta = Math.abs(target.y - lastInterior.y);
        if (delta >= minimumLead) return;
        const desiredY = target.y + (targetPosition === Position.Bottom ? -minimumLead : minimumLead);
        const sharedY = lastInterior.y;
        for (let index = nextPoints.length - 2; index >= 0; index -= 1) {
            if (Math.abs(nextPoints[index].y - sharedY) > 0.5) break;
            nextPoints[index].y = desiredY;
        }
    };

    shiftSourceLead();
    shiftTargetLead();
    return normalizePolylinePoints(nextPoints);
}

function buildElkEndpointBridge(
    anchor: { x: number; y: number },
    routePoint: { x: number; y: number } | undefined,
    position: Position,
    minimumLead = 12,
    direction: 'source' | 'target' = 'source'
): { x: number; y: number }[] {
    if (!routePoint) {
        return [];
    }

    const bridge: { x: number; y: number }[] = [];

    if (position === Position.Left || position === Position.Right) {
        const leadSign = position === Position.Right ? 1 : -1;
        const leadX = anchor.x + leadSign * minimumLead;

        if (direction === 'source') {
            bridge.push({ x: leadX, y: anchor.y });
            bridge.push({ x: leadX, y: routePoint.y });
        } else {
            bridge.push({ x: leadX, y: routePoint.y });
            bridge.push({ x: leadX, y: anchor.y });
        }
    } else {
        const leadSign = position === Position.Bottom ? 1 : -1;
        const leadY = anchor.y + leadSign * minimumLead;

        if (direction === 'source') {
            bridge.push({ x: anchor.x, y: leadY });
            bridge.push({ x: routePoint.x, y: leadY });
        } else {
            bridge.push({ x: routePoint.x, y: leadY });
            bridge.push({ x: anchor.x, y: leadY });
        }
    }

    return normalizePolylinePoints([anchor, ...bridge, routePoint]).slice(1, -1);
}

export function buildEdgePath(
    params: EdgePathParams,
    allEdges: MinimalEdge[],
    allNodes: MinimalNode[],
    variant: EdgeVariant,
    options: EdgePathOptions = {}
): EdgePathResult {
    return measureDevPerformance('buildEdgePath', () => {
        const interactionLowDetailModeActive = isEdgeInteractionLowDetailModeActive();

        if (params.source === params.target) {
            const loop = getSelfLoopPath(
                params.sourceX,
                params.sourceY,
                180,
                60,
                getLoopDirection(params.sourcePosition)
            );
            return { edgePath: loop.path, labelX: loop.labelX, labelY: loop.labelY };
        }

        const shouldUseElkRoute =
            options.routingMode !== 'manual'
            && options.elkPoints
            && options.elkPoints.length > 0;

        if (shouldUseElkRoute && ROLLOUT_FLAGS.connectorModelV1) {
            const points = options.elkPoints;
            const sourceNode = getNodeById(allNodes, params.source);
            const targetNode = getNodeById(allNodes, params.target);
            const adjustedSource = applyAnchorClearance(
                { x: params.sourceX, y: params.sourceY },
                params.sourcePosition,
                getShapeAwareElkAnchorClearance(sourceNode?.data?.shape)
            );
            const adjustedTarget = applyAnchorClearance(
                { x: params.targetX, y: params.targetY },
                params.targetPosition,
                getShapeAwareElkAnchorClearance(targetNode?.data?.shape)
            );
            const allPoints = enforceMinimumEndpointLead(
                [adjustedSource, ...points, adjustedTarget],
                params.sourcePosition,
                params.targetPosition
            );
            const pathStr = buildRoundedPolylinePath(allPoints, 8);
            const { x: labelX, y: labelY } = getElkLabelPosition(adjustedSource.x, adjustedSource.y, points);

            return {
                edgePath: pathStr,
                labelX,
                labelY,
            };
        }

        const pairOffset = interactionLowDetailModeActive
            ? 0
            : getParallelEdgeOffset(params.id, params.source, params.target, allEdges);
        const isMindmapBranch = Boolean(options.mindmapBranchKind) && variant === 'bezier' && !options.forceOrthogonal;
        const isMindmapRootBranch = options.mindmapBranchKind === 'root' && isMindmapBranch;
        const sourceSiblingCount = interactionLowDetailModeActive
            ? 0
            : getEndpointSiblingCount(allEdges, allNodes, {
                nodeId: params.source,
                handleId: params.sourceHandleId,
                direction: 'source',
            });
        const sourceFanoutOffset = interactionLowDetailModeActive
            ? 0
            : getEndpointFanoutOffset(params.id, allEdges, allNodes, {
                nodeId: params.source,
                handleId: params.sourceHandleId,
                direction: 'source',
            });
        const targetFanoutOffset = interactionLowDetailModeActive
            ? 0
            : getEndpointFanoutOffset(params.id, allEdges, allNodes, {
                nodeId: params.target,
                handleId: params.targetHandleId,
                direction: 'target',
            });
        const shouldUseSharedSourceTrunk =
            !isMindmapBranch
            && (variant === 'smoothstep' || variant === 'step' || options.forceOrthogonal)
            && sourceSiblingCount >= (ROLLOUT_FLAGS.connectorModelV1 ? 3 : 4)
            && (
                params.sourcePosition === Position.Left
                || params.sourcePosition === Position.Right
                || params.sourcePosition === Position.Top
                || params.sourcePosition === Position.Bottom
            )
            && (
                params.targetPosition === Position.Left
                || params.targetPosition === Position.Right
                || params.targetPosition === Position.Top
                || params.targetPosition === Position.Bottom
            );
        const sourceOffset = getOffsetVector(
            params.sourcePosition,
            pairOffset + ((isMindmapBranch || shouldUseSharedSourceTrunk) ? 0 : sourceFanoutOffset)
        );
        const targetOffset = getOffsetVector(params.targetPosition, pairOffset + targetFanoutOffset);
        const labelBundleOffset = pairOffset + (sourceFanoutOffset + targetFanoutOffset) / 2;
        const sourceX = params.sourceX + sourceOffset.x;
        const sourceY = params.sourceY + sourceOffset.y;
        const targetX = params.targetX + targetOffset.x;
        const targetY = params.targetY + targetOffset.y;

        const manualWaypoints = options.waypoints && options.waypoints.length > 0
            ? options.waypoints
            : options.waypoint
                ? [options.waypoint]
                : [];

        if (manualWaypoints.length > 0) {
            const pathPoints = [{ x: sourceX, y: sourceY }, ...manualWaypoints, { x: targetX, y: targetY }];
            const midpoint = getPathMidpoint(pathPoints);
            return withBundledLabelOffset(
                buildRoundedPolylinePath(pathPoints, 8),
                midpoint.x,
                midpoint.y,
                params,
                labelBundleOffset
            );
        }

        if (shouldUseElkRoute) {
            const points = options.elkPoints;
            const sourceNode = getNodeById(allNodes, params.source);
            const targetNode = getNodeById(allNodes, params.target);
            const adjustedSource = applyAnchorClearance(
                { x: sourceX, y: sourceY },
                params.sourcePosition,
                getShapeAwareElkAnchorClearance(sourceNode?.data?.shape)
            );
            const adjustedTarget = applyAnchorClearance(
                { x: targetX, y: targetY },
                params.targetPosition,
                getShapeAwareElkAnchorClearance(targetNode?.data?.shape)
            );

            const allPoints = enforceMinimumEndpointLead(
                normalizePolylinePoints([
                    adjustedSource,
                    ...buildElkEndpointBridge(adjustedSource, points[0], params.sourcePosition, 12, 'source'),
                    ...points,
                    ...buildElkEndpointBridge(adjustedTarget, points[points.length - 1], params.targetPosition, 12, 'target'),
                    adjustedTarget,
                ]),
                params.sourcePosition,
                params.targetPosition
            );
            const pathStr = buildRoundedPolylinePath(allPoints, 8);

            const { x: labelX, y: labelY } = getElkLabelPosition(adjustedSource.x, adjustedSource.y, points);
            return withBundledLabelOffset(pathStr, labelX, labelY, params, labelBundleOffset);
        }

        if (variant === 'bezier' && !options.forceOrthogonal) {
            if (isMindmapBranch) {
                return withBundledLabelOffset(
                    ...(() => {
                        const result = isMindmapRootBranch
                            ? buildMindmapRootBranchPath(sourceX, sourceY, targetX, targetY)
                            : buildMindmapTopicBranchPath(sourceX, sourceY, targetX, targetY);
                        return [result.edgePath, result.labelX, result.labelY] as const;
                    })(),
                    params,
                    labelBundleOffset
                );
            }
            const [edgePath, labelX, labelY] = getBezierPath({
                sourceX,
                sourceY,
                sourcePosition: params.sourcePosition,
                targetX,
                targetY,
                targetPosition: params.targetPosition,
                curvature: 0.25,
            });
            return withBundledLabelOffset(edgePath, labelX, labelY, params, labelBundleOffset);
        }

        if (variant === 'step') {
            const [edgePath, labelX, labelY] = getSmoothStepPath({
                sourceX,
                sourceY,
                sourcePosition: params.sourcePosition,
                targetX,
                targetY,
                targetPosition: params.targetPosition,
                borderRadius: 0,
                offset: 20,
            });
            return withBundledLabelOffset(edgePath, labelX, labelY, params, labelBundleOffset);
        }

        if (variant === 'straight') {
            const [edgePath, labelX, labelY] = getStraightPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
            });
            return withBundledLabelOffset(edgePath, labelX, labelY, params, labelBundleOffset);
        }

        if (options.forceOrthogonal) {
            const [edgePath, labelX, labelY] = getSmoothStepPath({
                sourceX,
                sourceY,
                sourcePosition: params.sourcePosition,
                targetX,
                targetY,
                targetPosition: params.targetPosition,
                borderRadius: 0,
                offset: 20,
            });
            return withBundledLabelOffset(edgePath, labelX, labelY, params, labelBundleOffset);
        }

        const [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX,
            sourceY,
            sourcePosition: params.sourcePosition,
            targetX,
            targetY,
            targetPosition: params.targetPosition,
            offset: 20,
        });
        return withBundledLabelOffset(edgePath, labelX, labelY, params, labelBundleOffset);
    });
}
