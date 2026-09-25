import {
  IconArrowCurveLeft, IconArrowDown, IconArrowLeft, IconArrowRight, IconArrowUp,
  IconArrowUpRight, IconBolt, IconBookmark, IconBrackets, IconBraces, IconCapsuleHorizontal, IconChevronRight,
  IconChartArea, IconChartBar, IconChartDots, IconChartDonut, IconChartLine, IconChartPie,
  IconChartRadar, IconCircle, IconCircleCheck, IconCircleNumber1, IconCircleX, IconCircles,
  IconCloud, IconCornerDownRight, IconCube, IconCylinder, IconDiamond, IconFile, IconFolder, IconGridDots,
  IconHeart, IconHexagon, IconIdBadge, IconLayersSubtract, IconLayoutList,
  IconLayoutSidebarRight, IconMessage, IconMinus, IconNote, IconOval, IconPin, IconPlus,
  IconPolygon, IconPrism, IconShape2, IconShape3, IconSquareRounded, IconStar,
  IconSquareDashed, IconTable, IconTarget, IconTriangle, IconUser, IconVectorBezier2,
} from '@tabler/icons-react';
import type { ConnectorRouteKind } from '../../domain/document/types';
import type { ChartKind } from '../../domain/nodes/chartNodePresentation';
import type { ShapeKind } from '../../domain/nodes/shapeNode';
import {
  IconAdjustmentsHorizontal, IconAlertTriangle, IconAlignLeft, IconAntennaBars5, IconAppWindow,
  IconBrowser, IconCalendar, IconChevronsDown, IconChevronsRight, IconCircleDot, IconCirclePlus, IconCursorText,
  IconDeviceMobile, IconDeviceTablet, IconDotsCircleHorizontal, IconEraser, IconFlare, IconForms, IconFrame,
  IconHeading, IconHighlight, IconLasso, IconLayoutBottombar, IconLayoutCards, IconLayoutNavbar,
  IconLayoutSidebar, IconLink, IconList, IconMenu2, IconPencil, IconPhoto, IconProgress,
  IconRectangle, IconSearch, IconSeparatorHorizontal, IconSquareCheck, IconSquareChevronDown, IconStairs,
  IconSwitchHorizontal, IconTabs, IconTag, IconToggleRight, IconTooltip, IconUserCircle,
} from '@tabler/icons-react';
import type { FramePreset } from '../../domain/nodes/framePreset';
import { WIDGETS, type WidgetKind } from '../../domain/nodes/widgetNodePresentation';

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
  | 'eraser' | 'lasso' | 'laser';

export type V2ConnectorTool = 'arrow' | 'elbow' | 'curve' | 'line' | 'path';
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
  readonly shortcut?: string;
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

export const CONNECTOR_OPTIONS: readonly ToolOption<V2ConnectorTool>[] = [
  { id: 'arrow', label: 'Arrow', icon: IconArrowUpRight },
  { id: 'elbow', label: 'Elbow', icon: IconCornerDownRight },
  { id: 'curve', label: 'Curve', icon: IconArrowCurveLeft },
  { id: 'line', label: 'Line', icon: IconMinus },
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

/** The route a picked connector tool draws. The arrow goes where it is dragged,
 * like its icon; elbows are asked for. `polyline` is the click-by-click path. */
export const CONNECTOR_ROUTE: Readonly<Record<V2ConnectorTool, ConnectorRouteKind>> = {
  arrow: 'direct',
  elbow: 'orthogonal',
  line: 'direct',
  curve: 'bezier',
  path: 'polyline',
};

/** A line has no head; every other connector points at its target. */
export function connectorHeadEnd(kind: V2ConnectorTool): 'arrow' | 'none' {
  return kind === 'line' ? 'none' : 'arrow';
}

/** A More pick names its group, so one grid can hold frames, tools and widgets. */
export type V2MoreTool = 'lasso' | 'laser' | 'eraser' | 'sticky';
export type V2MoreItem = `frame:${FramePreset}` | `tool:${V2MoreTool}` | `widget:${WidgetKind}`;

export interface ToolSection<T extends string> {
  readonly title: string;
  readonly options: readonly ToolOption<T>[];
}

/** The More flyout, in Koboyo's order: frames, drawing tools, then the wireframe kit. */
export const MORE_SECTIONS: readonly ToolSection<V2MoreItem>[] = [
  {
    title: 'Frames',
    options: [
      { id: 'frame:frame', label: 'Frame', icon: IconFrame, shortcut: 'F' },
      { id: 'frame:phone', label: 'Phone', icon: IconDeviceMobile },
      { id: 'frame:tablet', label: 'Tablet', icon: IconDeviceTablet },
      { id: 'frame:browser', label: 'Browser', icon: IconBrowser },
      { id: 'frame:window', label: 'Window', icon: IconAppWindow },
    ],
  },
  {
    title: 'Tools',
    options: [
      { id: 'tool:lasso', label: 'Lasso', icon: IconLasso, shortcut: 'Q' },
      { id: 'tool:laser', label: 'Laser pointer', icon: IconFlare, shortcut: 'K' },
      { id: 'tool:eraser', label: 'Eraser', icon: IconEraser, shortcut: 'X' },
      { id: 'tool:sticky', label: 'Sticky note', icon: IconNote, shortcut: 'N' },
    ],
  },
  {
    title: 'Wireframe',
    options: ([
      ['button', IconRectangle], ['input', IconCursorText], ['search', IconSearch], ['checkbox', IconSquareCheck],
      ['radio', IconCircleDot], ['toggle', IconToggleRight], ['dropdown', IconSquareChevronDown],
      ['slider', IconAdjustmentsHorizontal], ['navbar', IconLayoutNavbar], ['tabs', IconTabs], ['image', IconPhoto],
      ['avatar', IconUserCircle], ['heading', IconHeading], ['paragraph', IconAlignLeft],
      ['divider', IconSeparatorHorizontal], ['link', IconLink], ['textarea', IconForms], ['stepper', IconStairs],
      ['badge', IconTag], ['progress', IconProgress], ['breadcrumbs', IconChevronsRight],
      ['pagination', IconDotsCircleHorizontal], ['rating', IconStar], ['card', IconLayoutCards], ['list', IconList],
      ['alert', IconAlertTriangle], ['menu', IconMenu2], ['tooltip', IconTooltip], ['accordion', IconChevronsDown],
      ['datepicker', IconCalendar], ['sidebar', IconLayoutSidebar],
      ['segmented', IconSwitchHorizontal], ['tabbar', IconLayoutBottombar], ['statusbar', IconAntennaBars5],
      ['fab', IconCirclePlus],
    ] as const).map(([widget, icon]) => ({ id: `widget:${widget}` as const, label: WIDGETS[widget].name, icon })),
  },
];
