// Scene ops: what the language cannot say. Each one wraps the same command
// builders the UI uses, so an agent edit and a human edit produce identical
// records — the parity test in ./ops.test.ts keeps that honest.
import { z } from 'zod';
import { buildDeleteSelectionCommand, buildMoveNodesCommand } from '../../opencanvas/domain/commands/sceneEdits';
import { buildStyleNodesCommand } from '../../opencanvas/domain/commands/styleNodes';
import { PRODUCTION_NODE_CATALOG, createProductionSceneNode } from '../../opencanvas/application/active-document/productionNodeCatalog';
import { buildProductionNodeMutationCommand } from '../../opencanvas/application/active-document/productionNodeBridge';
import { SHAPE_KINDS, createShapeNode, type ShapeKind } from '../../opencanvas/domain/nodes/shapeNode';
import { createChartNode } from '../../opencanvas/domain/nodes/chartNode';
import { DEFAULT_QUADRANT } from '../../opencanvas/domain/nodes/chartNodePresentation';
import { createWidgetNode } from '../../opencanvas/domain/nodes/widgetNode';
import { WIDGET_KINDS, WIDGET_SEVERITIES } from '../../opencanvas/domain/nodes/widgetNodePresentation';
import { FRAME_PRESETS, createPresetFrame } from '../../opencanvas/domain/nodes/framePreset';
import { defineOp, pointOf, pointSchema, requirePage } from './types';

// Toolbar shapes first: they are what a human creates, so agents get the same nodes.
const CATALOG_IDS = [...SHAPE_KINDS, ...PRODUCTION_NODE_CATALOG.map((entry) => entry.id)];

