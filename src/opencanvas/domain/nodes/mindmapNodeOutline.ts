import type { Point2d, Size2d } from '../geometry/types';
import { basicNodeOutlinePoints } from './basicNodeOutline';
import type { BasicNodeShape } from './basicNodePresentation';

export type MindmapOutlineShape = BasicNodeShape | 'ellipse' | 'hexagon';

function ellipsePoints(size: Size2d): readonly Point2d[] {
  return Array.from({ length: 24 }, (_, index) => {
    const angle = (index * Math.PI * 2) / 24;
    return {
      x: size.width / 2 + Math.cos(angle) * (size.width / 2),
      y: size.height / 2 + Math.sin(angle) * (size.height / 2),
    };
  });
}

function hexagonPoints(size: Size2d): readonly Point2d[] {
  const inset = Math.min(size.width * 0.18, size.height * 0.55);
  return [
    { x: inset, y: 0 },
    { x: size.width - inset, y: 0 },
    { x: size.width, y: size.height / 2 },
    { x: size.width - inset, y: size.height },
    { x: inset, y: size.height },
    { x: 0, y: size.height / 2 },
  ];
}

export function mindmapNodeOutlinePoints(
  shape: MindmapOutlineShape,
  size: Size2d
): readonly Point2d[] {
  if (shape === 'ellipse') return ellipsePoints(size);
  if (shape === 'hexagon') return hexagonPoints(size);
  return basicNodeOutlinePoints(shape, size);
}
