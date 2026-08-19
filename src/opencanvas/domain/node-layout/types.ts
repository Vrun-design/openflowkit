import type { Bounds2d, Point2d, Size2d } from '../geometry/types';

export const NODE_CONTENT_LAYOUT_VERSION = 1 as const;

export type ContentAlignment = 'start' | 'center' | 'end';
export type IconPlacement = 'top' | 'right' | 'bottom' | 'left' | 'free';
export type LabelAlignment = 'start' | 'center' | 'end';

export interface ContentInsets {
  readonly top: number;
  readonly right: number;
  readonly bottom: number;
  readonly left: number;
}

export interface NodeContentLayoutV1 {
  readonly version: typeof NODE_CONTENT_LAYOUT_VERSION;
  readonly horizontal: ContentAlignment;
  readonly vertical: ContentAlignment;
  readonly iconPlacement: IconPlacement;
  readonly labelAlignment: LabelAlignment;
  readonly padding: ContentInsets;
  readonly gap: number;
  readonly iconScale: number;
  readonly freeIconPosition: Point2d;
}

export interface NodeContentMetrics {
  readonly nodeSize: Size2d;
  readonly iconSize: Size2d | null;
  readonly labelSize: Size2d;
  readonly subLabelSize: Size2d | null;
}

export interface NodeContentGeometry {
  readonly contentBounds: Bounds2d;
  readonly iconBounds: Bounds2d | null;
  readonly labelBounds: Bounds2d;
  readonly subLabelBounds: Bounds2d | null;
  readonly labelAlignment: LabelAlignment;
}
