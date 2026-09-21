import { resolveSizedNode } from '../opencanvas/domain/node-sizing/model';
import { measurePortableText } from '../opencanvas/domain/text/measurement';
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
}

const LIMITS = { min: { width: 24, height: 24 }, max: { width: 640, height: 520 } };

/** UML actor: the silhouette fills the box, so the label sits below it. */
export const ACTOR_CONTENT_LAYOUT = {
  version: 1, horizontal: 'center', vertical: 'end', iconPlacement: 'top', labelAlignment: 'center',
  padding: { top: 10, right: 10, bottom: 8, left: 10 }, gap: 8, iconScale: 1, freeIconPosition: { x: 0.5, y: 0.5 },
} as const;

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(maximum, Math.max(minimum, value));
}

function clampSize(width: number, height: number, spec: DslShapeSpec): Size2d {
  return {
    width: Math.round(clamp(width, Math.max(LIMITS.min.width, spec.minSize.width), Math.min(LIMITS.max.width, spec.maxSize.width))),
    height: Math.round(clamp(height, Math.max(LIMITS.min.height, spec.minSize.height), Math.min(LIMITS.max.height, spec.maxSize.height))),
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
  const label = measurePortableText(request.label, { fontSize: 14, fontWeight: 600, maxWidth: spec.wrap, overflow: 'visible' });
  if (request.kind === 'architecture') {
    const title = measurePortableText(request.label, { fontSize: 12, fontWeight: 600, maxWidth: 200, overflow: 'visible' });
    return clampSize(Math.max(148, title.width + 32), 84 + title.height + 16, spec);
  }
  if (request.kind === 'sticky') {
    return clampSize(Math.max(180, label.width + 40), label.height + 64, spec);
  }
  const sized = resolveSizedNode({
    id: 'measure', kind: request.kind, parentId: null, layerId: 'default', zIndex: 0,
    transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 1, height: 1 }, ports: [], metadata: {}, extensions: {},
    content: {
      label: request.label,
      ...(request.subLabel ? { subLabel: request.subLabel } : {}),
      ...(request.hasIcon ? { icon: 'icon' } : {}),
      contentLayout: request.spec.shape === 'actor' ? ACTOR_CONTENT_LAYOUT : { version: 1, horizontal: 'center', vertical: 'center', iconPlacement: 'top', labelAlignment: 'center', padding: { top: 14, right: 16, bottom: 14, left: 16 }, gap: 8, iconScale: 1, freeIconPosition: { x: 0.5, y: 0.5 } },
      sizingPolicy: {
        version: 1, mode: 'responsive',
        minSize: { width: spec.minSize.width, height: spec.minSize.height },
        maxSize: { width: spec.maxSize.width, height: spec.maxSize.height },
        overflow: 'visible', clipContent: false, maxLines: 4,
      },
    },
    appearance: {},
  }, { version: 1, mode: 'responsive', minSize: spec.minSize, maxSize: spec.maxSize, overflow: 'visible', clipContent: false, maxLines: 4 });
  return clampSize(sized.size.width, sized.size.height, spec);
}

/** Container minimums keep a group big enough for its header band and label. */
export function measureGroupSize(label: string, isFrame: boolean): Size2d {
  const measured = measurePortableText(label || (isFrame ? 'Diagram' : 'Group'), { fontSize: 14, fontWeight: 700, overflow: 'visible' });
  return {
    width: Math.max(isFrame ? 200 : 180, measured.width + (isFrame ? 60 : 88)),
    height: isFrame ? 140 : 132,
  };
}
