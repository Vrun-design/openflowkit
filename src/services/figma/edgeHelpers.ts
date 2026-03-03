import { Edge, Node, Position, getSmoothStepPath } from 'reactflow';
import { escapeXml } from './themeHelpers';

interface HandleResolution {
    sx: number;
    sy: number;
    tx: number;
    ty: number;
    sourcePos: Position;
    targetPos: Position;
}

function renderArrowHead(tx: number, ty: number, targetPos: Position): string {
    const size = 6;
    let path = '';

    switch (targetPos) {
        case Position.Top:
            path = `M${tx - size},${ty - size} L${tx},${ty} L${tx + size},${ty - size}`;
            break;
        case Position.Bottom:
            path = `M${tx - size},${ty + size} L${tx},${ty} L${tx + size},${ty + size}`;
            break;
        case Position.Left:
            path = `M${tx - size},${ty - size} L${tx},${ty} L${tx - size},${ty + size}`;
            break;
        case Position.Right:
            path = `M${tx + size},${ty - size} L${tx},${ty} L${tx + size},${ty + size}`;
            break;
    }

    return `<path d="${path}" stroke="#94a3b8" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" />`;
}

function resolveHandlePositions(sourceNode: Node, targetNode: Node, edge: Edge): HandleResolution {
    const sourceWidth = sourceNode.width || 200;
    const sourceHeight = sourceNode.height || 100;
    const targetWidth = targetNode.width || 200;
    const targetHeight = targetNode.height || 100;
    const sourceHandle = edge.sourceHandle;
    const targetHandle = edge.targetHandle;

    let sourcePos: Position;
    let targetPos: Position;
    let sx: number;
    let sy: number;
    let tx: number;
    let ty: number;

    if (sourceHandle && targetHandle) {
        const handleMap: Record<string, { pos: Position; x: (node: Node, width: number, height: number) => number; y: (node: Node, width: number, height: number) => number }> = {
            top: { pos: Position.Top, x: (node, width) => node.position.x + width / 2, y: (node) => node.position.y },
            bottom: { pos: Position.Bottom, x: (node, width) => node.position.x + width / 2, y: (node, _width, height) => node.position.y + height },
            left: { pos: Position.Left, x: (node) => node.position.x, y: (node, _width, height) => node.position.y + height / 2 },
            right: { pos: Position.Right, x: (node, width) => node.position.x + width, y: (node, _width, height) => node.position.y + height / 2 },
        };

        const source = handleMap[sourceHandle] || handleMap.bottom;
        const target = handleMap[targetHandle] || handleMap.top;

        sourcePos = source.pos;
        targetPos = target.pos;
        sx = source.x(sourceNode, sourceWidth, sourceHeight);
        sy = source.y(sourceNode, sourceWidth, sourceHeight);
        tx = target.x(targetNode, targetWidth, targetHeight);
        ty = target.y(targetNode, targetWidth, targetHeight);
    } else {
        const sourceCenterX = sourceNode.position.x + sourceWidth / 2;
        const sourceCenterY = sourceNode.position.y + sourceHeight / 2;
        const targetCenterX = targetNode.position.x + targetWidth / 2;
        const targetCenterY = targetNode.position.y + targetHeight / 2;
        const dx = targetCenterX - sourceCenterX;
        const dy = targetCenterY - sourceCenterY;

        if (Math.abs(dx) > Math.abs(dy)) {
            if (dx > 0) {
                sourcePos = Position.Right;
                targetPos = Position.Left;
                sx = sourceNode.position.x + sourceWidth;
                sy = sourceNode.position.y + sourceHeight / 2;
                tx = targetNode.position.x;
                ty = targetNode.position.y + targetHeight / 2;
            } else {
                sourcePos = Position.Left;
                targetPos = Position.Right;
                sx = sourceNode.position.x;
                sy = sourceNode.position.y + sourceHeight / 2;
                tx = targetNode.position.x + targetWidth;
                ty = targetNode.position.y + targetHeight / 2;
            }
        } else if (dy > 0) {
            sourcePos = Position.Bottom;
            targetPos = Position.Top;
            sx = sourceNode.position.x + sourceWidth / 2;
            sy = sourceNode.position.y + sourceHeight;
            tx = targetNode.position.x + targetWidth / 2;
            ty = targetNode.position.y;
        } else {
            sourcePos = Position.Top;
            targetPos = Position.Bottom;
            sx = sourceNode.position.x + sourceWidth / 2;
            sy = sourceNode.position.y;
            tx = targetNode.position.x + targetWidth / 2;
            ty = targetNode.position.y + targetHeight;
        }
    }

    return { sx, sy, tx, ty, sourcePos, targetPos };
}

export function renderEdgesLayer(out: string[], nodes: Node[], edges: Edge[]): void {
    out.push('<g id="edges">');

    edges.forEach((edge) => {
        const sourceNode = nodes.find((node) => node.id === edge.source);
        const targetNode = nodes.find((node) => node.id === edge.target);
        if (!sourceNode || !targetNode) return;

        const { sx, sy, tx, ty, sourcePos, targetPos } = resolveHandlePositions(sourceNode, targetNode, edge);
        const [pathData, labelX, labelY] = getSmoothStepPath({
            sourceX: sx,
            sourceY: sy,
            sourcePosition: sourcePos,
            targetX: tx,
            targetY: ty,
            targetPosition: targetPos,
            borderRadius: 16,
        });

        out.push(`  <path d="${pathData}" stroke="#94a3b8" stroke-width="2" fill="none" />`);
        out.push(`  ${renderArrowHead(tx, ty, targetPos)}`);

        if (edge.label) {
            const labelText = escapeXml(String(edge.label));
            const labelWidth = Math.max(labelText.length * 7 + 16, 40);
            out.push(`  <rect x="${labelX - labelWidth / 2}" y="${labelY - 10}" width="${labelWidth}" height="20" rx="4" fill="#ffffff" stroke="#cbd5e1" stroke-width="1" />`);
            out.push(`  <text x="${labelX}" y="${labelY + 4}" font-family="Inter, system-ui, sans-serif" font-size="12" font-weight="500" fill="#334155" text-anchor="middle">${labelText}</text>`);
        }
    });

    out.push('</g>');
}
