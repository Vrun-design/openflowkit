import type { SceneNode } from '../document/types';

export type BasicNodeKind = 'process' | 'start' | 'decision' | 'end' | 'custom';
export type BasicNodeShape =
  | 'rectangle' | 'rounded' | 'capsule' | 'circle' | 'ellipse' | 'diamond'
  | 'hexagon' | 'parallelogram' | 'cylinder' | 'cloud' | 'document'
  | 'queue' | 'database' | 'actor' | 'custom-path';
export type BasicNodeColorMode = 'subtle' | 'filled';

export interface BasicNodePresentation {
  readonly kind: BasicNodeKind;
  readonly shape: BasicNodeShape;
  readonly colorKey: string;
  readonly colorMode: BasicNodeColorMode;
  readonly customColor?: string;
}

const BASIC_NODE_DEFAULTS: Record<
  BasicNodeKind,
  Pick<BasicNodePresentation, 'shape' | 'colorKey'>
> = {
  process: { shape: 'rounded', colorKey: 'white' },
  start: { shape: 'capsule', colorKey: 'emerald' },
  decision: { shape: 'diamond', colorKey: 'amber' },
  end: { shape: 'capsule', colorKey: 'red' },
  custom: { shape: 'rounded', colorKey: 'white' },
};

function isBasicNodeKind(value: string): value is BasicNodeKind {
  return Object.hasOwn(BASIC_NODE_DEFAULTS, value);
}

function isBasicNodeShape(value: unknown): value is BasicNodeShape {
  return typeof value === 'string' && new Set<BasicNodeShape>([
    'rectangle', 'rounded', 'capsule', 'circle', 'ellipse', 'diamond',
    'hexagon', 'parallelogram', 'cylinder', 'cloud', 'document', 'queue', 'database', 'actor',
    'custom-path',
  ]).has(value as BasicNodeShape);
}

export function resolveBasicNodePresentation(node: SceneNode): BasicNodePresentation | null {
  if (!isBasicNodeKind(node.kind)) return null;
  const defaults = BASIC_NODE_DEFAULTS[node.kind];
  return {
    kind: node.kind,
    shape: isBasicNodeShape(node.content.shape) ? node.content.shape : defaults.shape,
    colorKey: typeof node.content.color === 'string' ? node.content.color : defaults.colorKey,
    colorMode: node.content.colorMode === 'filled' ? 'filled' : 'subtle',
    ...(typeof node.content.customColor === 'string'
      ? { customColor: node.content.customColor }
      : {}),
  };
}
