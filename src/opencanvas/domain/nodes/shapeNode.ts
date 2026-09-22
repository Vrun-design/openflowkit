import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import type { JsonObject } from '../document/json';

// The shape library the v2 toolbar creates. One factory serves the toolbar and
// the add_shape agent action so both produce byte-identical nodes.
export type ShapeKind =
  | 'text'
  | 'rectangle' | 'rounded' | 'capsule'
  | 'circle' | 'ellipse' | 'diamond' | 'parallelogram' | 'hexagon'
  | 'cylinder' | 'document' | 'cloud' | 'actor';

export const SHAPE_KINDS: readonly ShapeKind[] = [
  'rectangle', 'ellipse', 'text',
  'rounded', 'capsule', 'circle', 'diamond', 'parallelogram', 'hexagon',
  'cylinder', 'document', 'cloud', 'actor',
];

export const DEFAULT_SHAPE_SIZE: Size2d = { width: 160, height: 72 };
export const DEFAULT_TEXT_SIZE: Size2d = { width: 160, height: 48 };

// Round and pointy shapes need more room than a box for the same label.
const SHAPE_SIZES: Readonly<Partial<Record<ShapeKind, Size2d>>> = {
  ellipse: { width: 160, height: 92 },
  circle: { width: 120, height: 120 },
  diamond: { width: 168, height: 104 },
  hexagon: { width: 168, height: 92 },
  parallelogram: { width: 176, height: 88 },
  cylinder: { width: 150, height: 104 },
  document: { width: 160, height: 104 },
  cloud: { width: 184, height: 112 },
  actor: { width: 112, height: 136 },
  capsule: { width: 168, height: 64 },
};

export function defaultShapeSize(kind: ShapeKind): Size2d {
  if (kind === 'text') return DEFAULT_TEXT_SIZE;
  return SHAPE_SIZES[kind] ?? DEFAULT_SHAPE_SIZE;
}

export function nextNodeZIndex(page: ScenePage): number {
  return page.nodes.reduce((max, node) => Math.max(max, node.zIndex), -1) + 1;
}

function shapeNodeKind(kind: ShapeKind): { nodeKind: string; content: Record<string, string> } {
  if (kind === 'text') {
    // An empty label renders nothing on the canvas; start with a visible
    // placeholder the author replaces with F2. Explicit '' stays allowed.
    return { nodeKind: 'text', content: { label: 'Text' } };
  }
  // Every library shape is a `process` node carrying its outline id, exactly
  // what the DSL compiler writes for a shape word — so canvas and code agree
  // and the serializer can name the shape back.
  return { nodeKind: 'process', content: { shape: kind, label: '' } };
}

export interface CreateShapeNodeOptions {
  readonly kind: ShapeKind;
  readonly id: string;
  readonly at: Point2d;
  readonly size?: Size2d;
  /** Overrides the kind's default label; '' is allowed. */
  readonly label?: string;
  /** Sticky style from the last edit, merged over the kind's default paint. */
  readonly appearance?: JsonObject;
}

export function createShapeNode(page: ScenePage, options: CreateShapeNodeOptions): SceneNode {
  const { nodeKind, content } = shapeNodeKind(options.kind);
  return {
    id: options.id,
    kind: nodeKind,
    parentId: null,
    layerId: page.layers[0]?.id ?? 'default',
    zIndex: nextNodeZIndex(page),
    transform: { translation: { ...options.at }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { ...(options.size ?? defaultShapeSize(options.kind)) },
    content: { ...content, ...(options.label === undefined ? {} : { label: options.label }) },
    appearance: {
      ...(options.kind === 'text' ? {} : { fill: '#fdfdfb', stroke: '#555952', strokeWidth: 1.5 }),
      ...options.appearance,
    },
    ports: [],
    metadata: {},
    extensions: {},
  };
}
