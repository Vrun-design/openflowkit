import type { SceneNode } from '../document/types';
import type { Bounds2d } from '../geometry/types';
import { createBounds2d } from '../geometry/bounds';
import { resolveArchitectureNodePresentation } from './architectureNodePresentation';
import { resolveContainerNodePresentation } from './containerNodePresentation';

/** Height of a container's title band; the frame boundary below it is the body. */
export const CONTAINER_TITLE_HEIGHT = 40;
/** Icon nodes: a 72px plate at the top, the label underneath. */
export const ICON_PLATE_HEIGHT = 84;

// Where a node's editable label lives, in node-local coordinates. The Pixi
// renderers place the label here and the DOM editor opens on the same rect,
// so editing never jumps to the centre of a frame or over an icon.
export function nodeLabelBounds(node: SceneNode): Bounds2d {
  const { width, height } = node.size;
  const container = resolveContainerNodePresentation(node);
  if (container) {
    const left = container.kind === 'swimlane' ? 37 : 16;
    const right = 16;
    return createBounds2d(left, 0, Math.max(1, width - left - right), CONTAINER_TITLE_HEIGHT);
  }
  const architecture = resolveArchitectureNodePresentation(node);
  if (architecture?.display === 'provider-icon') {
    return createBounds2d(0, ICON_PLATE_HEIGHT, width, Math.max(1, height - ICON_PLATE_HEIGHT));
  }
  if (architecture) {
    return createBounds2d(0, 31, width, Math.max(1, height - 31));
  }
  return createBounds2d(0, 0, width, height);
}
