import { getBezierPath, getSmoothStepPath, Position } from 'reactflow';

interface MinimalEdge {
    id: string;
    source: string;
    target: string;
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
}

type EdgeVariant = 'bezier' | 'smoothstep' | 'step';
type LoopDirection = 'right' | 'top' | 'left' | 'bottom';

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

function getParallelEdgeOffset(edgeId: string, source: string, target: string, allEdges: MinimalEdge[]): number {
    const keyA = `${source}-${target}`;
    const keyB = `${target}-${source}`;
    const siblings = allEdges.filter((edge) => {
        const edgeKey = `${edge.source}-${edge.target}`;
        return edgeKey === keyA || edgeKey === keyB;
    });
    if (siblings.length <= 1) return 0;

    const index = siblings.findIndex((edge) => edge.id === edgeId);
    const spacing = 25;
    return (index - (siblings.length - 1) / 2) * spacing;
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

export function buildEdgePath(
    params: EdgePathParams,
    allEdges: MinimalEdge[],
    variant: EdgeVariant
): EdgePathResult {
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

    const offset = getParallelEdgeOffset(params.id, params.source, params.target, allEdges);
    const sourceOffset = getOffsetVector(params.sourcePosition, offset);
    const targetOffset = getOffsetVector(params.targetPosition, offset);

    if (variant === 'bezier') {
        const [edgePath, labelX, labelY] = getBezierPath({
            sourceX: params.sourceX + sourceOffset.x,
            sourceY: params.sourceY + sourceOffset.y,
            sourcePosition: params.sourcePosition,
            targetX: params.targetX + targetOffset.x,
            targetY: params.targetY + targetOffset.y,
            targetPosition: params.targetPosition,
            curvature: 0.25,
        });
        return { edgePath, labelX, labelY };
    }

    if (variant === 'step') {
        const [edgePath, labelX, labelY] = getSmoothStepPath({
            sourceX: params.sourceX + sourceOffset.x,
            sourceY: params.sourceY + sourceOffset.y,
            sourcePosition: params.sourcePosition,
            targetX: params.targetX + targetOffset.x,
            targetY: params.targetY + targetOffset.y,
            targetPosition: params.targetPosition,
            borderRadius: 0,
            offset: 20,
        });
        return { edgePath, labelX, labelY };
    }

    const [edgePath, labelX, labelY] = getSmoothStepPath({
        sourceX: params.sourceX + sourceOffset.x,
        sourceY: params.sourceY + sourceOffset.y,
        sourcePosition: params.sourcePosition,
        targetX: params.targetX + targetOffset.x,
        targetY: params.targetY + targetOffset.y,
        targetPosition: params.targetPosition,
        offset: 20,
    });
    return { edgePath, labelX, labelY };
}
