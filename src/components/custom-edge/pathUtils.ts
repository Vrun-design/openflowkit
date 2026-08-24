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
import {
    buildCurvedPath,
    curveFromLegacyVariant,
    isSmoothCurve,
    type EdgeCurve,
} from './edgeCurve';

const EDGE_ROUTING_FAST_PATH_THRESHOLD = 600;

/**
 * Length of straight path reserved at each endpoint, in flow units. Approximates the
 * rendered arrow marker length (marker defs vary: 8–12 units, some scaled by stroke
 * width) so the arrowhead sits on a segment whose direction equals the stroke's.
 */
const ARROW_LEAD_PX = 12;
/** Below this endpoint distance the lead would dominate the edge, so it is skipped. */
const MIN_LENGTH_FOR_ARROW_LEAD = ARROW_LEAD_PX * 4;

function isDecisionLikeShape(shape: string | undefined): boolean {
    return shape === 'diamond';
}

/**
 * Cubic bezier with a straight lead reserved at both endpoints.
 *
 * `getBezierPath` alone whips into the handle normal over the last few pixels, so an
 * `orient="auto"` arrow marker — which reads the exact tangent at the endpoint — ends up
 * pointing somewhere the visible stroke is not, and the stroke pokes out of the
 * arrowhead's side. Reserving a straight run as long as the arrowhead means the stroke
 * stops where the arrowhead begins and both share one direction.
 *
 * The leads are tangent-continuous with the curve because `getBezierPath` already
 * leaves and enters along the same handle normals, so no kink is introduced.
 */
function buildBezierPathWithArrowLeads(
    sourceX: number,
    sourceY: number,
    targetX: number,
    targetY: number,
    sourcePosition: Position,
    targetPosition: Position,
    curvature: number
): { path: string; labelX: number; labelY: number } {
    const lead = Math.hypot(targetX - sourceX, targetY - sourceY) >= MIN_LENGTH_FOR_ARROW_LEAD
        ? ARROW_LEAD_PX
        : 0;
    const curveSource = applyAnchorClearance({ x: sourceX, y: sourceY }, sourcePosition, lead);
    const curveTarget = applyAnchorClearance({ x: targetX, y: targetY }, targetPosition, lead);

    const [bezierPath, labelX, labelY] = getBezierPath({
        sourceX: curveSource.x,
        sourceY: curveSource.y,
        sourcePosition,
        targetX: curveTarget.x,
        targetY: curveTarget.y,
        targetPosition,
        curvature,
    });

    if (lead === 0) {
        return { path: bezierPath, labelX, labelY };
    }

    const curveStart = bezierPath.indexOf('C');
    if (curveStart < 0) {
        // Without a recognizable cubic the lead splice below would leave a path that
        // starts and ends off the real handles, so rebuild without leads instead.
        const [plainPath, plainLabelX, plainLabelY] = getBezierPath({
            sourceX,
            sourceY,
            sourcePosition,
            targetX,
            targetY,
            targetPosition,
            curvature,
        });
        return { path: plainPath, labelX: plainLabelX, labelY: plainLabelY };
    }

    // Keep React Flow's own path style: comma between coordinates, space between commands.
    return {
        path: `M${sourceX},${sourceY} L${curveSource.x},${curveSource.y} `
            + `${bezierPath.slice(curveStart)} L${targetX},${targetY}`,
        labelX,
        labelY,
    };
}

function shouldKeepMermaidBranchSpread(
    preserveMermaidEndpoints: boolean,
    shape: string | undefined
): boolean {
    return preserveMermaidEndpoints && isDecisionLikeShape(shape);
}

function getMermaidPreservedAnchorClearance(
    preserveMermaidEndpoints: boolean,
    isContainer: boolean | undefined,
    shape: string | undefined
): number {
    if (!preserveMermaidEndpoints) {
        return 0;
    }

    const containerClearance = isContainer ? 14 : 0;
    return Math.max(containerClearance, getShapeAwareElkAnchorClearance(shape));
}

