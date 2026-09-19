import { z } from 'zod';
import { PRODUCTION_NODE_CATALOG, createProductionSceneNode } from '@/opencanvas/application/active-document/productionNodeCatalog';
import { buildProductionNodeMutationCommand } from '@/opencanvas/application/active-document/productionNodeBridge';
import { defineAction } from './defineAction';

const CATALOG_IDS = PRODUCTION_NODE_CATALOG.map((entry) => entry.id);

export const addNode = defineAction({
  name: 'add_node',
  description: `Add a node to the page. Kinds: ${CATALOG_IDS.join(', ')}. Returns the new node id.`,
  schema: z.object({
    kind: z.enum(CATALOG_IDS as [string, ...string[]]).default('process'),
    label: z.string().min(1),
    x: z.number().finite().default(0),
    y: z.number().finite().default(0),
    id: z.string().min(1).optional(),
  }),
  run: (input, { page }) => {
    const id = input.id ?? `node-${crypto.randomUUID()}`;
    if (page.nodes.some((node) => node.id === id)) throw new RangeError(`Node "${id}" already exists.`);
    const layerId = page.layers[0]?.id ?? 'default';
    const node = createProductionSceneNode(input.kind, id, { x: input.x, y: input.y }, layerId, { label: input.label });
    return {
      command: buildProductionNodeMutationCommand(page, { kind: 'insert', node }).command,
      output: { id },
    };
  },
});
