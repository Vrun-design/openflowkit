import {
  IconArrowCurveLeft, IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp,
  IconArrowUpRight, IconBolt, IconBookmark, IconBrackets, IconBraces, IconCapsuleHorizontal, IconChevronRight,
  IconChartArea, IconChartBar, IconChartDots, IconChartDonut, IconChartLine, IconChartPie,
  IconChartRadar, IconCircle, IconCircleCheck, IconCircleNumber1, IconCircleX, IconCircles,
  IconCloud, IconCube, IconCylinder, IconDiamond, IconFile, IconFolder, IconGridDots,
  IconHeart, IconHexagon, IconIdBadge, IconLayersSubtract, IconLayoutList,
  IconLayoutSidebarRight, IconMessage, IconMinus, IconNote, IconOval, IconPin, IconPlus,
  IconPolygon, IconPrism, IconShape2, IconShape3, IconSquareRounded, IconStar,
  IconSquareDashed, IconTable, IconTarget, IconTriangle, IconUser, IconVectorBezier2,
} from '@tabler/icons-react';
import type { ConnectorRouteKind } from '../../domain/document/types';
import type { ChartKind } from '../../domain/nodes/chartNodePresentation';
import type { ShapeKind } from '../../domain/nodes/shapeNode';
import { IconHighlight, IconPencil } from '@tabler/icons-react';

// The rail's data: which tools exist, what a flyout offers, and how a picked
// option maps onto the document. Keeping it here lets the toolbar, the keyboard
// and the agent all name the same things.

export type V2Tool =
  | 'select' | 'hand'
  | 'rectangle' | 'ellipse'
  | 'shape'
  | 'connector'
  | 'text'
  | 'pen' | 'highlighter'
  | 'eraser' | 'lasso';

export type V2ConnectorTool = 'arrow' | 'line' | 'curve' | 'path';
export type V2InkTool = 'pen' | 'highlighter';
export type V2ChartKind = ChartKind;

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
  { id: 'triangle', label: 'Triangle', icon: IconTriangle },
  { id: 'circle', label: 'Circle', icon: IconCircle },
  { id: 'parallelogram', label: 'Parallelogram', icon: IconShape2 },
  { id: 'trapezoid', label: 'Trapezoid', icon: IconShape3 },
  { id: 'cylinder', label: 'Cylinder', icon: IconCylinder },
  { id: 'venn', label: 'Venn', icon: IconCircles },
  { id: 'document', label: 'Document', icon: IconFile },
  { id: 'speech-bubble', label: 'Speech bubble', icon: IconMessage },
  { id: 'hexagon', label: 'Hexagon', icon: IconHexagon },
  { id: 'star', label: 'Star', icon: IconStar },
  { id: 'check-circle', label: 'Check circle', icon: IconCircleCheck },
  { id: 'cross-circle', label: 'Cross circle', icon: IconCircleX },
  { id: 'heart', label: 'Heart', icon: IconHeart },
  { id: 'cloud', label: 'Cloud', icon: IconCloud },
  { id: 'arrow-up', label: 'Arrow up', icon: IconArrowUp },
  { id: 'arrow-down', label: 'Arrow down', icon: IconArrowDown },
  { id: 'arrow-left', label: 'Arrow left', icon: IconArrowLeft },
  { id: 'arrow-right', label: 'Arrow right', icon: IconArrowRight },
  { id: 'plus', label: 'Plus', icon: IconPlus },
  { id: 'lightning', label: 'Lightning', icon: IconBolt },
  { id: 'page', label: 'Note', icon: IconNote },
  { id: 'rounded', label: 'Rounded rectangle', icon: IconSquareRounded },
  { id: 'ellipse', label: 'Ellipse', icon: IconOval },
  { id: 'capsule', label: 'Pill', icon: IconCapsuleHorizontal },
  { id: 'octagon', label: 'Octagon', icon: IconPolygon },
  { id: 'pentagon-tag', label: 'Tag', icon: IconIdBadge },
  { id: 'chevron', label: 'Chevron', icon: IconChevronRight },
  { id: 'filled-bar', label: 'Bar', icon: IconMinus },
  { id: 'half-round', label: 'Half round', icon: IconLayoutSidebarRight },
  { id: 'bookmark', label: 'Bookmark', icon: IconBookmark },
  { id: 'folder', label: 'Folder', icon: IconFolder },
  { id: 'brace', label: 'Brace', icon: IconBraces },
  { id: 'bracket', label: 'Bracket', icon: IconBrackets },
  { id: 'numbered-circle', label: 'Numbered circle', icon: IconCircleNumber1 },
  { id: 'list-card', label: 'List card', icon: IconLayoutList },
  { id: 'cube', label: 'Cube', icon: IconCube },
  { id: 'prism', label: 'Prism', icon: IconPrism },
  { id: 'layer-stack', label: 'Layer stack', icon: IconLayersSubtract },
  { id: 'target', label: 'Target', icon: IconTarget },
  { id: 'pin', label: 'Pin', icon: IconPin },
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
  { id: 'path', label: 'Path', icon: IconVectorBezier2 },
];

export const INK_OPTIONS: readonly ToolOption<V2InkTool>[] = [
  { id: 'pen', label: 'Pen', icon: IconPencil },
  { id: 'highlighter', label: 'Highlighter', icon: IconHighlight },
];

export const CHART_OPTIONS: readonly ToolOption<V2ChartKind>[] = [
  { id: 'table', label: 'Table', icon: IconTable },
  { id: 'quadrant', label: 'Quadrant', icon: IconSquareDashed },
  { id: 'bar', label: 'Bar chart', icon: IconChartBar },
  { id: 'line', label: 'Line chart', icon: IconChartLine },
  { id: 'area', label: 'Area chart', icon: IconChartArea },
  { id: 'scatter', label: 'Scatter plot', icon: IconChartDots },
  { id: 'pie', label: 'Pie chart', icon: IconChartPie },
  { id: 'donut', label: 'Donut chart', icon: IconChartDonut },
  { id: 'radar', label: 'Radar chart', icon: IconChartRadar },
  { id: 'heatmap', label: 'Heatmap', icon: IconGridDots },
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
