import type { FlowNode, NodeData } from '@/lib/types';

const GENERIC_SHAPE_TYPES = new Set(['process', 'start', 'end', 'decision', 'custom']);

export function isGenericShapeType(type: string | null | undefined): boolean {
    return GENERIC_SHAPE_TYPES.has(type ?? 'process');
}

export function getBlankGenericShapeData(sourceNode?: FlowNode): Pick<NodeData, 'label' | 'subLabel' | 'color' | 'shape' | 'icon' | 'layerId'> {
    return {
        label: '',
        subLabel: '',
        color: sourceNode?.data?.color as string | undefined,
        shape: sourceNode?.data?.shape as NodeData['shape'],
        icon: sourceNode?.data?.icon as string | undefined,
        layerId: sourceNode?.data?.layerId as string | undefined,
    };
}

export function getGenericShapeColor(
    type: string,
    shape: NodeData['shape'] | undefined,
    defaultColor: string | undefined
): string {
    if (defaultColor) {
        return defaultColor;
    }

    if (type === 'annotation') {
        return 'yellow';
    }

    if (type === 'decision') {
        return 'amber';
    }

    if (shape === 'cylinder') {
        return 'emerald';
    }

    return 'slate';
}
