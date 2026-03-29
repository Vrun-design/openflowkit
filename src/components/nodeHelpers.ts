import type { FlowNode, NodeData } from '@/lib/types';

export type NodeShape = NonNullable<NodeData['shape']>;

export const COMPLEX_SHAPES: NodeShape[] = [
  'diamond',
  'hexagon',
  'parallelogram',
  'cylinder',
  'circle',
  'ellipse',
];

export const FONT_FAMILY_MAP: Record<string, string> = {
  inter: 'font-inter',
  roboto: 'font-roboto',
  outfit: 'font-outfit',
  playfair: 'font-playfair',
  fira: 'font-fira',
  sans: 'font-sans',
  serif: 'font-serif',
  mono: 'font-mono',
};

export function getNodeDefaults(type: string): {
  color: string;
  icon: string | null;
  shape: NodeShape;
} {
  switch (type) {
    case 'start':
      return { color: 'emerald', icon: null, shape: 'rounded' };
    case 'end':
      return { color: 'red', icon: null, shape: 'rounded' };
    case 'decision':
      return { color: 'amber', icon: null, shape: 'diamond' };
    case 'annotation':
      return { color: 'yellow', icon: null, shape: 'rounded' };
    case 'custom':
      return { color: 'white', icon: null, shape: 'rounded' };
    default:
      return { color: 'white', icon: null, shape: 'rounded' };
  }
}

export function getMinNodeSize(shape: NodeData['shape'] | undefined): {
  minWidth: number;
  minHeight: number;
} {
  if (shape === 'circle' || shape === 'ellipse') return { minWidth: 120, minHeight: 120 };
  if (shape === 'diamond' || shape === 'hexagon') return { minWidth: 140, minHeight: 140 };
  if (shape === 'parallelogram' || shape === 'cylinder') return { minWidth: 140, minHeight: 80 };
  return { minWidth: 120, minHeight: 60 };
}

export function getIconAssetNodeMinSize(hasLabel: boolean): {
  minWidth: number;
  minHeight: number;
} {
  return hasLabel
    ? { minWidth: 116, minHeight: 118 }
    : { minWidth: 96, minHeight: 88 };
}

export function resolveNodeSize(node: FlowNode): { width: number; height: number } {
  const minSize = node.data?.assetPresentation === 'icon'
    ? getIconAssetNodeMinSize(Boolean(node.data?.label?.trim()))
    : getMinNodeSize(node.data?.shape);
  const styleWidth = typeof node.style?.width === 'number' ? node.style.width : undefined;
  const styleHeight = typeof node.style?.height === 'number' ? node.style.height : undefined;
  const dataWidth = typeof node.data?.width === 'number' ? node.data.width : undefined;
  const dataHeight = typeof node.data?.height === 'number' ? node.data.height : undefined;
  const nodeWidth = typeof node.width === 'number' ? node.width : undefined;
  const nodeHeight = typeof node.height === 'number' ? node.height : undefined;

  return {
    width: dataWidth ?? styleWidth ?? nodeWidth ?? minSize.minWidth,
    height: dataHeight ?? styleHeight ?? nodeHeight ?? minSize.minHeight,
  };
}

export function toCssSize(value: number | string | undefined): string | undefined {
  if (value === undefined || value === null) return undefined;
  return typeof value === 'number' ? `${value}px` : value;
}

export function getNodeBorderRadius(
  isComplexShape: boolean,
  activeShape: NodeShape,
  borderRadius: string | number
): string | number {
  if (isComplexShape) return '0';
  if (activeShape === 'capsule') return '9999px';
  if (activeShape === 'rectangle') return '4px';
  return borderRadius;
}

export function fontSizeClassFor(fontSize: string | undefined): string {
  if (!fontSize || !isNaN(Number(fontSize))) return '';
  switch (fontSize) {
    case 'small':
      return 'text-xs';
    case 'medium':
      return 'text-sm';
    case 'large':
      return 'text-base';
    default:
      return 'text-lg';
  }
}

export const NEEDS_SQUARE_ASPECT: Set<NodeShape> = new Set([
  'circle',
  'ellipse',
  'diamond',
  'hexagon',
]);

export const COMPLEX_SHAPE_PADDING: Partial<Record<NodeShape, string>> = {
  diamond: 'px-8 py-6',
  hexagon: 'px-8',
  parallelogram: 'px-8',
  cylinder: 'pt-8 pb-4',
};
