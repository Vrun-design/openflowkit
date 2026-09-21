import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import { nextNodeZIndex } from './shapeNode';

/** One icon from a provider pack (AWS, Azure, GCP, CNCF, developer, Tabler). */
export interface IconChoice {
  readonly provider: string;
  readonly packId: string;
  readonly shapeId: string;
  readonly label: string;
}

/** Same footprint the DSL compiler gives an icon node with a short label. */
export const DEFAULT_ICON_NODE_SIZE: Size2d = { width: 148, height: 116 };

// The content keys the DSL compiler writes for `Name [aws/lambda]`, so an icon
// picked on the canvas serialises back to the same line and re-renders through
// the same architecture presentation.
export function iconContent(icon: IconChoice): Record<string, string> {
  return {
    icon: `${icon.provider}/${icon.shapeId}`,
    archProvider: icon.provider,
    archResourceType: icon.shapeId,
    archIconPackId: icon.packId,
    archIconShapeId: icon.shapeId,
    assetPresentation: 'icon',
  };
}

export function withIcon(node: SceneNode, icon: IconChoice): SceneNode {
  return { ...node, kind: 'architecture', content: { ...node.content, ...iconContent(icon) } };
}

export function createIconNode(page: ScenePage, options: {
  readonly id: string; readonly at: Point2d; readonly icon: IconChoice; readonly label?: string;
}): SceneNode {
  return {
    id: options.id,
    kind: 'architecture',
    parentId: null,
    layerId: page.layers[0]?.id ?? 'default',
    zIndex: nextNodeZIndex(page),
    transform: { translation: { ...options.at }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { ...DEFAULT_ICON_NODE_SIZE },
    content: { label: options.label ?? options.icon.label, ...iconContent(options.icon) },
    appearance: {},
    ports: [],
    metadata: {},
    extensions: {},
  };
}
