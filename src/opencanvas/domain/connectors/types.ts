import type { Point2d } from '../geometry/types';

export type ConnectorPathCommand =
  | { readonly kind: 'move'; readonly point: Point2d }
  | { readonly kind: 'line'; readonly point: Point2d }
  | {
      readonly kind: 'cubic';
      readonly control1: Point2d;
      readonly control2: Point2d;
      readonly point: Point2d;
    };

export type ConnectorMarkerGlyph =
  | 'arrow'
  | 'triangle-open'
  | 'triangle-filled'
  | 'diamond-open'
  | 'diamond-filled'
  | 'circle'
  | 'bar'
  | 'crow-foot';

export interface ConnectorLabelGeometry {
  readonly id: string;
  readonly text: string;
  readonly point: Point2d;
}

export interface ConnectorStrokePresentation {
  readonly color: string;
  readonly width: number;
  readonly opacity: number;
  readonly dash: readonly number[];
}

export interface ConnectorPresentation {
  readonly stroke: ConnectorStrokePresentation;
  readonly sourceMarkers: readonly ConnectorMarkerGlyph[];
  readonly targetMarkers: readonly ConnectorMarkerGlyph[];
}

export interface ProjectedConnector {
  readonly id: string;
  readonly commands: readonly ConnectorPathCommand[];
  readonly samples: readonly Point2d[];
  readonly labels: readonly ConnectorLabelGeometry[];
  readonly presentation: ConnectorPresentation;
}
