import { Container, Graphics, type Text } from 'pixi.js';
import type { SceneNode } from '../../domain/document/types';
import type { Matrix2d } from '../../domain/geometry/types';
import { applyMatrixToPoint } from '../../domain/geometry/matrix';
import { resolveNodeStyle, type NodeStyle } from '../../domain/nodes/nodeStyle';
import {
  resolveWidgetInks, resolveWidgetPresentation, widgetBackdrop, type WidgetInk, type WidgetInkPaint, type WidgetPrimitive,
} from '../../domain/nodes/widgetNodePresentation';
import { pixiHexColor } from './pixiColor';
import { createStyledPixiText } from './pixiText';
import type { PixiNodeDebugRecord } from './pixiNodeDebug';
import { drawPixiLocalRect } from './pixiNodeOutline';
import { applyPixiNodeMatrix } from './pixiNodeTransform';

type Inks = Readonly<Record<WidgetInk, WidgetInkPaint>>;
/** Makes (or reuses) a label; the node renderer passes its text pool. */
export type PixiTextFactory = (text: string, style: NodeStyle, fill: number) => Text;

const freshText: PixiTextFactory = (text, style, fill) => createStyledPixiText(text, style, fill, null);

/**
 * Paints widget primitives: shapes into the shared graphics in world space,
 * text into `label` in node-local space (the caller gives `label` the node
 * matrix). Frame chrome goes through here too, with no text and no label.
 */
export function drawWidgetPrimitives(
  graphics: Graphics,
  label: Container | null,
  primitives: readonly WidgetPrimitive[],
  matrix: Matrix2d,
  inks: Inks,
  style: NodeStyle,
  makeText: PixiTextFactory = freshText
): void {
  const scale = Math.sqrt(Math.abs(matrix.a * matrix.d - matrix.b * matrix.c)) || 1;
  const paint = (primitive: Exclude<WidgetPrimitive, { kind: 'text' }>) => {
    const opacity = (primitive.opacity ?? 1) * style.opacity;
    if (primitive.fill) {
      const ink = inks[primitive.fill];
      graphics.fill({ color: pixiHexColor(ink.color, 0xffffff), alpha: ink.alpha * opacity });
    }
    if (primitive.stroke) {
      const ink = inks[primitive.stroke];
      const width = primitive.strokeWidth ?? style.strokeWidth;
      if (width > 0) graphics.stroke({ color: pixiHexColor(ink.color, 0x555952), alpha: ink.alpha * opacity, width: width * scale });
    }
  };
  for (const primitive of primitives) {
    if (primitive.kind === 'text') {
      if (!primitive.text || !label) continue;
      const ink = inks[primitive.ink];
      const text = makeText(primitive.text,
        { ...style, fontSize: primitive.size, fontWeight: primitive.weight, fontStyle: 'normal', letterSpacing: 0, lineHeight: 1.2 },
        pixiHexColor(ink.color, 0x334155));
      text.alpha = ink.alpha * style.opacity;
      text.anchor.set(primitive.anchor === 'start' ? 0 : primitive.anchor === 'end' ? 1 : 0.5, 0.5);
      text.position.set(primitive.x, primitive.y);
      label.addChild(text);
      continue;
    }
    if (primitive.kind === 'rect') {
      if (primitive.width <= 0 || primitive.height <= 0) continue;
      const radius = Math.min(primitive.radius, primitive.width / 2, primitive.height / 2);
      drawPixiLocalRect(graphics, { x: primitive.x, y: primitive.y, width: primitive.width, height: primitive.height }, matrix, radius);
    } else if (primitive.kind === 'circle') {
      if (primitive.radius <= 0) continue;
      const centre = applyMatrixToPoint(matrix, primitive);
      graphics.circle(centre.x, centre.y, primitive.radius * scale);
    } else {
      const points = primitive.points.map((point) => applyMatrixToPoint(matrix, point));
      if (points.length < 2) continue;
      if (primitive.closed) {
        graphics.poly(points.flatMap((point) => [point.x, point.y]));
      } else {
        graphics.moveTo(points[0]!.x, points[0]!.y);
        for (const point of points.slice(1)) graphics.lineTo(point.x, point.y);
      }
    }
    paint(primitive);
  }
}

export class PixiWidgetNodeRenderer {
  constructor(private readonly makeText: PixiTextFactory = freshText) {}

  drawNode(
    node: SceneNode,
    matrix: Matrix2d,
    graphics: Graphics,
    canvasColor: string,
    parentOf: (id: string) => SceneNode | undefined
  ): { label: Container; debug: PixiNodeDebugRecord } | null {
    const presentation = resolveWidgetPresentation(node);
    if (!presentation) return null;
    const style = resolveNodeStyle(node, canvasColor);
    const inks = resolveWidgetInks(node, style, widgetBackdrop(node, parentOf, canvasColor));
    // A fresh container per draw: the node renderer destroys every label
    // container each frame, so nothing here may outlive one draw.
    const label = new Container();
    applyPixiNodeMatrix(label, matrix);
    drawWidgetPrimitives(graphics, label, presentation.primitives, matrix, inks, style, this.makeText);
    return {
      label,
      debug: {
        id: node.id, kind: 'widget', shape: presentation.widget,
        fill: pixiHexColor(inks.surface.color, 0xffffff), stroke: pixiHexColor(inks.line.color, 0x555952),
        textColor: pixiHexColor(inks.ink.color, 0x334155),
        mediaState: 'none',
      },
    };
  }
}
