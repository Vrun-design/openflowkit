// Inserts from the toolbar's More and Chart flyouts and their shortcuts: each
// commits one undo step, selects what it made and says so.
import type { RefObject } from 'react';
import { createProductionSceneNode } from '../../application/active-document/productionNodeCatalog';
import { replaceSelection, type CanvasSelection } from '../../application/selection/selection';
import type { DocumentCommand } from '../../domain/commands/types';
import type { SceneNode, ScenePage } from '../../domain/document/types';
import type { Point2d } from '../../domain/geometry/types';
import { createChartNode, DEFAULT_CHART_SIZE } from '../../domain/nodes/chartNode';
import { DEFAULT_QUADRANT } from '../../domain/nodes/chartNodePresentation';
import { FRAME_PRESET_SPECS, createPresetFrame, enclosingPresetFrame, nextFrameSlot, type FramePreset } from '../../domain/nodes/framePreset';
import { nextNodeZIndex } from '../../domain/nodes/shapeNode';
import { createWidgetNode } from '../../domain/nodes/widgetNode';
import { WIDGETS, type WidgetKind } from '../../domain/nodes/widgetNodePresentation';
import { reparentByPosition } from '../../domain/transforms/containment';
import type { V2Tool } from './V2CreationToolbar';
import { mintV2Id } from './v2Document';
import type { V2ChartKind, V2MoreItem } from './v2ToolCatalog';

/** Charts whose default bar data reads poorly start from five categories instead. */
const CATEGORY_CHARTS: ReadonlySet<V2ChartKind> = new Set(['pie', 'donut', 'radar', 'heatmap']);
const CATEGORY_DATA = { categories: ['A', 'B', 'C', 'D', 'E'], series: [{ name: 'Series 1', values: [4, 8, 6, 9, 3] }] };

export interface V2InsertsOptions {
  readonly pageRef: RefObject<ScenePage | null>;
  readonly readOnlyRef: RefObject<boolean>;
  readonly selectionRef: RefObject<CanvasSelection>;
  readonly commit: (command: DocumentCommand) => void;
  readonly applySelection: (selection: CanvasSelection) => void;
  readonly applyConnectorSelection: (ids: readonly string[]) => void;
  readonly centreWorld: () => Point2d;
  readonly setTool: (tool: V2Tool) => void;
  readonly openEditor: (nodeId: string) => void;
  readonly openChart: (nodeId: string) => void;
  readonly announce: (message: string) => void;
}

export function useV2Inserts(options: V2InsertsOptions) {
  const {
    pageRef, readOnlyRef, selectionRef, commit, applySelection, applyConnectorSelection,
    centreWorld, setTool, openEditor, openChart, announce,
  } = options;
  const writablePage = () => (readOnlyRef.current ? null : pageRef.current);
  const centredAt = (size: { width: number; height: number }) => {
    const centre = centreWorld();
    return { x: centre.x - size.width / 2, y: centre.y - size.height / 2 };
  };
  const insertAndSelect = (page: ScenePage, node: SceneNode, label: string, message: string, also: readonly DocumentCommand[] = []) => {
    const insert: DocumentCommand = { kind: 'insert-node', id: `create-node:${node.id}`, label, pageId: page.id, index: page.nodes.length, node };
    commit(also.length ? { kind: 'batch', id: insert.id, label, commands: [insert, ...also] } : insert);
    applyConnectorSelection([]);
    applySelection(replaceSelection([node.id]));
    setTool('select');
    announce(message);
  };

  const insertFrame = (preset: FramePreset) => {
    const page = writablePage();
    if (!page) return;
    const spec = FRAME_PRESET_SPECS[preset];
    insertAndSelect(page, createPresetFrame(page, { id: mintV2Id('node'), preset, at: centredAt(spec.size) }),
      `Add ${spec.name.toLowerCase()}`, `${spec.name} added.`);
  };
  // With a frame (or anything in one) selected, widgets stack down its column,
  // so a screen is built by picking controls one after another.
  const insertWidget = (widget: WidgetKind) => {
    const page = writablePage();
    if (!page) return;
    const spec = WIDGETS[widget];
    const id = mintV2Id('node');
    const frame = enclosingPresetFrame(page, selectionRef.current.primaryNodeId);
    const slot = frame ? nextFrameSlot(page, frame, spec.size, !spec.intrinsic) : null;
    const node = slot && frame
      ? createWidgetNode(page, { id, widget, at: slot.at, size: slot.size, parentId: frame.id })
      : createWidgetNode(page, { id, widget, at: centredAt(spec.size) });
    // Dropped at the viewport centre over a frame, it joins that frame, like a drag would.
    const placed = frame ? node : reparentByPosition({ ...page, nodes: [...page.nodes, node] }, [node])[0]!;
    // A frame that is full grows to hold the pick, in the same undo step (the DSL does too).
    const grow = frame && slot && slot.frameHeight > frame.size.height
      ? { ...frame, size: { ...frame.size, height: slot.frameHeight } } : null;
    insertAndSelect(page, placed, `Add ${spec.name.toLowerCase()}`, `${spec.name} added.`,
      grow && frame ? [{ kind: 'set-node', id: `grow-frame:${frame.id}`, label: 'Grow frame', pageId: page.id, before: frame, after: grow }] : []);
  };
  const insertSticky = () => {
    const page = writablePage();
    if (!page) return;
    const id = mintV2Id('node');
    const sticky = createProductionSceneNode('sticky', id, { x: 0, y: 0 }, page.layers[0]?.id ?? 'default', { label: '', subLabel: '' });
    insertAndSelect(page, { ...sticky, zIndex: nextNodeZIndex(page), transform: { ...sticky.transform, translation: centredAt(sticky.size) } },
      'Add sticky note', 'Sticky note added.');
    openEditor(id);
  };
  const pickMore = (item: V2MoreItem) => {
    const [group, name] = item.split(':') as [string, string];
    if (group === 'frame') insertFrame(name as FramePreset);
    else if (group === 'widget') insertWidget(name as WidgetKind);
    else if (name === 'sticky') insertSticky();
    else setTool(name as 'lasso' | 'laser' | 'eraser');
  };
  /** A chart lands with its data panel open: data is the first thing it needs. */
  const insertChart = (chart: V2ChartKind) => {
    const page = writablePage();
    if (!page) return;
    const node = createChartNode(page, {
      id: mintV2Id('node'), chart, size: DEFAULT_CHART_SIZE, at: centredAt(DEFAULT_CHART_SIZE),
      ...(CATEGORY_CHARTS.has(chart) ? { data: CATEGORY_DATA } : {}),
      ...(chart === 'quadrant' ? { quadrant: DEFAULT_QUADRANT } : {}),
    });
    insertAndSelect(page, node, 'Add chart', 'Chart added.');
    openChart(node.id);
  };

  return { insertFrame, insertSticky, pickMore, insertChart };
}
