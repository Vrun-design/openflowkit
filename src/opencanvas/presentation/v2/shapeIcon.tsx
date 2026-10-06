import type { IconProps } from '@tabler/icons-react';
import { basicNodeOutlinePoints } from '../../domain/nodes/basicNodeOutline';
import { basicNodeDecorations } from '../../domain/nodes/basicNodeDecorations';
import type { BasicNodeShape } from '../../domain/nodes/basicNodePresentation';
import { defaultShapeSize, type ShapeKind } from '../../domain/nodes/shapeNode';
import type { Point2d } from '../../domain/geometry/types';
import type { IconComponent } from '../design-system/Icon';

// Picker icons drawn from the outline the canvas and export draw, at the shape's
// own default proportions, so a cell can never show a different shape than it places.

const VIEW = 24;
const BOX = 19;

type IconShape = Exclude<BasicNodeShape & ShapeKind, 'text'>;

/** An SVG path for the shape's real outline (closed) and its decorations (open), fitted into 24×24. */
export function shapeIconPath(shape: IconShape): string {
  const size = defaultShapeSize(shape);
  const scale = BOX / Math.max(size.width, size.height);
  const dx = (VIEW - size.width * scale) / 2;
  const dy = (VIEW - size.height * scale) / 2;
  const at = ({ x, y }: Point2d) => `${(dx + x * scale).toFixed(2)} ${(dy + y * scale).toFixed(2)}`;
  const run = (points: readonly Point2d[], close: boolean) => `M${points.map(at).join('L')}${close ? 'Z' : ''}`;
  return [
    run(basicNodeOutlinePoints(shape, size), true),
    ...basicNodeDecorations(shape, size).filter((line) => line.length > 1).map((line) => run(line, false)),
  ].join('');
}

/** A Tabler-compatible icon from one 24×24 stroke path, for picks Tabler has no glyph for. */
export function pathIcon(d: string): IconComponent {
  const PathIcon = ({ size = VIEW, stroke = 2, ...rest }: IconProps) => (
    <svg {...rest} width={size} height={size} viewBox={`0 0 ${VIEW} ${VIEW}`} fill="none"
      stroke="currentColor" strokeWidth={stroke} strokeLinejoin="round" strokeLinecap="round">
      <path d={d} />
    </svg>
  );
  return PathIcon;
}

const icons = new Map<IconShape, IconComponent>();

/** A Tabler-compatible icon component for a shape; one per shape, made once. */
export function shapeIcon(shape: IconShape): IconComponent {
  const cached = icons.get(shape);
  if (cached) return cached;
  const icon = pathIcon(shapeIconPath(shape));
  icons.set(shape, icon);
  return icon;
}