export function buildEdgePath(
    params: EdgePathParams,
    allEdges: MinimalEdge[],
    allNodes: MinimalNode[],
    variant: EdgeVariant,
    options: EdgePathOptions = {}
): EdgePathResult {
    return measureDevPerformance('buildEdgePath', () => {
        const sourceNode = getNodeById(allNodes, params.source);
        const targetNode = getNodeById(allNodes, params.target);
        const useMermaidPreservedEndpointRouting = options.mermaidPreservedEndpoints === true;
        const effectiveForceOrthogonal = options.forceOrthogonal || useMermaidPreservedEndpointRouting;
        const keepMermaidSourceBranchSpread =
            shouldKeepMermaidBranchSpread(useMermaidPreservedEndpointRouting, sourceNode?.data?.shape);
        const keepMermaidTargetBranchSpread =
            shouldKeepMermaidBranchSpread(useMermaidPreservedEndpointRouting, targetNode?.data?.shape);
        const sourceMermaidAnchorClearance = getMermaidPreservedAnchorClearance(
            useMermaidPreservedEndpointRouting,
            options.mermaidSourceContainer,
            sourceNode?.data?.shape
        );
        const targetMermaidAnchorClearance = getMermaidPreservedAnchorClearance(
            useMermaidPreservedEndpointRouting,
            options.mermaidTargetContainer,
            targetNode?.data?.shape
        );
        const resolvedCurve: EdgeCurve = options.curve ?? curveFromLegacyVariant(variant);
        const interactionLowDetailModeActive = isEdgeInteractionLowDetailModeActive();
        const graphRoutingFastPathActive = interactionLowDetailModeActive || allEdges.length >= EDGE_ROUTING_FAST_PATH_THRESHOLD;
        const pairOffset = graphRoutingFastPathActive || useMermaidPreservedEndpointRouting
            ? 0
            : getParallelEdgeOffset(params.id, params.source, params.target, allEdges);
        const sourceSiblingCount = graphRoutingFastPathActive || (useMermaidPreservedEndpointRouting && !keepMermaidSourceBranchSpread)
            ? 0
            : getEndpointSiblingCount(allEdges, allNodes, {
                nodeId: params.source,
                handleId: params.sourceHandleId,
                direction: 'source',
            });
        const sourceFanoutOffset = graphRoutingFastPathActive || (useMermaidPreservedEndpointRouting && !keepMermaidSourceBranchSpread)
            ? 0
            : getEndpointFanoutOffset(params.id, allEdges, allNodes, {
                nodeId: params.source,
                handleId: params.sourceHandleId,
                direction: 'source',
            }) * (useMermaidPreservedEndpointRouting ? 0.75 : 1);
        const targetFanoutOffset = graphRoutingFastPathActive || (useMermaidPreservedEndpointRouting && !keepMermaidTargetBranchSpread)
            ? 0
            : getEndpointFanoutOffset(params.id, allEdges, allNodes, {
                nodeId: params.target,
                handleId: params.targetHandleId,
                direction: 'target',
            }) * (useMermaidPreservedEndpointRouting ? 0.75 : 1);
        const labelBundleOffset = pairOffset + (sourceFanoutOffset + targetFanoutOffset) / 2;

        if (params.source === params.target) {
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

        const shouldUseImportedFixedRoute =
            options.routingMode === 'import-fixed'
            && (
                typeof options.importRoutePath === 'string'
                || (options.importRoutePoints?.length ?? 0) > 0
            );

        if (shouldUseImportedFixedRoute) {
            const importRoutePoints = options.importRoutePoints ?? [];
            const importRoutePath = options.importRoutePath;

            // Safety check: if the imported route's first point is more than 150px away from
            // the actual ReactFlow handle position, the coordinates are in a different space
            // (e.g. Mermaid SVG user-units vs ReactFlow canvas coordinates). In that case,
            // skip the fixed route and fall back to smoothstep so edges are never disconnected.
            const IMPORT_ROUTE_COORDINATE_MISMATCH_THRESHOLD = 150;
            const firstPoint = importRoutePoints[0];
            const coordinatesMismatch =
                firstPoint !== undefined &&
                Math.hypot(
                    firstPoint.x - params.sourceX,
                    firstPoint.y - params.sourceY
                ) > IMPORT_ROUTE_COORDINATE_MISMATCH_THRESHOLD;

            if (!coordinatesMismatch) {
                const labelPoint = importRoutePoints.length > 1
                    ? getPathMidpoint(importRoutePoints)
                    : importRoutePoints[0] ?? {
                        x: (params.sourceX + params.targetX) / 2,
                        y: (params.sourceY + params.targetY) / 2,
                    };
                const pathStr = typeof importRoutePath === 'string' && importRoutePath.trim().length > 0
                    ? importRoutePath
                    : buildRoundedPolylinePath(importRoutePoints, 12);

                return withBundledLabelOffset(pathStr, labelPoint.x, labelPoint.y, params, labelBundleOffset);
            }
            // Coordinate mismatch detected — fall through to smoothstep routing below.
        }

        // If the user (or layout) moved a node, the cached ELK corridor no longer
        // matches the current source/target. Following a stale corridor with a
        // smooth curve looks broken — far worse than dropping to a clean cubic
        // bezier from the live endpoints. Threshold is conservative (60px) so
        // small adjustments still benefit from ELK's routing.
        const STALE_ELK_THRESHOLD_PX = 60;
        const elkPointsAreStale = (() => {
            if (!options.elkPoints || options.elkPoints.length === 0) return false;
            const first = options.elkPoints[0];
            const last = options.elkPoints[options.elkPoints.length - 1];
            const sourceDrift = Math.hypot(first.x - params.sourceX, first.y - params.sourceY);
            const targetDrift = Math.hypot(last.x - params.targetX, last.y - params.targetY);
            return sourceDrift > STALE_ELK_THRESHOLD_PX || targetDrift > STALE_ELK_THRESHOLD_PX;
        })();
        const useElkRouteForRender = shouldUseElkRoute
            && !(elkPointsAreStale && isSmoothCurve(resolvedCurve) && !effectiveForceOrthogonal);

        if (useElkRouteForRender) {
            const points = options.elkPoints;
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
            // forceOrthogonal (e.g. mermaid-preserved endpoints, relation semantics)
            // must keep the corridor's right-angles even when the diagram's curve
            // setting is smooth, so only honor smooth curves when not forced.
            const smoothedPath = (!effectiveForceOrthogonal && isSmoothCurve(resolvedCurve))
                ? buildCurvedPath(allPoints, resolvedCurve)
                : null;
            const pathStr = smoothedPath ?? buildRoundedPolylinePath(allPoints, 20);
            const { x: labelX, y: labelY } = getElkLabelPosition(adjustedSource.x, adjustedSource.y, points);

            return withBundledLabelOffset(pathStr, labelX, labelY, params, labelBundleOffset);
        }

        const isMindmapBranch = Boolean(options.mindmapBranchKind) && variant === 'bezier' && !effectiveForceOrthogonal;
        const isMindmapRootBranch = options.mindmapBranchKind === 'root' && isMindmapBranch;
        const shouldUseSharedSourceTrunk =
            !isMindmapBranch
            && (variant === 'smoothstep' || variant === 'step' || effectiveForceOrthogonal)
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
        const sourcePoint = applyAnchorClearance(
            { x: params.sourceX + sourceOffset.x, y: params.sourceY + sourceOffset.y },
            params.sourcePosition,
            sourceMermaidAnchorClearance
        );
        const targetPoint = applyAnchorClearance(
            { x: params.targetX + targetOffset.x, y: params.targetY + targetOffset.y },
            params.targetPosition,
            targetMermaidAnchorClearance
        );
        const sourceX = sourcePoint.x;
        const sourceY = sourcePoint.y;
        const targetX = targetPoint.x;
        const targetY = targetPoint.y;

        const manualWaypoints = options.waypoints && options.waypoints.length > 0
            ? options.waypoints
            : options.waypoint
                ? [options.waypoint]
                : [];

        if (manualWaypoints.length > 0) {
            const pathPoints = [{ x: sourceX, y: sourceY }, ...manualWaypoints, { x: targetX, y: targetY }];
            const midpoint = getPathMidpoint(pathPoints);
            const smoothedManual = (!effectiveForceOrthogonal && isSmoothCurve(resolvedCurve))
                ? buildCurvedPath(pathPoints, resolvedCurve)
                : null;
            return withBundledLabelOffset(
                smoothedManual ?? buildRoundedPolylinePath(pathPoints, 20),
                midpoint.x,
                midpoint.y,
                params,
                labelBundleOffset
            );
        }

        // Curve-driven fallback: when no ELK corridor is available (newly-dragged
        // edges, manual connections without waypoints, fresh nodes), the resolved
        // curve setting decides the visual instead of the legacy `variant` flag.
        // Smooth curves => cubic bezier through endpoints; orthogonal step curves
        // => rounded smoothstep; linear => straight line.
        if (!effectiveForceOrthogonal && isSmoothCurve(resolvedCurve)) {
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
            // For Mermaid-parity we use a slightly looser cubic bezier than the
            // React Flow default; mirrors Mermaid's `curveBasis` softness.
            const { path, labelX, labelY } = buildBezierPathWithArrowLeads(
                sourceX,
                sourceY,
                targetX,
                targetY,
                params.sourcePosition,
                params.targetPosition,
                0.35
            );
            return withBundledLabelOffset(path, labelX, labelY, params, labelBundleOffset);
        }

        if (resolvedCurve === 'linear') {
            const [edgePath, labelX, labelY] = getStraightPath({
                sourceX,
                sourceY,
                targetX,
                targetY,
            });
            return withBundledLabelOffset(edgePath, labelX, labelY, params, labelBundleOffset);
        }

        if (resolvedCurve === 'step' || resolvedCurve === 'stepBefore' || resolvedCurve === 'stepAfter') {
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

        if (effectiveForceOrthogonal) {
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
