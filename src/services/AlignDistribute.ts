import { Node } from 'reactflow';

/**
 * Alignment and distribution utilities for multi-selected nodes.
 */

type AlignDirection = 'left' | 'center' | 'right' | 'top' | 'middle' | 'bottom';
type DistributeDirection = 'horizontal' | 'vertical';

/** Align selected nodes along a given axis. */
export function alignNodes(nodes: Node[], direction: AlignDirection): Node[] {
    if (nodes.length < 2) return nodes;

    const ids = new Set(nodes.map((n) => n.id));
    let target: number;

    switch (direction) {
        case 'left':
            target = Math.min(...nodes.map((n) => n.position.x));
            return nodes.map((n) => (ids.has(n.id) ? { ...n, position: { ...n.position, x: target } } : n));
        case 'right': {
            const maxRight = Math.max(...nodes.map((n) => n.position.x + (n.width || 200)));
            return nodes.map((n) =>
                ids.has(n.id) ? { ...n, position: { ...n.position, x: maxRight - (n.width || 200) } } : n
            );
        }
        case 'center': {
            const avgX = nodes.reduce((sum, n) => sum + n.position.x + (n.width || 200) / 2, 0) / nodes.length;
            return nodes.map((n) =>
                ids.has(n.id) ? { ...n, position: { ...n.position, x: avgX - (n.width || 200) / 2 } } : n
            );
        }
        case 'top':
            target = Math.min(...nodes.map((n) => n.position.y));
            return nodes.map((n) => (ids.has(n.id) ? { ...n, position: { ...n.position, y: target } } : n));
        case 'bottom': {
            const maxBottom = Math.max(...nodes.map((n) => n.position.y + (n.height || 80)));
            return nodes.map((n) =>
                ids.has(n.id) ? { ...n, position: { ...n.position, y: maxBottom - (n.height || 80) } } : n
            );
        }
        case 'middle': {
            const avgY = nodes.reduce((sum, n) => sum + n.position.y + (n.height || 80) / 2, 0) / nodes.length;
            return nodes.map((n) =>
                ids.has(n.id) ? { ...n, position: { ...n.position, y: avgY - (n.height || 80) / 2 } } : n
            );
        }
        default:
            return nodes;
    }
}

/** Distribute selected nodes evenly along horizontal or vertical axis. */
export function distributeNodes(nodes: Node[], direction: DistributeDirection): Node[] {
    if (nodes.length < 3) return nodes;

    const sorted = [...nodes].sort((a, b) =>
        direction === 'horizontal' ? a.position.x - b.position.x : a.position.y - b.position.y
    );

    const first = sorted[0];
    const last = sorted[sorted.length - 1];

    if (direction === 'horizontal') {
        const totalWidth = sorted.reduce((sum, n) => sum + (n.width || 200), 0);
        const startX = first.position.x;
        const endX = last.position.x + (last.width || 200);
        const spacing = (endX - startX - totalWidth) / (sorted.length - 1);

        let currentX = startX;
        const posMap = new Map<string, number>();
        sorted.forEach((n) => {
            posMap.set(n.id, currentX);
            currentX += (n.width || 200) + spacing;
        });

        return nodes.map((n) => {
            const newX = posMap.get(n.id);
            return newX !== undefined ? { ...n, position: { ...n.position, x: newX } } : n;
        });
    } else {
        const totalHeight = sorted.reduce((sum, n) => sum + (n.height || 80), 0);
        const startY = first.position.y;
        const endY = last.position.y + (last.height || 80);
        const spacing = (endY - startY - totalHeight) / (sorted.length - 1);

        let currentY = startY;
        const posMap = new Map<string, number>();
        sorted.forEach((n) => {
            posMap.set(n.id, currentY);
            currentY += (n.height || 80) + spacing;
        });

        return nodes.map((n) => {
            const newY = posMap.get(n.id);
            return newY !== undefined ? { ...n, position: { ...n.position, y: newY } } : n;
        });
    }
}

/** Match all selected nodes to the same width/height. */
export function matchSize(nodes: Node[], dimension: 'width' | 'height' | 'both'): Node[] {
    if (nodes.length < 2) return nodes;

    const maxW = Math.max(...nodes.map((n) => n.width || 200));
    const maxH = Math.max(...nodes.map((n) => n.height || 80));
    const ids = new Set(nodes.map((n) => n.id));

    return nodes.map((n) => {
        if (!ids.has(n.id)) return n;
        return {
            ...n,
            width: dimension === 'height' ? n.width : maxW,
            height: dimension === 'width' ? n.height : maxH,
            style: {
                ...n.style,
                ...(dimension !== 'height' ? { width: maxW } : {}),
                ...(dimension !== 'width' ? { height: maxH } : {}),
            },
        };
    });
}
