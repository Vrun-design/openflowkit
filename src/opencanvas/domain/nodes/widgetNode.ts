import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import type { JsonObject } from '../document/json';
import { nextNodeZIndex } from './shapeNode';
import { WIDGETS, type WidgetKind, type WidgetVariant } from './widgetNodePresentation';

export interface CreateWidgetNodeOptions {
  readonly id: string;
  readonly widget: WidgetKind;
  /** Top-left corner. */
  readonly at: Point2d;
  readonly size?: Size2d;
  /** Overrides the widget's placeholder label; '' is allowed. */
  readonly label?: string;
  readonly checked?: boolean;
  readonly value?: number;
  readonly active?: number;
  readonly variant?: WidgetVariant;
  readonly parentId?: string | null;
}

/** One factory for the rail, the agent and the `wireframe` compiler. */
export function createWidgetNode(page: ScenePage, options: CreateWidgetNodeOptions): SceneNode {
  const spec = WIDGETS[options.widget];
  const state: JsonObject = {
    ...spec.initial,
    ...(options.checked === undefined ? {} : { checked: options.checked }),
    ...(options.value === undefined ? {} : { value: Math.min(1, Math.max(0, options.value)) }),
    ...(options.active === undefined ? {} : { active: options.active }),
    ...(options.variant === undefined ? {} : { variant: options.variant }),
  };
  return {
    id: options.id,
    kind: 'widget',
    parentId: options.parentId ?? null,
    layerId: page.layers[0]?.id ?? 'default',
    zIndex: nextNodeZIndex(page),
    transform: { translation: { ...options.at }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { ...(options.size ?? spec.size) },
    content: { widget: options.widget, label: options.label ?? spec.label, ...state },
    appearance: { fill: '#ffffff', stroke: '#555952', strokeWidth: 1.5 },
    ports: [],
    metadata: {},
    extensions: {},
  };
}
