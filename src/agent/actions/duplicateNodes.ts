import { z } from 'zod';
import { buildDuplicateSelectionCommand } from '@/opencanvas/domain/commands/sceneEdits';
import { defineAction, requireNode } from './defineAction';

export const duplicateNodes = defineAction({
  name: 'duplicate_nodes',
  description: 'Duplicate nodes (and the listed connectors between them) offset by 24px, like ⌘D. Returns the new ids.',
  schema: z.object({
    ids: z.array(z.string().min(1)).min(1),
    connectorIds: z.array(z.string().min(1)).default([]),
    offset: z.object({ x: z.number().finite(), y: z.number().finite() }).optional(),
  }),
  run: (input, { page }) => {
    for (const id of input.ids) requireNode(page, id);
    const minted: Record<'node' | 'connector', string[]> = { node: [], connector: [] };
    const mint = (prefix: string) => {
      const id = `${prefix}-${crypto.randomUUID()}`;
      minted[prefix === 'node' ? 'node' : 'connector'].push(id);
      return id;
    };
    const offset = input.offset ? { x: Number(input.offset.x), y: Number(input.offset.y) } : undefined;
    const command = buildDuplicateSelectionCommand(page, input.ids, input.connectorIds, mint, offset);
    return { command, output: { ids: minted.node, connectorIds: minted.connector } };
  },
});
