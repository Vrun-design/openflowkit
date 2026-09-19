import { z } from 'zod';
import { buildProductionNodeMutationCommand } from '@/opencanvas/application/active-document/productionNodeBridge';
import { defineAction } from './defineAction';

export const setLabel = defineAction({
  name: 'set_label',
  description: 'Rename a node.',
  schema: z.object({ id: z.string().min(1), label: z.string().min(1) }),
  run: (input, { page }) => ({
    command: buildProductionNodeMutationCommand(page, { kind: 'rename', nodeId: input.id, label: input.label }).command,
    output: { id: input.id },
  }),
});