const hex = z.string().regex(/^#[0-9a-fA-F]{6}([0-9a-fA-F]{2})?$/).describe('Hex colour, e.g. #e95420.');

export const moveNodes = defineOp({
  name: 'move',
  title: 'Move shapes',
  description: 'Move nodes by an absolute position or a delta. One undo step.',
  schema: z.object({
    ids: z.array(z.string().min(1)).min(1),
    to: pointSchema.optional(),
    delta: pointSchema.optional(),
  }),
  async run({ ids, to, delta }, context) {
    if ((to === undefined) === (delta === undefined)) throw new TypeError('Pass exactly one of to or delta.');
    const page = requirePage(context.document, context.pageId);
    const nodes = ids.map((id) => {
      const node = page.nodes.find((candidate) => candidate.id === id);
      if (!node) throw new RangeError(`Node "${id}" was not found on this page.`);
      return node;
    });
    const anchor = nodes[0]!;
    const target = to ? pointOf(to) : undefined;
    const offset = target
      ? { x: target.x - anchor.transform.translation.x, y: target.y - anchor.transform.translation.y }
      : pointOf(delta!);

    if (offset.x === 0 && offset.y === 0) return { command: null, output: { moved: [] } };
    // Same builder the nudge/pointer path commits, so records stay identical.
    // Locked nodes are dropped there, so only report what actually moved.
    const command = buildMoveNodesCommand(page, ids, offset);
    return { command, output: { moved: command ? ids : [] } };
  },
});

export const styleNodes = defineOp({
  name: 'style',
  title: 'Style shapes',
  description: 'Fill, stroke, width, dash, opacity and text colour for a set of nodes. One undo step.',
  schema: z.object({
    ids: z.array(z.string().min(1)).min(1),
    fill: hex.optional(),
    stroke: hex.optional(),
    strokeWidth: z.number().min(0).max(32).optional(),
    strokeStyle: z.enum(['solid', 'dashed', 'dotted']).optional(),
    opacity: z.number().min(0).max(1).optional(),
    textColor: hex.optional(),
  }),
  async run({ ids, ...patch }, context) {
    const page = requirePage(context.document, context.pageId);
    for (const id of ids) if (!page.nodes.some((node) => node.id === id)) throw new RangeError(`Node "${id}" was not found on this page.`);
    const defined = Object.fromEntries(Object.entries(patch).filter(([, value]) => value !== undefined));
    if (Object.keys(defined).length === 0) throw new TypeError('Pass at least one style property.');
    return { command: buildStyleNodesCommand(page, ids, defined), output: { ids } };
  },
});

export const deleteShapes = defineOp({
  name: 'delete',
  title: 'Delete shapes',
  description: 'Delete nodes (with their children and attached connectors) or connectors by id. One undo step.',
  schema: z.object({
    ids: z.array(z.string().min(1)).min(1),
    kind: z.enum(['node', 'connector', 'any']).default('any'),
  }),
  async run({ ids, kind }, context) {
    const page = requirePage(context.document, context.pageId);
    const nodes = kind === 'connector' ? [] : ids.filter((id) => page.nodes.some((node) => node.id === id));
    const connectors = kind === 'node' ? [] : ids.filter((id) => page.connectors.some((connector) => connector.id === id));
    if (nodes.length + connectors.length !== ids.length) {
      const missing = ids.filter((id) => !nodes.includes(id) && !connectors.includes(id));
      throw new RangeError(`These ids were not found on this page: ${missing.join(', ')}.`);
    }
    // One builder for both kinds: deletes a subtree and its dangling connectors.
    return { command: buildDeleteSelectionCommand(page, nodes, connectors), output: { deleted: ids } };
  },
});

export const addShape = defineOp({
  name: 'add_shape',
  title: 'Add shape',
  description: `Add one shape without writing DSL (hand-layout only). Prefer create_diagram. Kinds: ${CATALOG_IDS.join(', ')}, chart, widget (wireframe control), frame (phone, browser… preset; drop widgets in with parentId).`,
  schema: z.object({
    kind: z.union([z.enum(CATALOG_IDS as [string, ...string[]]), z.literal('chart'), z.literal('widget'), z.literal('frame')]).default('process'),
    label: z.string().optional(),
    x: z.number().finite().default(0),
    y: z.number().finite().default(0),
    id: z.string().min(1).optional(),
    /** Charts only: the data the node renders (categories and series, or points). */
    chart: z.object({
      kind: z.enum(['bar', 'line', 'area', 'scatter', 'pie', 'donut', 'radar', 'heatmap', 'table', 'quadrant']).default('bar'),
      categories: z.array(z.string()).optional(),
      series: z.array(z.object({ name: z.string(), values: z.array(z.number()) })).optional(),
      points: z.array(z.object({ label: z.string(), x: z.number(), y: z.number() })).optional(),
    }).optional(),
    /** Widgets only: which control, and its state. `label` holds items as `A | B | C`. */
    widget: z.object({
      kind: z.enum(WIDGET_KINDS),
      checked: z.boolean().optional(),
      value: z.number().min(0).max(1).optional(),
      active: z.number().int().min(0).optional(),
      variant: z.enum(['primary', ...WIDGET_SEVERITIES]).optional(),
    }).optional(),
    /** Frames only: the device or layout preset. */
    preset: z.enum(FRAME_PRESETS).optional(),
    /** Widgets only: the frame to place it in; x/y are then frame-local. */
    parentId: z.string().min(1).optional(),
  }).refine((input) => (SHAPE_KINDS as readonly string[]).includes(input.kind)
    || input.kind === 'chart' || input.kind === 'widget' || input.kind === 'frame' || !!input.label,
    { message: 'Catalog nodes need a label; toolbar shapes may be blank.', path: ['label'] }),
  async run(input, context) {
    const page = requirePage(context.document, context.pageId);
    const id = input.id ?? `node-${crypto.randomUUID()}`;
    if (page.nodes.some((node) => node.id === id)) throw new RangeError(`Node "${id}" already exists.`);
    const at = { x: input.x, y: input.y };
    if ((SHAPE_KINDS as readonly string[]).includes(input.kind)) {
      // Same command the v2 toolbar commits (create-node id, append index).
      const node = createShapeNode(page, { kind: input.kind as ShapeKind, id, at, label: input.label });
      return {
        command: { kind: 'insert-node', id: `create-node:${id}`, label: `Create ${input.kind}`, pageId: page.id, index: page.nodes.length, node },
        output: { id },
      };
    }
    if (input.kind === 'chart') {
      const chart = input.chart ?? { kind: 'bar' as const };
      const data = chart.series?.length
        ? { categories: chart.categories ?? [], series: chart.series.map((series) => ({
            name: series.name, values: [...series.values],
          })) }
        : undefined;
      const node = createChartNode(page, {
        id, at, chart: chart.kind,
        ...(input.label ? { title: input.label } : {}),
        ...(data ? { data } : {}),
        ...(chart.kind === 'quadrant' && chart.points?.length
          ? { quadrant: { ...DEFAULT_QUADRANT, points: chart.points.map((point) => ({
              label: point.label ?? 'Point', x: point.x ?? 0.5, y: point.y ?? 0.5,
            })) } } : {}),
      });
      return {
        command: { kind: 'insert-node', id: `create-node:${id}`, label: 'Add chart', pageId: page.id, index: page.nodes.length, node },
        output: { id },
      };
    }
    if (input.kind === 'widget') {
      if (!input.widget) throw new TypeError('Widgets need widget: { kind }.');
      if (input.parentId && !page.nodes.some((node) => node.id === input.parentId)) {
        throw new RangeError(`Parent "${input.parentId}" was not found on this page.`);
      }
      const { kind: widget, ...state } = input.widget;
      const node = createWidgetNode(page, {
        id, widget, at, ...state,
        ...(input.label === undefined ? {} : { label: input.label }),
        ...(input.parentId ? { parentId: input.parentId } : {}),
      });
      return {
        command: { kind: 'insert-node', id: `create-node:${id}`, label: 'Add widget', pageId: page.id, index: page.nodes.length, node },
        output: { id },
      };
    }
    if (input.kind === 'frame') {
      const node = createPresetFrame(page, { id, at, preset: input.preset ?? 'frame', ...(input.label ? { label: input.label } : {}) });
      return {
        command: { kind: 'insert-node', id: `create-node:${id}`, label: 'Add frame', pageId: page.id, index: page.nodes.length, node },
        output: { id },
      };
    }
    const layerId = page.layers[0]?.id ?? 'default';
    const node = createProductionSceneNode(input.kind, id, at, layerId, { label: input.label ?? '' });
    return { command: buildProductionNodeMutationCommand(page, { kind: 'insert', node }).command, output: { id } };
  },
});
