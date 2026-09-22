import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import type { JsonObject } from '../document/json';
import type { BasicNodeShape } from './basicNodePresentation';

// The shape library the v2 toolbar creates. One factory serves the toolbar and
// the add_shape agent action so both produce byte-identical nodes.
// queue/database are DSL aliases of cylinder and custom-path needs an authored
// SVG path, so neither is a pickable library shape.
export type LibraryShape = Exclude<BasicNodeShape, 'custom-path' | 'queue' | 'database'>;
export type ShapeKind = 'text' | LibraryShape;

export const LIBRARY_SHAPES: readonly LibraryShape[] = [
  'rectangle', 'rounded', 'capsule', 'circle', 'ellipse', 'diamond',
  'triangle', 'trapezoid', 'parallelogram', 'hexagon', 'octagon', 'pentagon-tag',
  'chevron', 'plus', 'star', 'heart', 'cloud', 'lightning', 'bookmark',
  'speech-bubble', 'comment', 'page', 'folder', 'panel', 'list-card',
  'filled-bar', 'half-round', 'cylinder', 'document', 'cube', 'prism',
  'layer-stack', 'callout-stack', 'target', 'check-circle', 'cross-circle',
  'numbered-circle', 'brace', 'bracket', 'pin', 'actor',
  'arrow-up', 'arrow-down', 'arrow-left', 'arrow-right', 'venn',
];

export const SHAPE_KINDS: readonly ShapeKind[] = ['rectangle', 'ellipse', 'text', ...LIBRARY_SHAPES];

export const DEFAULT_SHAPE_SIZE: Size2d = { width: 160, height: 72 };
export const DEFAULT_TEXT_SIZE: Size2d = { width: 160, height: 48 };

// Round and pointy shapes need more room than a box for the same label.
const SHAPE_SIZES: Readonly<Partial<Record<ShapeKind, Size2d>>> = {
  ellipse: { width: 160, height: 92 },
  circle: { width: 120, height: 120 },
  diamond: { width: 168, height: 104 },
  triangle: { width: 140, height: 112 },
  trapezoid: { width: 176, height: 96 },
  parallelogram: { width: 176, height: 88 },
  hexagon: { width: 168, height: 92 },
  octagon: { width: 132, height: 132 },
  'pentagon-tag': { width: 176, height: 96 },
  chevron: { width: 152, height: 88 },
  plus: { width: 128, height: 128 },
  star: { width: 128, height: 128 },
  heart: { width: 132, height: 120 },
  cloud: { width: 184, height: 112 },
  lightning: { width: 104, height: 136 },
  bookmark: { width: 96, height: 132 },
  'speech-bubble': { width: 180, height: 104 },
  comment: { width: 180, height: 96 },
  page: { width: 150, height: 140 },
  folder: { width: 168, height: 120 },
  panel: { width: 168, height: 128 },
  'list-card': { width: 168, height: 120 },
  'filled-bar': { width: 140, height: 22 },
  'half-round': { width: 176, height: 104 },
  cylinder: { width: 150, height: 104 },
  document: { width: 160, height: 104 },
  cube: { width: 140, height: 132 },
  prism: { width: 160, height: 128 },
  'layer-stack': { width: 180, height: 120 },
  'callout-stack': { width: 180, height: 120 },
  target: { width: 108, height: 108 },
  'check-circle': { width: 108, height: 108 },
  'cross-circle': { width: 108, height: 108 },
  'numbered-circle': { width: 108, height: 108 },
  brace: { width: 116, height: 160 },
  bracket: { width: 116, height: 160 },
  pin: { width: 96, height: 132 },
  actor: { width: 112, height: 136 },
  'arrow-up': { width: 150, height: 110 },
  'arrow-down': { width: 150, height: 110 },
  'arrow-left': { width: 150, height: 110 },
  'arrow-right': { width: 150, height: 110 },
  venn: { width: 200, height: 120 },
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

/** Numbered circles count up per page: the next 1-based label. */
export function nextNumberedLabel(page: ScenePage): string {
  const used = page.nodes
    .filter((node) => node.content.shape === 'numbered-circle')
    .map((node) => Number(node.content.label))
    .filter((value) => Number.isFinite(value));
  return String(used.reduce((max, value) => Math.max(max, value), 0) + 1);
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
  const label = options.label ?? (options.kind === 'numbered-circle' ? nextNumberedLabel(page) : undefined);
  return {
    id: options.id,
    kind: nodeKind,
    parentId: null,
    layerId: page.layers[0]?.id ?? 'default',
    zIndex: nextNodeZIndex(page),
    transform: { translation: { ...options.at }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { ...(options.size ?? defaultShapeSize(options.kind)) },
    content: { ...content, ...(label === undefined ? {} : { label }) },
    appearance: {
      ...(options.kind === 'text' ? {} : { fill: '#fdfdfb', stroke: '#555952', strokeWidth: 1.5 }),
      ...options.appearance,
    },
    ports: [],
    metadata: {},
    extensions: {},
  };
}
