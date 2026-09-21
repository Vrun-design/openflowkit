// Scene ops: what the language cannot say. Each one wraps the same command
// builders the UI uses, so an agent edit and a human edit produce identical
// records — the parity test in ./ops.test.ts keeps that honest.
import { z } from 'zod';
import { buildDeleteSelectionCommand, buildMoveNodesCommand } from '../../opencanvas/domain/commands/sceneEdits';
import { buildStyleNodesCommand } from '../../opencanvas/domain/commands/styleNodes';
import { addNode } from '../actions/addNode';
import { defineOp, pointOf, pointSchema, requirePage } from './types';

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
    return { command: buildMoveNodesCommand(page, ids, offset), output: { moved: ids } };
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
  description: 'Add one shape without writing DSL (hand-layout only). Prefer create_diagram.',
  schema: addNode.schema,
  async run(input, context) {
    const page = requirePage(context.document, context.pageId);
    return addNode.run(input, { document: context.document, page });
  },
});
