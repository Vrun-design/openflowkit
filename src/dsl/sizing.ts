import { resolveSizedNode } from '../opencanvas/domain/node-sizing/model';
import { LABEL_FONT, measurePortableText, SUBLABEL_FONT } from '../opencanvas/domain/text/measurement';
import type { SceneNode } from '../opencanvas/domain/document/types';
import { nodeLabelBounds } from '../opencanvas/domain/nodes/nodeLabelBounds';
import type { Size2d } from '../opencanvas/domain/geometry/types';
import type { DslShapeSpec } from './vocabulary';

export interface NodeMeasureRequest {
  readonly kind: string;
  readonly label: string;
  readonly subLabel?: string;
  readonly hasIcon: boolean;
  readonly spec: DslShapeSpec;
  readonly width?: number;
  readonly height?: number;
  /** `wrap` wraps whatever the shape's label area (C4 descriptions, which wrap in every shape). */
  readonly overflow?: 'wrap';
}

/** The policy the renderer wraps by; a node carries it when its text is wider than the box can be. */
export const WRAP_SIZING_POLICY = {
  version: 1, mode: 'fixed', minSize: { width: 24, height: 24 }, maxSize: { width: 1600, height: 1200 },
  overflow: 'wrap', clipContent: false, maxLines: 4,
} as const;

/** Matches the renderer's `textPadding` for shapes (nodeStyle), so measured and drawn wrap widths agree. */
export const TEXT_PADDING = 16;
export { SUBLABEL_FONT };

const LIMITS = { min: { width: 24, height: 24 }, max: { width: 640, height: 520 } };

const pad = (n: number) => ({ top: n, right: n, bottom: n, left: n });

/** UML actor: the silhouette fills the box, so the label sits below it. */
export const ACTOR_CONTENT_LAYOUT = {
  version: 1, horizontal: 'center', vertical: 'end', iconPlacement: 'top', labelAlignment: 'center',
  padding: pad(10), gap: 8, iconScale: 1, freeIconPosition: { x: 0.5, y: 0.5 },
} as const;

const TEXT_LAYOUT = {
  version: 1, horizontal: 'center', vertical: 'center', iconPlacement: 'top', labelAlignment: 'center',
  padding: pad(TEXT_PADDING), gap: 8, iconScale: 1, freeIconPosition: { x: 0.5, y: 0.5 },
} as const;

