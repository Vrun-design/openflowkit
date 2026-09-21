import type { FlowNode, NodeData } from '@/lib/types';

export function getMinNodeSize(shape: NodeData['shape'] | undefined): {
  minWidth: number;
  minHeight: number;
} {
  switch (shape) {
    case 'circle':
    case 'ellipse':
      return { minWidth: 120, minHeight: 120 };
    case 'diamond':
    case 'hexagon':
      return { minWidth: 140, minHeight: 140 };
    case 'parallelogram':
    case 'cylinder':
      return { minWidth: 140, minHeight: 80 };
    default:
      return { minWidth: 120, minHeight: 60 };
  }
}

export function getIconAssetNodeMinSize(hasLabel: boolean): {
  minWidth: number;
  minHeight: number;
} {
  return hasLabel
    ? { minWidth: 116, minHeight: 118 }
    : { minWidth: 96, minHeight: 88 };
}

function numberOrUndefined(value: unknown): number | undefined {
  return typeof value === 'number' ? value : undefined;
}

export function resolveNodeSize(node: FlowNode): { width: number; height: number } {
  const fallback = node.type === 'mermaid_svg'
    ? { minWidth: 640, minHeight: 480 }
    : node.data?.assetPresentation === 'icon'
      ? getIconAssetNodeMinSize(Boolean(node.data?.label?.trim()))
      : getMinNodeSize(node.data?.shape);
  return {
    width: numberOrUndefined(node.data?.width) ?? numberOrUndefined(node.style?.width) ?? numberOrUndefined(node.width) ?? fallback.minWidth,
    height: numberOrUndefined(node.data?.height) ?? numberOrUndefined(node.style?.height) ?? numberOrUndefined(node.height) ?? fallback.minHeight,
  };
}
