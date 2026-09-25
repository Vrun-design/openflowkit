import type { SceneNode, ScenePage } from '../document/types';
import type { Point2d, Size2d } from '../geometry/types';
import { nextNodeZIndex } from './shapeNode';
import type { WidgetPrimitive } from './widgetNodePresentation';

// Frames from the More flyout: a `frame` container carrying `content.preset`.
// A preset frame adopts what is dropped on it (it is a container), names itself
// above its top edge like Figma, and draws its device chrome from the same
// primitives the wireframe widgets use, so Pixi and SVG agree.

export const FRAME_PRESETS = ['frame', 'phone', 'tablet', 'browser', 'window'] as const;
export type FramePreset = (typeof FRAME_PRESETS)[number];

interface FramePresetSpec {
  readonly name: string;
  readonly size: Size2d;
  readonly radius: number;
}

export const FRAME_PRESET_SPECS: Readonly<Record<FramePreset, FramePresetSpec>> = {
  frame: { name: 'Frame', size: { width: 480, height: 360 }, radius: 4 },
  phone: { name: 'Phone', size: { width: 360, height: 740 }, radius: 36 },
  tablet: { name: 'Tablet', size: { width: 600, height: 800 }, radius: 28 },
  browser: { name: 'Browser', size: { width: 960, height: 640 }, radius: 10 },
  window: { name: 'Window', size: { width: 800, height: 520 }, radius: 10 },
};

/** How far the frame's name sits above its top edge, and its band height. */
export const FRAME_NAME_OFFSET = 24;
export const FRAME_NAME_HEIGHT = 20;

export function isFramePreset(value: unknown): value is FramePreset {
  return typeof value === 'string' && value in FRAME_PRESET_SPECS;
}

export function framePresetOf(node: SceneNode): FramePreset | null {
  return node.kind === 'frame' && isFramePreset(node.content.preset) ? node.content.preset : null;
}

/** Height of the chrome band at the top: content placed inside starts below it. */
export function frameChromeInset(preset: FramePreset): number {
  if (preset === 'browser') return 44;
  if (preset === 'window') return 36;
  if (preset === 'phone') return 40;
  if (preset === 'tablet') return 28;
  return 0;
}

/** Room kept clear at the bottom for a device's home bar or button. */
export function frameBottomInset(preset: FramePreset): number {
  if (preset === 'phone') return 28;
  if (preset === 'tablet') return 36;
  return 0;
}

function trafficLights(y: number): WidgetPrimitive[] {
  return [16, 32, 48].map((x) => ({ kind: 'circle', x, y, radius: 4.5, stroke: 'line', strokeWidth: 1 }));
}

const rule = (from: Point2d, to: Point2d): WidgetPrimitive =>
  ({ kind: 'path', points: [from, to], closed: false, stroke: 'line', strokeWidth: 1 });

export function frameChromePrimitives(preset: FramePreset, size: Size2d): readonly WidgetPrimitive[] {
  const { width: w, height: h } = size;
  switch (preset) {
    case 'phone':
      return [
        rule({ x: w / 2 - 28, y: 20 }, { x: w / 2 + 28, y: 20 }),
        { kind: 'path', points: [{ x: w / 2 - 56, y: h - 12 }, { x: w / 2 + 56, y: h - 12 }], closed: false, stroke: 'line', strokeWidth: 2 },
      ];
    case 'tablet':
      return [
        { kind: 'circle', x: w / 2, y: 14, radius: 3, stroke: 'line', strokeWidth: 1 },
        { kind: 'circle', x: w / 2, y: h - 20, radius: 7, stroke: 'line', strokeWidth: 1 },
      ];
    case 'browser':
      return [
        ...trafficLights(22),
        { kind: 'rect', x: 68, y: 11, width: Math.max(0, w - 84), height: 22, radius: 11, stroke: 'line', strokeWidth: 1 },
        rule({ x: 0, y: 44 }, { x: w, y: 44 }),
      ];
    case 'window':
      return [...trafficLights(18), rule({ x: 0, y: 36 }, { x: w, y: 36 })];
    case 'frame':
      return [];
  }
}

export interface CreatePresetFrameOptions {
  readonly id: string;
  readonly preset: FramePreset;
  /** Top-left corner. */
  readonly at: Point2d;
  readonly size?: Size2d;
  readonly label?: string;
}

export function createPresetFrame(page: ScenePage, options: CreatePresetFrameOptions): SceneNode {
  const spec = FRAME_PRESET_SPECS[options.preset];
  return {
    id: options.id,
    kind: 'frame',
    parentId: null,
    layerId: page.layers[0]?.id ?? 'default',
    // Frames sit under whatever is later dropped on them; the container layer
    // draws below nodes regardless, this keeps export order the same.
    zIndex: nextNodeZIndex(page),
    transform: { translation: { ...options.at }, rotationRadians: 0, scale: { x: 1, y: 1 } },
    size: { ...(options.size ?? spec.size) },
    content: { preset: options.preset, label: options.label ?? spec.name },
    appearance: {
      fill: '#ffffff', stroke: '#555952', strokeWidth: 1.5, cornerRadius: spec.radius,
      fontSize: 12, fontWeight: 500,
    },
    ports: [],
    metadata: {},
    extensions: {},
  };
}

const FRAME_PADDING = 16;
const FRAME_GAP = 12;

/**
 * Where the next widget goes in a preset frame, frame-local: under the lowest
 * child (or the chrome), inset by the padding. `stretch` spans the column.
 * `frameHeight` is how tall the frame must be to hold it (never shorter than now).
 */
export function nextFrameSlot(
  page: ScenePage, frame: SceneNode, size: Size2d, stretch = false
): { readonly at: Point2d; readonly size: Size2d; readonly frameHeight: number } {
  const preset = framePresetOf(frame) ?? 'frame';
  const top = frameChromeInset(preset) + FRAME_PADDING;
  const bottom = page.nodes
    .filter((node) => node.parentId === frame.id)
    .reduce((lowest, node) => Math.max(lowest, node.transform.translation.y + node.size.height + FRAME_GAP), top);
  const column = frame.size.width - FRAME_PADDING * 2;
  return {
    at: { x: FRAME_PADDING, y: bottom },
    size: { width: Math.max(1, stretch ? column : Math.min(size.width, column)), height: size.height },
    frameHeight: Math.max(frame.size.height, bottom + size.height + FRAME_PADDING + frameBottomInset(preset)),
  };
}

/** The preset frame a node is, or sits in (at any depth); null when none. */
export function enclosingPresetFrame(page: ScenePage, nodeId: string | null): SceneNode | null {
  const seen = new Set<string>();
  let node = nodeId ? page.nodes.find((candidate) => candidate.id === nodeId) : undefined;
  while (node && !seen.has(node.id)) {
    if (framePresetOf(node)) return node;
    seen.add(node.id);
    const parentId = node.parentId;
    node = parentId ? page.nodes.find((candidate) => candidate.id === parentId) : undefined;
  }
  return null;
}