/** A scene node with only what sizing and label bounds read. */
function blankNode(content: SceneNode['content'], size: Size2d, kind = 'process'): SceneNode {
  return {
    id: 'measure', kind, parentId: null, layerId: 'default', zIndex: 0,
    transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size, ports: [], metadata: {}, extensions: {}, content, appearance: {},
  };
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampSize(width: number, height: number, spec: DslShapeSpec): Size2d {
  return {
    width: Math.ceil(clamp(width, Math.max(LIMITS.min.width, spec.minSize.width), Math.min(LIMITS.max.width, spec.maxSize.width))),
    height: Math.ceil(clamp(height, Math.max(LIMITS.min.height, spec.minSize.height), Math.min(LIMITS.max.height, spec.maxSize.height))),
  };
}

/**
 * Sizes a DSL node with the same portable measurement the renderer uses, so
 * ELK reserves the space the label actually needs.
 */
export function measureNodeSize(request: NodeMeasureRequest): Size2d {
  const { spec } = request;
  if (request.width !== undefined || request.height !== undefined) {
    const fallback = { width: spec.minSize.width, height: spec.minSize.height };
    return {
      width: Math.round(clamp(request.width ?? fallback.width, LIMITS.min.width, LIMITS.max.width)),
      height: Math.round(clamp(request.height ?? fallback.height, LIMITS.min.height, LIMITS.max.height)),
    };
  }
  const label = measurePortableText(request.label, { ...LABEL_FONT, maxWidth: spec.wrap, overflow: 'visible' });
  if (request.kind === 'architecture') {
    const title = measurePortableText(request.label, { fontSize: 12, fontWeight: 600, maxWidth: 200, overflow: 'visible' });
    return clampSize(Math.max(148, title.width + 32), 84 + title.height + 16, spec);
  }
  if (request.kind === 'sticky') {
    return clampSize(Math.max(180, label.width + 40), label.height + 64, spec);
  }
  const wrapping = wrapsText(request);
  const policy = {
    version: 1, mode: 'responsive', minSize: { width: spec.minSize.width, height: spec.minSize.height },
    maxSize: { width: spec.maxSize.width, height: spec.maxSize.height },
    overflow: wrapping ? 'wrap' : 'visible', clipContent: false, maxLines: 4,
  } as const;
  const sized = resolveSizedNode(blankNode({
    label: request.label,
    ...(request.subLabel ? { subLabel: request.subLabel } : {}),
    ...(request.hasIcon ? { icon: 'icon' } : {}),
    contentLayout: request.spec.shape === 'actor' ? ACTOR_CONTENT_LAYOUT : TEXT_LAYOUT,
    sizingPolicy: policy,
  }, { width: 1, height: 1 }, request.kind), policy);
  const size = clampSize(sized.size.width, sized.size.height, spec);
  // A wrapped node takes the full wrap width: the canvas wraps with the real font at that width, so the
  // estimate's narrower widest line would leave no slack for glyphs wider than measured.
  return wrapping && needsWrap(request, spec.maxSize.width - 2 * textPadding(spec))
    ? { width: clampSize(spec.maxSize.width, 1, spec).width, height: size.height } : size;
}

/** Text sits `padding` from the box on every side; an actor's silhouette fills the box, so it keeps 10. */
const textPadding = (spec: DslShapeSpec) => spec.shape === 'actor' ? ACTOR_CONTENT_LAYOUT.padding.left : TEXT_PADDING;

/**
 * Whether this node's text may wrap in its box. Shapes whose label rect is inset (diamond, circle, ...)
 * keep one line: the canvas wraps at the box width, which is wider than the inset text area. An actor is
 * the exception, its label sits below the silhouette across the box.
 */
function wrapsText(request: NodeMeasureRequest): boolean {
  if (request.hasIcon || request.width !== undefined || request.height !== undefined) return false;
  return request.spec.shape === 'actor' || request.overflow === 'wrap' || !insetLabel(request.spec.shape, request.kind);
}

/** Whether the shape's label area is smaller than its box. */
function insetLabel(shape: string | undefined, kind: string): boolean {
  const bounds = nodeLabelBounds(blankNode({ ...(shape ? { shape } : {}) }, { width: 100, height: 100 }, kind));
  return !(bounds.x === 0 && bounds.y === 0 && bounds.width === 100 && bounds.height === 100);
}

/** Whether a line of the label or sub-label is wider than `inner`, so it must wrap. */
function needsWrap(request: NodeMeasureRequest, inner: number): boolean {
  const wide = (text: string, font: typeof LABEL_FONT | typeof SUBLABEL_FONT) => measurePortableText(text, { ...font, overflow: 'visible' }).width > inner;
  return wide(request.label, LABEL_FONT) || (request.subLabel ? wide(request.subLabel, SUBLABEL_FONT) : false);
}

/**
 * The wrap policy a sized node needs, or null when its text fits on one line at the size it got
 * (those nodes stay policy-free and draw exactly as before).
 */
export function wrapPolicyFor(request: NodeMeasureRequest, size: Size2d) {
  if (request.kind === 'architecture' || request.kind === 'sticky' || !wrapsText(request)) return null;
  return needsWrap(request, size.width - 2 * textPadding(request.spec)) ? WRAP_SIZING_POLICY : null;
}

/** Container minimums keep a group big enough for its header band and label. */
export function measureGroupSize(label: string, isFrame: boolean): Size2d {
  const measured = measurePortableText(label || (isFrame ? 'Diagram' : 'Group'), { fontSize: 14, fontWeight: 700, overflow: 'visible' });
  return {
    width: Math.max(isFrame ? 200 : 180, measured.width + (isFrame ? 60 : 88)),
    height: isFrame ? 140 : 132,
  };
}
