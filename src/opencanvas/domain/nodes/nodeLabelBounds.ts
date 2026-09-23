import type { SceneNode } from '../document/types';
import type { Bounds2d, Point2d } from '../geometry/types';
import { boundsCorners, createBounds2d } from '../geometry/bounds';
import { basicNodeOutlinePoints } from './basicNodeOutline';
import { resolveArchitectureNodePresentation } from './architectureNodePresentation';
import { resolveContainerNodePresentation } from './containerNodePresentation';
import { resolveBasicNodePresentation, type BasicNodeShape } from './basicNodePresentation';

/** Height of a container's title band; the frame boundary below it is the body. */
export const CONTAINER_TITLE_HEIGHT = 40;
/** Icon nodes: a 72px plate at the top, the label underneath. */
export const ICON_PLATE_HEIGHT = 84;

// How much of the box a shape's ink gives up to its own silhouette, as a
// fraction per side. Pointy shapes keep text inside the wide part.
interface LabelInset { readonly left: number; readonly top: number; readonly right: number; readonly bottom: number }
const FULL: LabelInset = { left: 0, top: 0, right: 0, bottom: 0 };
const SHAPE_LABEL_INSETS: Readonly<Partial<Record<BasicNodeShape, LabelInset>>> = {
  diamond: { left: 0.22, top: 0.22, right: 0.22, bottom: 0.22 },
  triangle: { left: 0.24, top: 0.34, right: 0.24, bottom: 0.1 },
  trapezoid: { left: 0.16, top: 0.16, right: 0.16, bottom: 0.06 },
  parallelogram: { left: 0.18, top: 0.1, right: 0.18, bottom: 0.1 },
  hexagon: { left: 0.18, top: 0.08, right: 0.18, bottom: 0.08 },
  octagon: { left: 0.18, top: 0.18, right: 0.18, bottom: 0.18 },
  'pentagon-tag': { left: 0.08, top: 0.12, right: 0.24, bottom: 0.12 },
  chevron: { left: 0.24, top: 0.12, right: 0.2, bottom: 0.12 },
  plus: { left: 0.3, top: 0.3, right: 0.3, bottom: 0.3 },
  star: { left: 0.28, top: 0.3, right: 0.28, bottom: 0.3 },
  heart: { left: 0.18, top: 0.3, right: 0.18, bottom: 0.16 },
  lightning: { left: 0.26, top: 0.14, right: 0.26, bottom: 0.14 },
  bookmark: { left: 0.12, top: 0.08, right: 0.12, bottom: 0.3 },
  circle: { left: 0.14, top: 0.16, right: 0.14, bottom: 0.16 },
  ellipse: { left: 0.12, top: 0.18, right: 0.12, bottom: 0.18 },
  'check-circle': { left: 0.2, top: 0.46, right: 0.2, bottom: 0.14 },
  'cross-circle': { left: 0.2, top: 0.44, right: 0.2, bottom: 0.14 },
  'numbered-circle': { left: 0.16, top: 0.2, right: 0.16, bottom: 0.2 },
  target: { left: 0.2, top: 0.2, right: 0.2, bottom: 0.2 },
  venn: { left: 0.1, top: 0.3, right: 0.1, bottom: 0.3 },
  'speech-bubble': { left: 0.08, top: 0.06, right: 0.08, bottom: 0.22 },
  comment: { left: 0.08, top: 0.06, right: 0.08, bottom: 0.24 },
  page: { left: 0.08, top: 0.06, right: 0.06, bottom: 0.1 },
  folder: { left: 0.08, top: 0.2, right: 0.08, bottom: 0.1 },
  panel: { left: 0.4, top: 0.08, right: 0.08, bottom: 0.08 },
  'list-card': { left: 0.1, top: 0.1, right: 0.1, bottom: 0.1 },
  'filled-bar': { left: 0.06, top: 0.06, right: 0.06, bottom: 0.06 },
  'half-round': { left: 0.06, top: 0.1, right: 0.22, bottom: 0.1 },
  cylinder: { left: 0.1, top: 0.2, right: 0.1, bottom: 0.14 },
  document: { left: 0.08, top: 0.06, right: 0.08, bottom: 0.2 },
  cube: { left: 0.1, top: 0.34, right: 0.1, bottom: 0.06 },
  prism: { left: 0.12, top: 0.42, right: 0.12, bottom: 0.06 },
  'layer-stack': { left: 0.12, top: 0.36, right: 0.12, bottom: 0.06 },
  'callout-stack': { left: 0.14, top: 0.2, right: 0.14, bottom: 0.14 },
  brace: { left: 0.34, top: 0.12, right: 0.1, bottom: 0.12 },
  bracket: { left: 0.34, top: 0.14, right: 0.14, bottom: 0.14 },
  pin: { left: 0.1, top: 0.3, right: 0.1, bottom: 0.16 },
  actor: { left: 0.16, top: 0.62, right: 0.16, bottom: 0.02 },
  cloud: { left: 0.16, top: 0.24, right: 0.16, bottom: 0.2 },
  'arrow-up': { left: 0.28, top: 0.42, right: 0.28, bottom: 0.08 },
  'arrow-down': { left: 0.28, top: 0.08, right: 0.28, bottom: 0.42 },
  'arrow-left': { left: 0.42, top: 0.26, right: 0.08, bottom: 0.26 },
  'arrow-right': { left: 0.08, top: 0.26, right: 0.42, bottom: 0.26 },
};

function insetBounds(node: SceneNode, inset: LabelInset): Bounds2d {
  const { width, height } = node.size;
  const left = width * inset.left;
  const top = height * inset.top;
  return createBounds2d(
    left, top,
    Math.max(1, width - left - width * inset.right),
    Math.max(1, height - top - height * inset.bottom)
  );
}

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
  const basic = resolveBasicNodePresentation(node);
  return insetBounds(node, (basic && SHAPE_LABEL_INSETS[basic.shape]) || FULL);
}

// The painted silhouette in node-local coordinates, shared by the SVG exporter
// and the motion frames: a basic shape's outline, an icon node's 72px plate,
// otherwise the box.
export function nodeOutline(node: SceneNode): readonly Point2d[] {
  const basic = resolveBasicNodePresentation(node);
  if (basic) {
    const customPath = typeof node.content.customSvgPath === 'string' ? node.content.customSvgPath : undefined;
    return basicNodeOutlinePoints(basic.shape, node.size, customPath);
  }
  const { width, height } = node.size;
  return boundsCorners(resolveArchitectureNodePresentation(node)?.display === 'provider-icon'
    ? createBounds2d((width - 72) / 2, 4, 72, 72)
    : createBounds2d(0, 0, width, height));
}
