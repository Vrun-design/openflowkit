import { z } from 'zod';
import { buildProductionNodeMutationCommand } from '@/opencanvas/application/active-document/productionNodeBridge';
import { defineAction } from './defineAction';

export const deleteNode = defineAction({
  name: 'delete_node',
  description: 'Delete a node, its children, and every connector attached to them.',
  schema: z.object({ id: z.string().min(1) }),
  run: (input, { page }) => ({
    command: buildProductionNodeMutationCommand(page, { kind: 'delete', nodeId: input.id }).command,
    output: { id: input.id },
  }),
});
