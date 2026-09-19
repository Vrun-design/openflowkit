import { z } from 'zod';
import { buildProductionPortConnectorCommand } from '@/opencanvas/application/active-document/productionConnectorBridge';
import { defineAction } from './defineAction';

const side = z.enum(['top', 'right', 'bottom', 'left']);

export const connect = defineAction({
  name: 'connect',
  description: 'Connect two nodes with a connector. Returns the new connector id.',
  schema: z.object({
    source: z.string().min(1),
    target: z.string().min(1),
    sourceSide: side.default('right'),
    targetSide: side.default('left'),
    id: z.string().min(1).optional(),
  }),
  run: (input, { document, page }) => {
    const id = input.id ?? `connector-${crypto.randomUUID()}`;
    return {
      command: buildProductionPortConnectorCommand(document, page.id, id,
        { nodeId: input.source, side: input.sourceSide },
        { nodeId: input.target, side: input.targetSide }),
      output: { id },
    };
  },
});
