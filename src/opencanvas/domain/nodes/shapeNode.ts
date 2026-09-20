import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';

// The three shapes the v2 toolbar creates. One factory serves the toolbar and
// the add_node agent action so both produce byte-identical nodes (gate 2).
export type ShapeKind = 'rectangle' | 'ellipse' | 'text';
export const SHAPE_KINDS: readonly ShapeKind[] = ['rectangle', 'ellipse', 'text'];

export const DEFAULT_SHAPE_SIZE: Size2d = { width: 160, height: 72 };
export const DEFAULT_TEXT_SIZE: Size2d = { width: 160, height: 48 };

export function defaultShapeSize(kind: ShapeKind): Size2d {
  return kind === 'text' ? DEFAULT_TEXT_SIZE : DEFAULT_SHAPE_SIZE;
}

export function nextNodeZIndex(page: ScenePage): number {
  return page.nodes.reduce((max, node) => Math.max(max, node.zIndex), -1) + 1;
}

function shapeNodeKind(kind: ShapeKind): { nodeKind: string; content: Record<string, string> } {
  switch (kind) {
    case 'ellipse':
      return { nodeKind: 'custom', content: { shape: 'ellipse', label: '' } };
    case 'text':
      // An empty label renders nothing on the canvas; start with a visible
      // placeholder the author replaces with F2. Explicit '' stays allowed.
      return { nodeKind: 'text', content: { label: 'Text' } };
    case 'rectangle':
      return { nodeKind: 'process', content: { shape: 'rectangle', label: '' } };
  }
}

export interface CreateShapeNodeOptions {
  readonly kind: ShapeKind;
  readonly id: string;
  readonly at: Point2d;
  readonly size?: Size2d;
  /** Overrides the kind's default label; '' is allowed. */
  readonly label?: string;
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
    appearance: options.kind === 'text' ? {} : { fill: '#fdfdfb', stroke: '#555952', strokeWidth: 1.5 },
    ports: [],
    metadata: {},
    extensions: {},
  };
}
