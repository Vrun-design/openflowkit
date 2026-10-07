import type { SceneConnector } from '../document/types';
import type { Bounds2d, Point2d } from '../geometry/types';
import { resolveNodeStyle, type NodeStyle } from '../nodes/nodeStyle';

// Connector labels share the node style vocabulary (docs/plan/phase-1-style.md
// §1) under `label*` appearance keys, so the renderer, the label editor and
// the style bar use one NodeStyle for both. `fill` is the label plate,
// `stroke` its border.
// Presentation resolves every connector every frame while dragging; the
// appearance object is immutable, so its identity is the cache key.
const cache = new WeakMap<object, NodeStyle>();

export function resolveConnectorLabelStyle(connector: SceneConnector): NodeStyle {
  const a = connector.appearance;
  const cached = cache.get(a);
  if (cached) return cached;
  const style = resolveNodeStyle({
    id: connector.id, kind: 'text', parentId: null, layerId: '', zIndex: 0,
    transform: { translation: { x: 0, y: 0 }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { width: 0, height: 0 }, content: {}, ports: [], metadata: {}, extensions: {},
    appearance: {
      fill: a.labelBackground ?? '#ffffff',
      stroke: a.labelBorder ?? '#e2e8f0',
      strokeWidth: 1,
      textColor: a.labelColor ?? '#334155',
      fontSize: a.labelFontSize ?? 12,
      fontFamily: a.labelFontFamily ?? 'sans',
      fontWeight: a.labelFontWeight ?? 500,
      fontStyle: a.labelFontStyle ?? 'normal',
      textDecoration: a.labelTextDecoration ?? 'none',
      textPadding: 5,
      cornerRadius: 4,
    },
  });
  cache.set(a, style);
  return style;
}

/** Labels wrap here, as the canvas draws them. */
export const LABEL_WRAP_WIDTH = 140;

// ponytail: exporters cannot measure text, so widths are estimated per character — upgrade to a
// shared metrics table if long labels overflow. The plate is padded generously (0.58em); where a
// line breaks is closer to Inter's real average (about 0.5em), so the file wraps where the canvas does.
const CHAR_EM = 0.58;
const WRAP_EM = 0.5;

/** The lines a label breaks into: the author's own breaks, then greedy word wrap at LABEL_WRAP_WIDTH. */
export function connectorLabelLines(text: string, style: NodeStyle): readonly string[] {
  const charWidth = style.fontSize * WRAP_EM;
  return text.split('\n').flatMap((paragraph) => {
    const lines: string[] = [];
    let line = '';
    for (const word of paragraph.split(/\s+/).filter(Boolean)) {
      if (line && (line.length + 1 + word.length) * charWidth > LABEL_WRAP_WIDTH) {
        lines.push(line);
        line = word;
      } else {
        line = line ? `${line} ${word}` : word;
      }
    }
    return [...lines, line];
  });
}

/** The height of one label line, as the plate counts it. */
export function connectorLabelLineHeight(style: NodeStyle): number {
  return style.fontSize * 1.25;
}

/** The plate behind a label, centred on its point, padded as the canvas pads it. */
export function connectorLabelPlate(text: string, style: NodeStyle, point: Point2d): Bounds2d {
  const lines = connectorLabelLines(text, style);
  const width = Math.max(...lines.map((line) => line.length)) * style.fontSize * CHAR_EM + style.textPadding * 2;
  const height = lines.length * connectorLabelLineHeight(style) + style.textPadding;
  return { x: point.x - width / 2, y: point.y - height / 2, width, height };
}
