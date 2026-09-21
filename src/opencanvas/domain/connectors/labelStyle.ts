import type { SceneConnector } from '../document/types';
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
      fontSize: a.labelFontSize ?? 11,
      fontFamily: a.labelFontFamily ?? 'sans',
      fontWeight: a.labelFontWeight ?? 600,
      fontStyle: a.labelFontStyle ?? 'normal',
      textDecoration: a.labelTextDecoration ?? 'none',
      textPadding: 5,
      cornerRadius: 4,
    },
  });
  cache.set(a, style);
  return style;
}
