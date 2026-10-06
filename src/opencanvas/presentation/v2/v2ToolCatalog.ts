import {
  IconArrowCurveLeft, IconArrowUpRight, IconChartArea, IconChartBar, IconChartDots, IconChartDonut, IconChartLine,
  IconChartPie, IconChartRadar, IconCornerDownRight, IconGridDots, IconNote, IconStar, IconSquareDashed,
  IconTable,
} from '@tabler/icons-react';
import type { ConnectorRouteKind } from '../../domain/document/types';
import type { ChartKind } from '../../domain/nodes/chartNodePresentation';
import type { LibraryShape, ShapeKind } from '../../domain/nodes/shapeNode';
import type { IconComponent } from '../design-system/Icon';
import { shapeIcon } from './shapeIcon';
import {
  IconAdjustmentsHorizontal, IconAlertTriangle, IconAlignLeft, IconAntennaBars5, IconAppWindow, IconBrowser,
  IconCalendar, IconChevronsDown, IconChevronsRight, IconCircleDot, IconCirclePlus, IconCursorText, IconDeviceMobile,
  IconDeviceTablet, IconDotsCircleHorizontal, IconEraser, IconFlare, IconForms, IconFrame, IconHeading,
  IconHighlight, IconLayoutBottombar, IconLayoutCards, IconLayoutNavbar, IconLayoutSidebar, IconLink,
  IconList, IconMenu2, IconPencil, IconPhoto, IconProgress, IconRectangle, IconSearch, IconSeparatorHorizontal,
  IconSquareCheck, IconSquareChevronDown, IconStairs, IconSwitchHorizontal, IconTabs, IconTag, IconToggleRight,
  IconTooltip, IconUserCircle, IconHandStop, IconPhotoPlus, IconPointer,
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
  | 'eraser' | 'laser';

export type V2ConnectorTool = 'arrow' | 'elbow' | 'curve';
export type V2ChartKind = ChartKind;

export interface V2ToolConfig {
  /** Last shape picked in the shapes flyout; the `shape` tool draws it. */
  readonly shape: ShapeKind;
  /** Last connector picked in the connector flyout; the `connector` tool draws it. */
  readonly connector: V2ConnectorTool;
}

export const DEFAULT_TOOL_CONFIG: V2ToolConfig = { shape: 'diamond', connector: 'arrow' };

export type TablerIcon = IconComponent;

export interface ToolOption<T extends string> {
  readonly id: T;
  readonly label: string;
  readonly icon: TablerIcon;
  readonly shortcut?: string;
}

export interface ToolSection<T extends string> {
  readonly title: string;
  readonly options: readonly ToolOption<T>[];
}

/**
 * The picker's shapes: what diagrams actually use. The rest of the library
 * (3D, icon-like, brackets…) still draws for old documents and DSL words; it is
 * just not offered. Each cell's icon is the shape's own outline.
 */
const PICKER_SHAPES: readonly (readonly [LibraryShape, string])[] = [
  ['diamond', 'Diamond'], ['triangle', 'Triangle'], ['circle', 'Circle'], ['parallelogram', 'Parallelogram'],
  ['trapezoid', 'Trapezoid'], ['hexagon', 'Hexagon'], ['octagon', 'Octagon'], ['cylinder', 'Cylinder'],
  ['document', 'Document'], ['page', 'Note'], ['speech-bubble', 'Speech bubble'], ['cloud', 'Cloud'],
  ['folder', 'Folder'], ['rounded', 'Rounded rectangle'], ['capsule', 'Pill'], ['chevron', 'Chevron'],
  ['pentagon-tag', 'Tag'], ['arrow-right', 'Arrow'], ['star', 'Star'],
];

export const SHAPE_OPTIONS: readonly ToolOption<ShapeKind>[] = PICKER_SHAPES.map(([id, label]) => ({ id, label, icon: shapeIcon(id) }));

export const CONNECTOR_OPTIONS: readonly ToolOption<V2ConnectorTool>[] = [
  { id: 'arrow', label: 'Arrow', icon: IconArrowUpRight },
  { id: 'elbow', label: 'Elbow', icon: IconCornerDownRight },
  { id: 'curve', label: 'Curve', icon: IconArrowCurveLeft },
];

/** Pointer flyout: ways to point at the canvas without drawing on it. */
export const POINTER_OPTIONS: readonly ToolOption<V2Tool>[] = [
  { id: 'select', label: 'Select', icon: IconPointer, shortcut: 'V' },
  { id: 'hand', label: 'Hand', icon: IconHandStop, shortcut: 'H' },
];

/** Draw flyout: freehand marks, and the tools that remove or point at them. */
export const DRAW_OPTIONS: readonly ToolOption<V2Tool>[] = [
  { id: 'pen', label: 'Pen', icon: IconPencil, shortcut: 'P' },
  { id: 'highlighter', label: 'Highlighter', icon: IconHighlight, shortcut: '⇧P' },
  { id: 'eraser', label: 'Eraser', icon: IconEraser, shortcut: 'X' },
  { id: 'laser', label: 'Laser pointer', icon: IconFlare, shortcut: 'K' },
];

/** Shapes flyout: R and O arm their own tools; the library grid arms the shape tool. */
export type V2ShapePick = ShapeKind | 'tool:rectangle' | 'tool:ellipse';
export const SHAPE_SECTIONS: readonly ToolSection<V2ShapePick>[] = [
  {
    title: 'Basic',
    options: [
      { id: 'tool:rectangle', label: 'Rectangle', icon: shapeIcon('rectangle'), shortcut: 'R' },
      { id: 'tool:ellipse', label: 'Ellipse', icon: shapeIcon('ellipse'), shortcut: 'O' },
    ],
  },
  { title: 'All shapes', options: SHAPE_OPTIONS },
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
 * like its icon; elbows are asked for. Bends come from dragging a segment. */
export const CONNECTOR_ROUTE: Readonly<Record<V2ConnectorTool, ConnectorRouteKind>> = {
  arrow: 'direct',
  elbow: 'orthogonal',
  curve: 'bezier',
};

/** An Insert pick names its group, so one panel can hold media, charts, frames and widgets. */
export type V2MoreItem = `frame:${FramePreset}` | `widget:${WidgetKind}` | `chart:${V2ChartKind}` | 'insert:sticky';
export type V2InsertPick = V2MoreItem | 'insert:image';

/** Insert: everything placed whole rather than drawn. One panel, sections, no second level. */
export const INSERT_SECTIONS: readonly ToolSection<V2InsertPick>[] = [
  {
    title: 'Media',
    options: [
      { id: 'insert:image', label: 'Upload image', icon: IconPhotoPlus, shortcut: '⇧I' },
      { id: 'insert:sticky', label: 'Sticky note', icon: IconNote, shortcut: 'N' },
    ],
  },
  {
    title: 'Charts',
    options: CHART_OPTIONS.map((option) => ({ ...option, id: `chart:${option.id}` as const })),
  },
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
