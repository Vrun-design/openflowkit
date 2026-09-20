import { z } from 'zod';
import { PRODUCTION_NODE_CATALOG, createProductionSceneNode } from '@/opencanvas/application/active-document/productionNodeCatalog';
import { buildProductionNodeMutationCommand } from '@/opencanvas/application/active-document/productionNodeBridge';
import { SHAPE_KINDS, createShapeNode, type ShapeKind } from '@/opencanvas/domain/nodes/shapeNode';
import { defineAction } from './defineAction';

// Toolbar shapes first: they are what a human creates, so agents get the same nodes.
const CATALOG_IDS = [...SHAPE_KINDS, ...PRODUCTION_NODE_CATALOG.map((entry) => entry.id)];

export const addNode = defineAction({
  name: 'add_node',
  description: `Add a node to the page. Kinds: ${CATALOG_IDS.join(', ')}. Returns the new node id.`,
  schema: z.object({
    kind: z.enum(CATALOG_IDS as [string, ...string[]]).default('process'),
    label: z.string().optional(),
    x: z.number().finite().default(0),
    y: z.number().finite().default(0),
    id: z.string().min(1).optional(),
  }).refine((input) => (SHAPE_KINDS as readonly string[]).includes(input.kind) || !!input.label,
    { message: 'Catalog nodes need a label; toolbar shapes may be blank.', path: ['label'] }),
  run: (input, { page }) => {
    const id = input.id ?? `node-${crypto.randomUUID()}`;
    if (page.nodes.some((node) => node.id === id)) throw new RangeError(`Node "${id}" already exists.`);
    const at = { x: input.x, y: input.y };
    if ((SHAPE_KINDS as readonly string[]).includes(input.kind)) {
      // Same command the v2 toolbar commits (create-node id, append index).
      const node = createShapeNode(page, { kind: input.kind as ShapeKind, id, at, label: input.label });
      return {
        command: { kind: 'insert-node', id: `create-node:${id}`, label: `Create ${input.kind}`,
          pageId: page.id, index: page.nodes.length, node },
        output: { id },
      };
    }
    const layerId = page.layers[0]?.id ?? 'default';
    const node = createProductionSceneNode(input.kind, id, at, layerId, { label: input.label ?? '' });
    return {
      command: buildProductionNodeMutationCommand(page, { kind: 'insert', node }).command,
      output: { id },
    };
  },
});
