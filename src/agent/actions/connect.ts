import { z } from 'zod';
import { buildProductionPortConnectorCommand } from '@/opencanvas/application/active-document/productionConnectorBridge';
import { buildInsertConnectorCommand, type V2ConnectorEnd } from '@/opencanvas/domain/commands/sceneEdits';
import { defineAction } from './defineAction';

const side = z.enum(['top', 'right', 'bottom', 'left']);
const point = z.object({ x: z.number().finite(), y: z.number().finite() });
const end = z.union([z.string().min(1), point]);

function toEnd(value: z.infer<typeof end>): V2ConnectorEnd {
  // Validated above; Number() only narrows the non-strict zod inference.
  return typeof value === 'string' ? { nodeId: value } : { point: { x: Number(value.x), y: Number(value.y) } };
}

export const connect = defineAction({
  name: 'connect',
  description: 'Draw an arrow between two nodes, or from a node to a free point {x, y}. Without sides it is the toolbar arrow (auto-anchored); with sourceSide/targetSide it binds ports. Returns the connector id.',
  schema: z.object({
    source: end,
    target: end,
    sourceSide: side.optional(),
    targetSide: side.optional(),
    id: z.string().min(1).optional(),
  }),
  run: (input, { document, page }) => {
    const id = input.id ?? `connector-${crypto.randomUUID()}`;
    if (input.sourceSide || input.targetSide) {
      if (typeof input.source !== 'string' || typeof input.target !== 'string') {
        throw new TypeError('Port sides need node ids at both ends.');
      }
      return {
        command: buildProductionPortConnectorCommand(document, page.id, id,
          { nodeId: input.source, side: input.sourceSide ?? 'right' },
          { nodeId: input.target, side: input.targetSide ?? 'left' }),
        output: { id },
      };
    }
    return {
      command: buildInsertConnectorCommand(page, { id, source: toEnd(input.source), target: toEnd(input.target) }),
      output: { id },
    };
  },
});
