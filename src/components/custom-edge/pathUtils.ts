import { getBezierPath, getSmoothStepPath, getStraightPath, Position } from '@/lib/reactflowCompat';
import { isEdgeInteractionLowDetailModeActive } from './edgeRenderMode';
import { measureDevPerformance } from '@/lib/devPerformance';
import {
    applyAnchorClearance,
    buildMindmapRootBranchPath,
    buildMindmapTopicBranchPath,
    buildRoundedPolylinePath,
    enforceMinimumEndpointLead,
    getElkLabelPosition,
    getLoopDirection,
    getOffsetVector,
    getPathMidpoint,
    getSelfLoopPath,
    withBundledLabelOffset,
} from './pathUtilsGeometry';
import {
    getEndpointFanoutOffset,
    getEndpointSiblingCount,
    getNodeById,
    getParallelEdgeOffset,
    getShapeAwareElkAnchorClearance,
} from './pathUtilsSiblingRouting';
import type {
    EdgePathOptions,
    EdgePathParams,
    EdgePathResult,
    EdgeVariant,
    MinimalEdge,
    MinimalNode,
} from './pathUtilsTypes';

const EDGE_ROUTING_FAST_PATH_THRESHOLD = 600;

export function buildEdgePath(
    params: EdgePathParams,
    allEdges: MinimalEdge[],
    allNodes: MinimalNode[],
    variant: EdgeVariant,
    options: EdgePathOptions = {}
): EdgePathResult {
    return measureDevPerformance('buildEdgePath', () => {
        const interactionLowDetailModeActive = isEdgeInteractionLowDetailModeActive();
        const graphRoutingFastPathActive = interactionLowDetailModeActive || allEdges.length >= EDGE_ROUTING_FAST_PATH_THRESHOLD;
        const pairOffset = graphRoutingFastPathActive
            ? 0
            : getParallelEdgeOffset(params.id, params.source, params.target, allEdges);
        const sourceSiblingCount = graphRoutingFastPathActive
            ? 0
            : getEndpointSiblingCount(allEdges, allNodes, {
                nodeId: params.source,
                handleId: params.sourceHandleId,
                direction: 'source',
            });
        const sourceFanoutOffset = graphRoutingFastPathActive
            ? 0
            : getEndpointFanoutOffset(params.id, allEdges, allNodes, {
                nodeId: params.source,
                handleId: params.sourceHandleId,
                direction: 'source',
            });
        const targetFanoutOffset = graphRoutingFastPathActive
            ? 0
            : getEndpointFanoutOffset(params.id, allEdges, allNodes, {
                nodeId: params.target,
                handleId: params.targetHandleId,
                direction: 'target',
            });
        const labelBundleOffset = pairOffset + (sourceFanoutOffset + targetFanoutOffset) / 2;

        if (params.source === params.target) {
            const sourceNode = getNodeById(allNodes, params.source);
            const loop = getSelfLoopPath(
                params.sourceX,
                params.sourceY,
                sourceNode?.width ?? 180,
                sourceNode?.height ?? 60,
                getLoopDirection(params.sourcePosition)
            );
            return withBundledLabelOffset(
                loop.path,
                loop.labelX,
                loop.labelY,
                params,
                labelBundleOffset
            );
        }

        const shouldUseElkRoute =
            options.routingMode !== 'manual'
            && options.elkPoints
            && options.elkPoints.length > 0;

        if (shouldUseElkRoute) {
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
            const pathStr = buildRoundedPolylinePath(allPoints, 20);
            const { x: labelX, y: labelY } = getElkLabelPosition(adjustedSource.x, adjustedSource.y, points);

            return withBundledLabelOffset(pathStr, labelX, labelY, params, labelBundleOffset);
        }

        const isMindmapBranch = Boolean(options.mindmapBranchKind) && variant === 'bezier' && !options.forceOrthogonal;
        const isMindmapRootBranch = options.mindmapBranchKind === 'root' && isMindmapBranch;
        const shouldUseSharedSourceTrunk =
            !isMindmapBranch
            && (variant === 'smoothstep' || variant === 'step' || options.forceOrthogonal)
            && sourceSiblingCount >= 3
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
                buildRoundedPolylinePath(pathPoints, 20),
                midpoint.x,
                midpoint.y,
                params,
                labelBundleOffset
            );
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
