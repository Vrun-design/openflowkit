import type { Point2d } from '../geometry/types';
import type { ConnectorMarkerGlyph } from './types';

/**
 * Arrowhead and end-glyph geometry in world space. The SVG export and the
 * motion frame painter both format these points, so a marker cannot look
 * different in a still than it does in a video frame.
 */
export type MarkerShape =
  | {
      readonly kind: 'polygon';
      /** One entry per subpath; a cross is two, everything else is one. */
      readonly subpaths: readonly (readonly Point2d[])[];
      readonly closed: boolean;
      readonly filled: boolean;
      /** `stroke-linejoin: round` (the open arrow chevron). */
      readonly round: boolean;
    }
  | { readonly kind: 'circle'; readonly center: Point2d; readonly radius: number };

function offsetPoint(point: Point2d, direction: Point2d, distance: number): Point2d {
  return { x: point.x + direction.x * distance, y: point.y + direction.y * distance };
}

/**
 * The glyphs `markerMarkup` can draw, at `endpoint` with `outward` pointing
 * away from the line. `offset` stacks glyphs when an end carries several.
 * Glyphs the exporter has never drawn (crow-foot) return nothing.
 */
export function connectorMarkerShapes(
  glyph: ConnectorMarkerGlyph,
  endpoint: Point2d,
  outward: Point2d,
  offset: number
): readonly MarkerShape[] {
  const tip = offsetPoint(endpoint, outward, -offset);
  const normal = { x: -outward.y, y: outward.x };
  if (glyph === 'arrow') {
    const back = offsetPoint(tip, outward, -9);
    return [{
      kind: 'polygon', closed: false, filled: false, round: true,
      subpaths: [[offsetPoint(back, normal, 4.5), tip, offsetPoint(back, normal, -4.5)]],
    }];
  }
  if (glyph === 'triangle-open' || glyph === 'triangle-filled') {
    const back = offsetPoint(tip, outward, -9);
    return [{
      kind: 'polygon', closed: true, filled: glyph === 'triangle-filled', round: false,
      subpaths: [[tip, offsetPoint(back, normal, 4.5), offsetPoint(back, normal, -4.5)]],
    }];
  }
  if (glyph === 'diamond-open' || glyph === 'diamond-filled') {
    const far = offsetPoint(tip, outward, -14);
    const middle = offsetPoint(tip, outward, -7);
    return [{
      kind: 'polygon', closed: true, filled: glyph === 'diamond-filled', round: false,
      subpaths: [[tip, offsetPoint(middle, normal, 4.5), far, offsetPoint(middle, normal, -4.5)]],
    }];
  }
  if (glyph === 'circle') {
    return [{ kind: 'circle', center: offsetPoint(tip, outward, -5), radius: 4 }];
  }
  if (glyph === 'bar') {
    const center = offsetPoint(tip, outward, -3);
    return [{
      kind: 'polygon', closed: false, filled: false, round: false,
      subpaths: [[offsetPoint(center, normal, 5), offsetPoint(center, normal, -5)]],
    }];
  }
  if (glyph === 'cross') {
    const center = offsetPoint(tip, outward, -5);
    return [{
      kind: 'polygon', closed: false, filled: false, round: false,
      subpaths: [
        [offsetPoint(offsetPoint(center, normal, 4.5), outward, 4.5),
          offsetPoint(offsetPoint(center, normal, -4.5), outward, -4.5)],
        [offsetPoint(offsetPoint(center, normal, 4.5), outward, -4.5),
          offsetPoint(offsetPoint(center, normal, -4.5), outward, 4.5)],
      ],
    }];
  }
  return [];
}
