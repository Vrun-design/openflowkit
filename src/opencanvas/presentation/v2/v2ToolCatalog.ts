import {
  IconArrowCurveLeft, IconArrowUpRight, IconCapsuleHorizontal, IconCircle, IconCloud,
  IconCylinder, IconDiamond, IconFile, IconHexagon, IconMinus, IconOval, IconPolygon,
  IconRectangle, IconSquareRounded, IconUser,
} from '@tabler/icons-react';
import type { ConnectorRouteKind } from '../../domain/document/types';
import type { ShapeKind } from '../../domain/nodes/shapeNode';

// The rail's data: which tools exist, what a flyout offers, and how a picked
// option maps onto the document. Keeping it here lets the toolbar, the keyboard
// and the agent all name the same things.

export type V2Tool =
  | 'select' | 'hand'
  | 'rectangle' | 'ellipse'
  | 'shape'
  | 'connector'
  | 'text';

export type V2ConnectorTool = 'arrow' | 'line' | 'curve' | 'path';

export interface V2ToolConfig {
  /** Last shape picked in the shapes flyout; the `shape` tool draws it. */
  readonly shape: ShapeKind;
  /** Last connector picked in the connector flyout; the `connector` tool draws it. */
  readonly connector: V2ConnectorTool;
}

export const DEFAULT_TOOL_CONFIG: V2ToolConfig = { shape: 'diamond', connector: 'arrow' };

export type TablerIcon = typeof IconDiamond;

export interface ToolOption<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly icon: TablerIcon;
}

/** Grid order matches the reference rail: pointy, round, then the box family. */
export const SHAPE_OPTIONS: readonly ToolOption<ShapeKind>[] = [
  { id: 'diamond', label: 'Diamond', icon: IconDiamond },
  { id: 'circle', label: 'Circle', icon: IconCircle },
  { id: 'ellipse', label: 'Ellipse', icon: IconOval },
  { id: 'rectangle', label: 'Rectangle', icon: IconRectangle },
  { id: 'rounded', label: 'Rounded rectangle', icon: IconSquareRounded },
  { id: 'capsule', label: 'Pill', icon: IconCapsuleHorizontal },
  { id: 'parallelogram', label: 'Parallelogram', icon: IconPolygon },
  { id: 'hexagon', label: 'Hexagon', icon: IconHexagon },
  { id: 'cylinder', label: 'Cylinder', icon: IconCylinder },
  { id: 'document', label: 'Document', icon: IconFile },
  { id: 'cloud', label: 'Cloud', icon: IconCloud },
  { id: 'actor', label: 'Actor', icon: IconUser },
];

const SHAPE_BY_ID = new Map(SHAPE_OPTIONS.map((option) => [option.id, option]));

export function shapeOption(kind: ShapeKind): ToolOption<ShapeKind> {
  return SHAPE_BY_ID.get(kind) ?? SHAPE_OPTIONS[0]!;
}

export const CONNECTOR_OPTIONS: readonly ToolOption<V2ConnectorTool>[] = [
  { id: 'arrow', label: 'Arrow', icon: IconArrowUpRight },
  { id: 'line', label: 'Line', icon: IconMinus },
  { id: 'curve', label: 'Curve', icon: IconArrowCurveLeft },
  { id: 'path', label: 'Path', icon: IconPolygon },
];

const CONNECTOR_BY_ID = new Map(CONNECTOR_OPTIONS.map((option) => [option.id, option]));

export function connectorOption(kind: V2ConnectorTool): ToolOption<V2ConnectorTool> {
  return CONNECTOR_BY_ID.get(kind) ?? CONNECTOR_OPTIONS[0]!;
}

/** The route a picked connector tool draws. `polyline` is the click-by-click path. */
export const CONNECTOR_ROUTE: Readonly<Record<V2ConnectorTool, ConnectorRouteKind>> = {
  arrow: 'orthogonal',
  line: 'direct',
  curve: 'bezier',
  path: 'polyline',
};

/** A line has no head; the other three point at their target. */
export function connectorHeadEnd(kind: V2ConnectorTool): 'arrow' | 'none' {
  return kind === 'line' ? 'none' : 'arrow';
}
